package com.makeup.platform.service.catalog.impl;

import com.makeup.platform.common.constants.ErrorCodes;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.catalog.MakeupStyleReq;
import com.makeup.platform.dto.request.catalog.MasterCategoryReq;
import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.MasterCategoryRes;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.catalog.MasterCategoryEntity;
import com.makeup.platform.mapper.catalog.MasterTaxonomyMapper;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.repository.catalog.MasterCategoryRepository;
import com.makeup.platform.service.catalog.MasterTaxonomyService;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MasterTaxonomyServiceImpl implements MasterTaxonomyService {

    private final MasterCategoryRepository masterCategoryRepository;
    private final MakeupStyleRepository makeupStyleRepository;
    private final MasterTaxonomyMapper taxonomyMapper;

    @Override
    public List<MasterCategoryRes> getActiveCategories() {
        return taxonomyMapper.toCategoryResList(
                masterCategoryRepository.findAllByIsActiveTrueOrderByCategoryNameAsc()
        );
    }

    @Override
    public List<MakeupStyleRes> getActiveStyles() {
        return taxonomyMapper.toStyleResList(
                makeupStyleRepository.findAllByIsActiveTrueOrderByStyleNameAsc()
        );
    }

    @Override
    public List<MasterCategoryRes> getAllCategories() {
        return taxonomyMapper.toCategoryResList(
                masterCategoryRepository.findAll(org.springframework.data.domain.Sort.by("categoryName"))
        );
    }

    @Override
    public List<MakeupStyleRes> getAllStyles() {
        return taxonomyMapper.toStyleResList(
                makeupStyleRepository.findAll(Sort.by("styleName"))
        );
    }

    @Override
    @Transactional
    public MasterCategoryRes createCategory(MasterCategoryReq req) {
        if (masterCategoryRepository.existsByCategoryCode(req.getCategoryCode())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_TAXONOMY_CODE_CONFLICT,
                    "category.code_conflict", HttpStatus.CONFLICT);
        }

        MasterCategoryEntity entity = MasterCategoryEntity.builder()
                .categoryCode(req.getCategoryCode().trim().toUpperCase())
                .categoryName(req.getCategoryName().trim())
                .description(req.getDescription())
                .iconUrl(req.getIconUrl())
                .isActive(Boolean.TRUE.equals(req.getIsActive()))
                .build();

        return taxonomyMapper.toCategoryRes(masterCategoryRepository.save(entity));
    }

    @Override
    @Transactional
    public MasterCategoryRes updateCategory(Integer id, MasterCategoryReq req) {
        MasterCategoryEntity entity = masterCategoryRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_MASTER_CATEGORY_NOT_FOUND,
                        "category.not_found", HttpStatus.NOT_FOUND));

        entity.setCategoryName(req.getCategoryName().trim());
        entity.setDescription(req.getDescription());
        entity.setIconUrl(req.getIconUrl());
        if (req.getIsActive() != null) {
            entity.setIsActive(req.getIsActive());
        }

        return taxonomyMapper.toCategoryRes(masterCategoryRepository.save(entity));
    }

    @Override
    @Transactional
    public MakeupStyleRes createStyle(MakeupStyleReq req) {
        if (makeupStyleRepository.existsByStyleCode(req.getStyleCode())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_TAXONOMY_CODE_CONFLICT,
                    "style.code_conflict", HttpStatus.CONFLICT);
        }

        MakeupStyleEntity entity = MakeupStyleEntity.builder()
                .styleCode(req.getStyleCode().trim().toUpperCase())
                .styleName(req.getStyleName().trim())
                .description(req.getDescription())
                .isActive(Boolean.TRUE.equals(req.getIsActive()))
                .build();

        return taxonomyMapper.toStyleRes(makeupStyleRepository.save(entity));
    }

    @Override
    @Transactional
    public MakeupStyleRes updateStyle(Integer id, MakeupStyleReq req) {
        MakeupStyleEntity entity = makeupStyleRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_STYLE_NOT_FOUND,
                        "style.not_found", HttpStatus.NOT_FOUND));

        entity.setStyleName(req.getStyleName().trim());
        entity.setDescription(req.getDescription());
        if (req.getIsActive() != null) {
            entity.setIsActive(req.getIsActive());
        }

        return taxonomyMapper.toStyleRes(makeupStyleRepository.save(entity));
    }

    @Override
    @Transactional
    public MasterCategoryRes toggleCategoryStatus(Integer id, boolean isActive) {
        MasterCategoryEntity entity = masterCategoryRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_MASTER_CATEGORY_NOT_FOUND,
                        "category.not_found", HttpStatus.NOT_FOUND));

        entity.setIsActive(isActive);
        return taxonomyMapper.toCategoryRes(masterCategoryRepository.save(entity));
    }

    @Override
    @Transactional
    public MakeupStyleRes toggleStyleStatus(Integer id, boolean isActive) {
        MakeupStyleEntity entity = makeupStyleRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_STYLE_NOT_FOUND,
                        "style.not_found", HttpStatus.NOT_FOUND));

        entity.setIsActive(isActive);
        return taxonomyMapper.toStyleRes(makeupStyleRepository.save(entity));
    }
}


