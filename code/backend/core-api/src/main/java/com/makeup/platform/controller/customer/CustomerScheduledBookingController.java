package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.booking.CreateScheduledBookingReq;
import com.makeup.platform.dto.response.booking.CustomerBookingItemRes;
import com.makeup.platform.dto.response.booking.ScheduledBookingCreatedRes;
import com.makeup.platform.service.booking.ScheduledBookingService;
import com.makeup.platform.service.customer.CustomerBookingQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customer/bookings")
@RequiredArgsConstructor
public class CustomerScheduledBookingController extends BaseController {

    private final ScheduledBookingService scheduledBookingService;
    private final CustomerBookingQueryService customerBookingQueryService;

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<CustomerBookingItemRes>>> getMyBookings(
            @RequestParam(required = false) String statusGroup) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        List<CustomerBookingItemRes> res = customerBookingQueryService.getMyBookings(customerId, statusGroup);
        return ok(res, "booking.query_success");
    }

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
