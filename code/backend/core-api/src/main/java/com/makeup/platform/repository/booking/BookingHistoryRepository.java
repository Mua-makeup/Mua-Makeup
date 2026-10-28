package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.BookingHistoryEntity;
import com.makeup.platform.entity.booking.BookingStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface BookingHistoryRepository extends JpaRepository<BookingHistoryEntity, Long> {

    interface ExecutionTimes {
        Long getStartedAtMillis();
        Long getCompletedAtMillis();
    }

    // Read TIMESTAMPTZ as instants, bypassing the legacy LocalDateTime entity mapping.
    @Query(value = """
            SELECT CAST(EXTRACT(EPOCH FROM MIN(created_at) FILTER (WHERE to_status = 'IN_PROGRESS')) * 1000 AS BIGINT) AS "startedAtMillis",
                   CAST(EXTRACT(EPOCH FROM MIN(created_at) FILTER (WHERE to_status = 'COMPLETED')) * 1000 AS BIGINT) AS "completedAtMillis"
            FROM booking_schema.booking_history WHERE booking_id = :bookingId
            """, nativeQuery = true)
    ExecutionTimes findExecutionTimes(@Param("bookingId") Long bookingId);

    boolean existsByBookingIdAndToStatusIn(Long bookingId, List<BookingStatus> statuses);

    List<BookingHistoryEntity> findByBookingIdOrderByCreatedAtAsc(Long bookingId);
}
