package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.common.utils.GeoDistanceUtils;
import com.makeup.platform.dto.request.admin.AdminCreateAgencyReq;
import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyLocationRes;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.RoleEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.telemetry.AgencyBranchEntity;
import com.makeup.platform.mapper.agency.AgencyProfileMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.RoleRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.telemetry.AgencyBranchRepository;
import com.makeup.platform.service.agency.AgencyProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Year;

import org.springframework.data.domain.Pageable;
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
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

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
    public PageResponse<AgencyProfileRes> getAllAgenciesForAdmin(
            String search, Boolean isVerified, Pageable pageable) {
        List<AgencyProfileEntity> list = agencyProfileRepository.findAll();
        List<AgencyProfileRes> filtered = list.stream()
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

        if (pageable == null || pageable.isUnpaged()) {
            return com.makeup.platform.common.base.PageResponse.<AgencyProfileRes>builder()
                    .content(filtered)
                    .page(0)
                    .size(filtered.size())
                    .totalElements(filtered.size())
                    .totalPages(filtered.isEmpty() ? 0 : 1)
                    .last(true)
                    .build();
        }

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        List<AgencyProfileRes> pagedList = start > filtered.size() ? List.of() : filtered.subList(start, end);
        org.springframework.data.domain.Page<AgencyProfileRes> page =
                new org.springframework.data.domain.PageImpl<>(pagedList, pageable, filtered.size());
        return PageResponse.from(page);
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

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgencyProfileRes createAgencyByAdmin(AdminCreateAgencyReq req) {
        // 1. Kiểm tra trùng số điện thoại chủ sở hữu
        if (userRepository.existsByPhoneNumber(req.getOwnerPhone())) {
            throw new CustomBusinessException(ErrorCodes.ERR_PHONE_ALREADY_EXISTS,
                    "auth.phone_already_exists", HttpStatus.CONFLICT);
        }

        // 2. Kiểm tra trùng email chủ sở hữu
        if (StringUtils.hasText(req.getOwnerEmail()) && userRepository.existsByEmail(req.getOwnerEmail())) {
            throw new CustomBusinessException(ErrorCodes.ERR_EMAIL_ALREADY_EXISTS,
                    "auth.email_already_exists", HttpStatus.CONFLICT);
        }

        // 3. Lấy Role AGENCY_ADMIN
        RoleEntity agencyRole = roleRepository.findByName(SecurityConstants.ROLE_AGENCY_ADMIN)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ROLE_NOT_FOUND,
                        "auth.role_not_found", HttpStatus.NOT_FOUND));

        // 4. Tạo UserEntity cho chủ sở hữu với đầy đủ thông tin cá nhân
        UserEntity owner = UserEntity.builder()
                .fullName(req.getOwnerFullName().trim())
                .phoneNumber(req.getOwnerPhone().trim())
                .email(req.getOwnerEmail().trim())
                .gender(StringUtils.hasText(req.getOwnerGender()) ? req.getOwnerGender().trim() : null)
                .passwordHash(passwordEncoder.encode(req.getOwnerPassword()))
                .isActive(true)
                .isVerified(true)
                .language("vi")
                .role(agencyRole)
                .build();

        owner = userRepository.save(owner);

        // 5. Sinh mã Agency Code
        int currentYear = Year.now().getValue();
        String generatedAgencyCode = String.format("AGN-%d-%05d", currentYear, owner.getId());

        // 6. Tạo AgencyProfileEntity
        AgencyProfileEntity agency = AgencyProfileEntity.builder()
                .owner(owner)
                .agencyCode(generatedAgencyCode)
                .agencyName(req.getAgencyName().trim())
                .hotline(req.getHotline().trim())
                .addressStreet(req.getAddressStreet().trim())
                .district(req.getDistrict().trim())
                .city(req.getCity().trim())
                .commissionRateInternal(req.getCommissionRateInternal() != null
                        ? req.getCommissionRateInternal()
                        : new BigDecimal("30.00"))
                .ratingAvg(null)
                .isVerified(true) 
                .build();

        AgencyProfileEntity savedAgency = agencyProfileRepository.save(agency);

        log.info("Super Admin created new agency: id={}, code={}, ownerPhone={}",
                savedAgency.getId(), savedAgency.getAgencyCode(), owner.getPhoneNumber());

        return agencyProfileMapper.toRes(savedAgency);
    }
}
