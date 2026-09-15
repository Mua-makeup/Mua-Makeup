package com.makeup.platform.dto.request.agency;

import com.makeup.platform.entity.agency.OvertimeReviewAction;
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
public class ReviewOvertimeReportReq {

    @NotNull(message = "{validation.overtime_action_required}")
    private OvertimeReviewAction action;

    @DecimalMin(value = "0.00", message = "{validation.custom_penalty_amount_min}")
    private BigDecimal customPenaltyAmount;

    @DecimalMin(value = "0.00", message = "{validation.customer_surcharge_amount_min}")
    private BigDecimal customerSurchargeAmount;

    private String chargeReason;

    private String adminNotes;
}
