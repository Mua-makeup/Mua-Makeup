package com.makeup.platform.service.customer;

import com.makeup.platform.dto.request.booking.CreateInstantBookingReq;
import com.makeup.platform.dto.response.booking.InstantBookingCreatedRes;
import com.makeup.platform.dto.response.booking.RecentAddressRes;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface CustomerInstantBookingService {

    InstantBookingCreatedRes createInstantBooking(Long customerId, CreateInstantBookingReq req);

    boolean dispatchNextCandidate(Long bookingId);

    boolean skipCurrentCandidate(Long bookingId, Long muaUserId);

    boolean expireInstantBooking(Long bookingId);

    boolean cancelInstantBookingByCustomer(Long bookingId, Long customerUserId, String reason);

    boolean dispatchNextCandidateIfCurrent(Long bookingId, Long expectedMuaId);

    void processPendingBooking(Long bookingId);

    List<RecentAddressRes> getRecentAddresses(Long customerId);
 
    boolean rejectMatchedProvider(Long bookingId, Long customerUserId, String reason);

    boolean confirmDeposit(Long bookingId, Long customerUserId, Long packageId, List<String> addOnNames, BigDecimal addOnTotal);

    Map<String, Object> getPendingOfferForMua(Long muaUserId);
}
