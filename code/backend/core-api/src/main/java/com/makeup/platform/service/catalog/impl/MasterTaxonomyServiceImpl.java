package com.makeup.platform.service.catalog.impl;

import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.MasterCategoryRes;
import com.makeup.platform.mapper.catalog.MasterTaxonomyMapper;
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
}
