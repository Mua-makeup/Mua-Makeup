package com.makeup.platform.mapper.catalog;

import com.makeup.platform.dto.response.mua.PortfolioDetailRes;
import com.makeup.platform.dto.response.mua.PortfolioSummaryRes;
import com.makeup.platform.entity.catalog.PortfolioShowcaseEntity;
import com.makeup.platform.repository.catalog.projection.PortfolioSummaryProjection;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Component
public class PortfolioMapper {

    public PortfolioDetailRes toDetailRes(PortfolioShowcaseEntity entity) {
        if (entity == null) {
            return null;
        }
        return PortfolioDetailRes.builder()
                .id(entity.getId())
                .muaId(entity.getMua() != null ? entity.getMua().getId() : null)
                .title(entity.getTitle())
                .description(entity.getDescription())
                .imageUrl(entity.getImageUrl())
                .thumbnailUrl(entity.getThumbnailUrl())
                .additionalImages(entity.getAdditionalImages())
                .styleId(entity.getStyle() != null ? entity.getStyle().getId() : null)
                .styleName(entity.getStyle() != null ? entity.getStyle().getStyleName() : null)
                .packageId(entity.getServicePackage() != null ? entity.getServicePackage().getId() : null)
                .packageName(entity.getServicePackage() != null ? entity.getServicePackage().getPackageName() : null)
                .isFeatured(entity.getIsFeatured())
                .isVisible(entity.getIsVisible())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public PortfolioSummaryRes toSummaryRes(PortfolioShowcaseEntity entity) {
        if (entity == null) {
            return null;
        }
        return PortfolioSummaryRes.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .imageUrl(entity.getImageUrl())
                .thumbnailUrl(entity.getThumbnailUrl())
                .styleName(entity.getStyle() != null ? entity.getStyle().getStyleName() : null)
                .isFeatured(entity.getIsFeatured())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public List<PortfolioSummaryRes> toSummaryResList(Collection<PortfolioShowcaseEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toSummaryRes).toList();
    }

    public PortfolioSummaryRes toSummaryRes(PortfolioSummaryProjection projection) {
        if (projection == null) {
            return null;
        }
        return PortfolioSummaryRes.builder()
                .id(projection.getId())
                .title(projection.getTitle())
                .thumbnailUrl(projection.getThumbnailUrl())
                .imageUrl(projection.getImageUrl())
                .styleName(projection.getStyleName())
                .isFeatured(projection.getIsFeatured())
                .createdAt(projection.getCreatedAt())
                .build();
    }

    public List<PortfolioSummaryRes> toSummaryResListFromProjections(Collection<PortfolioSummaryProjection> projections) {
        if (projections == null || projections.isEmpty()) {
            return Collections.emptyList();
        }
        return projections.stream().map(this::toSummaryRes).toList();
    }
}
