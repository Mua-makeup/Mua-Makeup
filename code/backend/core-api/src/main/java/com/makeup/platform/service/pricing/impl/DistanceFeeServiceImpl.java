package com.makeup.platform.service.pricing.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.PricingConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.service.pricing.DistanceFeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class DistanceFeeServiceImpl implements DistanceFeeService {

    @Override
    public InvoicePreviewRes.DistanceInfo calculateDistanceFee(
            BigDecimal distanceKm,
            Integer travelMinutes,
            String routingProvider,
            BigDecimal providerMaxRadiusKm,
            BigDecimal customFreeRadiusKm,
            BigDecimal customPricePerKm
    ) {
        BigDecimal actualDistance = distanceKm != null ? distanceKm : BigDecimal.ZERO;
        BigDecimal maxRadius = providerMaxRadiusKm != null ? providerMaxRadiusKm : PricingConstants.DEFAULT_MAX_SERVICE_RADIUS_KM;

        // Ràng buộc 1: Nếu khoảng cách vượt quá bán kính nhận việc tối đa của thợ/Studio -> chặn tạo đơn
        if (actualDistance.compareTo(maxRadius) > 0) {
            log.warn("Distance {} km exceeds provider max service radius {} km", actualDistance, maxRadius);
            throw new CustomBusinessException(
                    ErrorCodes.ERR_DISTANCE_EXCEEDS_MAX_RADIUS,
                    "pricing.distance_exceeds_max",
                    HttpStatus.BAD_REQUEST
            );
        }

        BigDecimal freeRadius = customFreeRadiusKm != null ? customFreeRadiusKm : PricingConstants.DEFAULT_FREE_RADIUS_KM;
        BigDecimal pricePerKm = customPricePerKm != null ? customPricePerKm : PricingConstants.DEFAULT_PRICE_PER_KM;

        BigDecimal excessDistanceKm;
        BigDecimal distanceFee;

        if (actualDistance.compareTo(freeRadius) <= 0) {
            excessDistanceKm = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            distanceFee = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        } else {
            excessDistanceKm = actualDistance.subtract(freeRadius).setScale(2, RoundingMode.HALF_UP);
            distanceFee = excessDistanceKm.multiply(pricePerKm).setScale(2, RoundingMode.HALF_UP);
        }

        return InvoicePreviewRes.DistanceInfo.builder()
                .distanceKm(actualDistance)
                .freeRadiusKm(freeRadius)
                .excessDistanceKm(excessDistanceKm)
                .pricePerKm(pricePerKm)
                .distanceFee(distanceFee)
                .estimatedTravelMinutes(travelMinutes != null ? travelMinutes : 0)
                .routingProvider(routingProvider != null ? routingProvider : "UNKNOWN")
                .build();
    }
}
