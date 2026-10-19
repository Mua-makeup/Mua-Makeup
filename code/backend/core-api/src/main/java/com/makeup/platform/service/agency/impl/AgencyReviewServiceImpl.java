package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.agency.AgencyReviewOverviewRes;
import com.makeup.platform.dto.response.agency.AgencyReviewRes;
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
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyReviewServiceImpl implements AgencyReviewService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final ReviewRepository reviewRepository;
    private final AgencyReviewMapper agencyReviewMapper;

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

    private AgencyProfileEntity findAgencyByOwner(Long ownerUserId) {
        return agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "agency.not_found",
                        HttpStatus.NOT_FOUND
                ));
    }
}
