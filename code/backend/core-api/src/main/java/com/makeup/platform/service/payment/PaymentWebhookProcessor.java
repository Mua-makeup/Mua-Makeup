package com.makeup.platform.service.payment;

import java.util.Map;

public interface PaymentWebhookProcessor {

    Object processWebhook(String gatewayCode, Map<String, String> queryParams, String rawBody);
}
