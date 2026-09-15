package com.makeup.platform.service.telemetry.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.GeoDistanceUtils;
import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.dto.response.telemetry.TelemetryLogRes;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.BookingTripEntity;
import com.makeup.platform.entity.telemetry.TelemetryLogEntity;
import com.makeup.platform.mapper.telemetry.TelemetryLogMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.telemetry.BookingTripRepository;
import com.makeup.platform.repository.telemetry.TelemetryLogRepository;
import com.makeup.platform.service.telemetry.TelemetryLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryLogServiceImpl implements TelemetryLogService {

    private final TelemetryLogRepository telemetryLogRepository;
    private final BookingTripRepository bookingTripRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final TelemetryLogMapper telemetryLogMapper;

    @Async
    @Override
    @Transactional
    public void saveTelemetryLog(Long muaId, LocationStreamReq req) {
        try {
            Point point = GeoDistanceUtils.createPoint(req.getLatitude(), req.getLongitude());
            TelemetryLogEntity entity = telemetryLogMapper.toEntity(muaId, req, point);
            telemetryLogRepository.save(entity);
            log.debug("Saved telemetry log point for MUA {} and booking {}", muaId, req.getBookingId());
        } catch (Exception e) {
            log.error("Failed to asynchronously save telemetry log for MUA {}: {}", muaId, e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public TelemetryLogRes compressBookingTrip(Long userId, Long bookingId) {
        log.info("Compressing booking trip for userId={}, bookingId={}", userId, bookingId);

        MuaProfileEntity mua = muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND, "ERR_MUA_PROFILE_NOT_FOUND", HttpStatus.NOT_FOUND));

        // Kiểm tra xem đã nén lộ trình trước đó chưa
        var existingTrip = bookingTripRepository.findByBookingId(bookingId);
        if (existingTrip.isPresent()) {
            return telemetryLogMapper.toResFromTrip(existingTrip.get());
        }

        List<TelemetryLogEntity> logs = telemetryLogRepository.findByBookingIdOrderByRecordedAtAsc(bookingId);
        if (logs == null || logs.isEmpty()) {
            throw new CustomBusinessException(ErrorCodes.ERR_TRIP_NOT_FOUND, "ERR_TRIP_NOT_FOUND", HttpStatus.NOT_FOUND);
        }

        List<Coordinate> coordinates = new ArrayList<>();
        double totalDistanceKm = 0.0;
        TelemetryLogEntity prev = null;

        for (TelemetryLogEntity curr : logs) {
            coordinates.add(new Coordinate(curr.getLongitude().doubleValue(), curr.getLatitude().doubleValue()));
            if (prev != null) {
                totalDistanceKm += GeoDistanceUtils.calculateDistanceKm(
                        prev.getLatitude().doubleValue(), prev.getLongitude().doubleValue(),
                        curr.getLatitude().doubleValue(), curr.getLongitude().doubleValue()
                );
            }
            prev = curr;
        }

        // Đảm bảo có ít nhất 2 điểm để tạo LineString hợp lệ theo chuẩn OGC
        if (coordinates.size() < 2) {
            // Trường hợp chỉ có 1 điểm duy nhất, lặp lại điểm đó với độ dịch cực nhỏ để tạo LineString hợp lệ
            Coordinate single = coordinates.get(0);
            coordinates.add(new Coordinate(single.getX() + 0.000001, single.getY() + 0.000001));
        }

        LineString lineString = GeoDistanceUtils.createLineString(coordinates);

        Instant startTime = logs.get(0).getRecordedAt();
        Instant endTime = logs.get(logs.size() - 1).getRecordedAt();
        long durationMinutes = Duration.between(startTime, endTime).toMinutes();

        BookingTripEntity trip = BookingTripEntity.builder()
                .bookingId(bookingId)
                .mua(mua)
                .totalDistanceKm(BigDecimal.valueOf(totalDistanceKm).setScale(2, RoundingMode.HALF_UP))
                .totalDurationMinutes((int) durationMinutes)
                .routeLinestring(lineString)
                .startTime(startTime)
                .endTime(endTime)
                .build();

        BookingTripEntity saved = bookingTripRepository.save(trip);
        return telemetryLogMapper.toResFromTrip(saved);
    }
}
