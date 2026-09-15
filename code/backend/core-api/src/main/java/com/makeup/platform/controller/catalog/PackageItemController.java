package com.makeup.platform.controller.catalog;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.catalog.CreatePackageItemReq;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.service.catalog.PackageItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/packages/{packageId}/items")
@RequiredArgsConstructor
public class PackageItemController extends BaseController {

    private final PackageItemService itemService;

    @PostMapping
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PackageItemRes>> addItem(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long packageId,
            @Valid @RequestBody CreatePackageItemReq req) {
        PackageItemRes res = itemService.addItem(userId, packageId, req);
        return created(res, "catalog.package_item_create_success");
    }

    @PutMapping("/{itemId}")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PackageItemRes>> updateItem(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long packageId,
            @PathVariable Long itemId,
            @Valid @RequestBody CreatePackageItemReq req) {
        PackageItemRes res = itemService.updateItem(userId, packageId, itemId, req);
        return ok(res, "catalog.package_item_update_success");
    }

    @DeleteMapping("/{itemId}")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long packageId,
            @PathVariable Long itemId) {
        itemService.deleteItem(userId, packageId, itemId);
        return ok(null, "catalog.package_item_delete_success");
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PackageItemRes>>> getItems(@PathVariable Long packageId) {
        return ok(itemService.getItemsByPackageId(packageId));
    }
}
