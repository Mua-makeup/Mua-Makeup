package com.makeup.platform.dto.response.agency;

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
public class AgencyInvitationRes {

    private String inviteCode;
    private Long agencyId;
    private String agencyName;
    private Long invitedByUserId;
    private String note;
    private BigDecimal proposedCommissionRate;
    private String inviteUrl;
    private String qrCodeBase64;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
