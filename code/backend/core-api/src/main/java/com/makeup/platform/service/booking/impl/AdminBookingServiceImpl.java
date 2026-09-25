package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.admin.AdminBookingOverviewStatsRes;
import com.makeup.platform.dto.response.admin.AdminBookingRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.AdminBookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.makeup.platform.common.base.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminBookingServiceImpl implements AdminBookingService {

    private final BookingRepository bookingRepository;
    private final BookingMapper bookingMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminBookingRes> getAllBookings(String status, String keyword, Pageable pageable) {
        List<BookingEntity> bookings = bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<AdminBookingRes> filtered = bookings.stream()
                .filter(b -> {
                    // Filter by status if provided
                    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                        String s = status.toUpperCase().trim();
                        BookingStatus bs = b.getStatus();
                        if (bs == null) {
                            return false;
                        }

                        boolean match = switch (s) {
                            case "PENDING_DEPOSIT" -> bs == BookingStatus.PENDING_DEPOSIT;
                            case "PENDING_AGENCY_DISPATCH" -> bs == BookingStatus.PENDING_AGENCY_DISPATCH || bs == BookingStatus.REQUESTED;
                            case "CONFIRMED", "AGENCY_ASSIGNED" -> bs == BookingStatus.AGENCY_ASSIGNED || bs == BookingStatus.ACCEPTED;
                            case "IN_PROGRESS" -> bs == BookingStatus.IN_PROGRESS || bs == BookingStatus.ON_THE_WAY || bs == BookingStatus.ARRIVED;
                            case "COMPLETED" -> bs == BookingStatus.COMPLETED || bs == BookingStatus.PAID_OUT;
                            case "CANCELLED" -> bs == BookingStatus.CANCELLED || bs == BookingStatus.CANCELLED_EXPIRED;
                            case "DISPUTED" -> bs == BookingStatus.DISPUTED;
                            default -> {
                                try {
                                    yield bs == BookingStatus.valueOf(s);
                                } catch (IllegalArgumentException e) {
                                    yield false;
                                }
                            }
                        };
                        if (!match) {
                            return false;
                        }
                    }

                    // Filter by keyword (bookingCode, customer phone, customer name)
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
                .map(bookingMapper::toAdminBookingRes)
                .collect(Collectors.toList());

        if (pageable == null || pageable.isUnpaged()) {
            return PageResponse.<AdminBookingRes>builder()
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
        List<AdminBookingRes> pagedList = start > filtered.size() ? List.of() : filtered.subList(start, end);
        Page<AdminBookingRes> page = new PageImpl<>(pagedList, pageable, filtered.size());
        return PageResponse.from(page);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminBookingRes getBookingDetail(Long id) {
        BookingEntity booking = bookingRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        return bookingMapper.toAdminBookingRes(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminBookingOverviewStatsRes getBookingOverviewStats() {
        List<BookingEntity> bookings = bookingRepository.findAll();

        long totalBookings = bookings.size();

        long completedBookings = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.PAID_OUT)
                .count();

        long inProgressBookings = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.IN_PROGRESS
                        || b.getStatus() == BookingStatus.ON_THE_WAY
                        || b.getStatus() == BookingStatus.ARRIVED)
                .count();

        long pendingDispatchCount = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.PENDING_AGENCY_DISPATCH
                        || b.getStatus() == BookingStatus.REQUESTED
                        || Boolean.TRUE.equals(b.getNeedsEmergencyReassignment()))
                .count();

        BigDecimal totalGrossVolume = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.PAID_OUT)
                .map(b -> b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long cancelledCount = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CANCELLED || b.getStatus() == BookingStatus.CANCELLED_EXPIRED)
                .count();

        long disputedCount = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.DISPUTED)
                .count();

        return AdminBookingOverviewStatsRes.builder()
                .totalBookings(totalBookings)
                .completedBookings(completedBookings)
                .inProgressBookings(inProgressBookings)
                .pendingDispatchCount(pendingDispatchCount)
                .totalGrossVolume(totalGrossVolume)
                .cancelledCount(cancelledCount)
                .disputedCount(disputedCount)
                .build();
    }
}
