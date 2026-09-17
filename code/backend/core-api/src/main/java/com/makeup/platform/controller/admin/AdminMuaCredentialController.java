package com.makeup.platform.controller.admin;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.admin.VerifyCertificateReq;
import com.makeup.platform.dto.response.admin.AdminMuaCertificateRes;
import com.makeup.platform.dto.response.mua.CertificateRes;
import com.makeup.platform.service.mua.MuaProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/muas")
@RequiredArgsConstructor
public class AdminMuaCredentialController extends BaseController {

    private final MuaProfileService muaProfileService;

    @GetMapping("/certificates")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<AdminMuaCertificateRes>>> getAllCertificates(
            @RequestParam(value = "status", required = false) String status) {
        List<AdminMuaCertificateRes> res = muaProfileService.getAllCertificatesForAdmin(status);
        return ok(res);
    }

    @PutMapping("/{muaId}/certificates/verify")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CertificateRes>> verifyCertificate(
            @PathVariable Long muaId,
            @Valid @RequestBody VerifyCertificateReq req) {
        CertificateRes res = muaProfileService.verifyCertificate(muaId, req);
        return ok(res, "mua.cert_verify_success");
    }
}
