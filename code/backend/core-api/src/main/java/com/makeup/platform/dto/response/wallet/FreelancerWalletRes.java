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
public class FreelancerWalletRes {

    private Long walletId;
    private BigDecimal availableBalance;
    private BigDecimal frozenBalance;
    private BigDecimal bookingDepositsHeld;
    private String currency;
    private List<FreelancerBookingDepositItemRes> heldDeposits;
    private List<CustomerWalletTransactionRes> recentTransactions;
}
