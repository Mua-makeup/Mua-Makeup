package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AgencyStaffOvertimeReportRepository extends JpaRepository<AgencyStaffOvertimeReportEntity, Long> {

    Page<AgencyStaffOvertimeReportEntity> findByAgencyId(Long agencyId, Pageable pageable);

    Page<AgencyStaffOvertimeReportEntity> findByAgencyIdAndStatus(Long agencyId, OvertimeReportStatus status, Pageable pageable);

    Page<AgencyStaffOvertimeReportEntity> findByStaffId(Long staffId, Pageable pageable);

    Optional<AgencyStaffOvertimeReportEntity> findByIdAndAgencyId(Long id, Long agencyId);

    @Query("SELECT r FROM AgencyStaffOvertimeReportEntity r " +
            "LEFT JOIN FETCH r.staff s " +
            "LEFT JOIN FETCH s.mua " +
            "LEFT JOIN FETCH r.rule " +
            "WHERE r.id = :id AND r.agency.id = :agencyId")
    Optional<AgencyStaffOvertimeReportEntity> findByIdAndAgencyIdWithDetails(@Param("id") Long id, @Param("agencyId") Long agencyId);
}
