package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.agency.AcceptInvitationReq;
import com.makeup.platform.dto.request.agency.CreateInvitationReq;
import com.makeup.platform.dto.request.agency.ReviewStaffApplicationReq;
import com.makeup.platform.dto.request.agency.UpdateStaffCommissionReq;
import com.makeup.platform.dto.request.agency.UpdateStaffStatusReq;
import com.makeup.platform.dto.response.agency.AgencyInvitationRes;
import com.makeup.platform.dto.response.agency.AgencyStaffDetailRes;
import com.makeup.platform.dto.response.agency.AgencyStaffRes;
import com.makeup.platform.dto.response.agency.PublicAgencyInvitationRes;
import com.makeup.platform.service.agency.AgencyStaffService;
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

@RestController
@RequestMapping("/api/v1/agencies")
@RequiredArgsConstructor
public class AgencyStaffController extends BaseController {

    private final AgencyStaffService agencyStaffService;

    // --- MÃ MỜI STUDIO QUA REDIS (ISSUE-12.1, ISSUE-12.2) ---

    @PostMapping("/invitations")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyInvitationRes>> createInvitation(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CreateInvitationReq req) {
        AgencyInvitationRes res = agencyStaffService.createInvitation(userId, req);
        return created(res, "agency.invitation_create_success");
    }

    @GetMapping("/invitations")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<List<AgencyInvitationRes>>> getInvitations(
            @AuthenticationPrincipal Long userId) {
        List<AgencyInvitationRes> res = agencyStaffService.getInvitations(userId);
        return ok(res, "agency.invitation_list_success");
    }

    @DeleteMapping("/invitations/{inviteCode}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> cancelInvitation(
            @AuthenticationPrincipal Long userId,
            @PathVariable String inviteCode) {
        agencyStaffService.cancelInvitation(userId, inviteCode);
        return ok(null, "agency.invitation_cancel_success");
    }

    @GetMapping("/invitations/{inviteCode}/public")
    public ResponseEntity<ApiResponse<PublicAgencyInvitationRes>> getPublicInvitationInfo(
            @PathVariable String inviteCode) {
        PublicAgencyInvitationRes res = agencyStaffService.getPublicInvitationInfo(inviteCode);
        return ok(res, "agency.invitation_get_success");
    }

    @PostMapping("/invitations/accept")
    @PreAuthorize("hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<AgencyStaffRes>> acceptInvitation(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody AcceptInvitationReq req) {
        AgencyStaffRes res = agencyStaffService.acceptInvitation(userId, req);
        return ok(res, "agency.invitation_accept_success");
    }

    // --- QUẢN LÝ NHÂN VIÊN STUDIO & PHÊ DUYỆT ĐƠN (ISSUE-12.2) ---

    @GetMapping("/staff")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<PageResponse<AgencyStaffRes>>> getStaffList(
            @AuthenticationPrincipal Long userId,
            @RequestParam(value = "status", required = false) String status,
            @PageableDefault(size = 20, sort = "joinedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AgencyStaffRes> res = agencyStaffService.getStaffList(userId, status, pageable);
        return ok(PageResponse.from(res), "agency.staff_list_success"); // <-- BỌC PageResponse.from(res)
    }

    @GetMapping("/staff/me")
    @PreAuthorize("hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<AgencyStaffDetailRes>> getMyStaffProfile(
            @AuthenticationPrincipal Long userId) {
        AgencyStaffDetailRes res = agencyStaffService.getMyStaffProfile(userId);
        return ok(res, "agency.staff_detail_success");
    }

    @GetMapping("/staff/{staffId}")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<AgencyStaffDetailRes>> getStaffDetail(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId) {
        AgencyStaffDetailRes res = agencyStaffService.getStaffDetail(userId, staffId);
        return ok(res, "agency.staff_detail_success");
    }

    @PutMapping("/staff/{staffId}/review")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyStaffRes>> reviewStaffApplication(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId,
            @Valid @RequestBody ReviewStaffApplicationReq req) {
        AgencyStaffRes res = agencyStaffService.reviewStaffApplication(userId, staffId, req);
        String msgKey = "APPROVE".equalsIgnoreCase(req.getDecision())
                ? "agency.staff_review_approved"
                : "agency.staff_review_rejected";
        return ok(res, msgKey);
    }

    @PutMapping("/staff/{staffId}/status")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyStaffRes>> updateStaffStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId,
            @Valid @RequestBody UpdateStaffStatusReq req) {
        AgencyStaffRes res = agencyStaffService.updateStaffStatus(userId, staffId, req);
        return ok(res, "agency.staff_status_update_success");
    }

    // --- CẤU HÌNH % HOA HỒNG NỘI BỘ (ISSUE-12.3) ---

    @PutMapping("/staff/{staffId}/commission")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<AgencyStaffRes>> updateStaffCommission(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId,
            @Valid @RequestBody UpdateStaffCommissionReq req) {
        AgencyStaffRes res = agencyStaffService.updateStaffCommission(userId, staffId, req);
        return ok(res, "agency.staff_commission_update_success");
    }

    @DeleteMapping("/staff/{staffId}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeStaff(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long staffId) {
        agencyStaffService.removeStaff(userId, staffId);
        return ok(null, "agency.staff_remove_success");
    }
}
