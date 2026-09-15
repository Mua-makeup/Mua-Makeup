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

    @NotNull(message = "Vĩ độ không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ tối thiểu là -90.0")
    @DecimalMax(value = "90.0", message = "Vĩ độ tối đa là 90.0")
    private Double latitude;

    @NotNull(message = "Kinh độ không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ tối thiểu là -180.0")
    @DecimalMax(value = "180.0", message = "Kinh độ tối đa là 180.0")
    private Double longitude;

    private Double speed; // km/h

    private Double heading; // 0 - 360 degree

    private Double accuracy; // meters

    private Long bookingId;

    private Double distanceRemainingMeters; // mét tới nhà khách
}
