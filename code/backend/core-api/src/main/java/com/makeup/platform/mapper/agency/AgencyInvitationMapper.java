package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyInvitationRes;
import com.makeup.platform.entity.agency.AgencyInvitationEntity;
import org.springframework.stereotype.Component;

@Component
public class AgencyInvitationMapper {

    public AgencyInvitationRes toRes(AgencyInvitationEntity entity) {
        if (entity == null) {
            return null;
        }

        Long invitedById = null;
        String invitedByName = null;
        if (entity.getInvitedBy() != null) {
            invitedById = entity.getInvitedBy().getId();
            invitedByName = entity.getInvitedBy().getFullName();
        }

        Long acceptedById = null;
        String acceptedByName = null;
        if (entity.getAcceptedByMua() != null) {
            acceptedById = entity.getAcceptedByMua().getId();
            if (entity.getAcceptedByMua().getUser() != null) {
                acceptedByName = entity.getAcceptedByMua().getUser().getFullName();
            }
        }

        return AgencyInvitationRes.builder()
                .id(entity.getId())
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .agencyName(entity.getAgency() != null ? entity.getAgency().getAgencyName() : null)
                .inviteCode(entity.getInviteCode())
                .invitedByUserId(invitedById)
                .invitedByName(invitedByName)
                .status(entity.getStatus())
                .note(entity.getNote())
                .expiresAt(entity.getExpiresAt())
                .acceptedByMuaId(acceptedById)
                .acceptedByMuaName(acceptedByName)
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
