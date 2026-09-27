package com.makeup.platform.service.agency.impl;

import com.makeup.platform.repository.booking.projection.BookingRevenueRow;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.agency.AgencyBookingOverviewStatsRes;
import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.mapper.agency.AgencyBookingMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.agency.AgencyBookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.makeup.platform.repository.booking.BookingSpecifications;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Objects;

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

        var spec = BookingSpecifications.agency(agency.getId()).and(BookingSpecifications.agencyStatus(status)).and(BookingSpecifications.keyword(keyword));
        Sort order = Sort.by(Sort.Direction.DESC, "createdAt", "id");
        Pageable queryPage = pageable == null || pageable.isUnpaged()
                ? Pageable.unpaged(order)
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), order);
        Page<BookingEntity> bookings = bookingRepository.findAll(spec, queryPage);
        Map<Long, BigDecimal> rates = loadCommissionRates(agency.getId(), bookings.getContent().stream()
                .filter(b -> b.getMua() != null).map(b -> b.getMua().getId()).distinct().toList());
        Page<AgencyBookingRes> result = bookings.map(b -> agencyBookingMapper.toRes(b, agency, rates));
        if (queryPage.isUnpaged()) {
            return PageResponse.<AgencyBookingRes>builder()
                    .content(result.getContent()).page(0).size(result.getNumberOfElements())
                    .totalElements(result.getTotalElements()).totalPages(result.isEmpty() ? 0 : 1)
                    .last(true).build();
        }
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyBookingOverviewStatsRes getAgencyBookingOverviewStats(Long ownerUserId) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "agency.not_found", HttpStatus.NOT_FOUND));

        var agencySpec = BookingSpecifications.agency(agency.getId());
        long totalBookings = bookingRepository.count(agencySpec);
        List<BookingRevenueRow> completed =
                bookingRepository.findCompletedRevenueByAgencyId(agency.getId());
        long completedBookings = completed.size();
        Map<Long, BigDecimal> rates = loadCommissionRates(agency.getId(), completed.stream()
                .map(BookingRevenueRow::getMuaId)
                .filter(Objects::nonNull).distinct().toList());
        BigDecimal defaultRate = agency.getCommissionRateInternal() != null
                ? agency.getCommissionRateInternal() : BigDecimal.valueOf(30.0);
        BigDecimal totalGrossRevenue = BigDecimal.ZERO;
        BigDecimal totalStudioNet = BigDecimal.ZERO;
        for (var booking : completed) {
            BigDecimal amount = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal rate = rates.getOrDefault(booking.getMuaId(), defaultRate);
            BigDecimal multiplier = rate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            BigDecimal commission = amount.multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
            totalGrossRevenue = totalGrossRevenue.add(amount);
            totalStudioNet = totalStudioNet.add(amount.subtract(commission).setScale(2, RoundingMode.HALF_UP));
        }
        long emergencyCount = bookingRepository.count(agencySpec
                .and(BookingSpecifications.agencyStatus("EMERGENCY_REASSIGNMENT")));

        return AgencyBookingOverviewStatsRes.builder()
                .totalBookings(totalBookings)
                .completedBookings(completedBookings)
                .totalGrossRevenue(totalGrossRevenue)
                .totalStudioNet(totalStudioNet)
                .emergencyCount(emergencyCount)
                .build();
    }

    private Map<Long, BigDecimal> loadCommissionRates(Long agencyId, List<Long> muaIds) {
        Map<Long, BigDecimal> rates = new HashMap<>();
        for (int offset = 0; offset < muaIds.size(); offset += 250) {
            for (AgencyStaffEntity staff : agencyStaffRepository.findCommissionRates(agencyId,
                    muaIds.subList(offset, Math.min(offset + 250, muaIds.size())))) {
                if (staff.getAgreedCommissionRate() != null) {
                    rates.put(staff.getMua().getId(), staff.getAgreedCommissionRate());
                }
            }
        }
        return rates;
    }
}
