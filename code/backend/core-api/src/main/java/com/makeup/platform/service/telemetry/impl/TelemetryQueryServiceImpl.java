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
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AdaptiveStreamMode;
import com.makeup.platform.entity.telemetry.AgencyBranchEntity;
import com.makeup.platform.entity.telemetry.BookingTripEntity;
import com.makeup.platform.entity.telemetry.ProviderType;
import com.makeup.platform.entity.telemetry.TelemetryLogEntity;
import com.makeup.platform.mapper.telemetry.TelemetryLogMapper;
import com.makeup.platform.mapper.telemetry.TelemetryProviderMapper;
import com.makeup.platform.entity.booking.BookingEntity;
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
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional(readOnly = true)
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

            Map<Long, NearbyProviderRes> providers = new HashMap<>();
            List<Long> cacheMisses = new ArrayList<>();
            for (int i = 0; i < muaIds.size(); i++) {
                Long muaId = muaIds.get(i);
                String summaryJson = summaries != null && i < summaries.size() ? summaries.get(i) : null;
                if (summaryJson != null) {
                    try {
                        Map<String, Object> summary = objectMapper.readValue(summaryJson, new TypeReference<>() {});
                        NearbyProviderRes provider = telemetryProviderMapper.fromSummaryMap(summary);
                        if (provider != null) providers.put(muaId, provider);
                    } catch (Exception ex) {
                        log.warn("Invalid cached summary for MUA {}", muaId, ex);
                    }
                }
                if (!providers.containsKey(muaId)) cacheMisses.add(muaId);
            }
            for (int offset = 0; offset < cacheMisses.size(); offset += 250) {
                List<Long> batch = cacheMisses.subList(offset, Math.min(offset + 250, cacheMisses.size()));
                Map<Long, BigDecimal> prices = new HashMap<>();
                for (var price : servicePackageRepository.findStartingPrices(batch)) {
                    if (price.getStartingPrice() != null) prices.put(price.getMuaId(), price.getStartingPrice());
                }
                for (MuaProfileEntity mua : muaProfileRepository.findDispatchCandidatesByIdIn(batch)) {
                    BigDecimal startingPrice = prices.getOrDefault(mua.getId(), BigDecimal.valueOf(350000));
                    providers.put(mua.getId(), telemetryProviderMapper.fromMuaEntity(mua, startingPrice));
                    cacheMuaSummary(mua, startingPrice);
                }
            }
            for (Long muaId : muaIds) {
                NearbyProviderRes providerRes = providers.get(muaId);
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
    @Transactional(readOnly = true)
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
                        .locationStatus("COMPLETED")
                        .updatedAt(trip.getEndTime())
                        .build();
            }

            // 2. Fallback: Nếu thợ đã nhận đơn nhưng chưa bấm stream tọa độ
            var bookingOpt = bookingRepository.findById(bookingId);
            if (bookingOpt.isPresent() && bookingOpt.get().getMua() != null) {
                BookingEntity booking = bookingOpt.get();
                MuaProfileEntity mua = booking.getMua();
                LiveTrackingRes fallback = LiveTrackingRes.builder()
                        .bookingId(bookingId)
                        .muaId(mua.getId())
                        .destinationLat(booking.getDestinationLatitude() != null ? booking.getDestinationLatitude().doubleValue() : null)
                        .destinationLng(booking.getDestinationLongitude() != null ? booking.getDestinationLongitude().doubleValue() : null)
                        .locationStatus("UNAVAILABLE")
                        .build();
                if (mua.getLastKnownLat() != null && mua.getLastKnownLng() != null
                        && mua.getLastKnownUpdatedAt() != null) {
                    fallback.setCurrentLat(mua.getLastKnownLat().doubleValue());
                    fallback.setCurrentLng(mua.getLastKnownLng().doubleValue());
                    fallback.setLocationStatus("LAST_KNOWN");
                    if (fallback.getDestinationLat() != null && fallback.getDestinationLng() != null) {
                        double dist = GeoDistanceUtils.calculateDistanceMeters(
                                fallback.getCurrentLat(), fallback.getCurrentLng(),
                                fallback.getDestinationLat(), fallback.getDestinationLng()
                        );
                        fallback.setDistanceRemainingMeters(dist);
                        fallback.setEtaMinutes(dist <= 25.0 ? 0 : Math.max(1, (int) Math.ceil((dist / 1000.0) / 25.0 * 60)));
                        fallback.setStreamMode(dist < 300.0 ? AdaptiveStreamMode.APPROACHING : AdaptiveStreamMode.MOVING);
                    }
                }
                return fallback;
            }

            throw new CustomBusinessException(ErrorCodes.ERR_TRIP_NOT_FOUND, "ERR_TRIP_NOT_FOUND", HttpStatus.NOT_FOUND);
        }

        LiveTrackingRes res = new LiveTrackingRes();
        res.setBookingId(bookingId);
        res.setLocationStatus("LIVE");

        if (raw.containsKey("muaId")) {
            res.setMuaId(Long.parseLong(raw.get("muaId").toString()));
        }
        if (raw.containsKey("currentLat")) {
            res.setCurrentLat(Double.parseDouble(raw.get("currentLat").toString()));
        }
        if (raw.containsKey("currentLng")) {
            res.setCurrentLng(Double.parseDouble(raw.get("currentLng").toString()));
        }
        if (raw.containsKey("destinationLat")) {
            res.setDestinationLat(Double.parseDouble(raw.get("destinationLat").toString()));
        }
        if (raw.containsKey("destinationLng")) {
            res.setDestinationLng(Double.parseDouble(raw.get("destinationLng").toString()));
        }
        if (res.getDestinationLat() == null || res.getDestinationLng() == null) {
            var bOpt = bookingRepository.findById(bookingId);
            if (bOpt.isPresent()) {
                BookingEntity b = bOpt.get();
                if (b.getDestinationLatitude() != null) {
                    res.setDestinationLat(b.getDestinationLatitude().doubleValue());
                }
                if (b.getDestinationLongitude() != null) {
                    res.setDestinationLng(b.getDestinationLongitude().doubleValue());
                }
            }
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

        // Tự động tính toán cự ly và thời gian đến tức thời nếu Redis chưa kịp lưu
        if (res.getDistanceRemainingMeters() == null && res.getCurrentLat() != null && res.getCurrentLng() != null
                && res.getDestinationLat() != null && res.getDestinationLng() != null) {
            double dist = GeoDistanceUtils.calculateDistanceMeters(
                    res.getCurrentLat(), res.getCurrentLng(),
                    res.getDestinationLat(), res.getDestinationLng()
            );
            res.setDistanceRemainingMeters(dist);
            if (res.getEtaMinutes() == null) {
                res.setEtaMinutes(dist <= 25.0 ? 0 : Math.max(1, (int) Math.ceil((dist / 1000.0) / 25.0 * 60)));
            }
            if (res.getStreamMode() == null) {
                res.setStreamMode(dist < 300.0 ? AdaptiveStreamMode.APPROACHING : AdaptiveStreamMode.MOVING);
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

    private void cacheMuaSummary(MuaProfileEntity mua, BigDecimal startingPrice) {
        try {
            Map<String, Object> summary = new HashMap<>();
            summary.put("providerId", mua.getId());
            summary.put("providerType", ProviderType.FREELANCE_MUA.name());
            summary.put("code", mua.getMuaCode());
            summary.put("fullName", mua.getUser() != null ? mua.getUser().getFullName() : "MUA " + mua.getMuaCode());
            summary.put("avatarUrl", mua.getUser() != null ? mua.getUser().getAvatarUrl() : null);
            summary.put("ratingAvg", mua.getRatingAvg() != null ? mua.getRatingAvg().doubleValue() : 5.0);

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
