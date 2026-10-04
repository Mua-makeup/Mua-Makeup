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
import org.springframework.http.HttpStatus;
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
import java.util.Map;

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

    @PostMapping({"", "/scheduled"})
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ScheduledBookingCreatedRes>> createScheduledBooking(
            @Valid @RequestBody CreateScheduledBookingReq req) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        ScheduledBookingCreatedRes res = scheduledBookingService.createScheduledBooking(customerId, req);
        return createdWithKey(res, "booking.scheduled_created_success");
    }

    /**
     * @deprecated Endpoint này đã bị thay thế bởi POST /deposit-intents
     * Trả 410 Gone để client chuyển sang API cọc mới.
     */
    @PostMapping("/{bookingId}/deposit")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> confirmDepositPayment(
            @PathVariable Long bookingId) {
        ApiResponse<Void> errorRes = ApiResponse.<Void>builder()
                .success(false)
                .errorCode("ERR_DEPRECATED")
                .message("Endpoint này đã bị thay thế. Vui lòng dùng POST /api/v1/customer/bookings/"
                        + bookingId + "/deposit-intents")
                .build();
        return ResponseEntity.status(HttpStatus.GONE).body(errorRes);
    }

    @PostMapping("/{bookingId}/cancel-requested")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> cancelRequestedBooking(
            @PathVariable Long bookingId,
            @RequestBody(required = false) Map<String, String> body) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        String reason = body != null ? body.get("reason") : null;
        scheduledBookingService.cancelRequestedBookingByCustomer(bookingId, customerId, reason);
        return ok(null, "booking.cancel_requested_success");
    }
}
