package com.makeup.platform.dto.response.catalog;

import com.makeup.platform.entity.catalog.SurchargeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurchargeDetailRes {

    private Long id;
    private Long agencyId;
    private Long muaId;
    private String surchargeName;
    private SurchargeType surchargeType;
    private BigDecimal amount;
    private Boolean isActive;
}
