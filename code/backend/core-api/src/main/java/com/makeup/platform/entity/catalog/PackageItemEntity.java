package com.makeup.platform.entity.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "package_items", schema = "catalog_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackageItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id", nullable = false)
    private ServicePackageEntity servicePackage;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    private PackageItemType itemType;

    @Column(name = "item_name", nullable = false, length = 150)
    private String itemName;

    @Column(name = "step_order", nullable = false)
    @Builder.Default
    private Integer stepOrder = 1;

    @Column(name = "item_price", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal itemPrice = BigDecimal.ZERO;

    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private Boolean isRequired = true;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
}
