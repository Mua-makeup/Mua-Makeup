package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgencyInvitationRes {

    private Long id;
    private Long agencyId;
    private String agencyName;
    private String inviteCode;
    private Long invitedByUserId;
    private String invitedByName;
    private String status;
    private String note;
    private LocalDateTime expiresAt;
    private Long acceptedByMuaId;
    private String acceptedByMuaName;
    private LocalDateTime createdAt;
}
