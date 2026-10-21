package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.agency.AgencyReplyReviewReq;
import com.makeup.platform.dto.response.agency.AgencyReviewItemRes;
import com.makeup.platform.dto.response.agency.AgencyReviewOverviewRes;
import com.makeup.platform.dto.response.agency.AgencyReviewRes;
import com.makeup.platform.dto.response.agency.AgencyReviewSummaryRes;
import com.makeup.platform.service.agency.AgencyReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
@RequestMapping("/api/v1/agency/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('AGENCY_ADMIN')")
public class AgencyReviewController extends BaseController {

    private final AgencyReviewService agencyReviewService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AgencyReviewRes>>> getAgencyReviews(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Long ownerUserId = userId != null ? userId : SecurityContextUtils.getCurrentUserId();
        PageResponse<AgencyReviewRes> res = agencyReviewService.getAgencyReviews(ownerUserId, rating, keyword, pageable);
        return ok(res, "agency.reviews_fetch_success");
    }

    @GetMapping("/filtered")
    public ResponseEntity<ApiResponse<PageResponse<AgencyReviewItemRes>>> getAgencyReviewsFiltered(
            @RequestParam(required = false) Long staffId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Boolean hasReply,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Long ownerUserId = SecurityContextUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AgencyReviewItemRes> res = agencyReviewService.getAgencyReviews(ownerUserId, staffId, rating, hasReply, pageable);
        return ok(PageResponse.from(res), "review.fetch_success");
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AgencyReviewOverviewRes>> getAgencyReviewOverview(
            @AuthenticationPrincipal Long userId
    ) {
        Long ownerUserId = userId != null ? userId : SecurityContextUtils.getCurrentUserId();
        AgencyReviewOverviewRes res = agencyReviewService.getAgencyReviewOverview(ownerUserId);
        return ok(res, "agency.review_overview_success");
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<AgencyReviewSummaryRes>> getAgencyReviewSummary() {
        Long ownerUserId = SecurityContextUtils.getCurrentUserId();
        AgencyReviewSummaryRes res = agencyReviewService.getAgencyReviewSummary(ownerUserId);
        return ok(res, "review.summary_success");
    }

    @PostMapping("/{reviewId}/reply")
    public ResponseEntity<ApiResponse<AgencyReviewItemRes>> replyToReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody AgencyReplyReviewReq req
    ) {
        Long ownerUserId = SecurityContextUtils.getCurrentUserId();
        AgencyReviewItemRes res = agencyReviewService.replyToReview(ownerUserId, reviewId, req);
        return ok(res, "review.reply_success");
    }
}
