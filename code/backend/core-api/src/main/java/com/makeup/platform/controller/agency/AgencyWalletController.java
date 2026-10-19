package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.response.wallet.AgencyWalletRes;
import com.makeup.platform.service.agency.AgencyWalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agency/wallet")
@RequiredArgsConstructor
public class AgencyWalletController extends BaseController {

    private final AgencyWalletService agencyWalletService;

    @GetMapping
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyWalletRes>> getAgencyWallet() {
        Long agencyOwnerUserId = SecurityContextUtils.getCurrentUserId();
        AgencyWalletRes res = agencyWalletService.getAgencyWalletInfo(agencyOwnerUserId);
        return ok(res, "wallet.info_ok");
    }
}
