package com.makeup.platform.service.catalog.impl;

import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.MasterCategoryRes;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.repository.catalog.MasterCategoryRepository;
import com.makeup.platform.service.catalog.MasterTaxonomyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MasterTaxonomyServiceImpl implements MasterTaxonomyService {

    private final MasterCategoryRepository masterCategoryRepository;
    private final MakeupStyleRepository makeupStyleRepository;

    @Override
    public List<MasterCategoryRes> getActiveCategories() {
        return masterCategoryRepository.findAllByIsActiveTrueOrderByCategoryNameAsc().stream()
                .map(cat -> MasterCategoryRes.builder()
                        .id(cat.getId())
                        .categoryCode(cat.getCategoryCode())
                        .categoryName(cat.getCategoryName())
                        .description(cat.getDescription())
                        .iconUrl(cat.getIconUrl())
                        .isActive(cat.getIsActive())
                        .build())
                .toList();
    }

    @Override
    public List<MakeupStyleRes> getActiveStyles() {
        return makeupStyleRepository.findAllByIsActiveTrueOrderByStyleNameAsc().stream()
                .map(s -> MakeupStyleRes.builder()
                        .id(s.getId())
                        .styleCode(s.getStyleCode())
                        .styleName(s.getStyleName())
                        .description(s.getDescription())
                        .isActive(s.getIsActive())
                        .build())
                .toList();
    }
}
