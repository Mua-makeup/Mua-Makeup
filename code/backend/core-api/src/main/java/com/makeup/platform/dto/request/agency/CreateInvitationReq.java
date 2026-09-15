package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class CreateInvitationReq {

    @Min(value = 1, message = "{validation.invite_expire_hours_min}")
    @Max(value = 720, message = "{validation.invite_expire_hours_max}")
    @Builder.Default
    private Integer expireHours = 72;

    private String note;

    @DecimalMin(value = "0.00", message = "{validation.commission_rate_min}")
    @DecimalMax(value = "100.00", message = "{validation.commission_rate_max}")
    private BigDecimal proposedCommissionRate;
}
