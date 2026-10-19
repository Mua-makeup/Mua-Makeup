package com.makeup.platform.service.agency;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.response.agency.AgencyReviewOverviewRes;
import com.makeup.platform.dto.response.agency.AgencyReviewRes;
import org.springframework.data.domain.Pageable;

public interface AgencyReviewService {

    PageResponse<AgencyReviewRes> getAgencyReviews(Long ownerUserId, Integer rating, String keyword, Pageable pageable);

    AgencyReviewOverviewRes getAgencyReviewOverview(Long ownerUserId);
}
