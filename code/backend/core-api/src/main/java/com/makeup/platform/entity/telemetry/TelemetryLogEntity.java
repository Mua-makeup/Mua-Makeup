package com.makeup.platform.entity.telemetry;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "telemetry_logs", schema = "telemetry_schema")
@IdClass(TelemetryLogId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelemetryLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Id
    @Column(name = "recorded_at", nullable = false)
    @Builder.Default
    private Instant recordedAt = Instant.now();

    @Column(name = "mua_id", nullable = false)
    private Long muaId;

    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "latitude", precision = 10, scale = 8, nullable = false)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 11, scale = 8, nullable = false)
    private BigDecimal longitude;

    @Column(name = "location_point", columnDefinition = "geometry(Point, 4326)", nullable = false)
    private Point locationPoint;

    @Column(name = "speed_kmh", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal speedKmh = BigDecimal.ZERO;

    @Column(name = "heading_degree", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal headingDegree = BigDecimal.ZERO;

    @Column(name = "accuracy_meters", precision = 6, scale = 2)
    private BigDecimal accuracyMeters;
}
