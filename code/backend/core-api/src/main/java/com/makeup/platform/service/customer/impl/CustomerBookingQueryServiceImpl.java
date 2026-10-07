package com.makeup.platform.service.customer.impl;

import com.makeup.platform.dto.response.booking.CustomerBookingItemRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.service.customer.CustomerBookingQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerBookingQueryServiceImpl implements CustomerBookingQueryService {

    private final BookingRepository bookingRepository;
    private final BookingDepositRepository bookingDepositRepository;
    private final BookingMapper bookingMapper;

    @Override
    @Transactional(readOnly = true)
    public List<CustomerBookingItemRes> getMyBookings(Long customerId, String statusGroup) {
        List<BookingEntity> bookings = bookingRepository.findCustomerBookings(customerId);

        if (statusGroup != null && !statusGroup.isBlank() && !"ALL".equalsIgnoreCase(statusGroup)) {
            if ("UPCOMING".equalsIgnoreCase(statusGroup)) {
                Set<BookingStatus> upcomingStatuses = Set.of(
                        BookingStatus.REQUESTED,
                        BookingStatus.PENDING_AGENCY_DISPATCH,
                        BookingStatus.AGENCY_ASSIGNED,
                        BookingStatus.ACCEPTED,
                        BookingStatus.ON_THE_WAY,
                        BookingStatus.ARRIVED,
                        BookingStatus.IN_PROGRESS
                );
                bookings = bookings.stream()
                        .filter(b -> upcomingStatuses.contains(b.getStatus()))
                        .toList();
            } else if ("HISTORY".equalsIgnoreCase(statusGroup)) {
                Set<BookingStatus> historyStatuses = Set.of(
                        BookingStatus.COMPLETED,
                        BookingStatus.PAID_OUT,
                        BookingStatus.CANCELLED,
                        BookingStatus.CANCELLED_EXPIRED,
                        BookingStatus.DISPUTED,
                        BookingStatus.DISPUTE_REFUNDED,
                        BookingStatus.DISPUTE_COMPENSATED
                );
                bookings = bookings.stream()
                        .filter(b -> historyStatuses.contains(b.getStatus()))
                        .toList();
            }
        }

        List<Long> bookingIds = bookings.stream().map(BookingEntity::getId).toList();
        Set<Long> paidBookingIds = bookingIds.isEmpty()
                ? Collections.emptySet()
                : new HashSet<>(bookingDepositRepository.findPaidBookingIds(bookingIds));

        return bookings.stream()
                .map(b -> bookingMapper.toCustomerBookingRes(b, paidBookingIds.contains(b.getId())))
                .toList();
    }
}
