package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.agency.AgencyReplyReviewReq;
import com.makeup.platform.dto.response.agency.AgencyReviewItemRes;
import com.makeup.platform.dto.response.agency.AgencyReviewSummaryRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.interaction.ReviewEntity;
import com.makeup.platform.mapper.agency.AgencyReviewMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.interaction.ReviewRepository;
import com.makeup.platform.service.agency.AgencyReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyReviewServiceImpl implements AgencyReviewService {

    private final ReviewRepository reviewRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyReviewMapper agencyReviewMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<AgencyReviewItemRes> getAgencyReviews(Long ownerUserId, Long staffId, Integer rating, Boolean hasReply, Pageable pageable) {
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);
        Page<ReviewEntity> reviewPage = reviewRepository.findAgencyReviewsWithFilters(
                agency.getId(),
                staffId,
                rating,
                hasReply,
                pageable
        );
        return reviewPage.map(agencyReviewMapper::toItemRes);
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyReviewSummaryRes getAgencyReviewSummary(Long ownerUserId) {
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);
        Long agencyId = agency.getId();

        Double avgRatingDouble = reviewRepository.getAgencyAverageRating(agencyId);
        BigDecimal avgRating = avgRatingDouble != null
                ? BigDecimal.valueOf(avgRatingDouble).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(5.00);

        long pendingCount = reviewRepository.countPendingReplyByAgencyId(agencyId);

        List<Object[]> ratingCounts = reviewRepository.countRatingsGroupedByAgencyId(agencyId);
        Map<Integer, Integer> countMap = new HashMap<>();
        int totalReviews = 0;

        for (Object[] row : ratingCounts) {
            Integer star = ((Number) row[0]).intValue();
            int count = ((Number) row[1]).intValue();
            countMap.put(star, count);
            totalReviews += count;
        }

        int fiveStar = countMap.getOrDefault(5, 0);
        int fourStar = countMap.getOrDefault(4, 0);
        int threeStar = countMap.getOrDefault(3, 0);
        int twoStar = countMap.getOrDefault(2, 0);
        int oneStar = countMap.getOrDefault(1, 0);

        double satisfactionRate = totalReviews > 0
                ? Math.round(((double) (fiveStar + fourStar) / totalReviews) * 1000.0) / 10.0
                : 100.0;

        return AgencyReviewSummaryRes.builder()
                .averageRating(avgRating)
                .totalReviews(totalReviews)
                .fiveStarCount(fiveStar)
                .fourStarCount(fourStar)
                .threeStarCount(threeStar)
                .twoStarCount(twoStar)
                .oneStarCount(oneStar)
                .pendingReplyCount((int) pendingCount)
                .satisfactionRate(satisfactionRate)
                .build();
    }

    @Override
    @Transactional
    public AgencyReviewItemRes replyToReview(Long ownerUserId, Long reviewId, AgencyReplyReviewReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);

        ReviewEntity review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_REVIEW_NOT_FOUND, "review.not_found"));

        if (review.getAgency() == null || !agency.getId().equals(review.getAgency().getId())) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN, "review.agency_unauthorized");
        }

        review.setAgencyReply(req.getReplyContent().trim());
        review.setAgencyRepliedAt(OffsetDateTime.now());

        ReviewEntity saved = reviewRepository.save(review);
        log.info("Agency [{}] replied to review [{}] for booking [{}]", agency.getId(), reviewId, review.getBooking().getId());

        return agencyReviewMapper.toItemRes(saved);
    }

    private AgencyProfileEntity getAgencyByOwnerUserId(Long ownerUserId) {
        return agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND, "agency.not_found"));
    }
}
