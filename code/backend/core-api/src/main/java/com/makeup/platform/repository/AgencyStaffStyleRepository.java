package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffStyleEntity;
import com.makeup.platform.entity.agency.AgencyStaffStyleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgencyStaffStyleRepository extends JpaRepository<AgencyStaffStyleEntity, AgencyStaffStyleId> {

    List<AgencyStaffStyleEntity> findByStaffId(Long staffId);

    @Modifying
    @Query("DELETE FROM AgencyStaffStyleEntity ass WHERE ass.staff.id = :staffId")
    void deleteByStaffId(@Param("staffId") Long staffId);

    @Query("SELECT ass FROM AgencyStaffStyleEntity ass JOIN FETCH ass.style WHERE ass.staff.id = :staffId")
    List<AgencyStaffStyleEntity> findByStaffIdWithStyle(@Param("staffId") Long staffId);

    @Query("SELECT ass FROM AgencyStaffStyleEntity ass JOIN FETCH ass.style WHERE ass.staff.id IN :staffIds")
    List<AgencyStaffStyleEntity> findByStaffIdInWithStyle(@Param("staffIds") List<Long> staffIds);
}
