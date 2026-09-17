package com.makeup.platform.controller.admin;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.service.agency.AgencyProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/agencies")
@RequiredArgsConstructor
public class AdminAgencyController extends BaseController {

    private final AgencyProfileService agencyProfileService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<AgencyProfileRes>>> getAllAgencies(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "isVerified", required = false) Boolean isVerified) {
        List<AgencyProfileRes> list = agencyProfileService.getAllAgenciesForAdmin(search, isVerified);
        return ok(list);
    }

    @PutMapping("/{agencyId}/verify")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyProfileRes>> verifyAgency(
            @PathVariable Long agencyId,
            @RequestParam("isVerified") boolean isVerified) {
        AgencyProfileRes res = agencyProfileService.verifyAgency(agencyId, isVerified);
        return ok(res, "admin.agency_verify_success");
    }
}
