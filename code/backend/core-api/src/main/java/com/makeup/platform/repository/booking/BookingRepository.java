package com.makeup.platform.repository.booking;

import com.makeup.platform.repository.booking.projection.BookingRevenueRow;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import com.makeup.platform.repository.booking.projection.BookingStatusAggregate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<BookingEntity, Long>, JpaSpecificationExecutor<BookingEntity> {

    @Override
    @EntityGraph(attributePaths = {"customer", "mua.user", "agency", "servicePackage.masterCategory"})
    Page<BookingEntity> findAll(Specification<BookingEntity> spec, Pageable pageable);

    @Query("""
            SELECT b.status AS status, b.needsEmergencyReassignment AS needsEmergencyReassignment,
                   COUNT(b) AS bookingCount, SUM(b.totalAmount) AS totalAmount
            FROM BookingEntity b
            GROUP BY b.status, b.needsEmergencyReassignment
            """)
    List<BookingStatusAggregate> aggregateByStatus();

    Optional<BookingEntity> findByBookingCode(String bookingCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BookingEntity b WHERE b.id = :id")
    Optional<BookingEntity> findByIdForUpdate(@Param("id") Long id);

    List<BookingEntity> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<BookingEntity> findByMuaIdOrderByCreatedAtDesc(Long muaId);

    @Query("""
            SELECT DISTINCT b FROM BookingEntity b
            LEFT JOIN FETCH b.customer c
            LEFT JOIN FETCH b.mua m
            LEFT JOIN FETCH m.user mu
            LEFT JOIN FETCH b.servicePackage sp
            LEFT JOIN FETCH b.style st
            WHERE b.mua.id = :muaId
              AND (
                  b.bookingDate = :date
                  OR b.status IN (
                      com.makeup.platform.entity.booking.BookingStatus.ACCEPTED,
                      com.makeup.platform.entity.booking.BookingStatus.ON_THE_WAY,
                      com.makeup.platform.entity.booking.BookingStatus.ARRIVED,
                      com.makeup.platform.entity.booking.BookingStatus.IN_PROGRESS
                  )
              )
            ORDER BY b.createdAt DESC
            """)
    List<BookingEntity> findFreelancerBookingsByDate(
            @Param("muaId") Long muaId,
            @Param("date") LocalDate date);

    @Query("""
            SELECT DISTINCT b FROM BookingEntity b
            LEFT JOIN FETCH b.customer c
            LEFT JOIN FETCH b.mua m
            LEFT JOIN FETCH m.user mu
            LEFT JOIN FETCH b.servicePackage sp
            LEFT JOIN FETCH b.style st
            WHERE b.mua.id = :muaId
            ORDER BY b.createdAt DESC
            """)
    List<BookingEntity> findAllFreelancerBookings(
            @Param("muaId") Long muaId);

    @Query("""
            SELECT DISTINCT b FROM BookingEntity b
            LEFT JOIN FETCH b.customer c
            LEFT JOIN FETCH b.mua m
            LEFT JOIN FETCH m.user mu
            LEFT JOIN FETCH b.servicePackage sp
            LEFT JOIN FETCH b.style st
            WHERE b.customer.id = :customerId
            ORDER BY b.createdAt DESC, b.bookingDate DESC, b.startTime DESC
            """)
    List<BookingEntity> findCustomerBookings(
            @Param("customerId") Long customerId);

    List<BookingEntity> findByAgencyIdOrderByCreatedAtDesc(Long agencyId);

    List<BookingEntity> findByStatus(BookingStatus status);

    @Query("""
            SELECT b FROM BookingEntity b
            LEFT JOIN FETCH b.customer c
            LEFT JOIN FETCH b.servicePackage sp
            LEFT JOIN FETCH b.style st
            WHERE b.mua.id = :muaId
              AND b.bookingType = com.makeup.platform.entity.booking.BookingType.SCHEDULED
              AND b.status = com.makeup.platform.entity.booking.BookingStatus.REQUESTED
              AND (b.confirmDeadline IS NULL OR b.confirmDeadline > CURRENT_TIMESTAMP)
            ORDER BY b.confirmDeadline ASC NULLS LAST, b.createdAt ASC
            """)
    List<BookingEntity> findPendingRequestedScheduledBookingsByMuaId(@Param("muaId") Long muaId);

    boolean existsByCustomerIdAndBookingTypeAndStatusIn(
            Long customerId,
            BookingType bookingType,
            Collection<BookingStatus> statuses);

    /**
     * Quét phân trang các đơn cần nhắc trước 24h: Chưa gửi, thời điểm bắt đầu <=
     * (now + 24h) và còn trong tương lai.
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
            @Param("maxReminderTime") LocalDateTime maxReminderTime,
            Pageable pageable);

    /**
     * Quét phân trang các đơn cần nhắc trước 2h: Chưa gửi, thời điểm bắt đầu <=
     * (now + 2h) và còn trong tương lai.
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
            @Param("maxReminderTime") LocalDateTime maxReminderTime,
            Pageable pageable);

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
     * Cập nhật trạng thái hủy đơn hết hạn cọc có điều kiện nguyên tử (Atomic
     * Conditional Update).
     * Triệt tiêu hoàn toàn race-condition khi khách hàng thanh toán cọc ở giây
     * 14:59.
     */
    @Modifying
    @Query("""
                UPDATE BookingEntity b
                SET b.status = com.makeup.platform.entity.booking.BookingStatus.CANCELLED_EXPIRED,
                    b.needsEmergencyReassignment = false,
                    b.emergencyReason = NULL,
                    b.updatedAt = CURRENT_TIMESTAMP
                WHERE b.id = :bookingId AND b.status = com.makeup.platform.entity.booking.BookingStatus.PENDING_DEPOSIT
            """)
    int cancelExpiredBookingIfPendingDeposit(@Param("bookingId") Long bookingId);

    /**
     * Danh sách đơn cần điều phối của Agency (Ưu tiên đơn khẩn cấp
     * needsEmergencyReassignment = true lên đầu)
     */
    @Query("""
                SELECT b FROM BookingEntity b
                LEFT JOIN FETCH b.customer c
                LEFT JOIN FETCH b.servicePackage sp
                LEFT JOIN FETCH b.style st
                WHERE b.agency.id = :agencyId
                  AND (b.status = com.makeup.platform.entity.booking.BookingStatus.PENDING_AGENCY_DISPATCH
                       OR (b.needsEmergencyReassignment = TRUE
                           AND b.status NOT IN (com.makeup.platform.entity.booking.BookingStatus.CANCELLED,
                                                com.makeup.platform.entity.booking.BookingStatus.CANCELLED_EXPIRED,
                                                com.makeup.platform.entity.booking.BookingStatus.COMPLETED,
                                                com.makeup.platform.entity.booking.BookingStatus.PAID_OUT)))
                ORDER BY b.needsEmergencyReassignment DESC, b.createdAt ASC
            """)
    List<BookingEntity> findPendingDispatchBookingsByAgencyId(@Param("agencyId") Long agencyId);

    @Query("SELECT b.destinationAddress, b.destinationLatitude, b.destinationLongitude, MAX(b.createdAt), COUNT(b.id) " +
           "FROM BookingEntity b " +
           "WHERE b.customer.id = :customerId AND b.destinationAddress IS NOT NULL " +
           "GROUP BY b.destinationAddress, b.destinationLatitude, b.destinationLongitude " +
           "ORDER BY MAX(b.createdAt) DESC")
    List<Object[]> findRecentAddressesByCustomerId(@Param("customerId") Long customerId, Pageable pageable);

    @Query("""
            SELECT b.id FROM BookingEntity b
            WHERE b.customer.id = :customerId AND b.bookingType = :type AND b.status = :status
            ORDER BY b.createdAt DESC
            """)
    List<Long> findCustomerPendingIds(@Param("customerId") Long customerId,
            @Param("type") BookingType type, @Param("status") BookingStatus status);

    @Query("""
            SELECT b.id FROM BookingEntity b
            WHERE b.bookingType = :type AND b.status = :status AND b.id > :afterId AND b.id <= :maxId
            ORDER BY b.id
            """)
    List<Long> findPendingInstantIds(@Param("type") BookingType type,
            @Param("status") BookingStatus status, @Param("afterId") Long afterId,
            @Param("maxId") Long maxId, Pageable pageable);

    @Query("""
            SELECT m.id AS muaId, b.totalAmount AS totalAmount FROM BookingEntity b
            LEFT JOIN b.mua m
            WHERE b.agency.id = :agencyId AND b.status IN (
                com.makeup.platform.entity.booking.BookingStatus.COMPLETED,
                com.makeup.platform.entity.booking.BookingStatus.PAID_OUT)
            """)
    List<BookingRevenueRow> findCompletedRevenueByAgencyId(
            @Param("agencyId") Long agencyId);

    @Query("SELECT MAX(b.id) FROM BookingEntity b WHERE b.bookingType = :type AND b.status = :status")
    Long findPendingScanUpperBound(@Param("type") BookingType type, @Param("status") BookingStatus status);

    @Query("""
            SELECT b FROM BookingEntity b
            WHERE b.status = com.makeup.platform.entity.booking.BookingStatus.REQUESTED
              AND b.confirmDeadline IS NOT NULL
              AND b.confirmDeadline < :now
            """)
    List<BookingEntity> findExpiredRequestedBookings(@Param("now") OffsetDateTime now);
}
