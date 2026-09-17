package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyStaffDetailRes;
import com.makeup.platform.dto.response.agency.AgencyStaffRes;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import org.springframework.stereotype.Component;

@Component
public class AgencyStaffMapper {

    public AgencyStaffRes toRes(AgencyStaffEntity entity) {
        if (entity == null) {
            return null;
        }

        MuaProfileEntity mua = entity.getMua();
        String fullName = null;
        String email = null;
        String phoneNumber = null;
        String avatarUrl = null;
        String muaCode = null;
        Long muaId = null;

        if (mua != null) {
            muaId = mua.getId();
            muaCode = mua.getMuaCode();
            if (mua.getUser() != null) {
                fullName = mua.getUser().getFullName();
                email = mua.getUser().getEmail();
                phoneNumber = mua.getUser().getPhoneNumber();
                avatarUrl = mua.getUser().getAvatarUrl();
            }
        }

        return AgencyStaffRes.builder()
                .id(entity.getId())
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .muaId(muaId)
                .muaCode(muaCode)
                .fullName(fullName)
                .email(email)
                .phoneNumber(phoneNumber)
                .avatarUrl(avatarUrl)
                .agreedCommissionRate(entity.getAgreedCommissionRate())
                .isActive(entity.getIsActive())
                .status(entity.getStatus())
                .note(entity.getNote())
                .joinedAt(entity.getJoinedAt())
                .build();
    }

    public AgencyStaffDetailRes toDetailRes(AgencyStaffEntity entity) {
        if (entity == null) {
            return null;
        }

        MuaProfileEntity mua = entity.getMua();
        String fullName = null;
        String email = null;
        String phoneNumber = null;
        String avatarUrl = null;
        String muaCode = null;
        String bio = null;
        Integer experienceYears = null;
        java.math.BigDecimal ratingAvg = null;
        Boolean isOnline = null;
        Boolean isBusy = null;
        Long muaId = null;

        if (mua != null) {
            muaId = mua.getId();
            muaCode = mua.getMuaCode();
            bio = mua.getBio();
            experienceYears = mua.getExperienceYears();
            ratingAvg = mua.getRatingAvg();
            isOnline = mua.getIsOnline();
            isBusy = mua.getIsBusy();
            if (mua.getUser() != null) {
                fullName = mua.getUser().getFullName();
                email = mua.getUser().getEmail();
                phoneNumber = mua.getUser().getPhoneNumber();
                avatarUrl = mua.getUser().getAvatarUrl();
            }
        }

        return AgencyStaffDetailRes.builder()
                .id(entity.getId())
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .agencyName(entity.getAgency() != null ? entity.getAgency().getAgencyName() : null)
                .muaId(muaId)
                .muaCode(muaCode)
                .fullName(fullName)
                .email(email)
                .phoneNumber(phoneNumber)
                .avatarUrl(avatarUrl)
                .bio(bio)
                .experienceYears(experienceYears)
                .ratingAvg(ratingAvg)
                .isOnline(isOnline)
                .isBusy(isBusy)
                .agreedCommissionRate(entity.getAgreedCommissionRate())
                .isActive(entity.getIsActive())
                .status(entity.getStatus())
                .note(entity.getNote())
                .joinedAt(entity.getJoinedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
