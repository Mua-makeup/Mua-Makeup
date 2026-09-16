package com.makeup.platform.service.pricing.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.constants.PricingConstants;
import com.makeup.platform.common.utils.GeoDistanceUtils;
import com.makeup.platform.config.MapsApiConfig;
import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;
import com.makeup.platform.service.pricing.MapsClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MapsClientServiceImpl implements MapsClientService {

    private final MapsApiConfig mapsApiConfig;
    private final RestClient mapsRestClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public DistanceMatrixRes getDistanceAndDuration(
            BigDecimal originLat,
            BigDecimal originLng,
            BigDecimal destinationLat,
            BigDecimal destinationLng
    ) {
        if (originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
            return fallbackDistance(originLat, originLng, destinationLat, destinationLng);
        }

        // Tạo cache key dạng geohash / tọa độ làm tròn 4 chữ số thập phân (~11 mét)
        String cacheKey = String.format("pricing:distance:%.4f,%.4f:%.4f,%.4f",
                originLat.doubleValue(), originLng.doubleValue(),
                destinationLat.doubleValue(), destinationLng.doubleValue());

        try {
            Object cachedVal = redisTemplate.opsForValue().get(cacheKey);
            if (cachedVal != null) {
                DistanceMatrixRes res = objectMapper.readValue(cachedVal.toString(), DistanceMatrixRes.class);
                res.setIsCached(true);
                return res;
            }
        } catch (Exception e) {
            log.warn("Redis distance cache read failed for key {}: {}", cacheKey, e.getMessage());
        }

        // Gọi API Goong Maps Distance Matrix
        try {
            String url = String.format("/DistanceMatrix?origins=%f,%f&destinations=%f,%f&vehicle=bike&api_key=%s",
                    originLat.doubleValue(), originLng.doubleValue(),
                    destinationLat.doubleValue(), destinationLng.doubleValue(),
                    mapsApiConfig.getGoongApiKey());

            String responseBody = mapsRestClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode rows = root.path("rows");
                if (rows.isArray() && !rows.isEmpty()) {
                    JsonNode elements = rows.get(0).path("elements");
                    if (elements.isArray() && !elements.isEmpty()) {
                        JsonNode element = elements.get(0);
                        String status = element.path("status").asText();
                        if ("OK".equalsIgnoreCase(status)) {
                            long distanceMeters = element.path("distance").path("value").asLong();
                            long durationSeconds = element.path("duration").path("value").asLong();

                            BigDecimal distanceKm = BigDecimal.valueOf(distanceMeters)
                                    .divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP);
                            int durationMinutes = (int) Math.ceil(durationSeconds / 60.0);

                            DistanceMatrixRes result = DistanceMatrixRes.builder()
                                    .distanceKm(distanceKm)
                                    .durationMinutes(Math.max(1, durationMinutes))
                                    .isCached(false)
                                    .routingProvider("GOONG_MAPS")
                                    .build();

                            // Lưu vào Redis cache với TTL 24h
                            try {
                                redisTemplate.opsForValue().set(
                                        cacheKey,
                                        objectMapper.writeValueAsString(result),
                                        PricingConstants.MAPS_CACHE_TTL_SECONDS,
                                        TimeUnit.SECONDS
                                );
                            } catch (Exception e) {
                                log.warn("Redis distance cache write failed for key {}: {}", cacheKey, e.getMessage());
                            }

                            return result;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Goong Maps API call failed or timed out ({}). Activating Haversine Fallback...", e.getMessage());
        }

        // Kích hoạt Circuit Breaker Fallback
        return fallbackDistance(originLat, originLng, destinationLat, destinationLng);
    }

    private DistanceMatrixRes fallbackDistance(
            BigDecimal originLat,
            BigDecimal originLng,
            BigDecimal destinationLat,
            BigDecimal destinationLng
    ) {
        if (originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
            return DistanceMatrixRes.builder()
                    .distanceKm(BigDecimal.ZERO)
                    .durationMinutes(0)
                    .isCached(false)
                    .routingProvider("HAVERSINE_FALLBACK")
                    .build();
        }

        double rawKm = GeoDistanceUtils.calculateDistanceKm(
                originLat.doubleValue(), originLng.doubleValue(),
                destinationLat.doubleValue(), destinationLng.doubleValue()
        );

        // Nhân hệ số uốn khúc đường bộ 1.35x
        double roadKm = rawKm * PricingConstants.HAVERSINE_ROAD_FACTOR;
        BigDecimal distanceKm = BigDecimal.valueOf(roadKm).setScale(2, RoundingMode.HALF_UP);

        // Thời gian ước tính lái xe trong đô thị (vận tốc trung bình 25 km/h)
        int estimatedMinutes = (int) Math.ceil((roadKm / PricingConstants.AVERAGE_DRIVING_SPEED_KMH) * 60.0);

        return DistanceMatrixRes.builder()
                .distanceKm(distanceKm)
                .durationMinutes(Math.max(5, estimatedMinutes))
                .isCached(false)
                .routingProvider("HAVERSINE_FALLBACK")
                .build();
    }
}
