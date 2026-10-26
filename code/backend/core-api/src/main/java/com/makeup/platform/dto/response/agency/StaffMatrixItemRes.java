package com.makeup.platform.dto.response.agency;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class StaffMatrixItemRes {

    private Long staffId;
    private String staffName;
    private String staffPhone;
    private String staffAvatarUrl;

    // Quality, rating & customer history
    private BigDecimal ratingAvg;
    private Integer totalReviews;
    private Integer totalCompletedJobs;
    @JsonProperty("hasServedThisCustomer")
    private boolean hasServedThisCustomer;

    // 4-way qualification flags
    private boolean hasShift;
    private boolean hasPackage;
    private boolean hasStyle;
    private boolean hasCalendarFree;

    @JsonProperty("hasReportedBusy")
    private boolean hasReportedBusy;

    // Combined eligibility
    @JsonProperty("isFullyQualified")
    private boolean isFullyQualified;
    private String disqualificationReason;
    private String cancellationReason;

    // Current assignment if already assigned
    private String currentRole;
    private BigDecimal commissionRate;
    private BigDecimal commissionAmount;
    private String commissionNote;
    private Double distanceMeters;

    // Overtime compensation attributes
    @JsonProperty("isOvertime")
    private boolean isOvertime;
    private Integer overtimeMinutes;
    private BigDecimal overtimePay;
    private String overtimeRuleName;
}
