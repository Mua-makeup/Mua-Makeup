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

    @Query("SELECT s FROM AgencyStaffShiftEntity s WHERE s.staff.id = :staffId AND s.isActive = true " +
            "AND (s.workDate = :workDate OR (s.workDate IS NULL AND s.dayOfWeek = :dayOfWeek AND s.isRecurring = true)) " +
            "ORDER BY s.startTime ASC")
    List<AgencyStaffShiftEntity> findActiveShiftsForStaffOnDate(
            @Param("staffId") Long staffId,
            @Param("workDate") java.time.LocalDate workDate,
            @Param("dayOfWeek") Integer dayOfWeek);

    @Query("SELECT s FROM AgencyStaffShiftEntity s WHERE s.staff.id = :staffId AND s.isActive = true " +
            "AND (s.workDate = :workDate OR (s.workDate IS NULL AND s.dayOfWeek = :dayOfWeek AND s.isRecurring = true)) " +
            "AND (s.startTime < :endTime AND s.endTime > :startTime)")
    List<AgencyStaffShiftEntity> findOverlappingShiftsForWorkDate(
            @Param("staffId") Long staffId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("workDate") java.time.LocalDate workDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);

    @Query("SELECT s FROM AgencyStaffShiftEntity s WHERE s.staff.id = :staffId AND s.isActive = true " +
            "AND s.id != :excludeShiftId " +
            "AND (s.workDate = :workDate OR (s.workDate IS NULL AND s.dayOfWeek = :dayOfWeek AND s.isRecurring = true)) " +
            "AND (s.startTime < :endTime AND s.endTime > :startTime)")
    List<AgencyStaffShiftEntity> findOverlappingShiftsForWorkDateExcluding(
            @Param("staffId") Long staffId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("workDate") java.time.LocalDate workDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeShiftId") Long excludeShiftId);

    @Query("SELECT s FROM AgencyStaffShiftEntity s WHERE s.staff.id = :staffId AND s.isActive = true " +
            "AND s.dayOfWeek = :dayOfWeek " +
            "AND (s.startTime < :endTime AND s.endTime > :startTime)")
    List<AgencyStaffShiftEntity> findOverlappingRecurringShifts(
            @Param("staffId") Long staffId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);

    @Query("SELECT s FROM AgencyStaffShiftEntity s WHERE s.staff.id = :staffId AND s.isActive = true " +
            "AND s.id != :excludeShiftId " +
            "AND s.dayOfWeek = :dayOfWeek " +
            "AND (s.startTime < :endTime AND s.endTime > :startTime)")
    List<AgencyStaffShiftEntity> findOverlappingRecurringShiftsExcluding(
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
            "WHERE s.agency.id = :agencyId AND s.isActive = true " +
            "AND ((s.workDate IS NOT NULL AND s.workDate BETWEEN :startDate AND :endDate) " +
            "     OR (s.workDate IS NULL AND s.isRecurring = true)) " +
            "ORDER BY s.dayOfWeek ASC, s.startTime ASC")
    List<AgencyStaffShiftEntity> findAllActiveByAgencyIdAndWeekRange(
            @Param("agencyId") Long agencyId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);

    @Query("SELECT s FROM AgencyStaffShiftEntity s " +
            "JOIN FETCH s.staff st " +
            "LEFT JOIN FETCH st.mua m " +
            "LEFT JOIN FETCH m.user u " +
            "WHERE s.staff.id = :staffId AND s.isActive = true " +
            "ORDER BY s.dayOfWeek ASC, s.startTime ASC")
    List<AgencyStaffShiftEntity> findAllActiveByStaffIdWithStaff(@Param("staffId") Long staffId);
}
