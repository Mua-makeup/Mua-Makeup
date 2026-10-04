package com.makeup.platform.service.payment.gateway;

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
public class GatewayPaymentResult {

    private String paymentCode;
    private String gatewayCode;
    private String gatewayRequestId;
    private String gatewayTransactionId;
    private BigDecimal amount;
    private boolean successful;
    private String responseCode;
    private String message;
    private OffsetDateTime paidAt;
}
