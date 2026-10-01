package com.makeup.platform.service.payment.gateway;

import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.dto.response.payment.PaymentGatewayInfoRes;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;

import java.util.Map;

public interface PaymentGatewayStrategy {

    String gatewayCode();

    PaymentGatewayInfoRes getMetadata();

    PaymentCheckoutRes createCheckout(PaymentTransactionEntity txn, String clientIp);

    GatewayPaymentResult verifyAndParseCallback(Map<String, String> queryParams, String rawBody);

    Object callbackAcknowledgement(GatewayPaymentResult result);
}
