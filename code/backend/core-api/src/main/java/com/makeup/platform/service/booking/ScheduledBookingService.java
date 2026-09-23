package com.makeup.platform.service.booking;

import com.makeup.platform.dto.request.booking.CreateScheduledBookingReq;
import com.makeup.platform.dto.response.booking.ScheduledBookingCreatedRes;

public interface ScheduledBookingService {

    ScheduledBookingCreatedRes createScheduledBooking(Long customerId, CreateScheduledBookingReq req);

    void confirmDepositPayment(Long bookingId);

    void expireSingleBooking(Long bookingId);

    void expireUnpaidScheduledBookings();
}
