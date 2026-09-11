package com.makeup.platform.controller.mua;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.mua.AssignMuaStylesReq;
import com.makeup.platform.dto.response.mua.AssignMuaStylesRes;
import com.makeup.platform.dto.response.mua.MuaStyleRes;
import com.makeup.platform.service.mua.MuaStyleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/muas/my-profile/styles")
@RequiredArgsConstructor
public class MuaStyleController extends BaseController {

    private final MuaStyleService muaStyleService;

    @PutMapping
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<AssignMuaStylesRes>> assignStyles(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody AssignMuaStylesReq req) {
        AssignMuaStylesRes res = muaStyleService.assignStyles(userId, req);
        return ok(res, "mua.styles_assign_success");
    }

    @GetMapping
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<List<MuaStyleRes>>> getMyStyles(
            @AuthenticationPrincipal Long userId) {
        List<MuaStyleRes> res = muaStyleService.getMyStyles(userId);
        return ok(res, "mua.styles_assign_success");
    }
}
