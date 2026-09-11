package com.makeup.platform.controller.catalog;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.catalog.CreatePackageReq;
import com.makeup.platform.dto.request.catalog.UpdatePackageReq;
import com.makeup.platform.dto.response.catalog.PackageDetailRes;
import com.makeup.platform.dto.response.catalog.PackageSummaryRes;
import com.makeup.platform.service.catalog.ServicePackageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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

@RestController
@RequestMapping("/api/v1/packages")
@RequiredArgsConstructor
public class ServicePackageController extends BaseController {

    private final ServicePackageService packageService;

    @PostMapping
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PackageDetailRes>> createPackage(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CreatePackageReq req) {
        PackageDetailRes res = packageService.createPackage(userId, req);
        return created(res, "Tạo gói dịch vụ thành công!");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PackageDetailRes>> updatePackage(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePackageReq req) {
        PackageDetailRes res = packageService.updatePackage(userId, id, req);
        return ok(res, "Cập nhật gói dịch vụ thành công!");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<Void>> deletePackage(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        packageService.deletePackage(userId, id);
        return ok(null, "Xóa gói dịch vụ thành công!");
    }

    @PatchMapping("/{id}/availability")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<PackageDetailRes>> toggleAvailability(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestParam boolean isAvailable) {
        PackageDetailRes res = packageService.toggleAvailability(userId, id, isAvailable);
        return ok(res, isAvailable ? "Gói dịch vụ đã được kích hoạt" : "Gói dịch vụ đã tạm ngưng nhận lịch");
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'FREELANCE_MUA')")
    public ResponseEntity<ApiResponse<List<PackageSummaryRes>>> listMyPackages(
            @AuthenticationPrincipal Long userId) {
        return ok(packageService.listMyPackages(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PackageDetailRes>> getPackageById(@PathVariable Long id) {
        return ok(packageService.getPackageById(id));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PackageSummaryRes>>> listPackages(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false) Long muaId,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false, defaultValue = "true") Boolean availableOnly) {
        return ok(packageService.listPackages(agencyId, muaId, categoryId, availableOnly));
    }
}
