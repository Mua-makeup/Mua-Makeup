package com.makeup.platform.service.mua.impl;

import com.makeup.platform.common.base.PageResponse;
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
import com.makeup.platform.dto.response.admin.AdminMuaCertificateRes;
import com.makeup.platform.entity.auth.UserEntity;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.makeup.platform.service.interaction.NotificationService;

@Slf4j
@Service
@RequiredArgsConstructor
public class MuaProfileServiceImpl implements MuaProfileService {

    private final MuaProfileRepository muaProfileRepository;
    private final MuaStyleRepository muaStyleRepository;
    private final MediaStorageService mediaStorageService;
    private final MuaProfileMapper muaProfileMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public MuaProfileRes getPublicProfile(Long muaId) {
        MuaProfileEntity mua = muaProfileRepository.findById(muaId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND",
                        muaId));
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

        if (req.getBaseAddressText() != null) {
            mua.setBaseAddressText(req.getBaseAddressText().trim());
        }

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
                    "mua_credentials/" + mua.getId());
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

            // Bắn thông báo in-app và WebSocket realtime tới Ban Quản Trị (Super Admin)
            try {
                notificationService.createCertificateUploadedNotification(
                        mua,
                        certificateItem.getCertName(),
                        certificateItem.getImageUrl()
                );
            } catch (Exception notifEx) {
                log.error("Failed to create certificate uploaded notification for muaId={}", mua.getId(), notifEx);
            }

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
                        muaId));

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

        if (Boolean.TRUE.equals(req.getIsVerified())) {
            targetCert.setIsVerified(true);
            targetCert.setStatus("VERIFIED");
            targetCert.setNotes(req.getNotes());
        } else {
            targetCert.setIsVerified(false);
            targetCert.setStatus("REJECTED");
            targetCert.setNotes(
                    StringUtils.hasText(req.getNotes()) ? req.getNotes() : "Hồ sơ chứng chỉ chưa đạt tiêu chuẩn");
        }
        muaProfileRepository.save(mua);

        return muaProfileMapper.toCertificateRes(targetCert);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminMuaCertificateRes> getAllCertificatesForAdmin(String status, Pageable pageable) {
        List<MuaProfileEntity> profiles = muaProfileRepository.findAll();
        List<AdminMuaCertificateRes> result = new ArrayList<>();

        for (MuaProfileEntity profile : profiles) {
            List<MuaCertificateItem> certs = profile.getCertificates();
            if (certs == null || certs.isEmpty()) {
                continue;
            }

            UserEntity user = profile.getUser();
            String muaName = (user != null && StringUtils.hasText(user.getFullName()))
                    ? user.getFullName()
                    : "MUA #" + profile.getId();
            String phone = user != null ? user.getPhoneNumber() : null;
            String email = user != null ? user.getEmail() : null;

            for (int i = 0; i < certs.size(); i++) {
                MuaCertificateItem cert = certs.get(i);
                String certStatus = cert.getStatus();
                if (certStatus == null) {
                    certStatus = Boolean.TRUE.equals(cert.getIsVerified()) ? "VERIFIED" : "PENDING";
                }
                if (status != null && !status.equalsIgnoreCase("ALL") && StringUtils.hasText(status)) {
                    if (!status.equalsIgnoreCase(certStatus)) {
                        continue;
                    }
                }

                result.add(AdminMuaCertificateRes.builder()
                        .muaId(profile.getId())
                        .userId(user != null ? user.getId() : null)
                        .muaName(muaName)
                        .phoneNumber(phone)
                        .email(email)
                        .experienceYears(profile.getExperienceYears())
                        .certIndex(i)
                        .certName(cert.getCertName())
                        .imageUrl(cert.getImageUrl())
                        .isVerified(cert.getIsVerified())
                        .status(certStatus)
                        .notes(cert.getNotes())
                        .uploadedAt(cert.getUploadedAt())
                        .build());
            }
        }

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), result.size());
        List<AdminMuaCertificateRes> pageContent = (start <= end && start < result.size())
                ? result.subList(start, end)
                : Collections.emptyList();

        Page<AdminMuaCertificateRes> page = new PageImpl<>(pageContent, pageable, result.size());
        return PageResponse.from(page);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", allEntries = true)
    public List<String> uploadPortfolioImages(Long userId,
            List<org.springframework.web.multipart.MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "mua.portfolio_files_empty", HttpStatus.BAD_REQUEST);
        }

        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        List<String> existingImages = mua.getPortfolioImages();
        if (existingImages == null) {
            existingImages = new ArrayList<>();
        } else {
            existingImages = new ArrayList<>(existingImages);
        }

        if (existingImages.size() + files.size() > 30) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "mua.portfolio_max_exceeded", HttpStatus.BAD_REQUEST);
        }

        List<String> newlyUploadedCloudIds = new ArrayList<>();
        try {
            for (org.springframework.web.multipart.MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                FileValidationUtils.validateImageFile(file, MediaConstants.MAX_MAIN_IMAGE_SIZE);
                CloudMediaUploadResult result = mediaStorageService.uploadImage(file,
                        "muas/" + mua.getId() + "/portfolios");
                newlyUploadedCloudIds.add(result.getPublicId());
                existingImages.add(result.getImageUrl());
            }
        } catch (Exception e) {
            if (!newlyUploadedCloudIds.isEmpty()) {
                mediaStorageService.deleteMediaBatchAsync(newlyUploadedCloudIds);
            }
            throw e;
        }

        mua.setPortfolioImages(existingImages);
        muaProfileRepository.save(mua);
        log.info("Uploaded {} portfolio images for muaId={}", newlyUploadedCloudIds.size(), mua.getId());

        return existingImages;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", allEntries = true)
    public List<String> deletePortfolioImage(Long userId, String imageUrl) {
        if (!StringUtils.hasText(imageUrl)) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "mua.image_url_required", HttpStatus.BAD_REQUEST);
        }

        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        List<String> existingImages = mua.getPortfolioImages();
        if (existingImages != null) {
            existingImages = new ArrayList<>(existingImages);
            boolean removed = existingImages.remove(imageUrl.trim());
            if (removed) {
                mua.setPortfolioImages(existingImages);
                muaProfileRepository.save(mua);
                log.info("Deleted portfolio image {} for muaId={}", imageUrl, mua.getId());
            }
        }
        return existingImages != null ? existingImages : Collections.emptyList();
    }

    private MuaProfileEntity getMuaProfileByUserId(Long userId) {
        return muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND"));
    }
}
