package com.makeup.platform.controller.mua;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.mua.UpdateMuaProfileReq;
import com.makeup.platform.dto.request.mua.UploadCertificateReq;
import com.makeup.platform.dto.response.mua.CertificateRes;
import com.makeup.platform.dto.response.mua.MuaProfileRes;
import com.makeup.platform.service.mua.MuaProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/muas")
@RequiredArgsConstructor
public class MuaProfileController extends BaseController {

    private final MuaProfileService muaProfileService;

    @GetMapping("/{muaId}/profile")
    public ResponseEntity<ApiResponse<MuaProfileRes>> getPublicProfile(@PathVariable Long muaId) {
        MuaProfileRes res = muaProfileService.getPublicProfile(muaId);
        return ok(res, "Lấy thông tin hồ sơ thợ thành công");
    }

    @GetMapping("/my-profile")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<MuaProfileRes>> getMyProfile(@AuthenticationPrincipal Long userId) {
        MuaProfileRes res = muaProfileService.getMyProfile(userId);
        return ok(res, "Lấy thông tin hồ sơ của bạn thành công");
    }

    @PutMapping("/my-profile")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<MuaProfileRes>> updateMyProfile(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateMuaProfileReq req) {
        MuaProfileRes res = muaProfileService.updateMyProfile(userId, req);
        return ok(res, "Cập nhật hồ sơ thợ thành công!");
    }

    @PostMapping(value = "/my-profile/certificates", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<CertificateRes>> uploadCertificate(
            @AuthenticationPrincipal Long userId,
            @RequestParam("cert_name") String certName,
            @RequestParam("file") MultipartFile file) {
        UploadCertificateReq req = UploadCertificateReq.builder()
                .certName(certName)
                .file(file)
                .build();
        CertificateRes res = muaProfileService.uploadCertificate(userId, req);
        return created(res, "Tải lên chứng chỉ bằng cấp thành công (chờ Admin duyệt)");
    }
}
