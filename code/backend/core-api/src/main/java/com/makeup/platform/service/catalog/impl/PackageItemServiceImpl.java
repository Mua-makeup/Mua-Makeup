package com.makeup.platform.service.catalog.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.catalog.CreatePackageItemReq;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.repository.catalog.PackageItemRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.catalog.PackageItemService;
import com.makeup.platform.service.catalog.helper.CatalogOwnerHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PackageItemServiceImpl implements PackageItemService {

    private final PackageItemRepository packageItemRepository;
    private final ServicePackageRepository packageRepository;
    private final CatalogOwnerHelper ownerHelper;

    @Override
    public PackageItemRes addItem(Long userId, Long packageId, CreatePackageItemReq req) {
        ServicePackageEntity pkg = checkPackageOwnership(userId, packageId);

        if (req.getItemPrice() != null && req.getItemPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_ITEM_PRICE,
                    "ERR_INVALID_ITEM_PRICE", HttpStatus.BAD_REQUEST);
        }

        PackageItemEntity item = PackageItemEntity.builder()
                .servicePackage(pkg)
                .itemType(req.getItemType())
                .itemName(req.getItemName().trim())
                .stepOrder(req.getStepOrder())
                .itemPrice(req.getItemPrice() != null ? req.getItemPrice() : BigDecimal.ZERO)
                .isRequired(req.getIsRequired() != null ? req.getIsRequired() : true)
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();

        PackageItemEntity saved = packageItemRepository.save(item);
        return mapToRes(saved);
    }

    @Override
    public PackageItemRes updateItem(Long userId, Long packageId, Long itemId, CreatePackageItemReq req) {
        checkPackageOwnership(userId, packageId);

        PackageItemEntity item = packageItemRepository.findByIdAndServicePackageId(itemId, packageId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_PACKAGE_NOT_FOUND,
                        "ERR_PACKAGE_NOT_FOUND", itemId));

        if (req.getItemPrice() != null && req.getItemPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_ITEM_PRICE,
                    "ERR_INVALID_ITEM_PRICE", HttpStatus.BAD_REQUEST);
        }

        item.setItemType(req.getItemType());
        item.setItemName(req.getItemName().trim());
        item.setStepOrder(req.getStepOrder());
        item.setItemPrice(req.getItemPrice());
        if (req.getIsRequired() != null) {
            item.setIsRequired(req.getIsRequired());
        }
        if (req.getIsActive() != null) {
            item.setIsActive(req.getIsActive());
        }

        PackageItemEntity saved = packageItemRepository.save(item);
        return mapToRes(saved);
    }

    @Override
    public void deleteItem(Long userId, Long packageId, Long itemId) {
        checkPackageOwnership(userId, packageId);

        PackageItemEntity item = packageItemRepository.findByIdAndServicePackageId(itemId, packageId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_PACKAGE_NOT_FOUND,
                        "ERR_PACKAGE_NOT_FOUND", itemId));

        packageItemRepository.delete(item);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PackageItemRes> getItemsByPackageId(Long packageId) {
        return packageItemRepository.findByServicePackageIdOrderByStepOrderAsc(packageId).stream()
                .map(this::mapToRes)
                .toList();
    }

    private ServicePackageEntity checkPackageOwnership(Long userId, Long packageId) {
        ServicePackageEntity pkg = packageRepository.findById(packageId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_PACKAGE_NOT_FOUND,
                        "ERR_PACKAGE_NOT_FOUND", packageId));

        CatalogOwnerHelper.OwnerContext owner = ownerHelper.resolveOwner(userId);

        boolean isAgencyOwner = pkg.getAgency() != null && owner.isAgency()
                && pkg.getAgency().getId() != null
                && pkg.getAgency().getId().equals(owner.getAgency().getId());
        boolean isMuaOwner = pkg.getMua() != null && owner.isMua()
                && pkg.getMua().getId() != null
                && pkg.getMua().getId().equals(owner.getMua().getId());

        if (!isAgencyOwner && !isMuaOwner) {
            throw new CustomBusinessException(ErrorCodes.ERR_PACKAGE_ACCESS_DENIED,
                    "ERR_PACKAGE_ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }

        return pkg;
    }

    private PackageItemRes mapToRes(PackageItemEntity entity) {
        return PackageItemRes.builder()
                .id(entity.getId())
                .itemType(entity.getItemType())
                .itemName(entity.getItemName())
                .stepOrder(entity.getStepOrder())
                .itemPrice(entity.getItemPrice())
                .isRequired(entity.getIsRequired())
                .isActive(entity.getIsActive())
                .build();
    }
}
