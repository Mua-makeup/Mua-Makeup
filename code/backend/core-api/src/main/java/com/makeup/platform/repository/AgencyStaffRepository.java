package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgencyStaffRepository extends JpaRepository<AgencyStaffEntity, Long> {

    Optional<AgencyStaffEntity> findByAgencyIdAndMuaId(Long agencyId, Long muaId);

    boolean existsByAgencyIdAndMuaId(Long agencyId, Long muaId);

    Page<AgencyStaffEntity> findByAgencyId(Long agencyId, Pageable pageable);

    Page<AgencyStaffEntity> findByAgencyIdAndStatus(Long agencyId, String status, Pageable pageable);

    List<AgencyStaffEntity> findByAgencyIdAndIsActiveTrue(Long agencyId);

    List<AgencyStaffEntity> findByAgencyIdAndStatus(Long agencyId, String status);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END " +
           "FROM AgencyStaffEntity s WHERE s.mua.id = :muaId AND s.isActive = true AND s.status = 'ACTIVE'")
    boolean existsActiveMembershipByMuaId(@Param("muaId") Long muaId);

    @Query("SELECT s FROM AgencyStaffEntity s " +
           "JOIN FETCH s.mua m " +
           "JOIN FETCH m.user " +
           "WHERE s.id = :staffId AND s.agency.id = :agencyId")
    Optional<AgencyStaffEntity> findByIdAndAgencyIdWithMuaAndUser(@Param("staffId") Long staffId,
                                                                   @Param("agencyId") Long agencyId);
}
