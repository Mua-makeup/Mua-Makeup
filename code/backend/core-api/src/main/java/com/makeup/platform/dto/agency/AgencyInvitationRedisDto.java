package com.makeup.platform.dto.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgencyInvitationRedisDto implements Serializable {

    private String inviteCode;
    private Long agencyId;
    private String agencyName;
    private Long invitedByUserId;
    private String note;
    private BigDecimal proposedCommissionRate;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
