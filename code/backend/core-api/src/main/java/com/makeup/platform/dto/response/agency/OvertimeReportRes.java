package com.makeup.platform.dto.response.agency;

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
    private String explanationText;
    private String proofImageUrl;
    private OvertimeReportStatus status;
    private BigDecimal penaltyAmountApplied;
    private BigDecimal customerSurchargeAmount;
    private String chargeReason;
    private String adminNotes;
    private Long reviewedByUserId;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
