package com.makeup.platform.service.catalog.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.catalog.CreatePackageItemReq;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.entity.catalog.PackageItemType;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.mapper.catalog.PackageItemMapper;
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
    private final PackageItemMapper packageItemMapper;

    @Override
    public PackageItemRes addItem(Long userId, Long packageId, CreatePackageItemReq req) {
        ServicePackageEntity pkg = checkPackageOwnership(userId, packageId);

        if (req.getItemPrice() != null && req.getItemPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_ITEM_PRICE,
                    "ERR_INVALID_ITEM_PRICE", HttpStatus.BAD_REQUEST);
        }

        List<PackageItemEntity> existingItems = packageItemRepository.findByServicePackageIdOrderByStepOrderAsc(packageId);

        // Chặn trùng thứ tự bước (stepOrder)
        boolean isDuplicateOrder = existingItems.stream()
                .anyMatch(it -> it.getStepOrder() != null && it.getStepOrder().equals(req.getStepOrder()));
        if (isDuplicateOrder) {
            throw new CustomBusinessException(ErrorCodes.ERR_DUPLICATE_STEP_ORDER,
                    "ERR_DUPLICATE_STEP_ORDER", HttpStatus.BAD_REQUEST);
        }

        // Chặn tổng thời lượng bước COMPONENT vượt quá thời lượng gói
        if (req.getItemType() == PackageItemType.COMPONENT) {
            int currentComponentDuration = existingItems.stream()
                    .filter(it -> it.getItemType() == PackageItemType.COMPONENT)
                    .mapToInt(it -> it.getDurationMinutes() != null ? it.getDurationMinutes() : 0)
                    .sum();
            int newDuration = req.getDurationMinutes() != null ? req.getDurationMinutes() : 0;
            int maxDuration = pkg.getEstimatedDurationMinutes() != null ? pkg.getEstimatedDurationMinutes() : 0;

            if (maxDuration > 0 && (currentComponentDuration + newDuration) > maxDuration) {
                throw new CustomBusinessException(ErrorCodes.ERR_PACKAGE_DURATION_EXCEEDED,
                        "ERR_PACKAGE_DURATION_EXCEEDED", HttpStatus.BAD_REQUEST);
            }
        }

        PackageItemEntity item = PackageItemEntity.builder()
                .servicePackage(pkg)
                .itemType(req.getItemType())
                .itemName(req.getItemName().trim())
                .stepOrder(req.getStepOrder())
                .itemPrice(req.getItemPrice() != null ? req.getItemPrice() : BigDecimal.ZERO)
                .durationMinutes(req.getDurationMinutes() != null ? req.getDurationMinutes() : 15)
                .isRequired(req.getIsRequired() != null ? req.getIsRequired() : true)
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();

        PackageItemEntity saved = packageItemRepository.save(item);
        return packageItemMapper.toRes(saved);
    }

    @Override
    public PackageItemRes updateItem(Long userId, Long packageId, Long itemId, CreatePackageItemReq req) {
        ServicePackageEntity pkg = checkPackageOwnership(userId, packageId);

        PackageItemEntity item = packageItemRepository.findByIdAndServicePackageId(itemId, packageId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_PACKAGE_NOT_FOUND,
                        "ERR_PACKAGE_NOT_FOUND", itemId));

        if (req.getItemPrice() != null && req.getItemPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_ITEM_PRICE,
                    "ERR_INVALID_ITEM_PRICE", HttpStatus.BAD_REQUEST);
        }

        List<PackageItemEntity> existingItems = packageItemRepository.findByServicePackageIdOrderByStepOrderAsc(packageId);

        // Chặn trùng thứ tự bước (stepOrder) với các bước khác
        boolean isDuplicateOrder = existingItems.stream()
                .filter(it -> !it.getId().equals(itemId))
                .anyMatch(it -> it.getStepOrder() != null && it.getStepOrder().equals(req.getStepOrder()));
        if (isDuplicateOrder) {
            throw new CustomBusinessException(ErrorCodes.ERR_DUPLICATE_STEP_ORDER,
                    "ERR_DUPLICATE_STEP_ORDER", HttpStatus.BAD_REQUEST);
        }

        // Chặn tổng thời lượng bước COMPONENT vượt quá thời lượng gói
        if (req.getItemType() == PackageItemType.COMPONENT) {
            int otherComponentDuration = existingItems.stream()
                    .filter(it -> !it.getId().equals(itemId) && it.getItemType() == PackageItemType.COMPONENT)
                    .mapToInt(it -> it.getDurationMinutes() != null ? it.getDurationMinutes() : 0)
                    .sum();
            int newDuration = req.getDurationMinutes() != null ? req.getDurationMinutes() : 0;
            int maxDuration = pkg.getEstimatedDurationMinutes() != null ? pkg.getEstimatedDurationMinutes() : 0;

            if (maxDuration > 0 && (otherComponentDuration + newDuration) > maxDuration) {
                throw new CustomBusinessException(ErrorCodes.ERR_PACKAGE_DURATION_EXCEEDED,
                        "ERR_PACKAGE_DURATION_EXCEEDED", HttpStatus.BAD_REQUEST);
            }
        }

        item.setItemType(req.getItemType());
        item.setItemName(req.getItemName().trim());
        item.setStepOrder(req.getStepOrder());
        item.setItemPrice(req.getItemPrice());
        if (req.getDurationMinutes() != null) {
            item.setDurationMinutes(req.getDurationMinutes());
        }
        if (req.getIsRequired() != null) {
            item.setIsRequired(req.getIsRequired());
        }
        if (req.getIsActive() != null) {
            item.setIsActive(req.getIsActive());
        }

        PackageItemEntity saved = packageItemRepository.save(item);
        return packageItemMapper.toRes(saved);
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
        return packageItemMapper.toResList(
                packageItemRepository.findByServicePackageIdOrderByStepOrderAsc(packageId)
        );
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
}
