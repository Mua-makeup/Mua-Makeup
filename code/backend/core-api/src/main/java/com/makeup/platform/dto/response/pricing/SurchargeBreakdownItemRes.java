package com.makeup.platform.dto.response.pricing;

import com.makeup.platform.entity.catalog.SurchargeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurchargeBreakdownItemRes {

    private SurchargeType type;
    private String description;
    private BigDecimal amount;
}
