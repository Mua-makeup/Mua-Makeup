package com.makeup.platform.mapper.catalog;

import com.makeup.platform.dto.response.catalog.PackageDetailRes;
import com.makeup.platform.dto.response.catalog.PackageSummaryRes;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ServicePackageMapper {

    private final MasterTaxonomyMapper taxonomyMapper;
    private final PackageItemMapper itemMapper;

    public PackageDetailRes toDetailRes(ServicePackageEntity entity) {
        if (entity == null) {
            return null;
        }
        return PackageDetailRes.builder()
                .id(entity.getId())
                .masterCategoryId(entity.getMasterCategory() != null ? entity.getMasterCategory().getId() : null)
                .categoryName(entity.getMasterCategory() != null ? entity.getMasterCategory().getCategoryName() : null)
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .agencyName(entity.getAgency() != null ? entity.getAgency().getAgencyName() : null)
                .muaId(entity.getMua() != null ? entity.getMua().getId() : null)
                .muaName(entity.getMua() != null && entity.getMua().getUser() != null ? entity.getMua().getUser().getFullName() : null)
                .packageName(entity.getPackageName())
                .description(entity.getDescription())
                .price(entity.getPrice())
                .estimatedDurationMinutes(entity.getEstimatedDurationMinutes())
                .isAvailable(entity.getIsAvailable())
                .styles(entity.getStyles() != null ? taxonomyMapper.toStyleResList(entity.getStyles()) : Collections.emptyList())
                .items(entity.getPackageItems() != null ? itemMapper.toResList(entity.getPackageItems()) : Collections.emptyList())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public PackageSummaryRes toSummaryRes(ServicePackageEntity entity) {
        if (entity == null) {
            return null;
        }
        return PackageSummaryRes.builder()
                .id(entity.getId())
                .masterCategoryId(entity.getMasterCategory() != null ? entity.getMasterCategory().getId() : null)
                .categoryName(entity.getMasterCategory() != null ? entity.getMasterCategory().getCategoryName() : null)
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .agencyName(entity.getAgency() != null ? entity.getAgency().getAgencyName() : null)
                .muaId(entity.getMua() != null ? entity.getMua().getId() : null)
                .muaName(entity.getMua() != null && entity.getMua().getUser() != null ? entity.getMua().getUser().getFullName() : null)
                .packageName(entity.getPackageName())
                .price(entity.getPrice())
                .estimatedDurationMinutes(entity.getEstimatedDurationMinutes())
                .isAvailable(entity.getIsAvailable())
                .styles(entity.getStyles() != null ? taxonomyMapper.toStyleResList(entity.getStyles()) : Collections.emptyList())
                .build();
    }

    public List<PackageSummaryRes> toSummaryResList(Collection<ServicePackageEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toSummaryRes).toList();
    }
}
