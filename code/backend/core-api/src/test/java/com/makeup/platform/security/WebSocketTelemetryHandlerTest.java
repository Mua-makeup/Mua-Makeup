package com.makeup.platform.security;

import com.makeup.platform.controller.telemetry.WebSocketTelemetryHandler;
import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.service.telemetry.TelemetryStreamService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WebSocketTelemetryHandlerTest {
    @Test
    void neverInfersIdentityForAnonymousTelemetry() {
        TelemetryStreamService service = mock(TelemetryStreamService.class);
        WebSocketTelemetryHandler handler = new WebSocketTelemetryHandler(service);
        LocationStreamReq request = LocationStreamReq.builder().bookingId(10L).build();
        assertThrows(AccessDeniedException.class, () -> handler.handleLocationStream(request, null));
        assertThrows(AccessDeniedException.class, () -> handler.handleLocationStream(request, () -> "anonymous"));
        verifyNoInteractions(service);
        handler.handleLocationStream(request, () -> "7");
        verify(service).processLocationStream(7L, request);
    }
}
