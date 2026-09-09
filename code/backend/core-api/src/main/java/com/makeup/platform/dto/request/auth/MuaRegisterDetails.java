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

    @Min(value = 0, message = "Số năm kinh nghiệm không thể âm")
    @Max(value = 50, message = "Số năm kinh nghiệm không hợp lệ")
    private Integer experienceYears;

    @Min(value = 1, message = "Bán kính tối thiểu là 1km")
    @Max(value = 100, message = "Bán kính tối đa là 100km")
    private BigDecimal maxServiceRadiusKm;
}
