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
import org.springframework.data.domain.PageRequest;
import com.makeup.platform.repository.booking.BookingSpecifications;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminBookingServiceImpl implements AdminBookingService {

    private final BookingRepository bookingRepository;
    private final BookingMapper bookingMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminBookingRes> getAllBookings(String status, String keyword, Pageable pageable) {
        var spec = BookingSpecifications.adminStatus(status).and(BookingSpecifications.keyword(keyword));
        Sort order = Sort.by(Sort.Direction.DESC, "createdAt", "id");
        Pageable queryPage = pageable == null || pageable.isUnpaged()
                ? Pageable.unpaged(order)
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), order);
        Page<AdminBookingRes> result = bookingRepository.findAll(spec, queryPage).map(bookingMapper::toAdminBookingRes);
        if (queryPage.isUnpaged()) {
            return PageResponse.<AdminBookingRes>builder()
                    .content(result.getContent()).page(0).size(result.getNumberOfElements())
                    .totalElements(result.getTotalElements()).totalPages(result.isEmpty() ? 0 : 1)
                    .last(true).build();
        }
        return PageResponse.from(result);
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
        long totalBookings = 0;
        long completedBookings = 0;
        long inProgressBookings = 0;
        long pendingDispatchCount = 0;
        long cancelledCount = 0;
        long disputedCount = 0;
        BigDecimal totalGrossVolume = BigDecimal.ZERO;
        for (var aggregate : bookingRepository.aggregateByStatus()) {
            long count = aggregate.getBookingCount();
            BookingStatus status = aggregate.getStatus();
            totalBookings += count;
            if (status == BookingStatus.COMPLETED || status == BookingStatus.PAID_OUT) {
                completedBookings += count;
                if (aggregate.getTotalAmount() != null) totalGrossVolume = totalGrossVolume.add(aggregate.getTotalAmount());
            }
            if (status == BookingStatus.IN_PROGRESS || status == BookingStatus.ON_THE_WAY || status == BookingStatus.ARRIVED) {
                inProgressBookings += count;
            }
            if (status == BookingStatus.PENDING_AGENCY_DISPATCH || status == BookingStatus.REQUESTED
                    || Boolean.TRUE.equals(aggregate.getNeedsEmergencyReassignment())) {
                pendingDispatchCount += count;
            }
            if (status == BookingStatus.CANCELLED || status == BookingStatus.CANCELLED_EXPIRED) cancelledCount += count;
            if (status == BookingStatus.DISPUTED) disputedCount += count;
        }

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
