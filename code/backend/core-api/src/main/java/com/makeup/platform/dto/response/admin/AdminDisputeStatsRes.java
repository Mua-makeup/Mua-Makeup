package com.makeup.platform.dto.response.admin;

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
public class AdminDisputeStatsRes {

    private long pendingDisputes;
    private long refundedDisputes;
    private long rejectedDisputes;
    private BigDecimal totalDisputedDepositAmount;
}
