package com.makeup.platform.service.booking;

import com.makeup.platform.dto.request.booking.CreateScheduledBookingReq;
import com.makeup.platform.dto.response.booking.ScheduledBookingCreatedRes;

import com.makeup.platform.dto.response.booking.ScheduledOfferRes;
import java.util.List;

public interface ScheduledBookingService {

    ScheduledBookingCreatedRes createScheduledBooking(Long customerId, CreateScheduledBookingReq req);

    void confirmDepositPayment(Long bookingId);

    void expireSingleBooking(Long bookingId);

    void expireUnpaidScheduledBookings();

    void confirmScheduledBookingByMua(Long bookingId, Long muaUserId);

    void rejectScheduledBookingByMua(Long bookingId, Long muaUserId, String reason);

    void cancelRequestedBookingByCustomer(Long bookingId, Long customerId, String reason);

    void expireUnconfirmedScheduledBookings();

    List<ScheduledOfferRes> getPendingScheduledOffersForMua(Long muaUserId);
}
