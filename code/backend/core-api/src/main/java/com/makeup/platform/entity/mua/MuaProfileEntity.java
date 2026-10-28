package com.makeup.platform.entity.mua;

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

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.makeup.platform.entity.telemetry.AvailabilityStatus;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;


import jakarta.persistence.MapsId;

@Entity
@Table(name = "mua_profiles", schema = "mua_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MuaProfileEntity extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserEntity user;

    @Column(name = "mua_code", unique = true, nullable = false, length = 30)
    private String muaCode;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "experience_years")
    @Builder.Default
    private Integer experienceYears = 1;

    @Column(name = "max_service_radius_km", precision = 4, scale = 1)
    @Builder.Default
    private BigDecimal maxServiceRadiusKm = new BigDecimal("15.0");

    @Column(name = "is_online", nullable = false)
    @Builder.Default
    private Boolean isOnline = false;

    @Column(name = "is_busy", nullable = false)
    @Builder.Default
    private Boolean isBusy = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_status", nullable = false, length = 20)
    @Builder.Default
    private AvailabilityStatus availabilityStatus = AvailabilityStatus.OFFLINE;

    @Column(name = "rating_avg", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal ratingAvg = null;

    @Column(name = "total_completed_jobs", nullable = false)
    @Builder.Default
    private Integer totalCompletedJobs = 0;

    @Column(name = "total_reviews", nullable = false)
    @Builder.Default
    private Integer totalReviews = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "certificates", columnDefinition = "jsonb")
    @Builder.Default
    private List<MuaCertificateItem> certificates = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "portfolio_images", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> portfolioImages = new ArrayList<>();

    @Column(name = "last_known_lat", precision = 10, scale = 8)
    private BigDecimal lastKnownLat;

    @Column(name = "last_known_lng", precision = 11, scale = 8)
    private BigDecimal lastKnownLng;

    @Column(name = "last_known_updated_at")
    private Instant lastKnownUpdatedAt;

    @Column(name = "base_address_lat", precision = 10, scale = 8)
    private BigDecimal baseAddressLat;

    @Column(name = "base_address_lng", precision = 11, scale = 8)
    private BigDecimal baseAddressLng;

    @Column(name = "base_address_text", columnDefinition = "TEXT")
    private String baseAddressText;

    @Column(name = "is_surge_enabled", nullable = false)
    @Builder.Default
    private Boolean isSurgeEnabled = true;

    @Column(name = "bayesian_rating", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal bayesianRating = new BigDecimal("4.60");

    @Column(name = "rolling_rating", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal rollingRating = new BigDecimal("5.00");

    @Column(name = "acceptance_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal acceptanceRate = new BigDecimal("100.00");

    @Column(name = "rank_score", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal rankScore = new BigDecimal("50.00");

    @Enumerated(EnumType.STRING)
    @Column(name = "badge_tier", nullable = false, length = 30)
    @Builder.Default
    private BadgeTier badgeTier = BadgeTier.STANDARD;

    @Column(name = "is_emergency_locked", nullable = false)
    @Builder.Default
    private Boolean isEmergencyLocked = false;

    @Column(name = "commission_rate", nullable = false, precision = 4, scale = 2)
    @Builder.Default
    private BigDecimal commissionRate = new BigDecimal("0.15");
}


