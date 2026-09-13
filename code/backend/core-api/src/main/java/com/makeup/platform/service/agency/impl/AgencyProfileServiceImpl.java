package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.mapper.agency.AgencyProfileMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.service.agency.AgencyProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyProfileServiceImpl implements AgencyProfileService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyProfileMapper agencyProfileMapper;

    @Override
    @Transactional(readOnly = true)
    public AgencyProfileRes getMyAgencyProfile(Long userId) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
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
            agency.setLogoUrl(req.getLogoUrl().trim());
        }

        AgencyProfileEntity saved = agencyProfileRepository.save(agency);
        log.info("Updated Agency profile: agencyId={}, ownerId={}", saved.getId(), userId);
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
}
