package com.makeup.platform.dto.request.telemetry;

import com.fasterxml.jackson.annotation.JsonAlias;

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

    @JsonAlias({"booking_id", "bookingId"})
    private Long bookingId;

    @JsonAlias({"distance_remaining_meters", "distanceRemainingMeters"})
    private Double distanceRemainingMeters; // mét tới nhà khách
}
