package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgencyBookingOverviewStatsRes {

    private Long totalBookings;

    private Long completedBookings;

    private BigDecimal totalGrossRevenue;

    private BigDecimal totalStudioNet;

    private Long emergencyCount;
}
