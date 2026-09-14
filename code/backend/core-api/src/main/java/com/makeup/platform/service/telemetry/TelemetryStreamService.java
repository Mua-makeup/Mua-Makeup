package com.makeup.platform.service.telemetry;

import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.request.telemetry.ToggleAvailabilityReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;

public interface TelemetryStreamService {

    String toggleAvailability(Long userId, ToggleAvailabilityReq req);

    LiveTrackingRes processLocationStream(Long userId, LocationStreamReq req);
}
