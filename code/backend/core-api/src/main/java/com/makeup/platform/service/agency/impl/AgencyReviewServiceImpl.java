package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.agency.AgencyReplyReviewReq;
import com.makeup.platform.dto.response.agency.AgencyReviewItemRes;
import com.makeup.platform.dto.response.agency.AgencyReviewOverviewRes;
import com.makeup.platform.dto.response.agency.AgencyReviewRes;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
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

    private final AgencyProfileRepository agencyProfileRepository;
    private final ReviewRepository reviewRepository;
    private final AgencyReviewMapper agencyReviewMapper;

    // --- Remote Implementation ---
    @Override
    @Transactional(readOnly = true)
    public PageResponse<AgencyReviewRes> getAgencyReviews(
            Long ownerUserId, Integer rating, String keyword, Pageable pageable) {
        AgencyProfileEntity agency = findAgencyByOwner(ownerUserId);

        String cleanKeyword = (keyword != null && !keyword.trim().isEmpty())
                ? keyword.trim()
                : null;

        int pageNumber = pageable != null ? pageable.getPageNumber() : 0;
        int pageSize = pageable != null && pageable.getPageSize() > 0 ? pageable.getPageSize() : 10;
        Pageable queryPage = PageRequest.of(pageNumber, pageSize);

        Page<ReviewEntity> page;
        if (cleanKeyword != null) {
            String pattern = "%" + cleanKeyword.toLowerCase() + "%";
            page = reviewRepository.findAgencyReviewsWithKeyword(agency.getId(), rating, pattern, queryPage);
        } else {
            page = reviewRepository.findAgencyReviews(agency.getId(), rating, queryPage);
        }

        Page<AgencyReviewRes> dtoPage = page.map(agencyReviewMapper::toRes);
        return PageResponse.from(dtoPage);
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyReviewOverviewRes getAgencyReviewOverview(Long ownerUserId) {
        AgencyProfileEntity agency = findAgencyByOwner(ownerUserId);

        Double avgRating = reviewRepository.getAgencyAverageRating(agency.getId());
        List<Object[]> counts = reviewRepository.getAgencyRatingCounts(agency.getId());

        long c5 = 0;
        long c4 = 0;
        long c3 = 0;
        long c2 = 0;
        long c1 = 0;

        if (counts != null) {
            for (Object[] row : counts) {
                if (row.length >= 2 && row[0] != null && row[1] != null) {
                    int r = ((Number) row[0]).intValue();
                    long cnt = ((Number) row[1]).longValue();
                    switch (r) {
                        case 5 -> c5 += cnt;
                        case 4 -> c4 += cnt;
                        case 3 -> c3 += cnt;
                        case 2 -> c2 += cnt;
                        case 1 -> c1 += cnt;
                        default -> {}
                    }
                }
            }
        }

        long total = c5 + c4 + c3 + c2 + c1;
        double finalAvg = 5.0;
        if (avgRating != null && avgRating > 0) {
            finalAvg = BigDecimal.valueOf(avgRating).setScale(1, RoundingMode.HALF_UP).doubleValue();
        } else if (total > 0) {
            double sum = (5.0 * c5) + (4.0 * c4) + (3.0 * c3) + (2.0 * c2) + (1.0 * c1);
            finalAvg = BigDecimal.valueOf(sum / total).setScale(1, RoundingMode.HALF_UP).doubleValue();
        }

        return AgencyReviewOverviewRes.builder()
                .averageRating(finalAvg)
                .totalReviews(total)
                .count5Star(c5)
                .count4Star(c4)
                .count3Star(c3)
                .count2Star(c2)
                .count1Star(c1)
                .build();
    }

    // --- Local Implementation ---
    @Override
    @Transactional(readOnly = true)
    public Page<AgencyReviewItemRes> getAgencyReviews(Long ownerUserId, Long staffId, Integer rating, Boolean hasReply, Pageable pageable) {
        AgencyProfileEntity agency = findAgencyByOwner(ownerUserId);
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
        AgencyProfileEntity agency = findAgencyByOwner(ownerUserId);
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
        AgencyProfileEntity agency = findAgencyByOwner(ownerUserId);

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

    private AgencyProfileEntity findAgencyByOwner(Long ownerUserId) {
        return agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "agency.not_found",
                        HttpStatus.NOT_FOUND
                ));
    }
}
