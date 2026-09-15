package com.makeup.platform.controller.booking;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;
import com.makeup.platform.service.booking.DistributedLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/freelancer/bookings")
@RequiredArgsConstructor
public class BookingAcceptanceController extends BaseController {

    private final DistributedLockService distributedLockService;

    @PostMapping("/{bookingId}/accept")
    @PreAuthorize("hasAnyRole('FREELANCE_MUA', 'AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<BookingAcceptanceRes>> acceptBooking(@PathVariable Long bookingId) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        BookingAcceptanceRes res = distributedLockService.acceptBookingWithLock(bookingId, userId);
        return ok(res, "booking.accept_success");
    }
}
