package com.makeup.platform.service.telemetry;

import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.response.telemetry.TelemetryLogRes;

public interface TelemetryLogService {

    void saveTelemetryLog(Long muaId, LocationStreamReq req);

    TelemetryLogRes compressBookingTrip(Long userId, Long bookingId);
}
