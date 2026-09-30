package com.makeup.platform.controller.booking;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;
import com.makeup.platform.dto.response.booking.FreelancerBookingItemRes;
import com.makeup.platform.service.booking.DistributedLockService;
import com.makeup.platform.service.booking.FreelancerBookingService;
import com.makeup.platform.service.customer.CustomerInstantBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/freelancer/bookings")
@RequiredArgsConstructor
public class BookingAcceptanceController extends BaseController {

    private final DistributedLockService distributedLockService;
    private final CustomerInstantBookingService customerInstantBookingService;
    private final FreelancerBookingService freelancerBookingService;

    @GetMapping
    @PreAuthorize("hasAnyRole('FREELANCE_MUA', 'AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<List<FreelancerBookingItemRes>>> getMyAssignedBookings(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String statusGroup) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        List<FreelancerBookingItemRes> res = freelancerBookingService.getMyAssignedBookings(userId, date, statusGroup);
        return ok(res, "booking.query_success");
    }

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
        Long userId = SecurityContextUtils.getCurrentUserId();
        boolean nextDispatched = customerInstantBookingService.skipCurrentCandidate(bookingId, userId);
        Map<String, Object> result = new HashMap<>();
        result.put("bookingId", bookingId);
        result.put("nextCandidateDispatched", nextDispatched);
        return ok(result, "booking.skip_success");
    }

    @GetMapping("/instant/pending-offer")
    @PreAuthorize("hasAnyRole('FREELANCE_MUA', 'AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPendingOffer() {
        Long userId = SecurityContextUtils.getCurrentUserId();
        Map<String, Object> res = customerInstantBookingService.getPendingOfferForMua(userId);
        return ok(res, "booking.pending_offer_checked");
    }
}
