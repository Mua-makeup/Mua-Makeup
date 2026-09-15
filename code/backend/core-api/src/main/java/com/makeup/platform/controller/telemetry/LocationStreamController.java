package com.makeup.platform.controller.telemetry;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.request.telemetry.ToggleAvailabilityReq;
import com.makeup.platform.dto.response.telemetry.LiveTrackingRes;
import com.makeup.platform.service.telemetry.TelemetryStreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/telemetry")
@RequiredArgsConstructor
public class LocationStreamController extends BaseController {

    private final TelemetryStreamService telemetryStreamService;

    @PostMapping("/availability")
    public ResponseEntity<ApiResponse<Void>> toggleAvailability(@Valid @RequestBody ToggleAvailabilityReq req) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        String messageKey = telemetryStreamService.toggleAvailability(userId, req);
        return ok(null, messageKey);
    }

    @PostMapping("/stream")
    public ResponseEntity<ApiResponse<LiveTrackingRes>> streamLocation(@Valid @RequestBody LocationStreamReq req) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        LiveTrackingRes res = telemetryStreamService.processLocationStream(userId, req);
        return ok(res, "telemetry.stream_success");
    }
}
