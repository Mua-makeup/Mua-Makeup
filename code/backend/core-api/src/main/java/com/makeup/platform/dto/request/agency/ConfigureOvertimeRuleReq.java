package com.makeup.platform.dto.request.agency;

import com.makeup.platform.entity.agency.OvertimePenaltyType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigureOvertimeRuleReq {

    private Long id;

    @NotBlank(message = "{validation.overtime_rule_name_required}")
    @Size(max = 150, message = "{validation.overtime_rule_name_max}")
    private String ruleName;

    @NotNull(message = "{validation.min_overtime_minutes_required}")
    @Min(value = 0, message = "{validation.min_overtime_minutes_min}")
    private Integer minOvertimeMinutes;

    private Integer maxOvertimeMinutes;

    @NotNull(message = "{validation.penalty_type_required}")
    private OvertimePenaltyType penaltyType;

    @NotNull(message = "{validation.penalty_value_required}")
    @DecimalMin(value = "0.00", message = "{validation.penalty_value_min}")
    @Builder.Default
    private BigDecimal penaltyValue = BigDecimal.ZERO;

    @Builder.Default
    private Boolean isActive = true;
}
