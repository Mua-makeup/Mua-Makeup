package com.makeup.platform.entity.catalog;

import com.makeup.platform.common.base.BaseEntity;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "surcharges", schema = "catalog_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurchargeEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id")
    private AgencyProfileEntity agency;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mua_id")
    private MuaProfileEntity mua;

    @Column(name = "surcharge_name", nullable = false, length = 100)
    private String surchargeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "surcharge_type", nullable = false, length = 30)
    private SurchargeType surchargeType;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
