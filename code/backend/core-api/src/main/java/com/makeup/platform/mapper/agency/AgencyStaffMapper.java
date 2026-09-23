package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyStaffDetailRes;
import com.makeup.platform.dto.response.agency.AgencyStaffRes;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.mua.MuaCertificateItem;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

        Integer experienceYears = null;
        BigDecimal ratingAvg = null;

        if (mua != null) {
            muaId = mua.getId();
            muaCode = mua.getMuaCode();
            experienceYears = mua.getExperienceYears();
            ratingAvg = mua.getRatingAvg();
            if (mua.getUser() != null) {
                fullName = mua.getUser().getFullName();
                email = mua.getUser().getEmail();
                phoneNumber = mua.getUser().getPhoneNumber();
                avatarUrl = mua.getUser().getAvatarUrl();
            }
        }

        String inviteCodeUsed = null;
        if (entity.getNote() != null && entity.getNote().contains("INV-")) {
            Matcher m = Pattern.compile("(INV-[A-Za-z0-9_-]+)").matcher(entity.getNote());
            if (m.find()) {
                inviteCodeUsed = m.group(1);
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
                .inviteCodeUsed(inviteCodeUsed)
                .joinedAt(entity.getJoinedAt())
                .experienceYears(experienceYears)
                .ratingAvg(ratingAvg)
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
        BigDecimal ratingAvg = null;
        Boolean isOnline = null;
        Boolean isBusy = null;
        Long muaId = null;

        List<MuaCertificateItem> certificates = null;
        List<String> portfolioImages = null;
        Integer totalCompletedJobs = null;
        Integer totalReviews = null;

        if (mua != null) {
            muaId = mua.getId();
            muaCode = mua.getMuaCode();
            bio = mua.getBio();
            experienceYears = mua.getExperienceYears();
            ratingAvg = mua.getRatingAvg();
            isOnline = mua.getIsOnline();
            isBusy = mua.getIsBusy();
            totalCompletedJobs = mua.getTotalCompletedJobs();
            totalReviews = mua.getTotalReviews();
            if (mua.getCertificates() != null) {
                certificates = new ArrayList<>(mua.getCertificates());
            } else {
                certificates = Collections.emptyList();
            }
            if (mua.getPortfolioImages() != null) {
                portfolioImages = new ArrayList<>(mua.getPortfolioImages());
            } else {
                portfolioImages = Collections.emptyList();
            }
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
                .certificates(certificates)
                .portfolioImages(portfolioImages)
                .totalCompletedJobs(totalCompletedJobs)
                .totalReviews(totalReviews)
                .joinedAt(entity.getJoinedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
