package com.makeup.platform.service.booking;

import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;

public interface DistributedLockService {

    BookingAcceptanceRes acceptBookingWithLock(Long bookingId, Long userId);
}
