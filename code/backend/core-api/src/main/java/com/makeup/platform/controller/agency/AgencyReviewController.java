package com.makeup.platform.controller.agency;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.response.agency.AgencyReviewOverviewRes;
import com.makeup.platform.dto.response.agency.AgencyReviewRes;
import com.makeup.platform.service.agency.AgencyReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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
        PageResponse<AgencyReviewRes> res = agencyReviewService.getAgencyReviews(userId, rating, keyword, pageable);
        return ok(res, "agency.reviews_fetch_success");
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AgencyReviewOverviewRes>> getAgencyReviewOverview(
            @AuthenticationPrincipal Long userId
    ) {
        AgencyReviewOverviewRes res = agencyReviewService.getAgencyReviewOverview(userId);
        return ok(res, "agency.review_overview_success");
    }
}
