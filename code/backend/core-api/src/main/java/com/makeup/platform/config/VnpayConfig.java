package com.makeup.platform.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class VnpayConfig {

    @Value("${payment.gateways.vnpay.enabled:true}")
    private boolean enabled;

    @Value("${payment.gateways.vnpay.tmn-code:DEMOVNPAY}")
    private String tmnCode;

    @Value("${payment.gateways.vnpay.hash-secret:DEMOVNPAYSECRETKEY12345678901234567890123456789012}")
    private String hashSecret;

    @Value("${payment.gateways.vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String payUrl;

    @Value("${payment.gateways.vnpay.return-url:http://localhost:8080/api/v1/payments/return/vnpay}")
    private String returnUrl;

    @Value("${payment.gateways.vnpay.api-url:https://sandbox.vnpayment.vn/merchant_webapi/api/transaction}")
    private String apiUrl;
}
