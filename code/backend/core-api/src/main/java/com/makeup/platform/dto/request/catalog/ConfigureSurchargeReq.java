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

    @NotBlank(message = "{validation.catalog_surcharge_name_required}")
    @Size(max = 100, message = "{validation.catalog_surcharge_name_size}")
    private String surchargeName;

    @NotNull(message = "{validation.catalog_surcharge_type_required}")
    private SurchargeType surchargeType;

    @NotNull(message = "{validation.catalog_surcharge_amount_required}")
    @DecimalMin(value = "0.00", message = "{validation.catalog_surcharge_amount_min}")
    private BigDecimal amount;

    @Builder.Default
    private Boolean isActive = true;
}
