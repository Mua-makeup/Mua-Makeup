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
public class PublicAgencyInvitationRes {

    private String inviteCode;
    private Long agencyId;
    private String agencyCode;
    private String agencyName;
    private String logoUrl;
    private String hotline;
    private String addressStreet;
    private String district;
    private String city;
    private BigDecimal proposedCommissionRate;
    private String note;
    private LocalDateTime expiresAt;
    private Boolean isExpired;
}
