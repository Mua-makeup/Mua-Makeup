package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.booking.CreateInstantBookingReq;
import com.makeup.platform.dto.response.booking.InstantBookingCreatedRes;
import com.makeup.platform.service.customer.CustomerInstantBookingService;
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
public class CustomerInstantBookingController extends BaseController {

    private final CustomerInstantBookingService customerInstantBookingService;

    @PostMapping("/instant")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<InstantBookingCreatedRes>> createInstantBooking(
            @Valid @RequestBody CreateInstantBookingReq req) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        InstantBookingCreatedRes res = customerInstantBookingService.createInstantBooking(customerId, req);
        return created(res, "booking.create_success");
    }

    @PostMapping("/{bookingId}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> cancelInstantBooking(
            @PathVariable Long bookingId) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        customerInstantBookingService.cancelInstantBookingByCustomer(bookingId, customerId, "Khách hàng chủ động hủy tìm kiếm");
        return ok(null, "booking.cancel_success");
    }
}
