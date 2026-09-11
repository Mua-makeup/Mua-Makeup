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

    @Override
    @Transactional(readOnly = true)
    public MuaProfileRes getPublicProfile(Long muaId) {
        MuaProfileEntity mua = muaProfileRepository.findById(muaId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "Không tìm thấy thông tin hồ sơ của thợ trang điểm."
                ));
        return mapToProfileRes(mua);
    }

    @Override
    @Transactional(readOnly = true)
    public MuaProfileRes getMyProfile(Long userId) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        return mapToProfileRes(mua);
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
        return mapToProfileRes(saved);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CertificateRes uploadCertificate(Long userId, UploadCertificateReq req) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);

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

            return CertificateRes.builder()
                    .certName(certificateItem.getCertName())
                    .imageUrl(certificateItem.getImageUrl())
                    .isVerified(false)
                    .uploadedAt(certificateItem.getUploadedAt())
                    .build();

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
                        "Không tìm thấy hồ sơ thợ để duyệt bằng cấp."
                ));

        List<MuaCertificateItem> certificates = mua.getCertificates();
        if (certificates == null || certificates.isEmpty()) {
            throw new ResourceNotFoundException("Thợ chưa có chứng chỉ nào để kiểm duyệt.");
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
            throw new ResourceNotFoundException("Không tìm thấy chứng chỉ tương ứng trong hồ sơ thợ.");
        }

        targetCert.setIsVerified(Boolean.TRUE.equals(req.getIsVerified()));
        muaProfileRepository.save(mua);

        return CertificateRes.builder()
                .certName(targetCert.getCertName())
                .imageUrl(targetCert.getImageUrl())
                .isVerified(targetCert.getIsVerified())
                .uploadedAt(targetCert.getUploadedAt())
                .build();
    }

    private MuaProfileEntity getMuaProfileByUserId(Long userId) {
        return muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "Không tìm thấy hồ sơ thợ trang điểm tương ứng."
                ));
    }

    private MuaProfileRes mapToProfileRes(MuaProfileEntity mua) {
        List<CertificateRes> certResList = new ArrayList<>();
        if (mua.getCertificates() != null) {
            for (MuaCertificateItem cert : mua.getCertificates()) {
                certResList.add(CertificateRes.builder()
                        .certName(cert.getCertName())
                        .imageUrl(cert.getImageUrl())
                        .isVerified(cert.getIsVerified())
                        .uploadedAt(cert.getUploadedAt())
                        .build());
            }
        }

        List<MuaStyleEntity> styles = muaStyleRepository.findAllByMuaProfileId(mua.getId());
        List<MuaStyleRes> styleResList = styles.stream()
                .map(s -> MuaStyleRes.builder()
                        .id(s.getStyle().getId())
                        .code(s.getStyle().getStyleCode())
                        .name(s.getStyle().getStyleName())
                        .description(s.getStyle().getDescription())
                        .build())
                .toList();

        String fullName = mua.getUser() != null ? mua.getUser().getFullName() : null;
        String avatarUrl = mua.getUser() != null ? mua.getUser().getAvatarUrl() : null;

        return MuaProfileRes.builder()
                .muaId(mua.getId())
                .muaCode(mua.getMuaCode())
                .fullName(fullName)
                .avatarUrl(avatarUrl)
                .bio(mua.getBio())
                .experienceYears(mua.getExperienceYears())
                .maxServiceRadiusKm(mua.getMaxServiceRadiusKm())
                .ratingAverage(mua.getRatingAvg())
                .totalReviews(mua.getTotalReviews())
                .totalCompletedJobs(mua.getTotalCompletedJobs())
                .certificates(certResList)
                .styles(styleResList)
                .updatedAt(mua.getUpdatedAt())
                .build();
    }
}
