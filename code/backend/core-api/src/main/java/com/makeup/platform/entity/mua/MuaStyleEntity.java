package com.makeup.platform.entity.mua;

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
@Table(name = "mua_styles", schema = "mua_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MuaStyleEntity {

    @EmbeddedId
    private MuaStyleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("muaId")
    @JoinColumn(name = "mua_id", nullable = false)
    private MuaProfileEntity muaProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("styleId")
    @JoinColumn(name = "style_id", nullable = false)
    private MakeupStyleEntity style;

    @Column(name = "is_qualified", nullable = false)
    @Builder.Default
    private Boolean isQualified = true;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false, nullable = false)
    private LocalDateTime assignedAt;
}
