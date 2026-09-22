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

    /**
     * Kiểm tra xem thợ đã có ca làm hoặc slot bận giao thoa với cửa sổ thời gian yêu cầu hay không.
     * Sử dụng toán tử && của PostgreSQL trên kiểu tstzrange để xử lý hoàn hảo ca vắt qua ngày (Midnight Crossing).
     */
    @Query(value = """
        SELECT COUNT(c.id) > 0 FROM mua_schema.mua_calendars c
        WHERE c.mua_id = :muaId
          AND c.is_locked = TRUE
          AND tstzrange(c.start_at, c.end_at) && tstzrange(:windowStart, :windowEnd)
    """, nativeQuery = true)
    boolean existsOverlappingSlot(
        @Param("muaId") Long muaId,
        @Param("windowStart") OffsetDateTime windowStart,
        @Param("windowEnd") OffsetDateTime windowEnd
    );

    @Query("SELECT c FROM MUACalendarEntity c WHERE c.mua.id = :muaId AND c.isLocked = true ORDER BY c.startAt ASC")
    List<MUACalendarEntity> findActiveSlotsByMuaId(@Param("muaId") Long muaId);

    @Query("SELECT c FROM MUACalendarEntity c WHERE c.mua.id = :muaId AND c.bookingDate = :date AND c.isLocked = true ORDER BY c.startAt ASC")
    List<MUACalendarEntity> findActiveSlotsByMuaIdAndDate(@Param("muaId") Long muaId, @Param("date") LocalDate date);

    /**
     * Giải phóng slot khóa khi đơn hàng bị hủy hoặc hết hạn thanh toán cọc 15 phút
     */
    @Modifying
    @Query("DELETE FROM MUACalendarEntity c WHERE c.booking.id = :bookingId")
    void deleteByBookingId(@Param("bookingId") Long bookingId);
}
