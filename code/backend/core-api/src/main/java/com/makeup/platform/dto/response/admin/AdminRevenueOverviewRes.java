package com.makeup.platform.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRevenueOverviewRes {

    private BigDecimal totalGrossVolume;

    private BigDecimal totalPlatformFee;

    private BigDecimal totalNetPartnerEarnings;

    private BigDecimal platformFeeRate;

    private Long totalSettledCount;

    private Long completedBookingsCount;

    private Long paidOutBookingsCount;

    // Breakdown for Agency/Studio
    private BigDecimal agencyGrossVolume;

    private BigDecimal agencyPlatformFee;

    private BigDecimal agencyNetEarnings;

    private Long agencyBookingCount;

    // Breakdown for Freelancer
    private BigDecimal freelanceGrossVolume;

    private BigDecimal freelancePlatformFee;

    private BigDecimal freelanceNetEarnings;

    private Long freelanceBookingCount;
}

