package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.agency.ConfigureOvertimeRuleReq;
import com.makeup.platform.dto.request.agency.ReviewOvertimeReportReq;
import com.makeup.platform.dto.request.agency.SubmitOvertimeReportReq;
import com.makeup.platform.dto.response.agency.OvertimeReportRes;
import com.makeup.platform.dto.response.agency.OvertimeRuleRes;
import com.makeup.platform.service.agency.AgencyOvertimeService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/api/v1/agency")
@RequiredArgsConstructor
public class AgencyOvertimeController extends BaseController {

    private final AgencyOvertimeService agencyOvertimeService;

    @PostMapping("/overtime-rules")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<OvertimeRuleRes>> createOrUpdateRule(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ConfigureOvertimeRuleReq req) {
        OvertimeRuleRes res = agencyOvertimeService.createOrUpdateRule(userId, req);
        return created(res, "agency.overtime_rule_created_success");
    }

    @GetMapping("/overtime-rules")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<List<OvertimeRuleRes>>> getAgencyRules(
            @AuthenticationPrincipal Long userId) {
        List<OvertimeRuleRes> res = agencyOvertimeService.getAgencyRules(userId);
        return ok(res, "agency.overtime_rules_get_success");
    }

    @DeleteMapping("/overtime-rules/{ruleId}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRule(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long ruleId) {
        agencyOvertimeService.deleteRule(userId, ruleId);
        return ok(null, "agency.overtime_rule_deleted_success");
    }

    @PatchMapping("/overtime-rules/{ruleId}/status")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleRuleStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long ruleId,
            @RequestParam boolean isActive) {
        agencyOvertimeService.toggleRuleStatus(userId, ruleId, isActive);
        return ok(Map.of("id", ruleId, "isActive", isActive), isActive ? "agency.overtime_rule_activated" : "agency.overtime_rule_deactivated");
    }

    @PostMapping("/overtime-reports")
    @PreAuthorize("hasRole('FREELANCE_MUA') or hasRole('AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<OvertimeReportRes>> submitOvertimeReport(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody SubmitOvertimeReportReq req) {
        OvertimeReportRes res = agencyOvertimeService.submitOvertimeReport(userId, req);
        return created(res, "agency.overtime_report_submitted_success");
    }

    @PostMapping("/overtime-reports/{reportId}/review")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<ApiResponse<OvertimeReportRes>> reviewOvertimeReport(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long reportId,
            @Valid @RequestBody ReviewOvertimeReportReq req) {
        OvertimeReportRes res = agencyOvertimeService.reviewOvertimeReport(userId, reportId, req);
        return ok(res, "agency.overtime_report_reviewed_success");
    }

    @GetMapping("/overtime-reports")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF')")
    public ResponseEntity<ApiResponse<Page<OvertimeReportRes>>> getOvertimeReports(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<OvertimeReportRes> res = agencyOvertimeService.getOvertimeReports(userId, status, pageable);
        return ok(res, "agency.overtime_reports_get_success");
    }

    @GetMapping("/overtime-reports/{reportId}")
    @PreAuthorize("hasRole('AGENCY_ADMIN') or hasRole('AGENCY_STAFF') or hasRole('FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<OvertimeReportRes>> getOvertimeReportDetail(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long reportId) {
        OvertimeReportRes res = agencyOvertimeService.getOvertimeReportDetail(userId, reportId);
        return ok(res, "agency.overtime_reports_get_success");
    }
}
