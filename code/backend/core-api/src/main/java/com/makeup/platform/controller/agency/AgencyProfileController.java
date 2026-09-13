package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.service.agency.AgencyProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agency")
@RequiredArgsConstructor
public class AgencyProfileController extends BaseController {

    private final AgencyProfileService agencyProfileService;

    @GetMapping("/profile")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyProfileRes>> getMyAgencyProfile(
            @AuthenticationPrincipal Long userId) {
        AgencyProfileRes res = agencyProfileService.getMyAgencyProfile(userId);
        return ok(res, "agency.profile_get_success");
    }

    @GetMapping("/{agencyId}/profile")
    public ResponseEntity<ApiResponse<AgencyProfileRes>> getAgencyProfileById(
            @PathVariable Long agencyId) {
        AgencyProfileRes res = agencyProfileService.getAgencyProfileById(agencyId);
        return ok(res, "agency.profile_get_success");
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyProfileRes>> updateAgencyProfile(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateAgencyProfileReq req) {
        AgencyProfileRes res = agencyProfileService.updateAgencyProfile(userId, req);
        return ok(res, "agency.profile_update_success");
    }

    @PutMapping("/commission")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyProfileRes>> updateDefaultCommission(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateCommissionReq req) {
        AgencyProfileRes res = agencyProfileService.updateCommissionRate(userId, req);
        return ok(res, "agency.commission_update_success");
    }
}
