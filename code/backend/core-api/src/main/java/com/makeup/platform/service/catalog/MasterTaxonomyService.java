package com.makeup.platform.service.catalog;

import com.makeup.platform.dto.request.catalog.MakeupStyleReq;
import com.makeup.platform.dto.request.catalog.MasterCategoryReq;
import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.MasterCategoryRes;


import java.util.List;

public interface MasterTaxonomyService {

    List<MasterCategoryRes> getActiveCategories();

    List<MakeupStyleRes> getActiveStyles();

    List<MasterCategoryRes> getAllCategories();

    List<MakeupStyleRes> getAllStyles();

    MasterCategoryRes createCategory(MasterCategoryReq req);

    MasterCategoryRes updateCategory(Integer id, MasterCategoryReq req);

    MakeupStyleRes createStyle(MakeupStyleReq req);

    MakeupStyleRes updateStyle(Integer id, MakeupStyleReq req);
}

