package com.makeup.platform.dto.request.mua;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
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
public class UpdateMuaProfileReq {

    private String bio;

    @NotNull(message = "{validation.experience_years_required}")
    @Min(value = 0, message = "{validation.experience_years_min}")
    private Integer experienceYears;

    @NotNull(message = "{validation.radius_required}")
    @DecimalMin(value = "1.0", message = "{validation.radius_min}")
    @DecimalMax(value = "50.0", message = "{validation.radius_max}")
    private BigDecimal maxServiceRadiusKm;
}
