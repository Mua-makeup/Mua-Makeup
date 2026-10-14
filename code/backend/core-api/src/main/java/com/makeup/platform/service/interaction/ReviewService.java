package com.makeup.platform.service.interaction;

import com.makeup.platform.dto.request.interaction.CreateReviewReq;
import com.makeup.platform.dto.response.interaction.MuaRatingSummaryRes;
import com.makeup.platform.dto.response.interaction.ReviewDetailRes;
import org.springframework.data.domain.Page;

public interface ReviewService {

    ReviewDetailRes submitReview(Long customerUserId, CreateReviewReq req, String clientIp);

    ReviewDetailRes getReviewByBookingId(Long bookingId);

    Page<ReviewDetailRes> getReviewsForMua(Long muaId, int page, int size);

    MuaRatingSummaryRes getMuaRatingSummary(Long muaId);
}
