package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.response.wallet.CustomerWalletRes;
import com.makeup.platform.service.wallet.CustomerWalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer/wallet")
@RequiredArgsConstructor
public class CustomerWalletController extends BaseController {

    private final CustomerWalletService customerWalletService;

    
    @GetMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CustomerWalletRes>> getWallet(
            @AuthenticationPrincipal Long principalUserId) {
        Long userId = principalUserId != null ? principalUserId : SecurityContextUtils.getCurrentUserId();
        CustomerWalletRes res = customerWalletService.getWalletInfo(userId);
        return ok(res, "wallet.customer_wallet_ok");
    }
}
