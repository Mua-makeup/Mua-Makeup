package com.makeup.platform.service.mua.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.MediaConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.common.utils.FileValidationUtils;
import com.makeup.platform.dto.request.admin.VerifyCertificateReq;
import com.makeup.platform.dto.request.mua.UpdateMuaProfileReq;
import com.makeup.platform.dto.request.mua.UploadCertificateReq;
import com.makeup.platform.dto.response.media.CloudMediaUploadResult;
import com.makeup.platform.dto.response.mua.CertificateRes;
import com.makeup.platform.dto.response.mua.MuaProfileRes;
import com.makeup.platform.dto.response.mua.MuaStyleRes;
import com.makeup.platform.entity.mua.MuaCertificateItem;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.mua.MuaStyleEntity;
import com.makeup.platform.mapper.mua.MuaProfileMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.mua.MuaStyleRepository;
import com.makeup.platform.service.media.MediaStorageService;
import com.makeup.platform.service.mua.MuaProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MuaProfileServiceImpl implements MuaProfileService {

    private final MuaProfileRepository muaProfileRepository;
    private final MuaStyleRepository muaStyleRepository;
    private final MediaStorageService mediaStorageService;
    private final MuaProfileMapper muaProfileMapper;

    @Override
    @Transactional(readOnly = true)
    public MuaProfileRes getPublicProfile(Long muaId) {
        MuaProfileEntity mua = muaProfileRepository.findById(muaId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND",
                        muaId
                ));
        List<MuaStyleEntity> styles = muaStyleRepository.findAllByMuaProfileId(mua.getId());
        return muaProfileMapper.toProfileRes(mua, styles);
    }

    @Override
    @Transactional(readOnly = true)
    public MuaProfileRes getMyProfile(Long userId) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        List<MuaStyleEntity> styles = muaStyleRepository.findAllByMuaProfileId(mua.getId());
        return muaProfileMapper.toProfileRes(mua, styles);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", allEntries = true)
    public MuaProfileRes updateMyProfile(Long userId, UpdateMuaProfileReq req) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);

        mua.setBio(req.getBio());
        mua.setExperienceYears(req.getExperienceYears());
        mua.setMaxServiceRadiusKm(req.getMaxServiceRadiusKm());

        MuaProfileEntity saved = muaProfileRepository.save(mua);
        List<MuaStyleEntity> styles = muaStyleRepository.findAllByMuaProfileId(saved.getId());
        return muaProfileMapper.toProfileRes(saved, styles);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CertificateRes uploadCertificate(Long userId, UploadCertificateReq req) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);

        if (!StringUtils.hasText(req.getCertName())) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "mua.cert_name_required", HttpStatus.BAD_REQUEST);
        }

        FileValidationUtils.validateImageFile(req.getFile(), MediaConstants.MAX_MAIN_IMAGE_SIZE);

        String uploadedPublicId = null;
        try {
            CloudMediaUploadResult uploadResult = mediaStorageService.uploadImage(
                    req.getFile(),
                    "mua_credentials/" + mua.getId()
            );
            uploadedPublicId = uploadResult.getPublicId();

            MuaCertificateItem certificateItem = MuaCertificateItem.builder()
                    .certName(req.getCertName().trim())
                    .imageUrl(uploadResult.getImageUrl())
                    .publicId(uploadResult.getPublicId())
                    .isVerified(false)
                    .uploadedAt(LocalDateTime.now())
                    .build();

            if (mua.getCertificates() == null) {
                mua.setCertificates(new ArrayList<>());
            }
            mua.getCertificates().add(certificateItem);

            muaProfileRepository.save(mua);

            return muaProfileMapper.toCertificateRes(certificateItem);

        } catch (Exception ex) {
            log.error("Compensating transaction triggered: Error saving certificate: {}", ex.getMessage());
            if (uploadedPublicId != null) {
                mediaStorageService.deleteMedia(uploadedPublicId);
            }
            throw ex;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CertificateRes verifyCertificate(Long muaId, VerifyCertificateReq req) {
        MuaProfileEntity mua = muaProfileRepository.findById(muaId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND",
                        muaId
                ));

        List<MuaCertificateItem> certificates = mua.getCertificates();
        if (certificates == null || certificates.isEmpty()) {
            throw new ResourceNotFoundException(ErrorCodes.ERR_PROFILE_NOT_FOUND, "mua.cert_not_found");
        }

        MuaCertificateItem targetCert = null;
        if (req.getCertIndex() != null && req.getCertIndex() >= 0 && req.getCertIndex() < certificates.size()) {
            targetCert = certificates.get(req.getCertIndex());
        } else if (req.getImageUrl() != null) {
            targetCert = certificates.stream()
                    .filter(c -> req.getImageUrl().equals(c.getImageUrl()))
                    .findFirst()
                    .orElse(null);
        }

        if (targetCert == null) {
            throw new ResourceNotFoundException(ErrorCodes.ERR_PROFILE_NOT_FOUND, "mua.cert_not_found");
        }

        targetCert.setIsVerified(Boolean.TRUE.equals(req.getIsVerified()));
        muaProfileRepository.save(mua);

        return muaProfileMapper.toCertificateRes(targetCert);
    }

    private MuaProfileEntity getMuaProfileByUserId(Long userId) {
        return muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND"
                ));
    }
}
