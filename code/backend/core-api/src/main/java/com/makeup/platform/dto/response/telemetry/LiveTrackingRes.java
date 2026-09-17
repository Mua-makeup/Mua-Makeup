package com.makeup.platform.dto.response.telemetry;

import com.makeup.platform.entity.telemetry.AdaptiveStreamMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveTrackingRes {

    private Long bookingId;

    private Long muaId;

    private Double currentLat;

    private Double currentLng;

    private Double speed; // km/h

    private Double heading; // degrees (0 - 360)

    private Double accuracy; // meters

    private Integer etaMinutes;

    private Double distanceRemainingMeters;

    private AdaptiveStreamMode streamMode;

    private Instant updatedAt;
}
