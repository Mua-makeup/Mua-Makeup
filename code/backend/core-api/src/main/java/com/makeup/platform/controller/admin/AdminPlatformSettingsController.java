package com.makeup.platform.controller.admin;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.admin.UpdatePlatformFeeReq;
import com.makeup.platform.dto.response.admin.PlatformFeeRes;
import com.makeup.platform.service.admin.AdminPlatformSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminPlatformSettingsController extends BaseController {

    private final AdminPlatformSettingsService adminPlatformSettingsService;

    @GetMapping("/platform-fee")
    public ResponseEntity<ApiResponse<PlatformFeeRes>> getPlatformFee() {
        return ok(adminPlatformSettingsService.getPlatformFee(), "admin.platform_fee_get_success");
    }

    @PutMapping("/platform-fee")
    public ResponseEntity<ApiResponse<PlatformFeeRes>> updatePlatformFee(
            @Valid @RequestBody UpdatePlatformFeeReq req) {
        return ok(adminPlatformSettingsService.updatePlatformFee(req), "admin.platform_fee_updated");
    }
}

