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

    @NotNull(message = "Số năm kinh nghiệm không được để trống")
    @Min(value = 0, message = "Số năm kinh nghiệm tối thiểu là 0 năm")
    private Integer experienceYears;

    @NotNull(message = "Bán kính phục vụ không được để trống")
    @DecimalMin(value = "1.0", message = "Bán kính phục vụ tối thiểu là 1.0 km")
    @DecimalMax(value = "50.0", message = "Bán kính phục vụ tối đa là 50.0 km")
    private BigDecimal maxServiceRadiusKm;
}
