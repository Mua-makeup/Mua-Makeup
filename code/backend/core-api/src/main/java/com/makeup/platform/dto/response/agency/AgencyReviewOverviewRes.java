package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyReviewOverviewRes {

    private Double averageRating;
    private Long totalReviews;
    private Long count5Star;
    private Long count4Star;
    private Long count3Star;
    private Long count2Star;
    private Long count1Star;
}
