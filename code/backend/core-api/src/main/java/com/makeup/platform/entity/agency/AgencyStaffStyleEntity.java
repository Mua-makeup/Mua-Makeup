package com.makeup.platform.entity.agency;

import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "agency_staff_styles", schema = "agency_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyStaffStyleEntity {

    @EmbeddedId
    private AgencyStaffStyleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("staffId")
    @JoinColumn(name = "staff_id", nullable = false)
    private AgencyStaffEntity staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("styleId")
    @JoinColumn(name = "style_id", nullable = false)
    private MakeupStyleEntity style;

    @Column(name = "is_qualified", nullable = false)
    @Builder.Default
    private Boolean isQualified = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
