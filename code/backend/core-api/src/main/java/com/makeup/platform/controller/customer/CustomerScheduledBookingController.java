package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.booking.CreateScheduledBookingReq;
import com.makeup.platform.dto.response.booking.ScheduledBookingCreatedRes;
import com.makeup.platform.service.booking.ScheduledBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer/bookings")
@RequiredArgsConstructor
public class CustomerScheduledBookingController extends BaseController {

    private final ScheduledBookingService scheduledBookingService;

    @PostMapping("/scheduled")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ScheduledBookingCreatedRes>> createScheduledBooking(
            @Valid @RequestBody CreateScheduledBookingReq req) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        ScheduledBookingCreatedRes res = scheduledBookingService.createScheduledBooking(customerId, req);
        return createdWithKey(res, "booking.scheduled_created_success");
    }

    @PostMapping("/{bookingId}/deposit")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> confirmDepositPayment(
            @PathVariable Long bookingId) {
        scheduledBookingService.confirmDepositPayment(bookingId);
        return okWithKey(null, "booking.deposit_confirmed_success");
    }
}
