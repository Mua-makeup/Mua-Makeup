package com.makeup.platform.controller.catalog;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.catalog.MakeupStyleReq;
import com.makeup.platform.dto.request.catalog.MasterCategoryReq;
import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.MasterCategoryRes;
import com.makeup.platform.service.catalog.MasterTaxonomyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class MasterTaxonomyController extends BaseController {

    private final MasterTaxonomyService taxonomyService;

    @GetMapping("/master-categories")
    public ResponseEntity<ApiResponse<List<MasterCategoryRes>>> getCategories() {
        return ok(taxonomyService.getActiveCategories());
    }

    @GetMapping("/admin/master-categories/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<MasterCategoryRes>>> getAllCategories() {
        return ok(taxonomyService.getAllCategories());
    }

    @PostMapping("/admin/master-categories")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<MasterCategoryRes>> createCategory(
            @Valid @RequestBody MasterCategoryReq req
    ) {
        return created(taxonomyService.createCategory(req), "category.create_success");
    }

    @PutMapping("/admin/master-categories/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<MasterCategoryRes>> updateCategory(
            @PathVariable Integer id,
            @Valid @RequestBody MasterCategoryReq req
    ) {
        return ok(taxonomyService.updateCategory(id, req), "category.update_success");
    }

    @PatchMapping("/admin/master-categories/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleCategoryStatus(
            @PathVariable Integer id,
            @RequestParam boolean isActive
    ) {
        taxonomyService.toggleCategoryStatus(id, isActive);
        return ok(Map.of("id", id, "isActive", isActive), "category.status_update_success");
    }

    @GetMapping("/makeup-styles")
    public ResponseEntity<ApiResponse<List<MakeupStyleRes>>> getStyles() {
        return ok(taxonomyService.getActiveStyles());
    }

    @GetMapping("/admin/makeup-styles/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<MakeupStyleRes>>> getAllStyles() {
        return ok(taxonomyService.getAllStyles());
    }

    @PostMapping("/admin/makeup-styles")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<MakeupStyleRes>> createStyle(
            @Valid @RequestBody MakeupStyleReq req
    ) {
        return created(taxonomyService.createStyle(req), "style.create_success");
    }

    @PutMapping("/admin/makeup-styles/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<MakeupStyleRes>> updateStyle(
            @PathVariable Integer id,
            @Valid @RequestBody MakeupStyleReq req
    ) {
        return ok(taxonomyService.updateStyle(id, req), "style.update_success");
    }

    @PatchMapping("/admin/makeup-styles/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleStyleStatus(
            @PathVariable Integer id,
            @RequestParam boolean isActive
    ) {
        taxonomyService.toggleStyleStatus(id, isActive);
        return ok(Map.of("id", id, "isActive", isActive), "style.status_update_success");
    }
}

