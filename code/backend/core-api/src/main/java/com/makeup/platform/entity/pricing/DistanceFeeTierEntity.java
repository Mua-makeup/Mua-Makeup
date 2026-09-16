package com.makeup.platform.entity.pricing;

import com.makeup.platform.common.base.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "distance_fee_tiers", schema = "catalog_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistanceFeeTierEntity extends BaseEntity {

    @Column(name = "min_distance_km", nullable = false, precision = 6, scale = 2)
    private BigDecimal minDistanceKm;

    @Column(name = "max_distance_km", nullable = false, precision = 6, scale = 2)
    private BigDecimal maxDistanceKm;

    @Column(name = "price_per_km", nullable = false, precision = 12, scale = 2)
    private BigDecimal pricePerKm;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
