package com.makeup.platform.mapper.catalog;

import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Component
public class PackageItemMapper {

    public PackageItemRes toRes(PackageItemEntity entity) {
        if (entity == null) {
            return null;
        }
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

    public List<PackageItemRes> toResList(Collection<PackageItemEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toRes).toList();
    }
}
