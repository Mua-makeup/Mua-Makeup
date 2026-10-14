package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.interaction.CreateReviewReq;
import com.makeup.platform.dto.response.interaction.ReviewDetailRes;
import com.makeup.platform.service.interaction.ReviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer/reviews")
@RequiredArgsConstructor
public class CustomerReviewController extends BaseController {

    private final ReviewService reviewService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ReviewDetailRes>> submitReview(
            @Valid @RequestBody CreateReviewReq req,
            HttpServletRequest request
    ) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        } else if (clientIp.contains(",")) {
            clientIp = clientIp.split(",")[0].trim();
        }
        ReviewDetailRes res = reviewService.submitReview(customerId, req, clientIp);
        return ok(res, "review.submit_success");
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ReviewDetailRes>> getReviewByBookingId(
            @PathVariable Long bookingId
    ) {
        ReviewDetailRes res = reviewService.getReviewByBookingId(bookingId);
        return ok(res, "review.get_success");
    }
}
