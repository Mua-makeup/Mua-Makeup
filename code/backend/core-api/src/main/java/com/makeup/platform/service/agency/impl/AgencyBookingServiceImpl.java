package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.agency.AgencyBookingOverviewStatsRes;
import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.mapper.agency.AgencyBookingMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.agency.AgencyBookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyBookingServiceImpl implements AgencyBookingService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final BookingRepository bookingRepository;
    private final AgencyBookingMapper agencyBookingMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AgencyBookingRes> getAgencyBookings(
            Long ownerUserId, String status, String keyword, Pageable pageable) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "agency.not_found", HttpStatus.NOT_FOUND));

        List<BookingEntity> bookings = bookingRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId());

        List<AgencyBookingRes> filtered = bookings.stream()
                .filter(b -> {
                    // Filter status
                    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                        if ("EMERGENCY_REASSIGNMENT".equalsIgnoreCase(status)) {
                            if (!Boolean.TRUE.equals(b.getNeedsEmergencyReassignment())
                                    || b.getStatus() == BookingStatus.CANCELLED
                                    || b.getStatus() == BookingStatus.CANCELLED_EXPIRED
                                    || b.getStatus() == BookingStatus.COMPLETED
                                    || b.getStatus() == BookingStatus.PAID_OUT) {
                                return false;
                            }
                        } else if ("CONFIRMED".equalsIgnoreCase(status)) {
                            if (b.getStatus() != BookingStatus.ACCEPTED
                                    && b.getStatus() != BookingStatus.AGENCY_ASSIGNED
                                    && b.getStatus() != BookingStatus.ARRIVED
                                    && b.getStatus() != BookingStatus.ON_THE_WAY) {
                                return false;
                            }
                        } else if ("CANCELLED".equalsIgnoreCase(status)) {
                            if (b.getStatus() != BookingStatus.CANCELLED
                                    && b.getStatus() != BookingStatus.CANCELLED_EXPIRED) {
                                return false;
                            }
                        } else {
                            try {
                                BookingStatus target = BookingStatus.valueOf(status.toUpperCase());
                                if (b.getStatus() != target) {
                                    return false;
                                }
                            } catch (IllegalArgumentException e) {
                                log.warn("Invalid agency booking status filter: {}", status);
                            }
                        }
                    }

                    // Filter keyword
                    if (keyword != null && !keyword.isBlank()) {
                        String kw = keyword.toLowerCase().trim();
                        boolean matchCode = b.getBookingCode() != null && b.getBookingCode().toLowerCase().contains(kw);
                        boolean matchCustName = b.getCustomer() != null && b.getCustomer().getFullName() != null &&
                                b.getCustomer().getFullName().toLowerCase().contains(kw);
                        boolean matchCustPhone = b.getCustomer() != null && b.getCustomer().getPhoneNumber() != null &&
                                b.getCustomer().getPhoneNumber().contains(kw);
                        boolean matchAddress = b.getDestinationAddress() != null &&
                                b.getDestinationAddress().toLowerCase().contains(kw);
                        return matchCode || matchCustName || matchCustPhone || matchAddress;
                    }

                    return true;
                })
                .map(b -> mapToAgencyBookingRes(b, agency))
                .collect(Collectors.toList());

        if (pageable == null || pageable.isUnpaged()) {
            return PageResponse.<AgencyBookingRes>builder()
                    .content(filtered)
                    .page(0)
                    .size(filtered.size())
                    .totalElements(filtered.size())
                    .totalPages(filtered.isEmpty() ? 0 : 1)
                    .last(true)
                    .build();
        }

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        List<AgencyBookingRes> pagedList = start > filtered.size() ? List.of() : filtered.subList(start, end);
        Page<AgencyBookingRes> page =
                new PageImpl<>(pagedList, pageable, filtered.size());
        return PageResponse.from(page);
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyBookingOverviewStatsRes getAgencyBookingOverviewStats(Long ownerUserId) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "agency.not_found", HttpStatus.NOT_FOUND));

        List<BookingEntity> bookings = bookingRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId());

        long totalBookings = bookings.size();

        long completedBookings = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.PAID_OUT)
                .count();

        BigDecimal totalGrossRevenue = BigDecimal.ZERO;
        BigDecimal totalStudioNet = BigDecimal.ZERO;

        for (BookingEntity b : bookings) {
            if (b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.PAID_OUT) {
                AgencyBookingRes res = mapToAgencyBookingRes(b, agency);
                if (res.getTotalAmount() != null) {
                    totalGrossRevenue = totalGrossRevenue.add(res.getTotalAmount());
                }
                if (res.getEstimatedStudioNet() != null) {
                    totalStudioNet = totalStudioNet.add(res.getEstimatedStudioNet());
                }
            }
        }

        long emergencyCount = bookings.stream()
                .filter(b -> Boolean.TRUE.equals(b.getNeedsEmergencyReassignment())
                        && b.getStatus() != BookingStatus.CANCELLED
                        && b.getStatus() != BookingStatus.CANCELLED_EXPIRED
                        && b.getStatus() != BookingStatus.COMPLETED
                        && b.getStatus() != BookingStatus.PAID_OUT)
                .count();

        return AgencyBookingOverviewStatsRes.builder()
                .totalBookings(totalBookings)
                .completedBookings(completedBookings)
                .totalGrossRevenue(totalGrossRevenue)
                .totalStudioNet(totalStudioNet)
                .emergencyCount(emergencyCount)
                .build();
    }

    private AgencyBookingRes mapToAgencyBookingRes(BookingEntity b, AgencyProfileEntity agency) {
        return agencyBookingMapper.toRes(b, agency);
    }
}
