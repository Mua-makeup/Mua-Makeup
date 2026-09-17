package com.makeup.platform.dto.request.agency;

import com.fasterxml.jackson.annotation.JsonAlias;
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

    @NotNull(message = "{validation.commission_rate_required}")
    @DecimalMin(value = "0.00", message = "{validation.commission_rate_min}")
    @DecimalMax(value = "100.00", message = "{validation.commission_rate_max}")
    @JsonAlias({"commissionRate", "commissionRateInternal", "rate"})
    private BigDecimal commissionRateInternal;
}
