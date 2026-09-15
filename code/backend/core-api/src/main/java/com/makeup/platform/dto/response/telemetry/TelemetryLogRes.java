package com.makeup.platform.dto.response.telemetry;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelemetryLogRes {

    private Long id;

    private Long muaId;

    private Long bookingId;

    private Double latitude;

    private Double longitude;

    private Double speedKmh;

    private Double headingDegree;

    private Double accuracyMeters;

    private Instant recordedAt;

    // Phục vụ trường hợp trả về toàn bộ danh sách điểm của chuyến đi
    private List<double[]> routeCoordinates; // [[lng, lat], ...]
}
