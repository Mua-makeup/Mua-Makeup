package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import com.makeup.platform.dto.response.agency.AgencyDisputeRes;
import com.makeup.platform.service.agency.AgencyDisputeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agency/disputes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('AGENCY_ADMIN')")
public class AgencyDisputeController extends BaseController {

    private final AgencyDisputeService agencyDisputeService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AgencyDisputeRes>>> getAgencyDisputes(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PageResponse<AgencyDisputeRes> disputes = agencyDisputeService.getAgencyDisputes(userId, status, keyword, pageable);
        return ok(disputes, "agency.disputes_fetch_success");
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<AgencyDisputeRes>> getAgencyDisputeDetail(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId
    ) {
        AgencyDisputeRes detail = agencyDisputeService.getAgencyDisputeDetail(userId, bookingId);
        return ok(detail, "agency.dispute_detail_fetch_success");
    }

    @PostMapping("/{bookingId}/resolve")
    public ResponseEntity<ApiResponse<AgencyDisputeRes>> resolveAgencyDispute(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookingId,
            @Valid @RequestBody ResolveDisputeReq req
    ) {
        AgencyDisputeRes result = agencyDisputeService.resolveAgencyDispute(userId, bookingId, req);
        return ok(result, "agency.dispute_resolved_success");
    }
}
