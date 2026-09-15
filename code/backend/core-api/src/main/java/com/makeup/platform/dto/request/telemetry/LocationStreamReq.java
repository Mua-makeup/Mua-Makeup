package com.makeup.platform.dto.request.telemetry;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationStreamReq {

    @NotNull(message = "{validation.telemetry_latitude_required}")
    @DecimalMin(value = "-90.0", message = "{validation.telemetry_latitude_min}")
    @DecimalMax(value = "90.0", message = "{validation.telemetry_latitude_max}")
    private Double latitude;

    @NotNull(message = "{validation.telemetry_longitude_required}")
    @DecimalMin(value = "-180.0", message = "{validation.telemetry_longitude_min}")
    @DecimalMax(value = "180.0", message = "{validation.telemetry_longitude_max}")
    private Double longitude;

    private Double speed; // km/h

    private Double heading; // 0 - 360 degree

    private Double accuracy; // meters

    private Long bookingId;

    private Double distanceRemainingMeters; // mét tới nhà khách
}
