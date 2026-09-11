package com.makeup.platform.service.catalog.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.MediaConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.common.utils.FileValidationUtils;
import com.makeup.platform.dto.request.mua.CreatePortfolioReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioFeaturedReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioReq;
import com.makeup.platform.dto.request.mua.UpdatePortfolioVisibilityReq;
import com.makeup.platform.dto.response.media.CloudMediaUploadResult;
import com.makeup.platform.dto.response.mua.PortfolioDetailRes;
import com.makeup.platform.dto.response.mua.PortfolioSummaryRes;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.catalog.PortfolioShowcaseEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.catalog.PortfolioMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.repository.catalog.PortfolioShowcaseRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.repository.catalog.projection.PortfolioSummaryProjection;
import com.makeup.platform.service.catalog.PortfolioService;
import com.makeup.platform.service.media.MediaStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioServiceImpl implements PortfolioService {

    private final PortfolioShowcaseRepository portfolioRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final MakeupStyleRepository makeupStyleRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final MediaStorageService mediaStorageService;
    private final PortfolioMapper portfolioMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", key = "#userId")
    public PortfolioDetailRes createPortfolioShowcase(Long userId, CreatePortfolioReq req) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);

        FileValidationUtils.validateImageFile(req.getImageFile(), MediaConstants.MAX_MAIN_IMAGE_SIZE);

        if (req.getAdditionalFiles() != null && req.getAdditionalFiles().size() > MediaConstants.MAX_ADDITIONAL_IMAGES_COUNT) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_TOO_MANY_ADDITIONAL_IMAGES,
                    "ERR_TOO_MANY_ADDITIONAL_IMAGES",
                    new Object[]{MediaConstants.MAX_ADDITIONAL_IMAGES_COUNT},
                    HttpStatus.BAD_REQUEST
            );
        }

        MakeupStyleEntity style = null;
        if (req.getStyleId() != null) {
            style = makeupStyleRepository.findById(req.getStyleId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_STYLE_NOT_FOUND, "ERR_STYLE_NOT_FOUND", req.getStyleId()));
        }

        ServicePackageEntity servicePackage = null;
        if (req.getPackageId() != null) {
            servicePackage = servicePackageRepository.findById(req.getPackageId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_PACKAGE_NOT_FOUND, "ERR_PACKAGE_NOT_FOUND", req.getPackageId()));
            if (servicePackage.getMua() == null || !servicePackage.getMua().getId().equals(mua.getId())) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_PACKAGE_NOT_OWNED,
                        "ERR_PACKAGE_NOT_OWNED",
                        HttpStatus.FORBIDDEN
                );
            }
        }

        List<String> uploadedCloudIds = new ArrayList<>();
        try {
            CloudMediaUploadResult mainResult = mediaStorageService.uploadImage(req.getImageFile(), "portfolios/" + mua.getId());
            uploadedCloudIds.add(mainResult.getPublicId());

            List<String> additionalUrls = new ArrayList<>();
            if (req.getAdditionalFiles() != null && !req.getAdditionalFiles().isEmpty()) {
                for (MultipartFile file : req.getAdditionalFiles()) {
                    FileValidationUtils.validateImageFile(file, MediaConstants.MAX_ADDITIONAL_IMAGE_SIZE);
                    CloudMediaUploadResult subResult = mediaStorageService.uploadImage(file, "portfolios/" + mua.getId() + "/additional");
                    uploadedCloudIds.add(subResult.getPublicId());
                    additionalUrls.add(subResult.getImageUrl());
                }
            }

            PortfolioShowcaseEntity entity = PortfolioShowcaseEntity.builder()
                    .mua(mua)
                    .servicePackage(servicePackage)
                    .style(style)
                    .title(req.getTitle().trim())
                    .description(req.getDescription())
                    .imageUrl(mainResult.getImageUrl())
                    .thumbnailUrl(mainResult.getThumbnailUrl())
                    .additionalImages(additionalUrls)
                    .isFeatured(false)
                    .isVisible(true)
                    .isDeleted(false)
                    .build();

            PortfolioShowcaseEntity saved = portfolioRepository.save(entity);
            return portfolioMapper.toDetailRes(saved);

        } catch (Exception ex) {
            log.error("Compensating transaction triggered: Error creating portfolio showcase: {}", ex.getMessage());
            mediaStorageService.deleteMediaBatchAsync(uploadedCloudIds);
            throw ex;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", allEntries = true)
    public PortfolioDetailRes updatePortfolioShowcase(Long userId, Long portfolioId, UpdatePortfolioReq req) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        PortfolioShowcaseEntity showcase = getShowcaseAndValidateOwner(portfolioId, mua.getId());

        if (req.getStyleId() != null) {
            MakeupStyleEntity style = makeupStyleRepository.findById(req.getStyleId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_STYLE_NOT_FOUND, "ERR_STYLE_NOT_FOUND", req.getStyleId()));
            showcase.setStyle(style);
        } else {
            showcase.setStyle(null);
        }

        if (req.getPackageId() != null) {
            ServicePackageEntity servicePackage = servicePackageRepository.findById(req.getPackageId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_PACKAGE_NOT_FOUND, "ERR_PACKAGE_NOT_FOUND", req.getPackageId()));
            if (servicePackage.getMua() == null || !servicePackage.getMua().getId().equals(mua.getId())) {
                throw new CustomBusinessException(ErrorCodes.ERR_PACKAGE_NOT_OWNED, "ERR_PACKAGE_NOT_OWNED", HttpStatus.FORBIDDEN);
            }
            showcase.setServicePackage(servicePackage);
        } else {
            showcase.setServicePackage(null);
        }

        showcase.setTitle(req.getTitle().trim());
        showcase.setDescription(req.getDescription());

        PortfolioShowcaseEntity updated = portfolioRepository.save(showcase);
        return portfolioMapper.toDetailRes(updated);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", allEntries = true)
    public PortfolioDetailRes updateFeaturedStatus(Long userId, Long portfolioId, UpdatePortfolioFeaturedReq req) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        PortfolioShowcaseEntity showcase = getShowcaseAndValidateOwner(portfolioId, mua.getId());

        if (Boolean.TRUE.equals(req.getIsFeatured())) {
            if (Boolean.FALSE.equals(showcase.getIsVisible())) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_CANNOT_FEATURE_HIDDEN_PORTFOLIO,
                        "ERR_CANNOT_FEATURE_HIDDEN_PORTFOLIO",
                        HttpStatus.BAD_REQUEST
                );
            }

            List<PortfolioShowcaseEntity> currentFeatured = portfolioRepository.findFeaturedForUpdate(mua.getId());
            boolean alreadyFeatured = currentFeatured.stream().anyMatch(p -> p.getId().equals(showcase.getId()));

            if (!alreadyFeatured && currentFeatured.size() >= MediaConstants.MAX_FEATURED_PORTFOLIO_COUNT) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_PORTFOLIO_FEATURED_LIMIT_EXCEEDED,
                        "ERR_PORTFOLIO_FEATURED_LIMIT_EXCEEDED",
                        new Object[]{MediaConstants.MAX_FEATURED_PORTFOLIO_COUNT},
                        HttpStatus.BAD_REQUEST
                );
            }
            showcase.setIsFeatured(true);
        } else {
            showcase.setIsFeatured(false);
        }

        PortfolioShowcaseEntity updated = portfolioRepository.save(showcase);
        return portfolioMapper.toDetailRes(updated);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", allEntries = true)
    public PortfolioDetailRes updateVisibilityStatus(Long userId, Long portfolioId, UpdatePortfolioVisibilityReq req) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        PortfolioShowcaseEntity showcase = getShowcaseAndValidateOwner(portfolioId, mua.getId());

        boolean newVisibility = Boolean.TRUE.equals(req.getIsVisible());
        showcase.setIsVisible(newVisibility);

        if (!newVisibility && Boolean.TRUE.equals(showcase.getIsFeatured())) {
            showcase.setIsFeatured(false);
        }

        PortfolioShowcaseEntity updated = portfolioRepository.save(showcase);
        return portfolioMapper.toDetailRes(updated);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", allEntries = true)
    public void softDeletePortfolio(Long userId, Long portfolioId) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        PortfolioShowcaseEntity showcase = getShowcaseAndValidateOwner(portfolioId, mua.getId());

        showcase.setIsFeatured(false);
        showcase.setIsDeleted(true);
        showcase.setDeletedAt(LocalDateTime.now());
        portfolioRepository.delete(showcase);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "mua_portfolios", key = "#muaId + '_' + #styleId + '_' + #isFeatured + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public PageResponse<PortfolioSummaryRes> getPublicGallery(Long muaId, Integer styleId, Boolean isFeatured, Pageable pageable) {
        Page<PortfolioSummaryProjection> projectedPage = portfolioRepository.findPublicGalleryProjected(
                muaId, styleId, isFeatured, pageable
        );

        List<PortfolioSummaryRes> dtoList = portfolioMapper.toSummaryResListFromProjections(projectedPage.getContent());

        return PageResponse.<PortfolioSummaryRes>builder()
                .content(dtoList)
                .page(projectedPage.getNumber())
                .size(projectedPage.getSize())
                .totalElements(projectedPage.getTotalElements())
                .totalPages(projectedPage.getTotalPages())
                .last(projectedPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PortfolioDetailRes> getMyPortfolios(Long userId, Pageable pageable) {
        MuaProfileEntity mua = getMuaProfileByUserId(userId);
        Page<PortfolioShowcaseEntity> page = portfolioRepository.findAllByMuaIdOrderByCreatedAtDesc(mua.getId(), pageable);
        List<PortfolioDetailRes> dtoList = page.getContent().stream().map(portfolioMapper::toDetailRes).toList();

        return PageResponse.<PortfolioDetailRes>builder()
                .content(dtoList)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PortfolioDetailRes getPortfolioDetail(Long portfolioId) {
        PortfolioShowcaseEntity showcase = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_PORTFOLIO_NOT_FOUND, "ERR_PORTFOLIO_NOT_FOUND", portfolioId));
        return portfolioMapper.toDetailRes(showcase);
    }

    private MuaProfileEntity getMuaProfileByUserId(Long userId) {
        return muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND"
                ));
    }

    private PortfolioShowcaseEntity getShowcaseAndValidateOwner(Long portfolioId, Long muaId) {
        PortfolioShowcaseEntity showcase = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_PORTFOLIO_NOT_FOUND,
                        "ERR_PORTFOLIO_NOT_FOUND",
                        portfolioId
                ));

        if (!showcase.getMua().getId().equals(muaId)) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_PORTFOLIO_ACCESS_DENIED,
                    "ERR_PORTFOLIO_ACCESS_DENIED",
                    HttpStatus.FORBIDDEN
            );
        }

        return showcase;
    }
}
