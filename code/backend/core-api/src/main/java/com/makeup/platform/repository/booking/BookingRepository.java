package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<BookingEntity, Long> {

    Optional<BookingEntity> findByBookingCode(String bookingCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BookingEntity b WHERE b.id = :id")
    Optional<BookingEntity> findByIdForUpdate(@Param("id") Long id);

    List<BookingEntity> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<BookingEntity> findByMuaIdOrderByCreatedAtDesc(Long muaId);

    List<BookingEntity> findByAgencyIdOrderByCreatedAtDesc(Long agencyId);

    List<BookingEntity> findByStatus(BookingStatus status);

    boolean existsByCustomerIdAndBookingTypeAndStatusIn(
            Long customerId,
            BookingType bookingType,
            Collection<BookingStatus> statuses
    );

    /**
     * Quét phân trang các đơn cần nhắc trước 24h: Chưa gửi, thời điểm bắt đầu <= (now + 24h) và còn trong tương lai.
     */
    @Query(value = """
        SELECT * FROM booking_schema.bookings b
        WHERE b.status = 'ACCEPTED'
          AND b.booking_type = 'SCHEDULED'
          AND b.reminder_24h_sent = FALSE
          AND (b.booking_date + b.start_time) <= :maxReminderTime
          AND (b.booking_date + b.start_time) > CURRENT_TIMESTAMP
        ORDER BY (b.booking_date + b.start_time) ASC
    """, nativeQuery = true)
    List<BookingEntity> findPending24hRemindersBatch(
            @Param("maxReminderTime") java.time.LocalDateTime maxReminderTime,
            org.springframework.data.domain.Pageable pageable
    );

    /**
     * Quét phân trang các đơn cần nhắc trước 2h: Chưa gửi, thời điểm bắt đầu <= (now + 2h) và còn trong tương lai.
     */
    @Query(value = """
        SELECT * FROM booking_schema.bookings b
        WHERE b.status = 'ACCEPTED'
          AND b.booking_type = 'SCHEDULED'
          AND b.reminder_2h_sent = FALSE
          AND (b.booking_date + b.start_time) <= :maxReminderTime
          AND (b.booking_date + b.start_time) > CURRENT_TIMESTAMP
        ORDER BY (b.booking_date + b.start_time) ASC
    """, nativeQuery = true)
    List<BookingEntity> findPending2hRemindersBatch(
            @Param("maxReminderTime") java.time.LocalDateTime maxReminderTime,
            org.springframework.data.domain.Pageable pageable
    );

    /**
     * Quét các đơn giữ chỗ PENDING_DEPOSIT đã quá hạn 15 phút chưa cọc
     */
    @Query("""
        SELECT b FROM BookingEntity b
        WHERE b.status = com.makeup.platform.entity.booking.BookingStatus.PENDING_DEPOSIT
          AND b.depositExpiredAt < CURRENT_TIMESTAMP
    """)
    List<BookingEntity> findExpiredPendingDepositBookings();

    /**
     * Cập nhật trạng thái hủy đơn hết hạn cọc có điều kiện nguyên tử (Atomic Conditional Update).
     * Triệt tiêu hoàn toàn race-condition khi khách hàng thanh toán cọc ở giây 14:59.
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query("""
        UPDATE BookingEntity b
        SET b.status = com.makeup.platform.entity.booking.BookingStatus.CANCELLED_EXPIRED, b.updatedAt = CURRENT_TIMESTAMP
        WHERE b.id = :bookingId AND b.status = com.makeup.platform.entity.booking.BookingStatus.PENDING_DEPOSIT
    """)
    int cancelExpiredBookingIfPendingDeposit(@Param("bookingId") Long bookingId);
}
