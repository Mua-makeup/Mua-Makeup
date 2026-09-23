package com.makeup.platform.controller.booking;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;
import com.makeup.platform.service.booking.DistributedLockService;
import com.makeup.platform.service.customer.CustomerInstantBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/freelancer/bookings")
@RequiredArgsConstructor
public class BookingAcceptanceController extends BaseController {

    private final DistributedLockService distributedLockService;
    private final CustomerInstantBookingService customerInstantBookingService;

    @PostMapping("/{bookingId}/accept")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<BookingAcceptanceRes>> acceptBooking(@PathVariable Long bookingId) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        BookingAcceptanceRes res = distributedLockService.acceptBookingWithLock(bookingId, userId);
        return ok(res, "booking.accept_success");
    }

    @PostMapping("/{bookingId}/skip")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> skipBooking(@PathVariable Long bookingId) {
        boolean nextDispatched = customerInstantBookingService.dispatchNextCandidate(bookingId);
        Map<String, Object> result = new HashMap<>();
        result.put("bookingId", bookingId);
        result.put("nextCandidateDispatched", nextDispatched);
        return ok(result, "booking.skip_success");
    }
}
