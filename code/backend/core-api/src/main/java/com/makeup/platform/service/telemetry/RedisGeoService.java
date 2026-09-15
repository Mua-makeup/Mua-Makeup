package com.makeup.platform.service.telemetry;

import com.makeup.platform.entity.telemetry.AdaptiveStreamMode;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.redis.connection.RedisGeoCommands;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public interface RedisGeoService {

    void addActiveMua(Long muaId, double lat, double lng);

    void removeActiveMua(Long muaId);

    void setHeartbeat(Long muaId, long ttlSeconds);

    void removeHeartbeat(Long muaId);

    boolean hasHeartbeat(Long muaId);

    void setMuaSummary(Long muaId, String summaryJson, long ttlSeconds);

    String getMuaSummary(Long muaId);

    List<String> getMuaSummaries(List<Long> muaIds);

    void removeMuaSummary(Long muaId);

    GeoResults<RedisGeoCommands.GeoLocation<String>> searchNearbyActiveMuas(double lat, double lng, double radiusKm);

    void updateTripLivePosition(Long bookingId, Long muaId, double lat, double lng,
                               Double speed, Double heading, Double accuracy,
                               Integer etaMinutes, Double distanceRemainingMeters,
                               AdaptiveStreamMode mode);

    Map<Object, Object> getTripLivePosition(Long bookingId);

    void addAgencyBranch(Long branchId, double lat, double lng);

    GeoResults<RedisGeoCommands.GeoLocation<String>> searchNearbyAgencyBranches(double lat, double lng, double radiusKm);

    String getLastRecordedPoint(Long bookingId);

    void setLastRecordedPoint(Long bookingId, double lat, double lng, Instant recordedAt);
}
