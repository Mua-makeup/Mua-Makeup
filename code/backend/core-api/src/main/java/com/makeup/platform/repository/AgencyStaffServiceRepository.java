package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffServiceEntity;
import com.makeup.platform.entity.agency.AgencyStaffServiceId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgencyStaffServiceRepository extends JpaRepository<AgencyStaffServiceEntity, AgencyStaffServiceId> {

    List<AgencyStaffServiceEntity> findByStaffId(Long staffId);

    @Modifying
    @Query("DELETE FROM AgencyStaffServiceEntity ase WHERE ase.staff.id = :staffId")
    void deleteByStaffId(@Param("staffId") Long staffId);

    @Query("SELECT ase FROM AgencyStaffServiceEntity ase JOIN FETCH ase.servicePackage WHERE ase.staff.id = :staffId")
    List<AgencyStaffServiceEntity> findByStaffIdWithPackage(@Param("staffId") Long staffId);

    @Query("SELECT ase FROM AgencyStaffServiceEntity ase JOIN FETCH ase.servicePackage WHERE ase.staff.id IN :staffIds")
    List<AgencyStaffServiceEntity> findByStaffIdInWithPackage(@Param("staffIds") List<Long> staffIds);
}
