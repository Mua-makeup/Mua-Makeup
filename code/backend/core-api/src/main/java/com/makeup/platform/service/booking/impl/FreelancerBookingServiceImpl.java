package com.makeup.platform.service.booking.impl;

import com.makeup.platform.dto.response.booking.FreelancerBookingItemRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.FreelancerBookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FreelancerBookingServiceImpl implements FreelancerBookingService {

    private final BookingRepository bookingRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingMapper bookingMapper;

    @Override
    @Transactional(readOnly = true)
    public List<FreelancerBookingItemRes> getMyAssignedBookings(Long userId, LocalDate date, String statusGroup) {
        MuaProfileEntity mua = muaProfileRepository.findByUserId(userId).orElse(null);
        if (mua == null) {
            log.warn("User {} has no MuaProfileEntity associated", userId);
            return List.of();
        }

        List<BookingEntity> bookings;
        if (date != null) {
            bookings = bookingRepository.findFreelancerBookingsByDate(mua.getId(), date);
        } else {
            bookings = bookingRepository.findAllFreelancerBookings(mua.getId());
        }

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
            } else if ("COMPLETED".equalsIgnoreCase(statusGroup) || "HISTORY".equalsIgnoreCase(statusGroup)) {
                Set<BookingStatus> completedStatuses = Set.of(
                        BookingStatus.COMPLETED,
                        BookingStatus.PAID_OUT,
                        BookingStatus.CANCELLED,
                        BookingStatus.CANCELLED_EXPIRED,
                        BookingStatus.DISPUTED
                );
                bookings = bookings.stream()
                        .filter(b -> completedStatuses.contains(b.getStatus()))
                        .toList();
            }
        }

        return bookings.stream()
                .map(bookingMapper::toFreelancerBookingRes)
                .toList();
    }
}
