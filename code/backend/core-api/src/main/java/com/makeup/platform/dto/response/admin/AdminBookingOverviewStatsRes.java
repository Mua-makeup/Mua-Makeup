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
public class AdminBookingOverviewStatsRes {

    private Long totalBookings;

    private Long completedBookings;

    private Long inProgressBookings;

    private Long pendingDispatchCount;

    private BigDecimal totalGrossVolume;

    private Long cancelledCount;

    private Long disputedCount;
}
