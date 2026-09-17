package com.makeup.platform.service.telemetry.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.TelemetryConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.GeoDistanceUtils;
import com.makeup.platform.dto.request.telemetry.NearbyProvidersReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;
import com.makeup.platform.dto.response.telemetry.NearbyProviderRes;
import com.makeup.platform.dto.response.telemetry.TelemetryLogRes;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AdaptiveStreamMode;
import com.makeup.platform.entity.telemetry.AgencyBranchEntity;
import com.makeup.platform.entity.telemetry.BookingTripEntity;
import com.makeup.platform.entity.telemetry.ProviderType;
import com.makeup.platform.entity.telemetry.TelemetryLogEntity;
import com.makeup.platform.mapper.telemetry.TelemetryLogMapper;
import com.makeup.platform.mapper.telemetry.TelemetryProviderMapper;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.repository.booking.BookingRepository;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.repository.telemetry.AgencyBranchRepository;
import com.makeup.platform.repository.telemetry.BookingTripRepository;
import com.makeup.platform.repository.telemetry.TelemetryLogRepository;
import com.makeup.platform.service.telemetry.RedisGeoService;
import com.makeup.platform.service.telemetry.TelemetryQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryQueryServiceImpl implements TelemetryQueryService {

    private final RedisGeoService redisGeoService;
    private final MuaProfileRepository muaProfileRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final AgencyBranchRepository agencyBranchRepository;
    private final BookingTripRepository bookingTripRepository;
    private final TelemetryLogRepository telemetryLogRepository;
    private final TelemetryLogMapper telemetryLogMapper;
    private final TelemetryProviderMapper telemetryProviderMapper;
    private final ObjectMapper objectMapper;
    private final BookingRepository bookingRepository;
    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public List<NearbyProviderRes> findNearbyProviders(NearbyProvidersReq req) {
        validateCoordinates(req.getLatitude(), req.getLongitude());

        double radiusKm = req.getRadiusKm() != null ? req.getRadiusKm() : TelemetryConstants.DEFAULT_RADIUS_KM;
        if (radiusKm > TelemetryConstants.MAX_RADIUS_KM) {
            radiusKm = TelemetryConstants.MAX_RADIUS_KM;
        }

        List<NearbyProviderRes> results = new ArrayList<>();

        // 1. Quét thợ tự do (Freelance MUA) trên Redis GEO (100% In-Memory < 5ms)
        GeoResults<RedisGeoCommands.GeoLocation<String>> geoResults = redisGeoService.searchNearbyActiveMuas(
                req.getLatitude(), req.getLongitude(), radiusKm
        );

        if (geoResults != null && !geoResults.getContent().isEmpty()) {
            List<Long> muaIds = new ArrayList<>();
            Map<Long, Double> distanceMap = new HashMap<>();
            Map<Long, Point> coordMap = new HashMap<>();

            for (GeoResult<RedisGeoCommands.GeoLocation<String>> res : geoResults.getContent()) {
                try {
                    Long muaId = Long.parseLong(res.getContent().getName());
                    muaIds.add(muaId);
                    if (res.getDistance() != null) {
                        distanceMap.put(muaId, res.getDistance().getValue());
                    }
                    if (res.getContent().getPoint() != null) {
                        coordMap.put(muaId, res.getContent().getPoint());
                    }
                } catch (NumberFormatException e) {
                    log.warn("Invalid MUA id in Redis GEO: {}", res.getContent().getName());
                }
            }

            // 2. Lấy profile tóm tắt siêu tốc qua MGET Redis String
            List<String> summaries = redisGeoService.getMuaSummaries(muaIds);

            for (int i = 0; i < muaIds.size(); i++) {
                Long muaId = muaIds.get(i);
                String summaryJson = i < summaries.size() ? summaries.get(i) : null;
                NearbyProviderRes providerRes = null;

                if (summaryJson != null) {
                    try {
                        Map<String, Object> summary = objectMapper.readValue(summaryJson, new TypeReference<>() {});
                        providerRes = telemetryProviderMapper.fromSummaryMap(summary);
                    } catch (Exception e) {
                        log.warn("Failed to parse summary JSON for MUA {}: {}", muaId, e.getMessage());
                    }
                }

                // Fallback nếu cache bị miss (DB query & populate cache)
                if (providerRes == null) {
                    var muaOpt = muaProfileRepository.findById(muaId);
                    if (muaOpt.isPresent()) {
                        MuaProfileEntity mua = muaOpt.get();
                        List<ServicePackageEntity> packages = servicePackageRepository.findByMuaIdAndIsAvailableTrue(mua.getId());
                        BigDecimal startingPrice = packages.stream()
                                .map(ServicePackageEntity::getPrice)
                                .min(BigDecimal::compareTo)
                                .orElse(BigDecimal.valueOf(350000));
                        providerRes = telemetryProviderMapper.fromMuaEntity(mua, startingPrice);
                        cacheMuaSummary(mua);
                    }
                }

                if (providerRes != null) {
                    Double dist = distanceMap.get(muaId);
                    providerRes.setDistanceKm(dist != null ? BigDecimal.valueOf(dist).setScale(2, RoundingMode.HALF_UP).doubleValue() : null);

                    // 3. Bảo vệ riêng tư (Privacy Fuzzing / Jittering +/- 30-50m) cho tọa độ công khai trên radar
                    org.springframework.data.geo.Point pt = coordMap.get(muaId);
                    if (pt != null) {
                        double[] fuzzed = GeoDistanceUtils.applyPrivacyFuzzing(pt.getY(), pt.getX());
                        providerRes.setFuzzedLatitude(fuzzed[0]);
                        providerRes.setFuzzedLongitude(fuzzed[1]);
                    }

                    // Lọc theo rating tối thiểu nếu có yêu cầu
                    if (req.getMinRating() == null || (providerRes.getRatingAvg() != null && providerRes.getRatingAvg().compareTo(req.getMinRating()) >= 0)) {
                        results.add(providerRes);
                    }
                }
            }
        }

        // 4. Bổ sung các Chi nhánh Studio / Agency cố định gần nhất
        List<AgencyBranchEntity> branches = agencyBranchRepository.findByIsActiveTrue();
        for (AgencyBranchEntity branch : branches) {
            double dist = GeoDistanceUtils.calculateDistanceKm(
                    req.getLatitude(), req.getLongitude(),
                    branch.getLatitude().doubleValue(), branch.getLongitude().doubleValue()
            );

            if (dist <= radiusKm) {
                double[] fuzzed = GeoDistanceUtils.applyPrivacyFuzzing(
                        branch.getLatitude().doubleValue(), branch.getLongitude().doubleValue()
                );

                NearbyProviderRes branchRes = telemetryProviderMapper.fromAgencyBranch(branch, dist, fuzzed);
                if (req.getMinRating() == null || branchRes.getRatingAvg().compareTo(req.getMinRating()) >= 0) {
                    results.add(branchRes);
                }
            }
        }

        // Sắp xếp theo khoảng cách tăng dần
        results.sort(Comparator.comparing(NearbyProviderRes::getDistanceKm, Comparator.nullsLast(Comparator.naturalOrder())));

        return results;
    }

    @Override
    public LiveTrackingRes getLiveTripTracking(Long bookingId) {
        Map<Object, Object> raw = redisGeoService.getTripLivePosition(bookingId);
        if (raw == null || raw.isEmpty()) {
            // 1. Kiểm tra xem đơn đã nén lộ trình chưa
            var tripOpt = bookingTripRepository.findByBookingId(bookingId);
            if (tripOpt.isPresent()) {
                BookingTripEntity trip = tripOpt.get();
                return LiveTrackingRes.builder()
                        .bookingId(bookingId)
                        .muaId(trip.getMua() != null ? trip.getMua().getId() : null)
                        .speed(0.0)
                        .heading(0.0)
                        .streamMode(AdaptiveStreamMode.STOPPED)
                        .updatedAt(trip.getEndTime())
                        .build();
            }

            // 2. Fallback: Nếu thợ đã nhận đơn nhưng chưa bấm stream tọa độ
            var bookingOpt = bookingRepository.findById(bookingId);
            if (bookingOpt.isPresent() && bookingOpt.get().getMua() != null) {
                BookingEntity booking = bookingOpt.get();
                Long muaId = booking.getMua().getId();
                double destLat = booking.getDestinationLatitude() != null ? booking.getDestinationLatitude().doubleValue() : 10.776889;
                double destLng = booking.getDestinationLongitude() != null ? booking.getDestinationLongitude().doubleValue() : 106.700806;

                double initialLat = destLat + 0.009;
                double initialLng = destLng + 0.009;
                double distKm = GeoDistanceUtils.calculateDistanceKm(initialLat, initialLng, destLat, destLng);
                double speed = 35.0;
                int eta = (int) Math.max(1, Math.ceil(distKm * 3.0));
                AdaptiveStreamMode mode = AdaptiveStreamMode.MOVING;

                if (booking.getStatus() == BookingStatus.ARRIVED
                        || booking.getStatus() == BookingStatus.IN_PROGRESS
                        || booking.getStatus() == BookingStatus.COMPLETED) {
                    initialLat = destLat;
                    initialLng = destLng;
                    distKm = 0.0;
                    speed = 0.0;
                    eta = 0;
                    mode = AdaptiveStreamMode.STOPPED;
                } else {
                    try {
                        var positions = stringRedisTemplate.opsForGeo().position(TelemetryConstants.REDIS_KEY_MUA_GEO, String.valueOf(muaId));
                        if (positions != null && !positions.isEmpty() && positions.get(0) != null) {
                            initialLng = positions.get(0).getX();
                            initialLat = positions.get(0).getY();
                            distKm = GeoDistanceUtils.calculateDistanceKm(initialLat, initialLng, destLat, destLng);
                            if (distKm * 1000 < TelemetryConstants.ADAPTIVE_APPROACHING_DISTANCE_METERS) {
                                mode = AdaptiveStreamMode.APPROACHING;
                            }
                        }
                    } catch (Exception ignored) {}
                }

                redisGeoService.updateTripLivePosition(
                        bookingId, muaId, initialLat, initialLng,
                        speed, 90.0, 5.0, eta, distKm * 1000, mode
                );

                return LiveTrackingRes.builder()
                        .bookingId(bookingId)
                        .muaId(muaId)
                        .currentLat(initialLat)
                        .currentLng(initialLng)
                        .speed(speed)
                        .heading(90.0)
                        .accuracy(5.0)
                        .etaMinutes(eta)
                        .distanceRemainingMeters(distKm * 1000)
                        .streamMode(mode)
                        .updatedAt(Instant.now())
                        .build();
            }

            throw new CustomBusinessException(ErrorCodes.ERR_TRIP_NOT_FOUND, "ERR_TRIP_NOT_FOUND", HttpStatus.NOT_FOUND);
        }

        LiveTrackingRes res = new LiveTrackingRes();
        res.setBookingId(bookingId);

        if (raw.containsKey("muaId")) {
            res.setMuaId(Long.parseLong(raw.get("muaId").toString()));
        }
        if (raw.containsKey("currentLat")) {
            res.setCurrentLat(Double.parseDouble(raw.get("currentLat").toString()));
        }
        if (raw.containsKey("currentLng")) {
            res.setCurrentLng(Double.parseDouble(raw.get("currentLng").toString()));
        }
        if (raw.containsKey("speed")) {
            res.setSpeed(Double.parseDouble(raw.get("speed").toString()));
        }
        if (raw.containsKey("heading")) {
            res.setHeading(Double.parseDouble(raw.get("heading").toString()));
        }
        if (raw.containsKey("accuracy")) {
            res.setAccuracy(Double.parseDouble(raw.get("accuracy").toString()));
        }
        if (raw.containsKey("etaMinutes")) {
            res.setEtaMinutes(Integer.parseInt(raw.get("etaMinutes").toString()));
        }
        if (raw.containsKey("distanceRemainingMeters")) {
            res.setDistanceRemainingMeters(Double.parseDouble(raw.get("distanceRemainingMeters").toString()));
        }
        if (raw.containsKey("streamMode")) {
            res.setStreamMode(AdaptiveStreamMode.valueOf(raw.get("streamMode").toString()));
        }
        if (raw.containsKey("updatedAt")) {
            res.setUpdatedAt(Instant.parse(raw.get("updatedAt").toString()));
        }

        // Nếu trạng thái đơn đã là ARRIVED / IN_PROGRESS / COMPLETED thì tự động ép về STOPPED và điểm đến
        var bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isPresent()) {
            BookingEntity booking = bookingOpt.get();
            if (booking.getStatus() == BookingStatus.ARRIVED
                    || booking.getStatus() == BookingStatus.IN_PROGRESS
                    || booking.getStatus() == BookingStatus.COMPLETED) {
                res.setStreamMode(AdaptiveStreamMode.STOPPED);
                res.setSpeed(0.0);
                res.setDistanceRemainingMeters(0.0);
                res.setEtaMinutes(0);
                if (booking.getDestinationLatitude() != null && booking.getDestinationLongitude() != null) {
                    res.setCurrentLat(booking.getDestinationLatitude().doubleValue());
                    res.setCurrentLng(booking.getDestinationLongitude().doubleValue());
                }
            }
        }

        return res;
    }

    @Override
    public TelemetryLogRes getBookingTripHistory(Long bookingId) {
        var tripOpt = bookingTripRepository.findByBookingId(bookingId);
        if (tripOpt.isPresent()) {
            return telemetryLogMapper.toResFromTrip(tripOpt.get());
        }

        // Nếu chưa nén thành LineString thì tổng hợp các điểm từ bảng phân vùng telemetry_logs
        List<TelemetryLogEntity> logs = telemetryLogRepository.findByBookingIdOrderByRecordedAtAsc(bookingId);
        if (logs == null || logs.isEmpty()) {
            throw new CustomBusinessException(ErrorCodes.ERR_TRIP_NOT_FOUND, "ERR_TRIP_NOT_FOUND", HttpStatus.NOT_FOUND);
        }

        return telemetryLogMapper.toResFromLogs(bookingId, logs);
    }

    private void cacheMuaSummary(MuaProfileEntity mua) {
        try {
            Map<String, Object> summary = new HashMap<>();
            summary.put("providerId", mua.getId());
            summary.put("providerType", ProviderType.FREELANCE_MUA.name());
            summary.put("code", mua.getMuaCode());
            summary.put("fullName", mua.getUser() != null ? mua.getUser().getFullName() : "MUA " + mua.getMuaCode());
            summary.put("avatarUrl", mua.getUser() != null ? mua.getUser().getAvatarUrl() : null);
            summary.put("ratingAvg", mua.getRatingAvg() != null ? mua.getRatingAvg().doubleValue() : 5.0);

            List<ServicePackageEntity> packages = servicePackageRepository.findByMuaIdAndIsAvailableTrue(mua.getId());
            BigDecimal startingPrice = packages.stream()
                    .map(ServicePackageEntity::getPrice)
                    .min(BigDecimal::compareTo)
                    .orElse(BigDecimal.valueOf(350000));
            summary.put("startingPrice", startingPrice.doubleValue());

            String json = objectMapper.writeValueAsString(summary);
            redisGeoService.setMuaSummary(mua.getId(), json, TelemetryConstants.SUMMARY_TTL_SECONDS);
        } catch (Exception e) {
            log.error("Failed to cache MUA summary for {}: {}", mua.getId(), e.getMessage());
        }
    }

    private void validateCoordinates(Double lat, Double lng) {
        if (lat == null || lng == null || lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
            throw new CustomBusinessException(ErrorCodes.ERR_LOCATION_INVALID, "ERR_LOCATION_INVALID", HttpStatus.BAD_REQUEST);
        }
    }
}
