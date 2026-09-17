package com.makeup.platform.mapper.catalog;

import com.makeup.platform.dto.response.catalog.MakeupStyleRes;
import com.makeup.platform.dto.response.catalog.MasterCategoryRes;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.catalog.MasterCategoryEntity;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Component
public class MasterTaxonomyMapper {

    public MasterCategoryRes toCategoryRes(MasterCategoryEntity entity) {
        if (entity == null) {
            return null;
        }
        return MasterCategoryRes.builder()
                .id(entity.getId())
                .categoryCode(entity.getCategoryCode())
                .categoryName(entity.getCategoryName())
                .description(entity.getDescription())
                .iconUrl(entity.getIconUrl())
                .isActive(entity.getIsActive())
                .build();
    }

    public List<MasterCategoryRes> toCategoryResList(Collection<MasterCategoryEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toCategoryRes).toList();
    }

    public MakeupStyleRes toStyleRes(MakeupStyleEntity entity) {
        if (entity == null) {
            return null;
        }
        return MakeupStyleRes.builder()
                .id(entity.getId())
                .styleCode(entity.getStyleCode())
                .styleName(entity.getStyleName())
                .description(entity.getDescription())
                .isActive(entity.getIsActive())
                .build();
    }

    public List<MakeupStyleRes> toStyleResList(Collection<MakeupStyleEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toStyleRes).toList();
    }
}
