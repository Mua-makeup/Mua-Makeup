package com.makeup.platform.entity.agency;

import com.makeup.platform.common.base.BaseEntity;
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
@Table(name = "agency_overtime_rules", schema = "agency_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyOvertimeRuleEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", nullable = false)
    private AgencyProfileEntity agency;

    @Column(name = "rule_name", nullable = false, length = 150)
    private String ruleName;

    @Column(name = "min_overtime_minutes", nullable = false)
    private Integer minOvertimeMinutes;

    @Column(name = "max_overtime_minutes")
    private Integer maxOvertimeMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "penalty_type", nullable = false, length = 30)
    private OvertimePenaltyType penaltyType;

    @Column(name = "penalty_value", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal penaltyValue = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
