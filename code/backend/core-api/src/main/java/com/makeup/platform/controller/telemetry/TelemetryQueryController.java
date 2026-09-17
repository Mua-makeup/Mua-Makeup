package com.makeup.platform.controller.telemetry;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.telemetry.NearbyProvidersReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;
import com.makeup.platform.dto.response.telemetry.NearbyProviderRes;
import com.makeup.platform.dto.response.telemetry.TelemetryLogRes;
import com.makeup.platform.service.telemetry.TelemetryLogService;
import com.makeup.platform.service.telemetry.TelemetryQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/telemetry")
@RequiredArgsConstructor
public class TelemetryQueryController extends BaseController {

    private final TelemetryQueryService telemetryQueryService;
    private final TelemetryLogService telemetryLogService;

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<NearbyProviderRes>>> getNearbyProviders(@Valid @ModelAttribute NearbyProvidersReq req) {
        List<NearbyProviderRes> providers = telemetryQueryService.findNearbyProviders(req);
        return ok(providers, "telemetry.nearby_query_success");
    }

    @GetMapping("/bookings/{id}/track")
    public ResponseEntity<ApiResponse<LiveTrackingRes>> trackBookingLive(@PathVariable("id") Long bookingId) {
        LiveTrackingRes res = telemetryQueryService.getLiveTripTracking(bookingId);
        return ok(res, "telemetry.live_track_success");
    }

    @GetMapping("/bookings/{id}/history")
    public ResponseEntity<ApiResponse<TelemetryLogRes>> getBookingTripHistory(@PathVariable("id") Long bookingId) {
        TelemetryLogRes res = telemetryQueryService.getBookingTripHistory(bookingId);
        return ok(res, "telemetry.trip_history_success");
    }

    @PostMapping("/bookings/{id}/compress")
    public ResponseEntity<ApiResponse<TelemetryLogRes>> compressTripRoute(@PathVariable("id") Long bookingId) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        TelemetryLogRes res = telemetryLogService.compressBookingTrip(userId, bookingId);
        return ok(res, "telemetry.trip_compress_success");
    }
}
