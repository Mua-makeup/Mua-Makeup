package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewStaffApplicationReq {

    @NotBlank(message = "{validation.approval_decision_required}")
    @Pattern(regexp = "APPROVE|REJECT", message = "{validation.approval_decision_invalid}")
    private String decision;

    @DecimalMin(value = "0.00", message = "{validation.commission_rate_min}")
    @DecimalMax(value = "100.00", message = "{validation.commission_rate_max}")
    private BigDecimal agreedCommissionRate;

    private String note;
}
