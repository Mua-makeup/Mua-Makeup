package com.makeup.platform.dto.response.interaction;

import com.makeup.platform.entity.mua.BadgeTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MuaRatingSummaryRes {
    private Long muaId;
    private BigDecimal ratingAvg;
    private BigDecimal bayesianRating;
    private BigDecimal rollingRating;
    private Integer totalReviews;
    private Integer totalCompletedJobs;
    private BigDecimal acceptanceRate;
    private BigDecimal rankScore;
    private BadgeTier badgeTier;
    private Boolean isEmergencyLocked;
}
