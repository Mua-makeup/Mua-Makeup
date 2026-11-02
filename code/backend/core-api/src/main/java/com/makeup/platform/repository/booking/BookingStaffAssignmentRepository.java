package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface BookingStaffAssignmentRepository extends JpaRepository<BookingStaffAssignmentEntity, Long> {

    List<BookingStaffAssignmentEntity> findByBookingId(Long bookingId);

    List<BookingStaffAssignmentEntity> findByBookingIdAndStatus(Long bookingId, AssignmentStatus status);

    Optional<BookingStaffAssignmentEntity> findByBookingIdAndAssignmentRoleAndStatus(
            Long bookingId, AssignmentRole assignmentRole, AssignmentStatus status
    );

    Optional<BookingStaffAssignmentEntity> findByBookingIdAndStaffIdAndStatus(
            Long bookingId, Long staffId, AssignmentStatus status
    );

    boolean existsByBookingIdAndStaffIdAndStatus(Long bookingId, Long staffId, AssignmentStatus status);

    @Query("""
        SELECT DISTINCT bsa FROM BookingStaffAssignmentEntity bsa
        JOIN FETCH bsa.staff s
        JOIN FETCH s.mua m
        JOIN FETCH m.user u
        WHERE bsa.booking.id = :bookingId AND bsa.status = :status
        ORDER BY bsa.assignmentRole ASC
    """)
    List<BookingStaffAssignmentEntity> findWithStaffAndUserByBookingIdAndStatus(
            @Param("bookingId") Long bookingId,
            @Param("status") AssignmentStatus status
    );

    @Query("""
        SELECT DISTINCT bsa FROM BookingStaffAssignmentEntity bsa
        JOIN FETCH bsa.staff s
        JOIN FETCH s.mua m
        JOIN FETCH m.user u
        WHERE bsa.booking.id = :bookingId
        ORDER BY bsa.createdAt DESC
    """)
    List<BookingStaffAssignmentEntity> findAllWithStaffAndUserByBookingId(@Param("bookingId") Long bookingId);

    @Query("""
        SELECT DISTINCT b.bookingCode FROM BookingStaffAssignmentEntity bsa
        JOIN bsa.booking b
        WHERE bsa.staff.id = :staffId
          AND bsa.status = com.makeup.platform.entity.booking.AssignmentStatus.ACTIVE
          AND (b.bookingDate >= :fromDate OR b.bookingDate IS NULL)
          AND b.status NOT IN (
              com.makeup.platform.entity.booking.BookingStatus.CANCELLED,
              com.makeup.platform.entity.booking.BookingStatus.CANCELLED_EXPIRED,
              com.makeup.platform.entity.booking.BookingStatus.COMPLETED,
              com.makeup.platform.entity.booking.BookingStatus.PAID_OUT,
              com.makeup.platform.entity.booking.BookingStatus.DISPUTE_REFUNDED,
              com.makeup.platform.entity.booking.BookingStatus.DISPUTE_COMPENSATED
          )
    """)
    List<String> findActiveFutureBookingCodesForStaff(
            @Param("staffId") Long staffId,
            @Param("fromDate") LocalDate fromDate
    );
}
