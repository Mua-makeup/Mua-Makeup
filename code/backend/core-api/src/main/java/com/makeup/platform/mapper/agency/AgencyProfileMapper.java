package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyLocationRes;
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
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .commissionRateInternal(entity.getCommissionRateInternal())
                .isVerified(entity.getIsVerified())
                .ratingAvg(entity.getRatingAvg())
                .isSurgeEnabled(entity.getIsSurgeEnabled() == null || entity.getIsSurgeEnabled())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public AgencyLocationRes toLocationRes(AgencyProfileEntity entity) {
        if (entity == null) {
            return null;
        }

        StringBuilder fullAddress = new StringBuilder();
        if (entity.getAddressStreet() != null) {
            fullAddress.append(entity.getAddressStreet());
        }
        if (entity.getDistrict() != null) {
            if (fullAddress.length() > 0) fullAddress.append(", ");
            fullAddress.append(entity.getDistrict());
        }
        if (entity.getCity() != null) {
            if (fullAddress.length() > 0) fullAddress.append(", ");
            fullAddress.append(entity.getCity());
        }

        return AgencyLocationRes.builder()
                .agencyId(entity.getId())
                .agencyCode(entity.getAgencyCode())
                .agencyName(entity.getAgencyName())
                .hotline(entity.getHotline())
                .addressStreet(entity.getAddressStreet())
                .district(entity.getDistrict())
                .city(entity.getCity())
                .fullAddress(fullAddress.toString())
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .build();
    }
}
