package com.makeup.platform.controller.telemetry;

import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.service.telemetry.RedisGeoService;
import com.makeup.platform.service.telemetry.TelemetryStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketTelemetryHandler {

    private final TelemetryStreamService telemetryStreamService;
    private final MuaProfileRepository muaProfileRepository;
    private final RedisGeoService redisGeoService;

    @MessageMapping("/telemetry/location")
    public LiveTrackingRes handleLocationStream(@Payload LocationStreamReq req, Principal principal) {
        log.debug("Received STOMP telemetry stream location from principal={}", principal != null ? principal.getName() : "anonymous");

        Long userId = null;
        if (principal != null) {
            try {
                userId = Long.parseLong(principal.getName());
            } catch (NumberFormatException e) {
                log.warn("Principal name is not a numeric userId: {}", principal.getName());
            }
        }

        // Fallback cho testing Postman STOMP nếu chưa đính kèm STOMP Auth header
        if (userId == null) {
            userId = resolveFallbackUserId(req);
        }

        if (userId != null) {
            return telemetryStreamService.processLocationStream(userId, req);
        } else {
            log.warn("STOMP message received without authenticated user ID and could not resolve MUA, skipping telemetry processing");
            return null;
        }
    }

    private Long resolveFallbackUserId(LocationStreamReq req) {
        // 1. Kiểm tra nếu bookingId đã có trip trong Redis Hash -> lấy userId của MUA đó
        if (req != null && req.getBookingId() != null) {
            try {
                Map<Object, Object> tripData = redisGeoService.getTripLivePosition(req.getBookingId());
                if (tripData != null && tripData.containsKey("muaId")) {
                    Long muaId = Long.parseLong(tripData.get("muaId").toString());
                    var muaOpt = muaProfileRepository.findById(muaId);
                    if (muaOpt.isPresent() && muaOpt.get().getUser() != null) {
                        Long userId = muaOpt.get().getUser().getId();
                        log.info("Resolved userId={} from active booking trip for bookingId={}", userId, req.getBookingId());
                        return userId;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to resolve MUA from trip hash: {}", e.getMessage());
            }
        }

        // 2. Lấy MUA đang AVAILABLE đầu tiên trong hệ thống (hoặc MUA bất kỳ)
        return muaProfileRepository.findAll().stream()
                .filter(m -> AvailabilityStatus.AVAILABLE.equals(m.getAvailabilityStatus()) || Boolean.TRUE.equals(m.getIsOnline()))
                .filter(m -> m.getUser() != null)
                .map(m -> m.getUser().getId())
                .findFirst()
                .or(() -> muaProfileRepository.findAll().stream()
                        .filter(m -> m.getUser() != null)
                        .map(m -> m.getUser().getId())
                        .findFirst())
                .orElse(null);
    }
}


