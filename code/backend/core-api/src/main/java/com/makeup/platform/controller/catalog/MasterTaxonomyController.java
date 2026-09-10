package com.makeup.platform.controller.catalog;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.MasterCategoryRes;
import com.makeup.platform.service.catalog.MasterTaxonomyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class MasterTaxonomyController extends BaseController {

    private final MasterTaxonomyService taxonomyService;

    @GetMapping("/master-categories")
    public ResponseEntity<ApiResponse<List<MasterCategoryRes>>> getCategories() {
        return ok(taxonomyService.getActiveCategories());
    }

    @GetMapping("/makeup-styles")
    public ResponseEntity<ApiResponse<List<MakeupStyleRes>>> getStyles() {
        return ok(taxonomyService.getActiveStyles());
    }
}
