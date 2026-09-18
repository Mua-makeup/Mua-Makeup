package com.makeup.platform.service.pricing;

import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;

import java.math.BigDecimal;

public interface DistanceFeeService {

    /**
     * Tính toán phí di chuyển và kiểm tra bán kính nhận việc tối đa của thợ / Studio.
     */
    InvoicePreviewRes.DistanceInfo calculateDistanceFee(
            BigDecimal distanceKm,
            Integer travelMinutes,
            String routingProvider,
            BigDecimal providerMaxRadiusKm,
            BigDecimal customFreeRadiusKm,
            BigDecimal customPricePerKm
    );
}
