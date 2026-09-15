package com.makeup.platform.dto.request.telemetry;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NearbyProvidersReq {

    @NotNull(message = "{validation.telemetry_latitude_required}")
    @DecimalMin(value = "-90.0", message = "{validation.telemetry_latitude_min}")
    @DecimalMax(value = "90.0", message = "{validation.telemetry_latitude_max}")
    private Double latitude;

    @NotNull(message = "{validation.telemetry_longitude_required}")
    @DecimalMin(value = "-180.0", message = "{validation.telemetry_longitude_min}")
    @DecimalMax(value = "180.0", message = "{validation.telemetry_longitude_max}")
    private Double longitude;

    @DecimalMin(value = "0.5", message = "{validation.telemetry_radius_min}")
    @DecimalMax(value = "30.0", message = "{validation.telemetry_radius_max}")
    private Double radiusKm;

    private Long masterCategoryId;

    private BigDecimal minRating;

    public void setRadius_km(Double radiusKm) {
        this.radiusKm = radiusKm;
    }

    public void setMaster_category_id(Long masterCategoryId) {
        this.masterCategoryId = masterCategoryId;
    }

    public void setMin_rating(BigDecimal minRating) {
        this.minRating = minRating;
    }
}
