package com.makeup.platform.service.catalog;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.catalog.CreatePackageReq;
import com.makeup.platform.dto.request.catalog.UpdatePackageReq;
import com.makeup.platform.dto.response.catalog.PackageDetailRes;
import com.makeup.platform.dto.response.catalog.PackageSummaryRes;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ServicePackageService {

    PackageDetailRes createPackage(Long userId, CreatePackageReq req);

    PackageDetailRes updatePackage(Long userId, Long packageId, UpdatePackageReq req);

    void deletePackage(Long userId, Long packageId);

    PackageDetailRes getPackageById(Long packageId);

    List<PackageSummaryRes> listPackages(Long agencyId, Long muaId, Integer categoryId, Boolean availableOnly);

    PageResponse<PackageSummaryRes> listMyPackages(Long userId, Pageable pageable);

    PackageDetailRes toggleAvailability(Long userId, Long packageId, boolean isAvailable);
}
