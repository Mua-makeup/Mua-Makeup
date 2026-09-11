package com.makeup.platform.service.catalog;

import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.MasterCategoryRes;

import java.util.List;

public interface MasterTaxonomyService {

    List<MasterCategoryRes> getActiveCategories();

    List<MakeupStyleRes> getActiveStyles();
}
