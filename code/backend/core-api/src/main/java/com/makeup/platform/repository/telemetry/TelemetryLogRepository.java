package com.makeup.platform.repository.telemetry;

import com.makeup.platform.entity.telemetry.TelemetryLogEntity;
import com.makeup.platform.entity.telemetry.TelemetryLogId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TelemetryLogRepository extends JpaRepository<TelemetryLogEntity, TelemetryLogId> {

    @Query("SELECT t FROM TelemetryLogEntity t WHERE t.bookingId = :bookingId ORDER BY t.recordedAt ASC")
    List<TelemetryLogEntity> findByBookingIdOrderByRecordedAtAsc(@Param("bookingId") Long bookingId);

    @Query("SELECT t FROM TelemetryLogEntity t WHERE t.muaId = :muaId ORDER BY t.recordedAt DESC")
    List<TelemetryLogEntity> findByMuaIdOrderByRecordedAtDesc(@Param("muaId") Long muaId);
}
