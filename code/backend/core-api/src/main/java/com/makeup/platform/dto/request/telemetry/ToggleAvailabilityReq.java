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
public class ToggleAvailabilityReq {

    @NotNull(message = "{validation.telemetry_is_available_required}")
    private Boolean isAvailable;

    @DecimalMin(value = "-90.0", message = "{validation.telemetry_latitude_min}")
    @DecimalMax(value = "90.0", message = "{validation.telemetry_latitude_max}")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "{validation.telemetry_longitude_min}")
    @DecimalMax(value = "180.0", message = "{validation.telemetry_longitude_max}")
    private Double longitude;
}
