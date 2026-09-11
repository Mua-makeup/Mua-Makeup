package com.makeup.platform.service.catalog;

import com.makeup.platform.dto.request.catalog.CreatePackageItemReq;
import com.makeup.platform.dto.response.catalog.PackageItemRes;

import java.util.List;

public interface PackageItemService {

    PackageItemRes addItem(Long userId, Long packageId, CreatePackageItemReq req);

    PackageItemRes updateItem(Long userId, Long packageId, Long itemId, CreatePackageItemReq req);

    void deleteItem(Long userId, Long packageId, Long itemId);

    List<PackageItemRes> getItemsByPackageId(Long packageId);
}
