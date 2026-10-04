package com.makeup.platform.service.payment.gateway;

import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.dto.response.payment.PaymentGatewayInfoRes;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;

import java.util.Map;
import java.math.BigDecimal;

public interface PaymentGatewayStrategy {

    String gatewayCode();

    /** Amount in currency units actually sent to the gateway. */
    default BigDecimal normalizeAmount(BigDecimal amount) {
        return amount;
    }

    PaymentGatewayInfoRes getMetadata();

    PaymentCheckoutRes createCheckout(PaymentTransactionEntity txn, String clientIp);

    GatewayPaymentResult verifyAndParseCallback(Map<String, String> queryParams, String rawBody);

    Object callbackAcknowledgement(GatewayPaymentResult result);

    GatewayPaymentResult queryTransaction(PaymentTransactionEntity txn);
}
