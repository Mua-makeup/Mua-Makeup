package com.makeup.platform.service.customer;

import com.makeup.platform.dto.request.booking.CreateInstantBookingReq;
import com.makeup.platform.dto.response.booking.InstantBookingCreatedRes;

public interface CustomerInstantBookingService {

    InstantBookingCreatedRes createInstantBooking(Long customerId, CreateInstantBookingReq req);

    boolean dispatchNextCandidate(Long bookingId);

    boolean skipCurrentCandidate(Long bookingId, Long muaUserId);

    boolean expireInstantBooking(Long bookingId);

    boolean cancelInstantBookingByCustomer(Long bookingId, Long customerUserId, String reason);
}
