package com.makeup.platform.mapper.pricing;

import com.makeup.platform.dto.request.pricing.ConfigureSurgeRuleReq;
import com.makeup.platform.dto.response.pricing.SurgeRuleRes;
import com.makeup.platform.entity.pricing.SurgePricingRuleEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class SurgePricingRuleMapper {

    public SurgePricingRuleEntity toEntity(ConfigureSurgeRuleReq req) {
        if (req == null) return null;
        return SurgePricingRuleEntity.builder()
                .ruleName(req.getRuleName() != null ? req.getRuleName().trim() : null)
                .zoneCode(req.getZoneCode() != null ? req.getZoneCode().trim() : "ALL")
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .applicableDaysOfWeek(req.getApplicableDaysOfWeek())
                .surgeMultiplier(req.getSurgeMultiplier())
                .minDemandRatio(req.getMinDemandRatio())
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();
    }

    public SurgeRuleRes toRes(SurgePricingRuleEntity entity) {
        if (entity == null) return null;
        return SurgeRuleRes.builder()
                .id(entity.getId())
                .ruleName(entity.getRuleName())
                .zoneCode(entity.getZoneCode())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .applicableDaysOfWeek(entity.getApplicableDaysOfWeek())
                .surgeMultiplier(entity.getSurgeMultiplier())
                .minDemandRatio(entity.getMinDemandRatio())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public List<SurgeRuleRes> toResList(List<SurgePricingRuleEntity> entities) {
        if (entities == null) return Collections.emptyList();
        return entities.stream().map(this::toRes).toList();
    }
}
