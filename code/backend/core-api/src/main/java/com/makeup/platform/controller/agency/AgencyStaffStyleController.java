package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.agency.AssignStaffStylesReq;
import com.makeup.platform.dto.response.agency.AssignedStyleRes;
import com.makeup.platform.dto.response.agency.StaffStylesRes;
import com.makeup.platform.service.agency.AgencyStaffStyleService;
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

import java.util.List;

@RestController
@RequestMapping({"/api/v1/agencies", "/api/v1/agency"})
@RequiredArgsConstructor
public class AgencyStaffStyleController extends BaseController {

    private final AgencyStaffStyleService agencyStaffStyleService;

    @PutMapping("/staff/{staffId}/styles")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<StaffStylesRes>> assignStaffStyles(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId,
            @Valid @RequestBody AssignStaffStylesReq req) {
        StaffStylesRes res = agencyStaffStyleService.assignStylesToStaff(userId, staffId, req);
        return ok(res, "agency.staff_styles_assign_success");
    }

    @GetMapping("/staff/{staffId}/styles")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<List<AssignedStyleRes>>> getStaffStyles(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId) {
        List<AssignedStyleRes> res = agencyStaffStyleService.getStaffStyles(userId, staffId);
        return ok(res, "agency.staff_styles_get_success");
    }
}
