package com.makeup.platform.controller.telemetry;

import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;
import com.makeup.platform.service.telemetry.TelemetryStreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class WebSocketTelemetryHandler {
    private final TelemetryStreamService telemetryStreamService;

    @MessageMapping("/telemetry/location")
    @SendToUser("/queue/telemetry")
    public LiveTrackingRes handleLocationStream(@Valid @Payload LocationStreamReq req, Principal principal) {
        if (principal == null) throw new AccessDeniedException("Authentication required");
        Long userId;
        try {
            userId = Long.valueOf(principal.getName());
        } catch (NumberFormatException exception) {
            throw new AccessDeniedException("Authentication required");
        }
        return telemetryStreamService.processLocationStream(userId, req);
    }
}


