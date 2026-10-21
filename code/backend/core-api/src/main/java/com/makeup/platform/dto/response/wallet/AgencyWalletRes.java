package com.makeup.platform.dto.response.wallet;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyWalletRes {

    private Long walletId;
    private Long agencyId;
    private String agencyName;
    private BigDecimal availableBalance;
    private BigDecimal frozenBalance;
    private BigDecimal pendingEscrowAmount;
    private BigDecimal totalRevenueSettled;
    private BigDecimal totalClawback;
    private BigDecimal totalOvertimePaid;
    private String currency;
    private List<CustomerWalletTransactionRes> recentTransactions;
}
