package com.makeup.platform.service.payment.gateway;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.payment.PaymentGatewayInfoRes;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class PaymentGatewayRegistry {

    private final Map<String, PaymentGatewayStrategy> strategies = new ConcurrentHashMap<>();

    public PaymentGatewayRegistry(List<PaymentGatewayStrategy> gatewayStrategies) {
        for (PaymentGatewayStrategy strategy : gatewayStrategies) {
            String code = normalize(strategy.gatewayCode());
            if (strategies.containsKey(code)) {
                throw new IllegalStateException("Duplicate payment gateway registration detected for code: " + code);
            }
            strategies.put(code, strategy);
        }
    }

    public PaymentGatewayStrategy getStrategy(String gatewayCode) {
        if (gatewayCode == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_GATEWAY_NOT_FOUND, "ERR_PAYMENT_GATEWAY_NOT_FOUND");
        }
        PaymentGatewayStrategy strategy = strategies.get(normalize(gatewayCode));
        if (strategy == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_GATEWAY_NOT_FOUND, "ERR_PAYMENT_GATEWAY_NOT_FOUND");
        }
        return strategy;
    }

    public List<PaymentGatewayInfoRes> getAvailableGateways() {
        return strategies.values().stream()
                .map(PaymentGatewayStrategy::getMetadata)
                .collect(Collectors.toList());
    }

    public boolean isSupported(String gatewayCode) {
        if (gatewayCode == null) {
            return false;
        }
        return strategies.containsKey(normalize(gatewayCode));
    }

    private String normalize(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
