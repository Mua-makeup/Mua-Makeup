package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.wallet.CashPaymentConfirmationReq;
import com.makeup.platform.dto.response.wallet.CashReceiptStatusRes;
import com.makeup.platform.service.wallet.CashPaymentService;
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

@RestController
@RequestMapping("/api/v1/customer/bookings")
@RequiredArgsConstructor
public class CustomerCashPaymentController extends BaseController {

    private final CashPaymentService cashPaymentService;

    /**
     * POST /api/v1/customer/bookings/{bookingId}/cash-confirmation
     * Khách xác nhận đã trả tiền mặt phần còn lại cho thợ.
     */
    @PostMapping("/{bookingId}/cash-confirmation")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CashReceiptStatusRes>> confirmCash(
            @PathVariable Long bookingId,
            @Valid @RequestBody CashPaymentConfirmationReq req) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        CashReceiptStatusRes res = cashPaymentService.confirmByCustomer(bookingId, customerId, req);
        return ok(res, "cash_receipt.customer_confirmed");
    }

    /**
     * GET /api/v1/customer/bookings/{bookingId}/cash-receipt-status
     * Trạng thái xác nhận tiền mặt.
     */
    @GetMapping("/{bookingId}/cash-receipt-status")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CashReceiptStatusRes>> getCashReceiptStatus(
            @PathVariable Long bookingId) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        CashReceiptStatusRes res = cashPaymentService.getStatus(bookingId, customerId);
        return ok(res, "cash_receipt.status_ok");
    }
}
