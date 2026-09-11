package com.makeup.platform.service.catalog.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.catalog.CreatePackageReq;
import com.makeup.platform.dto.request.catalog.UpdatePackageReq;
import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.PackageDetailRes;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.dto.response.catalog.PackageSummaryRes;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.catalog.MasterCategoryEntity;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.mapper.catalog.ServicePackageMapper;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.repository.catalog.MasterCategoryRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.catalog.ServicePackageService;
import com.makeup.platform.service.catalog.helper.CatalogOwnerHelper;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ServicePackageServiceImpl implements ServicePackageService {

    private final ServicePackageRepository packageRepository;
    private final MasterCategoryRepository masterCategoryRepository;
    private final MakeupStyleRepository makeupStyleRepository;
    private final CatalogOwnerHelper ownerHelper;
    private final ServicePackageMapper packageMapper;

    private static final BigDecimal MIN_PRICE = new BigDecimal("50000.00");

    @Override
    public PackageDetailRes createPackage(Long userId, CreatePackageReq req) {
        if (req.getPrice() != null && req.getPrice().compareTo(MIN_PRICE) < 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_PACKAGE_PRICE,
                    "ERR_INVALID_PACKAGE_PRICE", HttpStatus.BAD_REQUEST);
        }

        MasterCategoryEntity category = masterCategoryRepository.findById(req.getMasterCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_MASTER_CATEGORY_NOT_FOUND,
                        "ERR_MASTER_CATEGORY_NOT_FOUND", req.getMasterCategoryId()));

        CatalogOwnerHelper.OwnerContext owner = ownerHelper.resolveOwner(userId);

        ServicePackageEntity pkg = ServicePackageEntity.builder()
                .masterCategory(category)
                .agency(owner.getAgency())
                .mua(owner.getMua())
                .packageName(req.getPackageName().trim())
                .description(req.getDescription())
                .price(req.getPrice())
                .estimatedDurationMinutes(req.getEstimatedDurationMinutes() != null ? req.getEstimatedDurationMinutes() : 60)
                .isAvailable(true)
                .packageItems(new ArrayList<>())
                .styles(new HashSet<>())
                .build();

        if (req.getStyleIds() != null && !req.getStyleIds().isEmpty()) {
            List<MakeupStyleEntity> styles = makeupStyleRepository.findAllById(req.getStyleIds());
            pkg.setStyles(new HashSet<>(styles));
        }

        if (req.getItems() != null && !req.getItems().isEmpty()) {
            for (var itemReq : req.getItems()) {
                PackageItemEntity item = PackageItemEntity.builder()
                        .servicePackage(pkg)
                        .itemType(itemReq.getItemType())
                        .itemName(itemReq.getItemName().trim())
                        .stepOrder(itemReq.getStepOrder())
                        .itemPrice(itemReq.getItemPrice() != null ? itemReq.getItemPrice() : BigDecimal.ZERO)
                        .isRequired(itemReq.getIsRequired() != null ? itemReq.getIsRequired() : true)
                        .isActive(itemReq.getIsActive() != null ? itemReq.getIsActive() : true)
                        .build();
                pkg.getPackageItems().add(item);
            }
        }

        ServicePackageEntity saved = packageRepository.save(pkg);
        return packageMapper.toDetailRes(saved);
    }

    @Override
    public PackageDetailRes updatePackage(Long userId, Long packageId, UpdatePackageReq req) {
        ServicePackageEntity pkg = findPackageAndCheckOwnership(userId, packageId);

        if (req.getPrice() != null && req.getPrice().compareTo(MIN_PRICE) < 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_PACKAGE_PRICE,
                    "ERR_INVALID_PACKAGE_PRICE", HttpStatus.BAD_REQUEST);
        }

        if (!pkg.getMasterCategory().getId().equals(req.getMasterCategoryId())) {
            MasterCategoryEntity newCat = masterCategoryRepository.findById(req.getMasterCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_MASTER_CATEGORY_NOT_FOUND,
                            "ERR_MASTER_CATEGORY_NOT_FOUND", req.getMasterCategoryId()));
            pkg.setMasterCategory(newCat);
        }

        pkg.setPackageName(req.getPackageName().trim());
        pkg.setDescription(req.getDescription());
        pkg.setPrice(req.getPrice());
        pkg.setEstimatedDurationMinutes(req.getEstimatedDurationMinutes());
        if (req.getIsAvailable() != null) {
            pkg.setIsAvailable(req.getIsAvailable());
        }

        if (req.getStyleIds() != null) {
            List<MakeupStyleEntity> styles = makeupStyleRepository.findAllById(req.getStyleIds());
            pkg.setStyles(new HashSet<>(styles));
        }

        ServicePackageEntity updated = packageRepository.save(pkg);
        return packageMapper.toDetailRes(updated);
    }

    @Override
    public void deletePackage(Long userId, Long packageId) {
        ServicePackageEntity pkg = findPackageAndCheckOwnership(userId, packageId);
        packageRepository.delete(pkg);
    }

    @Override
    @Transactional(readOnly = true)
    public PackageDetailRes getPackageById(Long packageId) {
        ServicePackageEntity pkg = packageRepository.findByIdWithDetails(packageId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_PACKAGE_NOT_FOUND,
                        "Không tìm thấy gói dịch vụ với ID: " + packageId, HttpStatus.NOT_FOUND));
        return packageMapper.toDetailRes(pkg);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PackageSummaryRes> listPackages(Long agencyId, Long muaId, Integer categoryId, Boolean availableOnly) {
        Specification<ServicePackageEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (agencyId != null) {
                predicates.add(cb.equal(root.get("agency").get("id"), agencyId));
            }
            if (muaId != null) {
                predicates.add(cb.equal(root.get("mua").get("id"), muaId));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("masterCategory").get("id"), categoryId));
            }
            if (Boolean.TRUE.equals(availableOnly)) {
                predicates.add(cb.isTrue(root.get("isAvailable")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return packageMapper.toSummaryResList(packageRepository.findAll(spec));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PackageSummaryRes> listMyPackages(Long userId) {
        CatalogOwnerHelper.OwnerContext owner = ownerHelper.resolveOwner(userId);
        List<ServicePackageEntity> list;
        if (owner.isAgency()) {
            list = packageRepository.findByAgencyId(owner.getAgency().getId());
        } else {
            list = packageRepository.findByMuaId(owner.getMua().getId());
        }
        return packageMapper.toSummaryResList(list);
    }

    @Override
    public PackageDetailRes toggleAvailability(Long userId, Long packageId, boolean isAvailable) {
        ServicePackageEntity pkg = findPackageAndCheckOwnership(userId, packageId);
        pkg.setIsAvailable(isAvailable);
        return packageMapper.toDetailRes(packageRepository.save(pkg));
    }

    public ServicePackageEntity findPackageAndCheckOwnership(Long userId, Long packageId) {
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
