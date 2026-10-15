package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.interaction.CreateReviewReq;
import com.makeup.platform.dto.request.interaction.UpdateReviewReq;
import com.makeup.platform.dto.response.interaction.ReviewDetailRes;
import com.makeup.platform.service.interaction.ReviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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

    @PutMapping("/{reviewId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ReviewDetailRes>> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateReviewReq req
    ) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        ReviewDetailRes res = reviewService.updateReview(customerId, reviewId, req);
        return ok(res, "review.update_success");
    }

    @PostMapping(value = "/upload-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<String>>> uploadReviewImages(
            @RequestParam("files") List<MultipartFile> files
    ) {
        Long customerId = SecurityContextUtils.getCurrentUserId();
        List<String> urls = reviewService.uploadReviewImages(customerId, files);
        return ok(urls, "review.upload_images_success");
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReviewDetailRes>> getReviewByBookingId(
            @PathVariable Long bookingId
    ) {
        ReviewDetailRes res = reviewService.getReviewByBookingId(bookingId);
        return ok(res, "review.get_success");
    }
}

