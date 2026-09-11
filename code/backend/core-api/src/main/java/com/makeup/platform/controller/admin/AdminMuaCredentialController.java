package com.makeup.platform.controller.admin;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.admin.VerifyCertificateReq;
import com.makeup.platform.dto.response.mua.CertificateRes;
import com.makeup.platform.service.mua.MuaProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/muas")
@RequiredArgsConstructor
public class AdminMuaCredentialController extends BaseController {

    private final MuaProfileService muaProfileService;

    @PutMapping("/{muaId}/certificates/verify")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CertificateRes>> verifyCertificate(
            @PathVariable Long muaId,
            @Valid @RequestBody VerifyCertificateReq req) {
        CertificateRes res = muaProfileService.verifyCertificate(muaId, req);
        return ok(res, "mua.cert_verify_success");
    }
}
