package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import org.springframework.stereotype.Component;

@Component
public class AgencyProfileMapper {

    public AgencyProfileRes toRes(AgencyProfileEntity entity) {
        if (entity == null) {
            return null;
        }

        Long ownerId = null;
        String ownerName = null;
        String ownerEmail = null;
        String ownerPhone = null;

        if (entity.getOwner() != null) {
            ownerId = entity.getOwner().getId();
            ownerName = entity.getOwner().getFullName();
            ownerEmail = entity.getOwner().getEmail();
            ownerPhone = entity.getOwner().getPhoneNumber();
        }

        return AgencyProfileRes.builder()
                .id(entity.getId())
                .ownerId(ownerId)
                .ownerName(ownerName)
                .ownerEmail(ownerEmail)
                .ownerPhone(ownerPhone)
                .agencyCode(entity.getAgencyCode())
                .agencyName(entity.getAgencyName())
                .logoUrl(entity.getLogoUrl())
                .hotline(entity.getHotline())
                .addressStreet(entity.getAddressStreet())
                .district(entity.getDistrict())
                .city(entity.getCity())
                .commissionRateInternal(entity.getCommissionRateInternal())
                .isVerified(entity.getIsVerified())
                .ratingAvg(entity.getRatingAvg())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
