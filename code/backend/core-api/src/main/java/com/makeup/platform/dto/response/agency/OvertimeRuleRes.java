package com.makeup.platform.dto.response.agency;

import com.makeup.platform.entity.agency.OvertimePenaltyType;
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
public class OvertimeRuleRes {

    private Long id;
    private Long agencyId;
    private String ruleName;
    private Integer minOvertimeMinutes;
    private Integer maxOvertimeMinutes;
    private OvertimePenaltyType penaltyType;
    private BigDecimal penaltyValue;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
