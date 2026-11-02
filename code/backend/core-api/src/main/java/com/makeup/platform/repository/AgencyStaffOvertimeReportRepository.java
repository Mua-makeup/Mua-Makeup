package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import com.makeup.platform.entity.agency.OvertimeReportStatus;

import jakarta.persistence.LockModeType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgencyStaffOvertimeReportRepository extends JpaRepository<AgencyStaffOvertimeReportEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM AgencyStaffOvertimeReportEntity r WHERE r.id = :id")
    Optional<AgencyStaffOvertimeReportEntity> findByIdForPayment(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM AgencyStaffOvertimeReportEntity r WHERE r.id = :id AND r.agency.id = :agencyId")
    Optional<AgencyStaffOvertimeReportEntity> findByIdAndAgencyIdForReview(@Param("id") Long id, @Param("agencyId") Long agencyId);

    @Query("SELECT r FROM AgencyStaffOvertimeReportEntity r WHERE r.staff.mua.user.id = :userId AND r.status = :status")
    List<AgencyStaffOvertimeReportEntity> findByStaffUserIdAndStatus(@Param("userId") Long userId, @Param("status") OvertimeReportStatus status);

    default List<AgencyStaffOvertimeReportEntity> findApprovedByStaffUserId(Long userId) {
        return findByStaffUserIdAndStatus(userId, OvertimeReportStatus.APPROVED_WAIVED);
    }

    List<AgencyStaffOvertimeReportEntity> findByBookingId(Long bookingId);

    boolean existsByBookingIdAndStaffId(Long bookingId, Long staffId);

    Optional<AgencyStaffOvertimeReportEntity> findByBookingIdAndStaffId(Long bookingId, Long staffId);

    Page<AgencyStaffOvertimeReportEntity> findByAgencyId(Long agencyId, Pageable pageable);

    Page<AgencyStaffOvertimeReportEntity> findByAgencyIdAndStatus(Long agencyId, OvertimeReportStatus status, Pageable pageable);

    Page<AgencyStaffOvertimeReportEntity> findByStaffId(Long staffId, Pageable pageable);

    Page<AgencyStaffOvertimeReportEntity> findByStaffIdAndStatus(Long staffId, OvertimeReportStatus status, Pageable pageable);

    Optional<AgencyStaffOvertimeReportEntity> findByIdAndAgencyId(Long id, Long agencyId);

    @Query("SELECT r FROM AgencyStaffOvertimeReportEntity r " +
            "LEFT JOIN FETCH r.staff s " +
            "LEFT JOIN FETCH s.mua " +
            "LEFT JOIN FETCH r.rule " +
            "WHERE r.id = :id AND r.agency.id = :agencyId")
    Optional<AgencyStaffOvertimeReportEntity> findByIdAndAgencyIdWithDetails(@Param("id") Long id, @Param("agencyId") Long agencyId);
}
