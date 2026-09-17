package com.makeup.platform.service.telemetry;

import com.makeup.platform.dto.request.telemetry.NearbyProvidersReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;
import com.makeup.platform.dto.response.telemetry.NearbyProviderRes;
import com.makeup.platform.dto.response.telemetry.TelemetryLogRes;

import java.util.List;

public interface TelemetryQueryService {

    List<NearbyProviderRes> findNearbyProviders(NearbyProvidersReq req);

    LiveTrackingRes getLiveTripTracking(Long bookingId);

    TelemetryLogRes getBookingTripHistory(Long bookingId);
}
