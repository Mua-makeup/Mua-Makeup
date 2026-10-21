package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.AgencyReplyReviewReq;
import com.makeup.platform.dto.response.agency.AgencyReviewItemRes;
import com.makeup.platform.dto.response.agency.AgencyReviewSummaryRes;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AgencyReviewService {

    Page<AgencyReviewItemRes> getAgencyReviews(Long ownerUserId, Long staffId, Integer rating, Boolean hasReply, Pageable pageable);

    AgencyReviewSummaryRes getAgencyReviewSummary(Long ownerUserId);

    AgencyReviewItemRes replyToReview(Long ownerUserId, Long reviewId, AgencyReplyReviewReq req);
}
