package com.makeup.platform.service.pricing.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.constants.PricingConstants;
import com.makeup.platform.common.utils.GeoDistanceUtils;
import com.makeup.platform.config.MapsApiConfig;
import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;
import com.makeup.platform.dto.response.maps.GeocodeRes;
import com.makeup.platform.dto.response.maps.PlaceSuggestionRes;
import com.makeup.platform.service.pricing.MapsClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
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
        String cacheKey = String.format(Locale.US, "pricing:distance:%.4f,%.4f:%.4f,%.4f",
                originLat.doubleValue(), originLng.doubleValue(),
                destinationLat.doubleValue(), destinationLng.doubleValue());

        // 1. Kiểm tra Redis Cache 24h
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

        // 2. Gọi API Goong Maps Distance Matrix
        try {
            String originsParam = String.format(Locale.US, "%.6f,%.6f", originLat.doubleValue(), originLng.doubleValue());
            String destsParam = String.format(Locale.US, "%.6f,%.6f", destinationLat.doubleValue(), destinationLng.doubleValue());

            String responseBody = mapsRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/DistanceMatrix")
                            .queryParam("origins", originsParam)
                            .queryParam("destinations", destsParam)
                            .queryParam("vehicle", "bike")
                            .queryParam("api_key", mapsApiConfig.getGoongApiKey())
                            .build())
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

                            // Lưu vào Redis Cache 24 giờ
                            try {
                                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), 24, TimeUnit.HOURS);
                            } catch (Exception ex) {
                                log.warn("Redis distance cache write failed for key {}: {}", cacheKey, ex.getMessage());
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

    @Override
    public GeocodeRes reverseGeocode(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) {
            return GeocodeRes.builder()
                    .formattedAddress("Vị trí không xác định")
                    .provider("FALLBACK")
                    .build();
        }

        String cacheKey = String.format(Locale.US, "pricing:reverse_geo:%.4f,%.4f",
                latitude.doubleValue(), longitude.doubleValue());

        // 1. Kiểm tra cache Redis 7 ngày
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached.toString(), GeocodeRes.class);
            }
        } catch (Exception e) {
            log.warn("Redis reverse geocode cache read error: {}", e.getMessage());
        }

        // 2. Gọi Goong Maps API
        try {
            String latLngParam = String.format(Locale.US, "%.6f,%.6f", latitude.doubleValue(), longitude.doubleValue());

            String responseBody = mapsRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/Geocode")
                            .queryParam("latlng", latLngParam)
                            .queryParam("api_key", mapsApiConfig.getGoongApiKey())
                            .build())
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode results = root.path("results");
                if (results.isArray() && !results.isEmpty()) {
                    JsonNode first = results.get(0);
                    String address = first.path("formatted_address").asText();
                    String placeId = first.path("place_id").asText();
                    String district = first.path("compound").path("district").asText();
                    String province = first.path("compound").path("province").asText();

                    GeocodeRes result = GeocodeRes.builder()
                            .formattedAddress(address)
                            .latitude(latitude)
                            .longitude(longitude)
                            .placeId(placeId)
                            .district(district)
                            .city(province)
                            .provider("GOONG_MAPS")
                            .build();

                    // Cache 7 ngày
                    try {
                        redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), 7, TimeUnit.DAYS);
                    } catch (Exception ex) {
                        log.warn("Redis cache reverse geocode write error: {}", ex.getMessage());
                    }

                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("Goong Maps Reverse Geocode API call failed ({}). Returning fallback coordinates.", e.getMessage());
        }

        return GeocodeRes.builder()
                .formattedAddress(String.format(Locale.US, "%.5f, %.5f", latitude.doubleValue(), longitude.doubleValue()))
                .latitude(latitude)
                .longitude(longitude)
                .provider("FALLBACK")
                .build();
    }

    @Override
    public GeocodeRes geocode(String address) {
        if (address == null || address.trim().isEmpty()) {
            return GeocodeRes.builder()
                    .formattedAddress(address)
                    .provider("FALLBACK")
                    .build();
        }

        String cacheKey = "pricing:geocode:" + address.trim().toLowerCase(Locale.ROOT);
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached.toString(), GeocodeRes.class);
            }
        } catch (Exception e) {
            log.warn("Redis cache geocode read error: {}", e.getMessage());
        }

        try {
            String responseBody = mapsRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/Geocode")
                            .queryParam("address", address.trim())
                            .queryParam("api_key", mapsApiConfig.getGoongApiKey())
                            .build())
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode results = root.path("results");
                if (results.isArray() && !results.isEmpty()) {
                    JsonNode first = results.get(0);
                    String formattedAddress = first.path("formatted_address").asText();
                    JsonNode loc = first.path("geometry").path("location");
                    double lat = loc.path("lat").asDouble();
                    double lng = loc.path("lng").asDouble();

                    GeocodeRes res = GeocodeRes.builder()
                            .formattedAddress(formattedAddress)
                            .latitude(BigDecimal.valueOf(lat))
                            .longitude(BigDecimal.valueOf(lng))
                            .placeId(first.path("place_id").asText())
                            .provider("GOONG_MAPS")
                            .build();

                    try {
                        redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(res), 7, TimeUnit.DAYS);
                    } catch (Exception ex) {
                        log.warn("Redis cache geocode write error: {}", ex.getMessage());
                    }

                    return res;
                }
            }
        } catch (Exception e) {
            log.warn("Goong Maps Geocode API call failed ({}).", e.getMessage());
        }

        return GeocodeRes.builder()
                .formattedAddress(address)
                .provider("FALLBACK")
                .build();
    }

    @Override
    public List<PlaceSuggestionRes> getPlaceAutoComplete(
            String input,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        if (input == null || input.trim().length() < 2) {
            return Collections.emptyList();
        }

        List<PlaceSuggestionRes> list = new ArrayList<>();

        // 1. Thử gọi Geocode trước để nhận diện địa chỉ hành chính & số nhà (như "21 đường tựu liệt", "thị xã sơn tây")
        try {
            GeocodeRes directGeo = geocode(input.trim());
            if (directGeo != null && directGeo.getLatitude() != null && directGeo.getLongitude() != null) {
                String full = directGeo.getFormattedAddress();
                String main = full;
                String sec = "";
                int firstComma = full.indexOf(',');
                if (firstComma > 0) {
                    main = full.substring(0, firstComma).trim();
                    sec = full.substring(firstComma + 1).trim();
                }
                list.add(PlaceSuggestionRes.builder()
                        .description(full)
                        .placeId(directGeo.getPlaceId() != null && !directGeo.getPlaceId().isEmpty() 
                                ? directGeo.getPlaceId() 
                                : String.format(Locale.US, "GEOCODE_%.6f_%.6f", directGeo.getLatitude().doubleValue(), directGeo.getLongitude().doubleValue()))
                        .mainText(main)
                        .secondaryText(sec)
                        .build());
            }
        } catch (Exception ex) {
            log.warn("Geocode hybrid search failed: {}", ex.getMessage());
        }

        // 2. Gọi Goong Maps Place AutoComplete để tìm kiếm các điểm đến thương mại, POI, tòa nhà
        try {
            String responseBody = mapsRestClient.get()
                    .uri(uriBuilder -> {
                        var b = uriBuilder
                                .path("/Place/AutoComplete")
                                .queryParam("input", input.trim())
                                .queryParam("api_key", mapsApiConfig.getGoongApiKey());
                        if (latitude != null && longitude != null 
                                && latitude.compareTo(BigDecimal.ZERO) > 0 
                                && longitude.compareTo(BigDecimal.ZERO) > 0) {
                            b.queryParam("location", String.format(Locale.US, "%.6f,%.6f", latitude.doubleValue(), longitude.doubleValue()))
                             .queryParam("radius", 30000);
                        }
                        return b.build();
                    })
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode predictions = root.path("predictions");
                if (predictions.isArray() && !predictions.isEmpty()) {
                    for (JsonNode p : predictions) {
                        String desc = p.path("description").asText();
                        String placeId = p.path("place_id").asText();
                        JsonNode sf = p.path("structured_formatting");
                        String mainText = sf.path("main_text").asText();
                        String secText = sf.path("secondary_text").asText();

                        // Tránh trùng lặp với kết quả geocode đã thêm ở trên
                        boolean duplicate = list.stream().anyMatch(item -> item.getDescription().equalsIgnoreCase(desc));
                        if (!duplicate) {
                            list.add(PlaceSuggestionRes.builder()
                                    .description(desc)
                                    .placeId(placeId)
                                    .mainText(mainText != null && !mainText.isEmpty() ? mainText : desc)
                                    .secondaryText(secText)
                                    .build());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Goong Maps Place AutoComplete API call failed ({}).", e.getMessage());
        }

        return list;
    }

    @Override
    public GeocodeRes getPlaceDetail(String placeId) {
        if (placeId == null || placeId.trim().isEmpty()) {
            return null;
        }

        // Nếu là ID sinh ra từ Geocode trực tiếp: GEOCODE_lat_lng
        if (placeId.startsWith("GEOCODE_")) {
            String[] parts = placeId.split("_");
            if (parts.length == 3) {
                try {
                    BigDecimal lat = new BigDecimal(parts[1]);
                    BigDecimal lng = new BigDecimal(parts[2]);
                    return reverseGeocode(lat, lng);
                } catch (Exception ignored) {
                }
            }
        }

        String cacheKey = "pricing:place_detail:" + placeId.trim();
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached.toString(), GeocodeRes.class);
            }
        } catch (Exception e) {
            log.warn("Redis read cache place detail error: {}", e.getMessage());
        }

        try {
            String responseBody = mapsRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/Place/Detail")
                            .queryParam("place_id", placeId.trim())
                            .queryParam("api_key", mapsApiConfig.getGoongApiKey())
                            .build())
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode result = root.path("result");
                if (!result.isMissingNode() && !result.isNull()) {
                    String formattedAddress = result.path("formatted_address").asText();
                    if (formattedAddress == null || formattedAddress.isEmpty()) {
                        formattedAddress = result.path("name").asText();
                    }

                    JsonNode loc = result.path("geometry").path("location");
                    double lat = loc.path("lat").asDouble();
                    double lng = loc.path("lng").asDouble();

                    GeocodeRes res = GeocodeRes.builder()
                            .formattedAddress(formattedAddress)
                            .latitude(BigDecimal.valueOf(lat))
                            .longitude(BigDecimal.valueOf(lng))
                            .placeId(placeId)
                            .provider("GOONG_MAPS")
                            .build();

                    // Cache 7 ngày
                    try {
                        redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(res), 7, TimeUnit.DAYS);
                    } catch (Exception ex) {
                        log.warn("Redis write cache place detail error: {}", ex.getMessage());
                    }

                    return res;
                }
            }
        } catch (Exception e) {
            log.warn("Goong Maps Place Detail API call failed ({}).", e.getMessage());
        }

        return null;
    }
}
