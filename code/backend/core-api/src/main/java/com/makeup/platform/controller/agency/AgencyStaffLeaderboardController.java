package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.agency.StaffLeaderboardRes;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.service.agency.AgencyStaffLeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agency/staff/leaderboard")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'AGENCY_STAFF')")
public class AgencyStaffLeaderboardController extends BaseController {

    private final AgencyStaffLeaderboardService agencyStaffLeaderboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<StaffLeaderboardRes>> getStaffLeaderboard(
            @RequestParam(defaultValue = "ALL_TIME") String period
    ) {
        Long currentUserId = SecurityContextUtils.getCurrentUserId();
        StaffLeaderboardRes res = agencyStaffLeaderboardService.getStaffLeaderboard(currentUserId, period);
        return ok(res, "agency.staff_leaderboard_success");
    }
}
