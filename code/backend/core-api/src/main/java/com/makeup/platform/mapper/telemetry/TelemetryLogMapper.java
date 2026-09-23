package com.makeup.platform.mapper.telemetry;

import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.response.telemetry.TelemetryLogRes;
import com.makeup.platform.entity.telemetry.BookingTripEntity;
import com.makeup.platform.entity.telemetry.TelemetryLogEntity;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class TelemetryLogMapper {

    public TelemetryLogRes toRes(TelemetryLogEntity entity) {
        if (entity == null) {
            return null;
        }
        return TelemetryLogRes.builder()
                .id(entity.getId())
                .muaId(entity.getMuaId())
                .bookingId(entity.getBookingId())
                .latitude(entity.getLatitude() != null ? entity.getLatitude().doubleValue() : null)
                .longitude(entity.getLongitude() != null ? entity.getLongitude().doubleValue() : null)
                .speedKmh(entity.getSpeedKmh() != null ? entity.getSpeedKmh().doubleValue() : 0.0)
                .headingDegree(entity.getHeadingDegree() != null ? entity.getHeadingDegree().doubleValue() : 0.0)
                .accuracyMeters(entity.getAccuracyMeters() != null ? entity.getAccuracyMeters().doubleValue() : null)
                .recordedAt(entity.getRecordedAt())
                .build();
    }

    public List<TelemetryLogRes> toResList(List<TelemetryLogEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toRes).toList();
    }

    public TelemetryLogRes toResFromTrip(BookingTripEntity trip) {
        if (trip == null) {
            return null;
        }

        List<double[]> routeCoordinates = new ArrayList<>();
        if (trip.getRouteLinestring() != null) {
            for (Coordinate coord : trip.getRouteLinestring().getCoordinates()) {
                // GeoJSON format: [longitude, latitude]
                routeCoordinates.add(new double[]{coord.getX(), coord.getY()});
            }
        }

        Instant recordedAt = trip.getCreatedAt() != null
                ? trip.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()
                : Instant.now();

        return TelemetryLogRes.builder()
                .id(trip.getId())
                .muaId(trip.getMua() != null ? trip.getMua().getId() : null)
                .bookingId(trip.getBookingId())
                .speedKmh(0.0)
                .headingDegree(0.0)
                .recordedAt(recordedAt)
                .routeCoordinates(routeCoordinates)
                .build();
    }

    public TelemetryLogRes toResFromLogs(Long bookingId, List<TelemetryLogEntity> logs) {
        if (logs == null || logs.isEmpty()) {
            return null;
        }

        List<double[]> routeCoordinates = new ArrayList<>();
        for (TelemetryLogEntity logEntity : logs) {
            // GeoJSON format: [longitude, latitude]
            routeCoordinates.add(new double[]{
                    logEntity.getLongitude().doubleValue(),
                    logEntity.getLatitude().doubleValue()
            });
        }

        TelemetryLogEntity last = logs.get(logs.size() - 1);
        return TelemetryLogRes.builder()
                .id(last.getId())
                .muaId(last.getMuaId())
                .bookingId(bookingId)
                .latitude(last.getLatitude().doubleValue())
                .longitude(last.getLongitude().doubleValue())
                .speedKmh(last.getSpeedKmh() != null ? last.getSpeedKmh().doubleValue() : 0.0)
                .headingDegree(last.getHeadingDegree() != null ? last.getHeadingDegree().doubleValue() : 0.0)
                .accuracyMeters(last.getAccuracyMeters() != null ? last.getAccuracyMeters().doubleValue() : null)
                .recordedAt(last.getRecordedAt())
                .routeCoordinates(routeCoordinates)
                .build();
    }

    public TelemetryLogEntity toEntity(Long muaId, LocationStreamReq req, Point point) {
        return TelemetryLogEntity.builder()
                .muaId(muaId)
                .bookingId(req.getBookingId())
                .latitude(BigDecimal.valueOf(req.getLatitude()))
                .longitude(BigDecimal.valueOf(req.getLongitude()))
                .locationPoint(point)
                .speedKmh(req.getSpeed() != null ? BigDecimal.valueOf(req.getSpeed()) : BigDecimal.ZERO)
                .headingDegree(req.getHeading() != null ? BigDecimal.valueOf(req.getHeading()) : BigDecimal.ZERO)
                .accuracyMeters(req.getAccuracy() != null ? BigDecimal.valueOf(req.getAccuracy()) : null)
                .recordedAt(Instant.now())
                .build();
    }
}
