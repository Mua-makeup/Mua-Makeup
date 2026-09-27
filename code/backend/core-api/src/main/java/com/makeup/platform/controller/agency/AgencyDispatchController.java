package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.agency.ApproveEmergencyReportReq;
import com.makeup.platform.dto.request.agency.AssignStaffToBookingReq;
import com.makeup.platform.dto.request.agency.ProceedSoloReq;
import com.makeup.platform.dto.request.agency.ReassignStaffReq;
import com.makeup.platform.dto.request.agency.RejectDispatchBookingReq;
import com.makeup.platform.dto.request.agency.ReportEmergencyBusyReq;
import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.dto.response.agency.DispatchAssignmentRes;
import com.makeup.platform.dto.response.agency.EmergencyApprovalRes;
import com.makeup.platform.dto.response.agency.EmergencyReassignmentRes;
import com.makeup.platform.dto.response.agency.StaffAvailabilityMatrixRes;
import com.makeup.platform.service.agency.AgencyDispatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/agency/dispatch")
@RequiredArgsConstructor
public class AgencyDispatchController extends BaseController {

    private final AgencyDispatchService agencyDispatchService;

    @GetMapping("/pending-bookings")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<List<AgencyBookingRes>>> getPendingDispatchBookings(
            @AuthenticationPrincipal Long userId
    ) {
        List<AgencyBookingRes> res = agencyDispatchService.getPendingDispatchBookings(userId);
        return ok(res, "dispatch.fetch_pending_success");
    }

    @GetMapping("/bookings/{bookingId}/staff-matrix")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<StaffAvailabilityMatrixRes>> getStaffMatrix(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId
    ) {
        StaffAvailabilityMatrixRes res = agencyDispatchService.getStaffMatrix(userId, bookingId);
        return ok(res, "dispatch.fetch_matrix_success");
    }

    @PostMapping("/bookings/{bookingId}/assign")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<DispatchAssignmentRes>> assignStaff(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId,
            @Valid @RequestBody AssignStaffToBookingReq req
    ) {
        DispatchAssignmentRes res = agencyDispatchService.assignStaff(userId, bookingId, req);
        return ok(res, "dispatch.assign_success");
    }

    @PostMapping("/bookings/{bookingId}/reassign")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<EmergencyReassignmentRes>> reassignStaff(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId,
            @Valid @RequestBody ReassignStaffReq req
    ) {
        EmergencyReassignmentRes res = agencyDispatchService.reassignStaff(userId, bookingId, req);
        return ok(res, "dispatch.reassign_success");
    }

    @PostMapping("/bookings/{bookingId}/reject")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectBooking(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId,
            @Valid @RequestBody RejectDispatchBookingReq req
    ) {
        agencyDispatchService.rejectBooking(userId, bookingId, req);
        return ok(null, "dispatch.reject_success");
    }

    @PostMapping("/bookings/{bookingId}/proceed-solo")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> proceedSolo(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId,
            @Valid @RequestBody(required = false) ProceedSoloReq req
    ) {
        agencyDispatchService.proceedSolo(userId, bookingId, req != null ? req : new ProceedSoloReq());
        return ok(null, "dispatch.proceed_solo_success");
    }

    @PostMapping("/bookings/{bookingId}/report-emergency-busy")
    @PreAuthorize("hasAnyRole('AGENCY_STAFF', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<Void>> reportEmergencyBusy(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId,
            @Valid @RequestBody ReportEmergencyBusyReq req
    ) {
        agencyDispatchService.reportEmergencyBusy(userId, bookingId, req);
        return ok(null, "dispatch.emergency_report_success");
    }

    @PostMapping("/bookings/{bookingId}/emergency-approval/{staffId}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<EmergencyApprovalRes>> reviewEmergencyReport(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId,
            @PathVariable Long staffId,
            @Valid @RequestBody ApproveEmergencyReportReq req
    ) {
        EmergencyApprovalRes res = agencyDispatchService.reviewEmergencyReport(userId, bookingId, staffId, req);
        return ok(res, "dispatch.emergency_review_success");
    }

    @PostMapping("/assignments/{assignmentId}/confirm")
    @PreAuthorize("hasRole('AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<Void>> confirmAssignment(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long assignmentId
    ) {
        agencyDispatchService.confirmAssignment(userId, assignmentId);
        return ok(null, "dispatch.assignment_confirm_success");
    }
}
