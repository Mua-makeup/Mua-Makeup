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
public class CustomerWalletRes {

    private Long walletId;
    private BigDecimal availableBalance;
    private BigDecimal frozenBalance;
    private String currency;
    private List<CustomerWalletTransactionRes> recentTransactions;
}
