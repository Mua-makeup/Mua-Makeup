package com.makeup.platform.mapper.catalog;

import com.makeup.platform.dto.response.catalog.SurchargeDetailRes;
import com.makeup.platform.entity.catalog.SurchargeEntity;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Component
public class SurchargeMapper {

    public SurchargeDetailRes toRes(SurchargeEntity entity) {
        if (entity == null) {
            return null;
        }
        return SurchargeDetailRes.builder()
                .id(entity.getId())
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .muaId(entity.getMua() != null ? entity.getMua().getId() : null)
                .surchargeName(entity.getSurchargeName())
                .surchargeType(entity.getSurchargeType())
                .amount(entity.getAmount())
                .isActive(entity.getIsActive())
                .build();
    }

    public List<SurchargeDetailRes> toResList(Collection<SurchargeEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toRes).toList();
    }
}
