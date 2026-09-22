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

import com.makeup.platform.common.base.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;

import com.makeup.platform.dto.request.admin.AdminCreateAgencyReq;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/admin/agencies")
@RequiredArgsConstructor
public class AdminAgencyController extends BaseController {

    private final AgencyProfileService agencyProfileService;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyProfileRes>> createAgency(
            @Valid @RequestBody AdminCreateAgencyReq req
    ) {
        AgencyProfileRes created = agencyProfileService.createAgencyByAdmin(req);
        return created(created, "admin.agency_create_success");
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<AgencyProfileRes>>> getAllAgencies(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "isVerified", required = false) Boolean isVerified,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<AgencyProfileRes> list = agencyProfileService.getAllAgenciesForAdmin(search, isVerified, pageable);
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
