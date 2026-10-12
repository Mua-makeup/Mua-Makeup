package com.makeup.platform.controller.freelancer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.response.wallet.FreelancerWalletRes;
import com.makeup.platform.service.wallet.FreelancerWalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/freelancer")
@RequiredArgsConstructor
public class FreelancerWalletController extends BaseController {

    private final FreelancerWalletService freelancerWalletService;

    /**
     * GET /api/v1/freelancer/wallet
     * Thông tin ví chuyên viên (Thợ tự do hoặc Nhân viên Studio): số dư khả dụng + tổng cọc đang giữ.
     */
    @GetMapping("/wallet")
    @PreAuthorize("hasAnyRole('FREELANCE_MUA', 'AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<FreelancerWalletRes>> getWallet() {
        Long muaUserId = SecurityContextUtils.getCurrentUserId();
        FreelancerWalletRes res = freelancerWalletService.getWalletInfo(muaUserId);
        return ok(res, "wallet.info_ok");
    }
}
