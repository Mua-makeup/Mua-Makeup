package com.makeup.platform.entity.telemetry;

import com.makeup.platform.common.base.BaseEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.locationtech.jts.geom.LineString;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "booking_trips", schema = "telemetry_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingTripEntity extends BaseEntity {

    @Column(name = "booking_id", unique = true, nullable = false)
    private Long bookingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mua_id", nullable = false)
    private MuaProfileEntity mua;

    @Column(name = "total_distance_km", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal totalDistanceKm = BigDecimal.ZERO;

    @Column(name = "total_duration_minutes")
    @Builder.Default
    private Integer totalDurationMinutes = 0;

    @Column(name = "route_linestring", columnDefinition = "geometry(LineString, 4326)", nullable = false)
    private LineString routeLinestring;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time", nullable = false)
    private Instant endTime;
}
