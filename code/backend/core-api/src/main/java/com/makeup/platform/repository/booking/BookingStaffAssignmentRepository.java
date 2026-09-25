package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
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
        SELECT bsa FROM BookingStaffAssignmentEntity bsa
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
        SELECT bsa FROM BookingStaffAssignmentEntity bsa
        JOIN FETCH bsa.staff s
        JOIN FETCH s.mua m
        JOIN FETCH m.user u
        WHERE bsa.booking.id = :bookingId
        ORDER BY bsa.createdAt DESC
    """)
    List<BookingStaffAssignmentEntity> findAllWithStaffAndUserByBookingId(@Param("bookingId") Long bookingId);
}
