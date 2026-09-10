package com.makeup.platform.dto.request.catalog;

import com.makeup.platform.entity.catalog.SurchargeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class ConfigureSurchargeReq {

    @NotBlank(message = "Tên phụ phí không được để trống")
    @Size(max = 100, message = "Tên phụ phí không được vượt quá 100 ký tự")
    private String surchargeName;

    @NotNull(message = "Loại phụ phí không được để trống")
    private SurchargeType surchargeType;

    @NotNull(message = "Mức phụ phí không được để trống")
    @DecimalMin(value = "0.00", message = "Mức phụ phí không được nhỏ hơn 0 VNĐ")
    private BigDecimal amount;

    @Builder.Default
    private Boolean isActive = true;
}
