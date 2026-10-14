 package com.makeup.platform.controller.mua;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.interaction.MuaRatingSummaryRes;
import com.makeup.platform.dto.response.interaction.ReviewDetailRes;
import com.makeup.platform.service.interaction.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/reviews")
@RequiredArgsConstructor
public class MuaReviewQueryController extends BaseController {

    private final ReviewService reviewService;

    @GetMapping("/mua/{muaId}")
    public ResponseEntity<ApiResponse<Page<ReviewDetailRes>>> getReviewsForMua(
            @PathVariable Long muaId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Boolean hasImages,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<ReviewDetailRes> res = reviewService.getReviewsForMua(muaId, rating, hasImages, page, size);
        return ok(res, "review.list_success");
    }

    @GetMapping("/mua/{muaId}/summary")
    public ResponseEntity<ApiResponse<MuaRatingSummaryRes>> getMuaRatingSummary(
            @PathVariable Long muaId
    ) {
        MuaRatingSummaryRes res = reviewService.getMuaRatingSummary(muaId);
        return ok(res, "review.summary_success");
    }

    @GetMapping("/agency/{agencyId}")
    public ResponseEntity<ApiResponse<Page<ReviewDetailRes>>> getReviewsForAgency(
            @PathVariable Long agencyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<ReviewDetailRes> res = reviewService.getReviewsForAgency(agencyId, page, size);
        return ok(res, "review.list_success");
    }
}
