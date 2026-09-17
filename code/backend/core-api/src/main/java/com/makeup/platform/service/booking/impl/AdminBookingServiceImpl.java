package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.admin.AdminBookingRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.AdminBookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public List<AdminBookingRes> getAllBookings(String status, String keyword) {
        List<BookingEntity> bookings = bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        return bookings.stream()
                .filter(b -> {
                    // Filter by status if provided
                    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                        try {
                            BookingStatus targetStatus = BookingStatus.valueOf(status.toUpperCase());
                            if (b.getStatus() != targetStatus) {
                                return false;
                            }
                        } catch (IllegalArgumentException e) {
                            log.warn("Invalid booking status filter: {}", status);
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
    }

    @Override
    @Transactional(readOnly = true)
    public AdminBookingRes getBookingDetail(Long id) {
        BookingEntity booking = bookingRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        return bookingMapper.toAdminBookingRes(booking);
    }
}
