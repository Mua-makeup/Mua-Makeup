package com.makeup.platform.controller.freelancer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.wallet.CashPaymentConfirmationReq;
import com.makeup.platform.dto.response.wallet.CashReceiptStatusRes;
import com.makeup.platform.dto.response.wallet.FreelancerWalletRes;
import com.makeup.platform.service.wallet.CashPaymentService;
import com.makeup.platform.service.wallet.FreelancerWalletService;
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
@RequestMapping("/api/v1/freelancer")
@RequiredArgsConstructor
public class FreelancerWalletController extends BaseController {

    private final CashPaymentService cashPaymentService;
    private final FreelancerWalletService freelancerWalletService;

    /**
     * GET /api/v1/freelancer/wallet
     * Thông tin ví thợ tự do: số dư khả dụng + tổng cọc đang giữ.
     */
    @GetMapping("/wallet")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<FreelancerWalletRes>> getWallet() {
        Long muaUserId = SecurityContextUtils.getCurrentUserId();
        FreelancerWalletRes res = freelancerWalletService.getWalletInfo(muaUserId);
        return ok(res, "wallet.info_ok");
    }

    /**
     * POST /api/v1/freelancer/bookings/{bookingId}/cash-confirmation
     * Thợ xác nhận đã nhận tiền mặt từ khách.
     */
    @PostMapping("/bookings/{bookingId}/cash-confirmation")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<CashReceiptStatusRes>> confirmCash(
            @PathVariable Long bookingId,
            @Valid @RequestBody CashPaymentConfirmationReq req) {
        Long muaUserId = SecurityContextUtils.getCurrentUserId();
        CashReceiptStatusRes res = cashPaymentService.confirmByFreelancer(bookingId, muaUserId, req);
        return ok(res, "cash_receipt.freelancer_confirmed");
    }

    /**
     * GET /api/v1/freelancer/bookings/{bookingId}/cash-receipt-status
     * Trạng thái xác nhận tiền mặt của booking.
     */
    @GetMapping("/bookings/{bookingId}/cash-receipt-status")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<CashReceiptStatusRes>> getCashReceiptStatus(
            @PathVariable Long bookingId) {
        Long muaUserId = SecurityContextUtils.getCurrentUserId();
        CashReceiptStatusRes res = cashPaymentService.getStatus(bookingId, muaUserId);
        return ok(res, "cash_receipt.status_ok");
    }
}
