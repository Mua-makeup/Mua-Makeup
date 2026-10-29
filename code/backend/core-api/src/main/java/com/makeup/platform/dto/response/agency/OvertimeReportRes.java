package com.makeup.platform.dto.response.agency;

import com.makeup.platform.entity.agency.OvertimeAllowancePaymentStatus;
import com.makeup.platform.entity.agency.OvertimePenaltyType;
import com.makeup.platform.entity.agency.OvertimePolicyType;
import com.makeup.platform.entity.agency.OvertimeReasonType;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeReportRes {

    private Long id;
    private Long bookingId;
    private Long staffId;
    private String staffName;
    private Long agencyId;
    private String agencyName;
    private Integer overtimeMinutes;
    private OvertimeReasonType reasonType;
    private Long ruleId;
    private String ruleName;
    private OvertimePolicyType policyType;
    private OvertimePenaltyType penaltyType;
    private BigDecimal penaltyValue;
    private String explanationText;
    private String proofImageUrl;
    private OvertimeReportStatus status;
    private BigDecimal penaltyAmountApplied;
    private BigDecimal estimatedAllowanceAmount;
    private OvertimeAllowancePaymentStatus allowancePaymentStatus;
    private BigDecimal customerSurchargeAmount;
    private String chargeReason;
    private String adminNotes;
    private Long reviewedByUserId;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
