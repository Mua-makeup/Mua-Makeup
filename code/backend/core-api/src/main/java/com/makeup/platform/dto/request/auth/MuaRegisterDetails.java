package com.makeup.platform.dto.request.auth;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MuaRegisterDetails {

    private String bio;

    @Min(value = 0, message = "{validation.experience_years_min}")
    @Max(value = 50, message = "{validation.experience_years_max}")
    private Integer experienceYears;

    @Min(value = 1, message = "{validation.radius_min}")
    @Max(value = 100, message = "{validation.radius_max}")
    private BigDecimal maxServiceRadiusKm;
}
