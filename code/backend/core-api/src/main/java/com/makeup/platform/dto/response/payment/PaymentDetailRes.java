package com.makeup.platform.dto.response.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentDetailRes {

    private String paymentCode;
    private String gatewayCode;
    private BigDecimal amount;
    private String status;
    private String walletPostingStatus;
    private String paymentUrl;
    private String qrCodeUrl;
    private OffsetDateTime paidAt;
    private OffsetDateTime walletPostedAt;
    private OffsetDateTime createdAt;
}
