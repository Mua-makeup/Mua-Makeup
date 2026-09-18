package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.common.utils.GeoDistanceUtils;
import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyLocationRes;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.telemetry.AgencyBranchEntity;
import com.makeup.platform.mapper.agency.AgencyProfileMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.telemetry.AgencyBranchRepository;
import com.makeup.platform.service.agency.AgencyProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyProfileServiceImpl implements AgencyProfileService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyProfileMapper agencyProfileMapper;
    private final AgencyBranchRepository agencyBranchRepository;

    @Override
    @Transactional
    public AgencyProfileRes getMyAgencyProfile(Long userId) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
        if (StringUtils.hasText(agency.getLogoUrl()) && agency.getOwner() != null) {
            agency.getOwner().setAvatarUrl(agency.getLogoUrl());
        }
        return agencyProfileMapper.toRes(agency);
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyProfileRes getAgencyProfileById(Long agencyId) {
        AgencyProfileEntity agency = agencyProfileRepository.findById(agencyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
        return agencyProfileMapper.toRes(agency);
    }

    @Override
    @Transactional
    public AgencyProfileRes updateAgencyProfile(Long userId, UpdateAgencyProfileReq req) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));

        if (StringUtils.hasText(req.getAgencyName())) {
            agency.setAgencyName(req.getAgencyName().trim());
        }
        if (StringUtils.hasText(req.getHotline())) {
            agency.setHotline(req.getHotline().trim());
        }
        if (StringUtils.hasText(req.getAddressStreet())) {
            agency.setAddressStreet(req.getAddressStreet().trim());
        }
        if (StringUtils.hasText(req.getDistrict())) {
            agency.setDistrict(req.getDistrict().trim());
        }
        if (StringUtils.hasText(req.getCity())) {
            agency.setCity(req.getCity().trim());
        }
        if (req.getLogoUrl() != null) {
            String logo = req.getLogoUrl().trim();
            agency.setLogoUrl(logo);
            if (agency.getOwner() != null) {
                agency.getOwner().setAvatarUrl(logo);
            }
        }
        if (req.getLatitude() != null && req.getLongitude() != null) {
            agency.setLatitude(req.getLatitude());
            agency.setLongitude(req.getLongitude());
            agency.setLocationPoint(GeoDistanceUtils.createPoint(
                    req.getLatitude().doubleValue(), req.getLongitude().doubleValue()
            ));
            syncMainBranchLocation(agency, req.getLatitude(), req.getLongitude());
        }
        if (req.getIsSurgeEnabled() != null) {
            agency.setIsSurgeEnabled(req.getIsSurgeEnabled());
        }

        AgencyProfileEntity saved = agencyProfileRepository.save(agency);
        log.info("Updated Agency profile: agencyId={}, ownerId={}, lat={}, lng={}", 
                saved.getId(), userId, saved.getLatitude(), saved.getLongitude());
        return agencyProfileMapper.toRes(saved);
    }

    @Override
    @Transactional
    public AgencyProfileRes updateCommissionRate(Long userId, UpdateCommissionReq req) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));

        agency.setCommissionRateInternal(req.getCommissionRateInternal());
        AgencyProfileEntity saved = agencyProfileRepository.save(agency);
        log.info("Updated default internal commission rate: agencyId={}, newRate={}%", saved.getId(), req.getCommissionRateInternal());
        return agencyProfileMapper.toRes(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyLocationRes getAgencyLocation(Long agencyId) {
        AgencyProfileEntity agency = agencyProfileRepository.findById(agencyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "agency.profile_not_found"
                ));

        if (agency.getLatitude() == null || agency.getLongitude() == null) {
            List<AgencyBranchEntity> branches = agencyBranchRepository.findByAgencyIdAndIsActiveTrue(agencyId);
            AgencyBranchEntity mainBranch = branches.stream()
                    .filter(b -> Boolean.TRUE.equals(b.getIsMainBranch()))
                    .findFirst()
                    .orElse(null);

            if (mainBranch != null && mainBranch.getLatitude() != null && mainBranch.getLongitude() != null) {
                return AgencyLocationRes.builder()
                        .agencyId(agency.getId())
                        .agencyCode(agency.getAgencyCode())
                        .agencyName(agency.getAgencyName())
                        .hotline(agency.getHotline())
                        .addressStreet(agency.getAddressStreet())
                        .district(agency.getDistrict())
                        .city(agency.getCity())
                        .fullAddress(mainBranch.getAddressLine())
                        .latitude(mainBranch.getLatitude())
                        .longitude(mainBranch.getLongitude())
                        .build();
            }

            throw new CustomBusinessException(
                    ErrorCodes.ERR_AGENCY_LOCATION_NOT_CONFIGURED,
                    "agency.location_not_configured"
            );
        }

        return agencyProfileMapper.toLocationRes(agency);
    }

    private void syncMainBranchLocation(AgencyProfileEntity agency, BigDecimal lat, BigDecimal lng) {
        try {
            List<AgencyBranchEntity> branches = agencyBranchRepository.findByAgencyIdAndIsActiveTrue(agency.getId());
            AgencyBranchEntity mainBranch = branches.stream()
                    .filter(b -> Boolean.TRUE.equals(b.getIsMainBranch()))
                    .findFirst()
                    .orElse(null);

            String addressLine = (agency.getAddressStreet() != null ? agency.getAddressStreet() : "") +
                    (agency.getDistrict() != null ? ", " + agency.getDistrict() : "") +
                    (agency.getCity() != null ? ", " + agency.getCity() : "");

            if (mainBranch == null) {
                mainBranch = AgencyBranchEntity.builder()
                        .agencyId(agency.getId())
                        .branchName(agency.getAgencyName() + " (Trụ sở chính)")
                        .phoneNumber(agency.getHotline())
                        .addressLine(addressLine)
                        .latitude(lat)
                        .longitude(lng)
                        .locationPoint(GeoDistanceUtils.createPoint(lat.doubleValue(), lng.doubleValue()))
                        .isMainBranch(true)
                        .isActive(true)
                        .build();
            } else {
                mainBranch.setBranchName(agency.getAgencyName() + " (Trụ sở chính)");
                mainBranch.setPhoneNumber(agency.getHotline());
                mainBranch.setAddressLine(addressLine);
                mainBranch.setLatitude(lat);
                mainBranch.setLongitude(lng);
                mainBranch.setLocationPoint(GeoDistanceUtils.createPoint(lat.doubleValue(), lng.doubleValue()));
            }
            agencyBranchRepository.save(mainBranch);
            log.info("Synchronized main branch location for Agency: agencyId={}, lat={}, lng={}", agency.getId(), lat, lng);
        } catch (Exception e) {
            log.warn("Failed to sync main branch location for agencyId={}: {}", agency.getId(), e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AgencyProfileRes> getAllAgenciesForAdmin(String search, Boolean isVerified) {
        List<AgencyProfileEntity> list = agencyProfileRepository.findAll();
        return list.stream()
                .filter(a -> {
                    if (isVerified != null && !isVerified.equals(a.getIsVerified())) {
                        return false;
                    }
                    if (StringUtils.hasText(search)) {
                        String q = search.trim().toLowerCase();
                        boolean matchName = a.getAgencyName() != null && a.getAgencyName().toLowerCase().contains(q);
                        boolean matchCode = a.getAgencyCode() != null && a.getAgencyCode().toLowerCase().contains(q);
                        boolean matchPhone = a.getHotline() != null && a.getHotline().contains(q);
                        boolean matchOwner = a.getOwner() != null && a.getOwner().getFullName() != null
                                && a.getOwner().getFullName().toLowerCase().contains(q);
                        boolean matchEmail = a.getOwner() != null && a.getOwner().getEmail() != null
                                && a.getOwner().getEmail().toLowerCase().contains(q);
                        return matchName || matchCode || matchPhone || matchOwner || matchEmail;
                    }
                    return true;
                })
                .map(agencyProfileMapper::toRes)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgencyProfileRes verifyAgency(Long agencyId, boolean isVerified) {
        AgencyProfileEntity agency = agencyProfileRepository.findById(agencyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND",
                        agencyId
                ));
        agency.setIsVerified(isVerified);
        AgencyProfileEntity saved = agencyProfileRepository.save(agency);
        log.info("Super Admin updated verification for Agency ID {}: isVerified={}", agencyId, isVerified);
        return agencyProfileMapper.toRes(saved);
    }
}
