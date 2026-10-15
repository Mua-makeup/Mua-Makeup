package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.agency.CreateLeaveRequestReq;
import com.makeup.platform.dto.request.agency.ReviewLeaveRequestReq;
import com.makeup.platform.dto.response.agency.StaffLeaveRequestRes;
import com.makeup.platform.entity.agency.LeaveRequestStatus;
import com.makeup.platform.service.agency.AgencyLeaveRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/agencies")
@RequiredArgsConstructor
public class AgencyLeaveRequestController extends BaseController {

    private final AgencyLeaveRequestService leaveRequestService;

    @GetMapping("/leave-requests")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Page<StaffLeaveRequestRes>>> getAgencyLeaveRequests(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) LeaveRequestStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<StaffLeaveRequestRes> page = leaveRequestService.getAgencyLeaveRequests(userId, status, pageable);
        return ok(page, "agency.leave_requests_fetched");
    }

    @GetMapping("/leave-requests/pending-count")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getPendingCount(
            @AuthenticationPrincipal Long userId
    ) {
        long count = leaveRequestService.countPendingRequests(userId);
        return ok(Map.of("pendingCount", count), "agency.leave_pending_count_fetched");
    }

    @PutMapping("/leave-requests/{requestId}/review")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<StaffLeaveRequestRes>> reviewLeaveRequest(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long requestId,
            @Valid @RequestBody ReviewLeaveRequestReq req
    ) {
        StaffLeaveRequestRes res = leaveRequestService.reviewLeaveRequest(userId, requestId, req);
        String msgKey = req.getStatus() == LeaveRequestStatus.APPROVED
                ? "agency.leave_request_approved_success"
                : "agency.leave_request_rejected_success";
        return ok(res, msgKey);
    }

    @PostMapping("/staff/leave-requests")
    @PreAuthorize("hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<StaffLeaveRequestRes>> submitLeaveRequest(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CreateLeaveRequestReq req
    ) {
        StaffLeaveRequestRes res = leaveRequestService.submitLeaveRequest(userId, req);
        return created(res, "agency.leave_request_submitted_success");
    }

    @GetMapping("/staff/leave-requests")
    @PreAuthorize("hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<List<StaffLeaveRequestRes>>> getMyLeaveRequests(
            @AuthenticationPrincipal Long userId
    ) {
        List<StaffLeaveRequestRes> list = leaveRequestService.getMyLeaveRequests(userId);
        return ok(list, "agency.my_leave_requests_fetched");
    }

    @DeleteMapping("/staff/leave-requests/{requestId}")
    @PreAuthorize("hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<Void>> cancelMyLeaveRequest(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long requestId
    ) {
        leaveRequestService.cancelMyLeaveRequest(userId, requestId);
        return ok(null, "agency.leave_request_cancelled_success");
    }
}
