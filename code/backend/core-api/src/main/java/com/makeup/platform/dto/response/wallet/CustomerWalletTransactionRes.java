package com.makeup.platform.dto.response.wallet;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerWalletTransactionRes {

    private Long id;
    private String entryType;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private String referenceType;
    private Long referenceId;
    private String description;
    private String holdStatus;
    private LocalDateTime createdAt;
}
