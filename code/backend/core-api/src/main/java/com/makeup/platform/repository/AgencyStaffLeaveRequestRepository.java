package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffLeaveRequestEntity;
import com.makeup.platform.entity.agency.LeaveRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface AgencyStaffLeaveRequestRepository extends JpaRepository<AgencyStaffLeaveRequestEntity, Long> {

    @Query("SELECT r FROM AgencyStaffLeaveRequestEntity r " +
            "JOIN FETCH r.staff s " +
            "LEFT JOIN FETCH s.mua m " +
            "LEFT JOIN FETCH m.user u " +
            "WHERE r.agency.id = :agencyId " +
            "AND (:status IS NULL OR r.status = :status) " +
            "ORDER BY r.createdAt DESC")
    Page<AgencyStaffLeaveRequestEntity> findAllByAgencyIdAndOptionalStatus(
            @Param("agencyId") Long agencyId,
            @Param("status") LeaveRequestStatus status,
            Pageable pageable
    );

    @Query("SELECT r FROM AgencyStaffLeaveRequestEntity r " +
            "JOIN FETCH r.agency a " +
            "WHERE r.staff.id = :staffId " +
            "ORDER BY r.createdAt DESC")
    List<AgencyStaffLeaveRequestEntity> findAllByStaffIdOrderByCreatedAtDesc(@Param("staffId") Long staffId);

    long countByAgencyIdAndStatus(Long agencyId, LeaveRequestStatus status);

    @Query("SELECT r FROM AgencyStaffLeaveRequestEntity r " +
            "WHERE r.staff.id = :staffId " +
            "AND r.leaveDate = :leaveDate " +
            "AND r.status = 'PENDING' " +
            "AND (r.startTime < :endTime AND r.endTime > :startTime)")
    List<AgencyStaffLeaveRequestEntity> findOverlappingPendingRequests(
            @Param("staffId") Long staffId,
            @Param("leaveDate") LocalDate leaveDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    @Query("SELECT r FROM AgencyStaffLeaveRequestEntity r " +
            "WHERE r.staff.id = :staffId " +
            "AND r.leaveDate = :leaveDate " +
            "AND r.status = 'APPROVED' " +
            "AND (r.startTime < :endTime AND r.endTime > :startTime)")
    List<AgencyStaffLeaveRequestEntity> findOverlappingApprovedRequests(
            @Param("staffId") Long staffId,
            @Param("leaveDate") LocalDate leaveDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );
}
