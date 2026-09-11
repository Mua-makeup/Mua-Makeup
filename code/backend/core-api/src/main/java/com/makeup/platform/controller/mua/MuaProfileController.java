package com.makeup.platform.controller.mua;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.mua.UpdateMuaProfileReq;
import com.makeup.platform.dto.request.mua.UploadCertificateReq;
import com.makeup.platform.dto.response.mua.CertificateRes;
import com.makeup.platform.dto.response.mua.MuaProfileRes;
import com.makeup.platform.service.mua.MuaProfileService;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
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
        return ok(res, "mua.profile_get_success");
    }

    @GetMapping("/my-profile")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<MuaProfileRes>> getMyProfile(@AuthenticationPrincipal Long userId) {
        MuaProfileRes res = muaProfileService.getMyProfile(userId);
        return ok(res, "mua.profile_get_success");
    }

    @PutMapping("/my-profile")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<MuaProfileRes>> updateMyProfile(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateMuaProfileReq req) {
        MuaProfileRes res = muaProfileService.updateMyProfile(userId, req);
        return ok(res, "mua.profile_update_success");
    }

    @PostMapping(value = "/my-profile/certificates", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<CertificateRes>> uploadCertificate(
            @AuthenticationPrincipal Long userId,
            @RequestParam(value = "cert_name", required = false) String certNameSnake,
            @RequestParam(value = "certName", required = false) String certNameCamel,
            @RequestParam("file") MultipartFile file) {

        String certName = StringUtils.hasText(certNameSnake) ? certNameSnake.trim()
                : (StringUtils.hasText(certNameCamel) ? certNameCamel.trim() : null);

        if (!StringUtils.hasText(certName)) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "mua.cert_name_required",
                    HttpStatus.BAD_REQUEST);
        }

        UploadCertificateReq req = UploadCertificateReq.builder()
                .certName(certName)
                .file(file)
                .build();
        CertificateRes res = muaProfileService.uploadCertificate(userId, req);
        return created(res, "mua.cert_upload_success");
    }
}
