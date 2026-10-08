package com.makeup.platform.service.telemetry.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.TelemetryConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.GeoDistanceUtils;
import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.request.telemetry.ToggleAvailabilityReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.entity.mua.MuaCertificateItem;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AdaptiveStreamMode;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.entity.telemetry.ProviderType;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.telemetry.RedisGeoService;
import com.makeup.platform.service.telemetry.TelemetryLogService;
import com.makeup.platform.service.telemetry.TelemetryStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryStreamServiceImpl implements TelemetryStreamService {

    private final MuaProfileRepository muaProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final BookingRepository bookingRepository;
    private final RedisGeoService redisGeoService;
    private final TelemetryLogService telemetryLogService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public String toggleAvailability(Long userId, ToggleAvailabilityReq req) {
        log.info("Toggling availability for userId={}, isAvailable={}", userId, req.getIsAvailable());

        MuaProfileEntity mua = muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(req.getIsAvailable())) {
            // Đối với thợ Studio chính thức, Studio bảo lãnh tay nghề nên cho phép bật GPS trực tuyến
            boolean isStaffOfAgency = agencyStaffRepository.existsActiveMembershipByMuaId(mua.getId());
            if (!isStaffOfAgency) {
                List<MuaCertificateItem> certs = mua.getCertificates();
                boolean hasVerifiedCert = certs != null && certs.stream()
                        .anyMatch(c -> Boolean.TRUE.equals(c.getIsVerified()) || "VERIFIED".equalsIgnoreCase(c.getStatus()));
                if (!hasVerifiedCert) {
                    log.warn("MUA {} attempted to go ONLINE without verified certificates", mua.getId());
                    if (certs == null || certs.isEmpty()) {
                        throw new CustomBusinessException(ErrorCodes.ERR_MUA_CERTIFICATE_NOT_VERIFIED,
                                "mua.certificate_missing_cannot_operate", HttpStatus.FORBIDDEN);
                    }
                    boolean hasPending = certs.stream()
                            .anyMatch(c -> "PENDING".equalsIgnoreCase(c.getStatus()) || (!Boolean.TRUE.equals(c.getIsVerified()) && !"REJECTED".equalsIgnoreCase(c.getStatus())));
                    if (hasPending) {
                        throw new CustomBusinessException(ErrorCodes.ERR_MUA_CERTIFICATE_NOT_VERIFIED,
                                "mua.certificate_pending_cannot_operate", HttpStatus.FORBIDDEN);
                    }
                    // All uploaded certificates are rejected
                    throw new CustomBusinessException(ErrorCodes.ERR_MUA_CERTIFICATE_NOT_VERIFIED,
                            "mua.certificate_rejected_cannot_operate", HttpStatus.FORBIDDEN);
                }
            }

            if (mua.getBaseAddressLat() == null || mua.getBaseAddressLng() == null) {
                throw new CustomBusinessException(ErrorCodes.ERR_LOCATION_INVALID, "ERR_LOCATION_INVALID",
                        HttpStatus.BAD_REQUEST);
            }
            validateCoordinates(mua.getBaseAddressLat().doubleValue(), mua.getBaseAddressLng().doubleValue());

            // 1. Thêm vào Redis GEO
            redisGeoService.addActiveMua(mua.getId(), mua.getBaseAddressLat().doubleValue(), mua.getBaseAddressLng().doubleValue());

            // 2. Kích hoạt Heartbeat 60s
            redisGeoService.setHeartbeat(mua.getId(), TelemetryConstants.HEARTBEAT_TTL_SECONDS);

            // 3. Tạo JSON Profile tóm tắt và đồng bộ vào Redis String (TTL 24h)
            cacheMuaSummary(mua);

            // 4. Cập nhật Database
            mua.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
            mua.setIsOnline(true);
            mua.setIsBusy(false);
            muaProfileRepository.save(mua);

            log.info("MUA {} is now AVAILABLE on Redis GEO", mua.getId());
            return "telemetry.availability_online_success";
        } else {
            // 1. Xóa khỏi Redis GEO
            redisGeoService.removeActiveMua(mua.getId());

            // 2. Xóa Heartbeat và Cache Summary
            redisGeoService.removeHeartbeat(mua.getId());
            redisGeoService.removeMuaSummary(mua.getId());

            // 3. Cập nhật Database
            mua.setAvailabilityStatus(AvailabilityStatus.OFFLINE);
            mua.setIsOnline(false);
            mua.setIsBusy(false);
            muaProfileRepository.save(mua);

            log.info("MUA {} switched to OFFLINE", mua.getId());
            return "telemetry.availability_offline_success";
        }
    }

    @Override
    public LiveTrackingRes processLocationStream(Long userId, LocationStreamReq req) {
        validateCoordinates(req.getLatitude(), req.getLongitude());

        MuaProfileEntity mua = muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND", HttpStatus.NOT_FOUND));

        double speed = req.getSpeed() != null ? req.getSpeed() : 0.0;
        double heading = req.getHeading() != null ? req.getHeading() : 0.0;
        double accuracy = req.getAccuracy() != null ? req.getAccuracy() : 0.0;

        // 1. Lọc nhiễu GPS (GPS Noise & Anti-Spoofing Filter)
        boolean isNoiseOrSpoof = false;
        if (req.getAccuracy() != null && req.getAccuracy() > TelemetryConstants.MAX_ACCURACY_METERS) {
            log.warn("GPS accuracy too low (accuracy={}m > {}m) for MUA {}, skipping broadcast",
                    req.getAccuracy(), TelemetryConstants.MAX_ACCURACY_METERS, mua.getId());
            isNoiseOrSpoof = true;
        }

        if (speed > TelemetryConstants.MAX_SPEED_KMH) {
            log.warn("Abnormal speed detected (speed={}km/h > {}km/h) for MUA {}, skipping broadcast",
                    speed, TelemetryConstants.MAX_SPEED_KMH, mua.getId());
            isNoiseOrSpoof = true;
        }

        // 2. Gia hạn Heartbeat 60s
        redisGeoService.setHeartbeat(mua.getId(), TelemetryConstants.HEARTBEAT_TTL_SECONDS);

        // Trip GPS must not move the receiving-area GEO index.

        // 4. Lấy tọa độ điểm hẹn cố định của Khách hàng
        Double destLat = null;
        Double destLng = null;
        if (req.getBookingId() != null) {
            Map<Object, Object> tripData = redisGeoService.getTripLivePosition(req.getBookingId());
            if (tripData != null && tripData.containsKey("destinationLat") && tripData.containsKey("destinationLng")) {
                try {
                    destLat = Double.parseDouble(tripData.get("destinationLat").toString());
                    destLng = Double.parseDouble(tripData.get("destinationLng").toString());
                } catch (NumberFormatException ignored) {
                }
            }
            if (destLat == null || destLng == null) {
                var bookingOpt = bookingRepository.findById(req.getBookingId());
                if (bookingOpt.isPresent()) {
                    BookingEntity booking = bookingOpt.get();
                    if (booking.getDestinationLatitude() != null) {
                        destLat = booking.getDestinationLatitude().doubleValue();
                    }
                    if (booking.getDestinationLongitude() != null) {
                        destLng = booking.getDestinationLongitude().doubleValue();
                    }
                }
            }
        }

        // 5. Xác định khoảng cách còn lại (Meters)
        Double distanceRemainingMeters = req.getDistanceRemainingMeters();
        if (distanceRemainingMeters == null && destLat != null && destLng != null) {
            // Hệ số uốn lượn đường phố đô thị 1.35x (Detour Road Factor)
            distanceRemainingMeters = GeoDistanceUtils.calculateDistanceMeters(
                    req.getLatitude(), req.getLongitude(), destLat, destLng) * 1.35;
        }

        // 6. Tính toán Adaptive Sampling Rate Mode
        AdaptiveStreamMode mode;
        if (distanceRemainingMeters != null && distanceRemainingMeters < TelemetryConstants.ADAPTIVE_APPROACHING_DISTANCE_METERS) {
            mode = AdaptiveStreamMode.APPROACHING; // 3s
        } else if (speed < TelemetryConstants.ADAPTIVE_STOPPED_SPEED_THRESHOLD_KMH) {
            mode = AdaptiveStreamMode.STOPPED; // 20s
        } else {
            mode = AdaptiveStreamMode.MOVING; // 5s
        }

        // 7. Thuật toán Hybrid ETA tối ưu: chống nhảy số khi dừng đèn đỏ và phản ánh đúng tốc độ
        Integer etaMinutes = calculateOptimalEta(distanceRemainingMeters, speed);

        LiveTrackingRes res = LiveTrackingRes.builder()
                .bookingId(req.getBookingId())
                .muaId(mua.getId())
                .currentLat(req.getLatitude())
                .currentLng(req.getLongitude())
                .destinationLat(destLat)
                .destinationLng(destLng)
                .speed(speed)
                .heading(heading)
                .accuracy(accuracy)
                .etaMinutes(etaMinutes)
                .distanceRemainingMeters(distanceRemainingMeters)
                .streamMode(mode)
                .updatedAt(Instant.now())
                .build();

        // 8. Nếu không bị nhiễu và có bookingId thì cập nhật Redis Hash & broadcast STOMP
        if (!isNoiseOrSpoof && req.getBookingId() != null) {
            // Cập nhật Redis Hash
            redisGeoService.updateTripLivePosition(
                    req.getBookingId(), mua.getId(), req.getLatitude(), req.getLongitude(),
                    speed, heading, accuracy, etaMinutes, distanceRemainingMeters, mode,
                    destLat, destLng
            );

            // Broadcast qua STOMP topic
            String topic = TelemetryConstants.TOPIC_GPS_STREAM_PREFIX + req.getBookingId();
            res.setLocationStatus("LIVE");
            messagingTemplate.convertAndSend(topic, res);
            log.debug("Broadcasted live telemetry to topic {}", topic);

            // 6. Dead-Reckoning Filter trước khi ghi xuống Database (Giảm > 85% I/O Disk
            // Write)
            checkAndTriggerDeadReckoningLog(mua.getId(), req);
        }

        return res;
    }

    private void checkAndTriggerDeadReckoningLog(Long muaId, LocationStreamReq req) {
        String lastPointStr = redisGeoService.getLastRecordedPoint(req.getBookingId());
        Instant now = Instant.now();

        boolean shouldRecord = false;
        if (lastPointStr == null) {
            shouldRecord = true;
        } else {
            try {
                String[] parts = lastPointStr.split(",");
                double prevLat = Double.parseDouble(parts[0]);
                double prevLng = Double.parseDouble(parts[1]);
                long prevEpochMillis = Long.parseLong(parts[2]);

                double deltaDistance = GeoDistanceUtils.calculateDistanceMeters(prevLat, prevLng, req.getLatitude(),
                        req.getLongitude());
                long deltaSeconds = (now.toEpochMilli() - prevEpochMillis) / 1000;

                if (deltaDistance >= TelemetryConstants.DEAD_RECKONING_DISTANCE_METERS
                        || deltaSeconds >= TelemetryConstants.DEAD_RECKONING_TIME_SECONDS) {
                    shouldRecord = true;
                }
            } catch (Exception e) {
                log.warn("Error parsing dead reckoning point: {}", e.getMessage());
                shouldRecord = true;
            }
        }

        if (shouldRecord) {
            redisGeoService.setLastRecordedPoint(req.getBookingId(), req.getLatitude(), req.getLongitude(), now);
            telemetryLogService.saveTelemetryLog(muaId, req);
        }
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

            // Lấy giá khởi điểm từ các gói khả dụng
            List<ServicePackageEntity> packages = servicePackageRepository.findByMuaIdAndIsAvailableTrue(mua.getId());
            BigDecimal startingPrice = packages.stream()
                    .map(ServicePackageEntity::getPrice)
                    .min(BigDecimal::compareTo)
                    .orElse(BigDecimal.valueOf(350000));
            summary.put("startingPrice", startingPrice.doubleValue());
            summary.put("maxServiceRadiusKm", mua.getMaxServiceRadiusKm() != null ? mua.getMaxServiceRadiusKm().doubleValue() : 15.0);

            String json = objectMapper.writeValueAsString(summary);
            redisGeoService.setMuaSummary(mua.getId(), json, TelemetryConstants.SUMMARY_TTL_SECONDS);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize MUA summary for {}: {}", mua.getId(), e.getMessage());
        }
    }

    @Override
    public void recordHeartbeat(Long userId) {
        MuaProfileEntity mua = muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND", HttpStatus.NOT_FOUND));
        if (Boolean.TRUE.equals(mua.getIsOnline())) {
            redisGeoService.setHeartbeat(mua.getId(), TelemetryConstants.HEARTBEAT_TTL_SECONDS);
            if (mua.getBaseAddressLat() != null && mua.getBaseAddressLng() != null) {
                redisGeoService.addActiveMua(mua.getId(), mua.getBaseAddressLat().doubleValue(), mua.getBaseAddressLng().doubleValue());
            } else {
                redisGeoService.removeActiveMua(mua.getId());
            }
            log.debug("Renewed heartbeat for online MUA {} (TTL={}s)", mua.getId(),
                    TelemetryConstants.HEARTBEAT_TTL_SECONDS);
        }
    }

    private void validateCoordinates(Double lat, Double lng) {
        if (lat == null || lng == null || lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
            throw new CustomBusinessException(ErrorCodes.ERR_LOCATION_INVALID, "ERR_LOCATION_INVALID",
                    HttpStatus.BAD_REQUEST);
        }
    }

    private Integer calculateOptimalEta(Double distanceRemainingMeters, double speedKmh) {
        if (distanceRemainingMeters == null || distanceRemainingMeters <= 25.0) {
            return 0;
        }

        // Tốc độ cơ sở chuẩn xe máy đô thị tại Việt Nam (25 km/h), đồng bộ 100% giữa API và App thợ
        double urbanBaselineSpeedKmh = 25.0;
        double effectiveSpeedKmh = urbanBaselineSpeedKmh;

        // Nếu xe đang di chuyển thực tế >= 10 km/h, kết hợp tốc độ tức thời và cơ sở
        if (speedKmh >= 10.0) {
            effectiveSpeedKmh = (urbanBaselineSpeedKmh * 0.6) + (Math.min(speedKmh, 50.0) * 0.4);
        }

        effectiveSpeedKmh = Math.max(15.0, Math.min(effectiveSpeedKmh, 50.0));
        double distanceKm = distanceRemainingMeters / 1000.0;
        int etaMinutes = (int) Math.ceil((distanceKm / effectiveSpeedKmh) * 60);

        return Math.max(1, etaMinutes);
    }
}
