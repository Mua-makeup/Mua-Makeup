package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.agency.AssignStaffPackagesReq;
import com.makeup.platform.dto.response.agency.StaffPackagesRes;
import com.makeup.platform.service.agency.AgencyStaffPackageService;
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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AgencyStaffPackageController extends BaseController {

    private final AgencyStaffPackageService agencyStaffPackageService;

    @PutMapping({"/agencies/staff/{staffId}/packages", "/packages/staff-assignments"})
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<StaffPackagesRes>> assignPackagesToStaff(
            @AuthenticationPrincipal Long userId,
            @PathVariable(required = false) Long staffId,
            @Valid @RequestBody AssignStaffPackagesReq req) {
        if (staffId != null) {
            req.setStaffId(staffId);
        }
        StaffPackagesRes res = agencyStaffPackageService.assignPackagesToStaff(userId, req);
        return ok(res, "agency.staff_packages_assign_success");
    }

    @GetMapping("/agencies/staff/{staffId}/packages")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<StaffPackagesRes>> getStaffPackages(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId) {
        StaffPackagesRes res = agencyStaffPackageService.getStaffPackages(userId, staffId);
        return ok(res, "agency.staff_packages_get_success");
    }
}
