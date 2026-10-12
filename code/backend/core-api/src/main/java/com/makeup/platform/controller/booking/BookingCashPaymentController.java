package com.makeup.platform.controller.booking;

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

/**
 * Endpoint xác nhận tiền mặt trong quy trình thi công đơn hàng (/api/v1/bookings/{bookingId}/*).
 * Cho phép cả Freelancer MUA và Agency Staff (chuyên viên thực hiện ca) xác nhận.
 */
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingCashPaymentController extends BaseController {

    private final CashPaymentService cashPaymentService;

    /**
     * POST /api/v1/bookings/{bookingId}/cash-confirmation
     * Thợ (Freelancer hoặc Nhân viên Studio) xác nhận đã thu 70% tiền mặt từ khách hàng.
     */
    @PostMapping("/{bookingId}/cash-confirmation")
    @PreAuthorize("hasAnyRole('FREELANCE_MUA', 'AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<CashReceiptStatusRes>> confirmCash(
            @PathVariable Long bookingId,
            @Valid @RequestBody CashPaymentConfirmationReq req) {
        Long workerUserId = SecurityContextUtils.getCurrentUserId();
        CashReceiptStatusRes res = cashPaymentService.confirmByWorker(bookingId, workerUserId, req);
        return ok(res, "cash_receipt.worker_confirmed");
    }

    /**
     * GET /api/v1/bookings/{bookingId}/cash-receipt-status
     * Kiểm tra trạng thái biên nhận tiền mặt của đơn hàng.
     */
    @GetMapping("/{bookingId}/cash-receipt-status")
    @PreAuthorize("hasAnyRole('FREELANCE_MUA', 'AGENCY_STAFF', 'CUSTOMER', 'AGENCY_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CashReceiptStatusRes>> getCashReceiptStatus(
            @PathVariable Long bookingId) {
        Long actorUserId = SecurityContextUtils.getCurrentUserId();
        CashReceiptStatusRes res = cashPaymentService.getStatus(bookingId, actorUserId);
        return ok(res, "cash_receipt.status_ok");
    }
}
