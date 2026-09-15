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

    @NotNull(message = "Vĩ độ không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ tối thiểu là -90.0")
    @DecimalMax(value = "90.0", message = "Vĩ độ tối đa là 90.0")
    private Double latitude;

    @NotNull(message = "Kinh độ không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ tối thiểu là -180.0")
    @DecimalMax(value = "180.0", message = "Kinh độ tối đa là 180.0")
    private Double longitude;

    @DecimalMin(value = "0.5", message = "Bán kính quét tối thiểu là 0.5 km")
    @DecimalMax(value = "30.0", message = "Bán kính quét tối đa là 30.0 km")
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
