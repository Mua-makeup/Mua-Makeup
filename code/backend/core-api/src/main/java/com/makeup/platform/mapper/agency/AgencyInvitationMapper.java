package com.makeup.platform.mapper.agency;

import com.makeup.platform.common.utils.QrCodeUtils;
import com.makeup.platform.dto.agency.AgencyInvitationRedisDto;
import com.makeup.platform.dto.response.agency.AgencyInvitationRes;
import org.springframework.stereotype.Component;

@Component
public class AgencyInvitationMapper {

    public AgencyInvitationRes toRes(AgencyInvitationRedisDto dto) {
        if (dto == null) {
            return null;
        }
        String inviteUrl = "https://app.makeup.vn/join?code=" + dto.getInviteCode();
        String qrCodeBase64 = QrCodeUtils.generateQrBase64(inviteUrl, 300, 300);

        return AgencyInvitationRes.builder()
                .inviteCode(dto.getInviteCode())
                .agencyId(dto.getAgencyId())
                .agencyName(dto.getAgencyName())
                .invitedByUserId(dto.getInvitedByUserId())
                .note(dto.getNote())
                .proposedCommissionRate(dto.getProposedCommissionRate())
                .inviteUrl(inviteUrl)
                .qrCodeBase64(qrCodeBase64)
                .expiresAt(dto.getExpiresAt())
                .createdAt(dto.getCreatedAt())
                .build();
    }
}
