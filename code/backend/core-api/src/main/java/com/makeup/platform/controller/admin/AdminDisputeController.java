package com.makeup.platform.controller.admin;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import com.makeup.platform.dto.response.admin.AdminDisputeRes;
import com.makeup.platform.dto.response.admin.AdminDisputeStatsRes;
import com.makeup.platform.service.booking.AdminDisputeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/disputes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminDisputeController extends BaseController {

    private final AdminDisputeService adminDisputeService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminDisputeRes>>> getAllDisputes(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PageResponse<AdminDisputeRes> disputes = adminDisputeService.getAllDisputes(status, keyword, pageable);
        return ok(disputes, "admin.disputes_fetch_success");
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminDisputeStatsRes>> getDisputeStats() {
        AdminDisputeStatsRes stats = adminDisputeService.getDisputeStats();
        return ok(stats, "admin.dispute_stats_fetch_success");
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<AdminDisputeRes>> getDisputeDetail(@PathVariable Long bookingId) {
        AdminDisputeRes detail = adminDisputeService.getDisputeDetail(bookingId);
        return ok(detail, "admin.dispute_detail_fetch_success");
    }

    @PostMapping("/{bookingId}/resolve")
    public ResponseEntity<ApiResponse<AdminDisputeRes>> resolveDispute(
            @PathVariable Long bookingId,
            @Valid @RequestBody ResolveDisputeReq req
    ) {
        Long adminUserId = SecurityContextUtils.getCurrentUserId();
        AdminDisputeRes result = adminDisputeService.resolveDispute(bookingId, adminUserId, req);
        return ok(result, "admin.dispute_resolved_success");
    }
}
