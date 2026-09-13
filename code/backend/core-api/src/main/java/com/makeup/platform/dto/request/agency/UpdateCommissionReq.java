package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCommissionReq {

    @NotNull(message = "Tỷ lệ hoa hồng không được để trống")
    @DecimalMin(value = "0.00", message = "Tỷ lệ hoa hồng tối thiểu là 0%")
    @DecimalMax(value = "100.00", message = "Tỷ lệ hoa hồng tối đa là 100%")
    private BigDecimal commissionRateInternal;
}
