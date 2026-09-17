package com.makeup.platform.dto.response.catalog;

import com.makeup.platform.entity.catalog.SurchargeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurchargeCalculationRes {

    @Builder.Default
    private BigDecimal totalSurcharge = BigDecimal.ZERO;

    @Builder.Default
    private List<AppliedSurchargeItem> appliedSurcharges = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AppliedSurchargeItem {
        private SurchargeType surchargeType;
        private String surchargeName;
        private BigDecimal amount;
        private String description;
    }
}
