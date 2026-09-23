package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.agency.ConfigureShiftReq;
import com.makeup.platform.dto.response.agency.ShiftDetailRes;
import com.makeup.platform.dto.response.agency.WeeklyShiftMatrixRes;
import com.makeup.platform.service.agency.AgencyShiftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/agencies")
@RequiredArgsConstructor
public class AgencyShiftController extends BaseController {

    private final AgencyShiftService agencyShiftService;

    @PostMapping("/shifts")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<ShiftDetailRes>> createShift(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ConfigureShiftReq req) {
        ShiftDetailRes res = agencyShiftService.createShift(userId, req);
        return created(res, "agency.shift_created_success");
    }

    @PutMapping("/shifts/{shiftId}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<ShiftDetailRes>> updateShift(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long shiftId,
            @Valid @RequestBody ConfigureShiftReq req) {
        ShiftDetailRes res = agencyShiftService.updateShift(userId, shiftId, req);
        return ok(res, "agency.shift_updated_success");
    }

    @GetMapping("/shifts/matrix")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<WeeklyShiftMatrixRes>> getWeeklyShiftMatrix(
            @AuthenticationPrincipal Long userId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @org.springframework.web.bind.annotation.RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        WeeklyShiftMatrixRes res = agencyShiftService.getWeeklyShiftMatrix(userId, startDate, endDate);
        return ok(res, "agency.shift_matrix_get_success");
    }

    @GetMapping("/shifts/staff/{staffId}")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<List<ShiftDetailRes>>> getStaffShifts(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId) {
        List<ShiftDetailRes> res = agencyShiftService.getStaffShifts(userId, staffId);
        return ok(res, "agency.shift_staff_get_success");
    }

    @DeleteMapping("/shifts/{shiftId}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteShift(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long shiftId) {
        agencyShiftService.deleteShift(userId, shiftId);
        return ok(null, "agency.shift_deleted_success");
    }
}
