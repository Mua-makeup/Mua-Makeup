package com.makeup.platform.service.pricing.impl;

import com.makeup.platform.common.constants.PricingConstants;
import com.makeup.platform.common.utils.H3SpatialUtils;
import com.makeup.platform.service.pricing.SurgeDemandTracker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class SurgeDemandTrackerImpl implements SurgeDemandTracker {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String DEMAND_KEY_PREFIX = "surge:demand:";
    private static final String ACTIVE_MUAS_GEO_KEY = "geo:muas:active";
    private static final double SURGE_RADIUS_KM = 3.0; // Bán kính gom cụm Cung ~3km

    @Override
    public RealtimeSurgeResult evaluateRealtimeSurge(BigDecimal customerLat, BigDecimal customerLng) {
        if (customerLat == null || customerLng == null) {
            return new RealtimeSurgeResult(
                    PricingConstants.MIN_SURGE_MULTIPLIER,
                    0, 0, BigDecimal.ONE,
                    "Không xác định được tọa độ khách hàng",
                    "NORMAL"
            );
        }

        try {
            double lat = customerLat.doubleValue();
            double lng = customerLng.doubleValue();

            // 1. Phân giải tọa độ ra H3 Cell ID (Resolution 7 ~1.2km)
            String cellAddress = H3SpatialUtils.latLngToCell(lat, lng);
            String demandKey = DEMAND_KEY_PREFIX + cellAddress;

            // 2. Ghi nhận và tăng biến đếm CẦU (Demand) với TTL trượt 5 phút
            Long incrementedVal = redisTemplate.opsForValue().increment(demandKey);
            int demandCount = incrementedVal != null ? incrementedVal.intValue() : 1;

            if (incrementedVal != null && incrementedVal == 1L) {
                redisTemplate.expire(demandKey, PricingConstants.DEMAND_TTL_SECONDS, TimeUnit.SECONDS);
            }

            // 3. Đếm CUNG (Supply): Quét số thợ online trong bán kính 3km từ Redis GEO
            int supplyCount = 0;
            try {
                Circle searchCircle = new Circle(new Point(lng, lat), new Distance(SURGE_RADIUS_KM, Metrics.KILOMETERS));
                GeoResults<RedisGeoCommands.GeoLocation<Object>> geoResults = redisTemplate.opsForGeo().radius(ACTIVE_MUAS_GEO_KEY, searchCircle);
                if (geoResults != null && geoResults.getContent() != null) {
                    supplyCount = geoResults.getContent().size();
                }
            } catch (Exception geoEx) {
                log.warn("Failed to query active MUA supply from Redis GEO: {}", geoEx.getMessage());
            }

            // 4. Tính toán Tỷ lệ Cung / Cầu (Demand / Supply Ratio)
            int effectiveSupply = Math.max(supplyCount, 1);
            double rawRatio = (double) demandCount / (double) effectiveSupply;
            BigDecimal demandRatio = BigDecimal.valueOf(rawRatio).setScale(2, RoundingMode.HALF_UP);

            // 5. Tính toán hệ số nhân giá theo tỷ lệ Cung / Cầu
            if (rawRatio <= 1.0) {
                return new RealtimeSurgeResult(
                        PricingConstants.MIN_SURGE_MULTIPLIER,
                        demandCount, supplyCount, demandRatio,
                        "Cung cầu cân bằng tại khu vực",
                        "NORMAL"
                );
            }

            // Công thức độ dốc: 1.0 + (ratio - 1.0) * 0.25
            double rawMultiplier = 1.0 + (rawRatio - 1.0) * PricingConstants.DEMAND_SURGE_STEP;
            double maxMultiplier = PricingConstants.MAX_SURGE_MULTIPLIER.doubleValue();

            if (rawMultiplier > maxMultiplier) {
                rawMultiplier = maxMultiplier;
            }

            BigDecimal finalMultiplier = BigDecimal.valueOf(rawMultiplier).setScale(2, RoundingMode.HALF_UP);
            String surgeReason = String.format("Nhu cầu đặt thợ tăng cao tại khu vực (%d khách / %d thợ)", demandCount, supplyCount);

            return new RealtimeSurgeResult(
                    finalMultiplier,
                    demandCount, supplyCount, demandRatio,
                    surgeReason,
                    "REALTIME_DEMAND_SURGE"
            );

        } catch (Exception e) {
            // CƠ CHẾ DỰ PHÒNG SẬP REDIS: Bắt ngoại lệ, không làm gián đoạn request, fallback an toàn về 1.00x
            log.warn("Redis demand/supply evaluation error: {}. Falling back gracefully to 1.00x multiplier.", e.getMessage());
            return new RealtimeSurgeResult(
                    PricingConstants.MIN_SURGE_MULTIPLIER,
                    0, 0, BigDecimal.ONE,
                    "Khung giờ bình thường (Redis fallback)",
                    "NORMAL"
            );
        }
    }
}
