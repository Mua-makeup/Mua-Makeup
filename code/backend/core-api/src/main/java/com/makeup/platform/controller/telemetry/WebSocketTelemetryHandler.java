package com.makeup.platform.controller.telemetry;

import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;
import com.makeup.platform.service.telemetry.TelemetryStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketTelemetryHandler {

    private final TelemetryStreamService telemetryStreamService;

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

        if (userId != null) {
            return telemetryStreamService.processLocationStream(userId, req);
        } else {
            log.warn("STOMP message received without authenticated user ID, skipping telemetry processing");
            return null;
        }
    }
}
