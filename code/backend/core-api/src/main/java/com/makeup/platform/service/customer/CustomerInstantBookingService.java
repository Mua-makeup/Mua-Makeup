package com.makeup.platform.service.customer;

import com.makeup.platform.dto.request.booking.CreateInstantBookingReq;
import com.makeup.platform.dto.response.booking.InstantBookingCreatedRes;
import com.makeup.platform.dto.response.booking.RecentAddressRes;

import java.util.List;

public interface CustomerInstantBookingService {

    InstantBookingCreatedRes createInstantBooking(Long customerId, CreateInstantBookingReq req);

    boolean dispatchNextCandidate(Long bookingId);

    boolean skipCurrentCandidate(Long bookingId, Long muaUserId);

    boolean expireInstantBooking(Long bookingId);

    boolean cancelInstantBookingByCustomer(Long bookingId, Long customerUserId, String reason);

    boolean dispatchNextCandidateIfCurrent(Long bookingId, Long expectedMuaId);

    void processPendingBooking(Long bookingId);

    List<RecentAddressRes> getRecentAddresses(Long customerId);
}
