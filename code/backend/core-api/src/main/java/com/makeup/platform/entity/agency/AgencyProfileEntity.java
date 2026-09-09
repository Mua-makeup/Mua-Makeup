package com.makeup.platform.entity.agency;

import com.makeup.platform.common.base.BaseEntity;
import com.makeup.platform.entity.auth.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "agency_profiles", schema = "agency_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyProfileEntity extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false, unique = true)
    private UserEntity owner;

    @Column(name = "agency_code", unique = true, nullable = false, length = 30)
    private String agencyCode;

    @Column(name = "agency_name", nullable = false, length = 150)
    private String agencyName;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "hotline", nullable = false, length = 20)
    private String hotline;

    @Column(name = "address_street", nullable = false, columnDefinition = "TEXT")
    private String addressStreet;

    @Column(name = "district", nullable = false, length = 50)
    private String district;

    @Column(name = "city", nullable = false, length = 50)
    private String city;

    @Column(name = "commission_rate_internal", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal commissionRateInternal = new BigDecimal("30.00");

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "rating_avg", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal ratingAvg = new BigDecimal("5.00");
}
