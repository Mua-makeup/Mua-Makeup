package com.makeup.platform.service.interaction;

import com.makeup.platform.dto.request.interaction.CreateReviewReq;
import com.makeup.platform.dto.request.interaction.UpdateReviewReq;
import com.makeup.platform.dto.response.interaction.MuaRatingSummaryRes;
import com.makeup.platform.dto.response.interaction.ReviewDetailRes;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ReviewService {

    ReviewDetailRes submitReview(Long customerUserId, CreateReviewReq req, String clientIp);

    ReviewDetailRes updateReview(Long customerUserId, Long reviewId, UpdateReviewReq req);

    List<String> uploadReviewImages(Long customerUserId, List<MultipartFile> files);

    ReviewDetailRes getReviewByBookingId(Long bookingId);

    Page<ReviewDetailRes> getReviewsForMua(Long muaId, Integer rating, Boolean hasImages, Integer categoryId, int page, int size);

    MuaRatingSummaryRes getMuaRatingSummary(Long muaId);

    Page<ReviewDetailRes> getReviewsForAgency(Long agencyId, int page, int size);
}

