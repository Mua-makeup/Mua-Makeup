package com.makeup.platform.repository.mua;

import com.makeup.platform.entity.mua.MUACalendarEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface MUACalendarRepository extends JpaRepository<MUACalendarEntity, Long> {

   
    @Query(value = """
        SELECT COUNT(c.id) > 0 FROM mua_schema.mua_calendars c
        LEFT JOIN booking_schema.bookings b ON c.booking_id = b.id
        WHERE c.mua_id = :muaId
          AND c.is_locked = TRUE
          AND (c.booking_id IS NULL OR (b.status != 'CANCELLED' AND b.status != 'CANCELLED_EXPIRED' AND b.status != 'PENDING_DEPOSIT'))
          AND tstzrange(c.start_at, c.end_at) && tstzrange(:windowStart, :windowEnd)
    """, nativeQuery = true)
    boolean existsOverlappingSlot(
        @Param("muaId") Long muaId,
        @Param("windowStart") OffsetDateTime windowStart,
        @Param("windowEnd") OffsetDateTime windowEnd
    );

    @Query(value = """
        SELECT COUNT(c.id) > 0 FROM mua_schema.mua_calendars c
        LEFT JOIN booking_schema.bookings b ON c.booking_id = b.id
        WHERE c.mua_id = :muaId
          AND c.is_locked = TRUE
          AND (c.booking_id IS NULL OR (:excludeBookingId IS NULL OR c.booking_id != :excludeBookingId))
          AND (c.booking_id IS NULL OR (b.status != 'CANCELLED' AND b.status != 'CANCELLED_EXPIRED' AND b.status != 'PENDING_DEPOSIT'))
          AND tstzrange(c.start_at, c.end_at) && tstzrange(:windowStart, :windowEnd)
    """, nativeQuery = true)
    boolean existsOverlappingSlotExcludingBooking(
        @Param("muaId") Long muaId,
        @Param("windowStart") OffsetDateTime windowStart,
        @Param("windowEnd") OffsetDateTime windowEnd,
        @Param("excludeBookingId") Long excludeBookingId
    );

    @Query("""
        SELECT c FROM MUACalendarEntity c 
        WHERE c.mua.id = :muaId 
          AND c.isLocked = true 
          AND (c.booking IS NULL OR (c.booking.status != com.makeup.platform.entity.booking.BookingStatus.CANCELLED 
               AND c.booking.status != com.makeup.platform.entity.booking.BookingStatus.CANCELLED_EXPIRED 
               AND c.booking.status != com.makeup.platform.entity.booking.BookingStatus.PENDING_DEPOSIT))
        ORDER BY c.startAt ASC
    """)
    List<MUACalendarEntity> findActiveSlotsByMuaId(@Param("muaId") Long muaId);

    @Query("""
        SELECT c FROM MUACalendarEntity c 
        WHERE c.mua.id = :muaId 
          AND c.bookingDate = :date 
          AND c.isLocked = true 
          AND (c.booking IS NULL OR (c.booking.status != com.makeup.platform.entity.booking.BookingStatus.CANCELLED 
               AND c.booking.status != com.makeup.platform.entity.booking.BookingStatus.CANCELLED_EXPIRED 
               AND c.booking.status != com.makeup.platform.entity.booking.BookingStatus.PENDING_DEPOSIT))
        ORDER BY c.startAt ASC
    """)
    List<MUACalendarEntity> findActiveSlotsByMuaIdAndDate(@Param("muaId") Long muaId, @Param("date") LocalDate date);

    @Query("""
        SELECT c FROM MUACalendarEntity c 
        WHERE c.mua.id = :muaId 
          AND c.bookingDate BETWEEN :startDate AND :endDate 
          AND c.isLocked = true 
          AND (c.booking IS NULL OR (c.booking.status != com.makeup.platform.entity.booking.BookingStatus.CANCELLED 
               AND c.booking.status != com.makeup.platform.entity.booking.BookingStatus.CANCELLED_EXPIRED 
               AND c.booking.status != com.makeup.platform.entity.booking.BookingStatus.PENDING_DEPOSIT))
        ORDER BY c.startAt ASC
    """)
    List<MUACalendarEntity> findActiveSlotsByMuaIdAndDateBetween(
        @Param("muaId") Long muaId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    /**
     * Giải phóng slot khóa khi đơn hàng bị hủy hoặc hết hạn thanh toán cọc 15 phút
     */
    @Modifying
    @Query("DELETE FROM MUACalendarEntity c WHERE c.booking.id = :bookingId")
    void deleteByBookingId(@Param("bookingId") Long bookingId);

    /**
     * Giải phóng slot khóa của một thợ cụ thể trên đơn hàng (dùng khi báo bận đột xuất hoặc điều phối lại)
     */
    @Modifying
    @Query("DELETE FROM MUACalendarEntity c WHERE c.booking.id = :bookingId AND c.mua.id = :muaId")
    void deleteByBookingIdAndMuaId(@Param("bookingId") Long bookingId, @Param("muaId") Long muaId);
}
