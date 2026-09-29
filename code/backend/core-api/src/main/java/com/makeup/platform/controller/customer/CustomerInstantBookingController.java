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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.makeup.platform.dto.request.booking.ConfirmDepositReq;
import com.makeup.platform.dto.response.booking.RecentAddressRes;

import java.math.BigDecimal;
import java.util.List;

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
            @PathVariable Long bookingId,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        String reason = (body != null && body.containsKey("reason"))
                ? body.get("reason") : "Khách hàng chủ động hủy tìm kiếm";
        customerInstantBookingService.cancelInstantBookingByCustomer(bookingId, customerId, reason);
        return ok(null, "booking.cancel_success");
    }

    @GetMapping("/recent-addresses")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<RecentAddressRes>>> getRecentAddresses() {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        List<RecentAddressRes> res =
                customerInstantBookingService.getRecentAddresses(customerId);
        return ok(res, "booking.recent_addresses_fetch_success");
    }

    @PostMapping("/{bookingId}/reject-provider")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> rejectMatchedProvider(
            @PathVariable Long bookingId,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        String reason = (body != null && body.containsKey("reason"))
                ? body.get("reason") : "Khách hàng từ chối thợ";
        customerInstantBookingService.rejectMatchedProvider(bookingId, customerId, reason);
        return ok(null, "booking.reject_provider_success");
    }

    @PostMapping("/{bookingId}/confirm-deposit")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> confirmDeposit(
            @PathVariable Long bookingId,
            @RequestBody(required = false) ConfirmDepositReq req) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        List<String> addOnNames = req != null ? req.getAddOnNames() : null;
        BigDecimal addOnTotal = req != null ? req.getAddOnTotal() : null;
        customerInstantBookingService.confirmDeposit(bookingId, customerId, addOnNames, addOnTotal);
        return ok(null, "booking.deposit_success");
    }
}
