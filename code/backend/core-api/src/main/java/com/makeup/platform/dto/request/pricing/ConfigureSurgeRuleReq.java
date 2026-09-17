package com.makeup.platform.dto.request.pricing;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigureSurgeRuleReq {

    @NotBlank(message = "{validation.pricing_surge_rule_name_required}")
    @Size(max = 150)
    private String ruleName;

    @Builder.Default
    private String zoneCode = "ALL";

    @JsonFormat(pattern = "HH:mm[:ss]")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm[:ss]")
    private LocalTime endTime;

    private String applicableDaysOfWeek; // e.g. "SATURDAY,SUNDAY"

    @NotNull(message = "{validation.pricing_surge_multiplier_required}")
    @DecimalMin(value = "1.00", message = "{validation.pricing_surge_multiplier_min}")
    @DecimalMax(value = "1.50", message = "{validation.pricing_surge_multiplier_max}")
    private BigDecimal surgeMultiplier;

    @Builder.Default
    private BigDecimal minDemandRatio = BigDecimal.valueOf(1.00);

    @Builder.Default
    private Boolean isActive = true;
}
