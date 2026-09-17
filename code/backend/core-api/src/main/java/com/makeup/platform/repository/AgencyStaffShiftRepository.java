package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffShiftEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface AgencyStaffShiftRepository extends JpaRepository<AgencyStaffShiftEntity, Long> {

    List<AgencyStaffShiftEntity> findByAgencyIdAndIsActiveTrue(Long agencyId);

    List<AgencyStaffShiftEntity> findByStaffIdAndIsActiveTrue(Long staffId);

    List<AgencyStaffShiftEntity> findByStaffIdAndDayOfWeekAndIsActiveTrue(Long staffId, Integer dayOfWeek);

    @Query("SELECT s FROM AgencyStaffShiftEntity s WHERE s.staff.id = :staffId AND s.dayOfWeek = :dayOfWeek AND s.isActive = true " +
            "AND (:excludeShiftId IS NULL OR s.id != :excludeShiftId) " +
            "AND (s.startTime < :endTime AND s.endTime > :startTime)")
    List<AgencyStaffShiftEntity> findOverlappingShifts(
            @Param("staffId") Long staffId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeShiftId") Long excludeShiftId);

    @Query("SELECT s FROM AgencyStaffShiftEntity s " +
            "JOIN FETCH s.staff st " +
            "LEFT JOIN FETCH st.mua m " +
            "LEFT JOIN FETCH m.user u " +
            "WHERE s.agency.id = :agencyId AND s.isActive = true " +
            "ORDER BY s.dayOfWeek ASC, s.startTime ASC")
    List<AgencyStaffShiftEntity> findAllActiveByAgencyIdWithStaff(@Param("agencyId") Long agencyId);

    @Query("SELECT s FROM AgencyStaffShiftEntity s " +
            "JOIN FETCH s.staff st " +
            "LEFT JOIN FETCH st.mua m " +
            "LEFT JOIN FETCH m.user u " +
            "WHERE s.staff.id = :staffId AND s.isActive = true " +
            "ORDER BY s.dayOfWeek ASC, s.startTime ASC")
    List<AgencyStaffShiftEntity> findAllActiveByStaffIdWithStaff(@Param("staffId") Long staffId);
}
