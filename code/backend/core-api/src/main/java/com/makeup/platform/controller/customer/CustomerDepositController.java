package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.payment.CreateDepositIntentReq;
import com.makeup.platform.dto.response.payment.BookingDepositStatusRes;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.service.payment.BookingDepositService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer/bookings")
@RequiredArgsConstructor
public class CustomerDepositController extends BaseController {

    private final BookingDepositService bookingDepositService;
    private final com.makeup.platform.service.payment.impl.FinalPaymentSyncService finalPaymentSyncService;

    @PostMapping("/{bookingId}/final-payment/sync")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Boolean>> syncFinalPayment(@PathVariable Long bookingId) {
        finalPaymentSyncService.syncBooking(bookingId, SecurityContextUtils.getCurrentUserId());
        return ok(true, "booking.final_payment_synced");
    }


    @PostMapping("/{bookingId}/deposit-intents")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PaymentCheckoutRes>> createDepositIntent(
            @PathVariable Long bookingId,
            @Valid @RequestBody CreateDepositIntentReq req,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            HttpServletRequest httpRequest) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        String clientIp = httpRequest.getRemoteAddr();
        PaymentCheckoutRes res = bookingDepositService.createOrResumeDepositIntent(
                bookingId, customerId, req, idempotencyKey, clientIp);
        return createdWithKey(res, "booking.deposit_intent_created");
    }

    @GetMapping("/{bookingId}/deposit")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BookingDepositStatusRes>> getDepositStatus(
            @PathVariable Long bookingId) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        BookingDepositStatusRes res = bookingDepositService.getDepositStatus(bookingId, customerId);
        return ok(res, "booking.deposit_status_ok");
    }

    @PostMapping("/{bookingId}/deposit/sync-payment")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BookingDepositStatusRes>> syncDepositPayment(
            @PathVariable Long bookingId) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        BookingDepositStatusRes res = bookingDepositService.syncDepositPayment(bookingId, customerId);
        return ok(res, "booking.deposit_synced");
    }


    @PostMapping("/{bookingId}/final-payment-intents")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PaymentCheckoutRes>> createFinalPaymentIntent(
            @PathVariable Long bookingId,
            @Valid @RequestBody CreateDepositIntentReq req,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            HttpServletRequest httpRequest) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        String clientIp = httpRequest.getRemoteAddr();
        PaymentCheckoutRes res = bookingDepositService.createFinalPaymentIntent(
                bookingId, customerId, req, idempotencyKey, clientIp);
        return createdWithKey(res, "booking.final_payment_intent_created");
    }
}
