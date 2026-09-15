package com.makeup.platform.service.telemetry.impl;

import com.makeup.platform.common.constants.TelemetryConstants;
import com.makeup.platform.entity.telemetry.AdaptiveStreamMode;
import com.makeup.platform.service.telemetry.RedisGeoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisGeoServiceImpl implements RedisGeoService {

    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public void addActiveMua(Long muaId, double lat, double lng) {
        log.debug("Adding active MUA {} to Redis GEO at lat={}, lng={}", muaId, lat, lng);
        // Lưu ý trong Redis GEO: Point(x = longitude, y = latitude)
        stringRedisTemplate.opsForGeo().add(
                TelemetryConstants.REDIS_KEY_MUA_GEO,
                new Point(lng, lat),
                String.valueOf(muaId)
        );
    }

    @Override
    public void removeActiveMua(Long muaId) {
        log.debug("Removing MUA {} from Redis GEO", muaId);
        stringRedisTemplate.opsForZSet().remove(
                TelemetryConstants.REDIS_KEY_MUA_GEO,
                String.valueOf(muaId)
        );
    }

    @Override
    public void setHeartbeat(Long muaId, long ttlSeconds) {
        String key = TelemetryConstants.REDIS_KEY_HEARTBEAT_PREFIX + muaId;
        stringRedisTemplate.opsForValue().set(key, "ALIVE", Duration.ofSeconds(ttlSeconds));
    }

    @Override
    public void removeHeartbeat(Long muaId) {
        String key = TelemetryConstants.REDIS_KEY_HEARTBEAT_PREFIX + muaId;
        stringRedisTemplate.delete(key);
    }

    @Override
    public boolean hasHeartbeat(Long muaId) {
        String key = TelemetryConstants.REDIS_KEY_HEARTBEAT_PREFIX + muaId;
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
    }

    @Override
    public void setMuaSummary(Long muaId, String summaryJson, long ttlSeconds) {
        String key = TelemetryConstants.REDIS_KEY_SUMMARY_PREFIX + muaId;
        stringRedisTemplate.opsForValue().set(key, summaryJson, Duration.ofSeconds(ttlSeconds));
    }

    @Override
    public String getMuaSummary(Long muaId) {
        String key = TelemetryConstants.REDIS_KEY_SUMMARY_PREFIX + muaId;
        Object val = stringRedisTemplate.opsForValue().get(key);
        return val != null ? val.toString() : null;
    }

    @Override
    public List<String> getMuaSummaries(List<Long> muaIds) {
        if (muaIds == null || muaIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> keys = muaIds.stream()
                .map(id -> TelemetryConstants.REDIS_KEY_SUMMARY_PREFIX + id)
                .toList();
        List<String> rawList = stringRedisTemplate.opsForValue().multiGet(keys);
        if (rawList == null) {
            return Collections.emptyList();
        }
        return new ArrayList<>(rawList);
    }

    @Override
    public void removeMuaSummary(Long muaId) {
        String key = TelemetryConstants.REDIS_KEY_SUMMARY_PREFIX + muaId;
        stringRedisTemplate.delete(key);
    }

    @Override
    public GeoResults<RedisGeoCommands.GeoLocation<String>> searchNearbyActiveMuas(double lat, double lng, double radiusKm) {
        Circle circle = new Circle(new Point(lng, lat), new Distance(radiusKm, Metrics.KILOMETERS));
        RedisGeoCommands.GeoRadiusCommandArgs args = RedisGeoCommands.GeoRadiusCommandArgs.newGeoRadiusArgs()
                .includeDistance()
                .includeCoordinates()
                .sortAscending();

        return stringRedisTemplate.opsForGeo().radius(TelemetryConstants.REDIS_KEY_MUA_GEO, circle, args);
    }

    @Override
    public void updateTripLivePosition(Long bookingId, Long muaId, double lat, double lng,
                                       Double speed, Double heading, Double accuracy,
                                       Integer etaMinutes, Double distanceRemainingMeters,
                                       AdaptiveStreamMode mode) {
        String key = TelemetryConstants.REDIS_KEY_TRIP_PREFIX + bookingId;
        Map<String, String> data = new HashMap<>();
        data.put("bookingId", String.valueOf(bookingId));
        if (muaId != null) data.put("muaId", String.valueOf(muaId));
        data.put("currentLat", String.valueOf(lat));
        data.put("currentLng", String.valueOf(lng));
        data.put("speed", String.valueOf(speed != null ? speed : 0.0));
        data.put("heading", String.valueOf(heading != null ? heading : 0.0));
        if (accuracy != null) data.put("accuracy", String.valueOf(accuracy));
        if (etaMinutes != null) data.put("etaMinutes", String.valueOf(etaMinutes));
        if (distanceRemainingMeters != null) data.put("distanceRemainingMeters", String.valueOf(distanceRemainingMeters));
        if (mode != null) data.put("streamMode", mode.name());
        data.put("updatedAt", Instant.now().toString());

        stringRedisTemplate.opsForHash().putAll(key, data);
        stringRedisTemplate.expire(key, Duration.ofSeconds(TelemetryConstants.TRIP_TTL_SECONDS));
    }

    @Override
    public Map<Object, Object> getTripLivePosition(Long bookingId) {
        String key = TelemetryConstants.REDIS_KEY_TRIP_PREFIX + bookingId;
        return stringRedisTemplate.opsForHash().entries(key);
    }

    @Override
    public void addAgencyBranch(Long branchId, double lat, double lng) {
        stringRedisTemplate.opsForGeo().add(
                TelemetryConstants.REDIS_KEY_AGENCY_GEO,
                new Point(lng, lat),
                String.valueOf(branchId)
        );
    }

    @Override
    public GeoResults<RedisGeoCommands.GeoLocation<String>> searchNearbyAgencyBranches(double lat, double lng, double radiusKm) {
        Circle circle = new Circle(new Point(lng, lat), new Distance(radiusKm, Metrics.KILOMETERS));
        RedisGeoCommands.GeoRadiusCommandArgs args = RedisGeoCommands.GeoRadiusCommandArgs.newGeoRadiusArgs()
                .includeDistance()
                .includeCoordinates()
                .sortAscending();

        return stringRedisTemplate.opsForGeo().radius(TelemetryConstants.REDIS_KEY_AGENCY_GEO, circle, args);
    }

    @Override
    public String getLastRecordedPoint(Long bookingId) {
        String key = "booking:dead_reckoning:" + bookingId;
        Object val = stringRedisTemplate.opsForValue().get(key);
        return val != null ? val.toString() : null;
    }

    @Override
    public void setLastRecordedPoint(Long bookingId, double lat, double lng, Instant recordedAt) {
        String key = "booking:dead_reckoning:" + bookingId;
        String val = lat + "," + lng + "," + recordedAt.toEpochMilli();
        stringRedisTemplate.opsForValue().set(key, val, Duration.ofSeconds(TelemetryConstants.TRIP_TTL_SECONDS));
    }
}
