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
import java.time.LocalTime;

@Entity
@Table(name = "surge_pricing_rules", schema = "catalog_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurgePricingRuleEntity extends BaseEntity {

    @Column(name = "rule_name", nullable = false, length = 150)
    private String ruleName;

    @Column(name = "zone_code", length = 50)
    @Builder.Default
    private String zoneCode = "ALL";

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "applicable_days_of_week", length = 255)
    private String applicableDaysOfWeek; // comma-separated, e.g. "SATURDAY,SUNDAY"

    @Column(name = "surge_multiplier", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal surgeMultiplier = BigDecimal.valueOf(1.00);

    @Column(name = "min_demand_ratio", precision = 4, scale = 2)
    @Builder.Default
    private BigDecimal minDemandRatio = BigDecimal.valueOf(1.00);

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
