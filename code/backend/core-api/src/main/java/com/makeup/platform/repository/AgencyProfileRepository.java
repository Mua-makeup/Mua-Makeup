package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AgencyProfileRepository extends JpaRepository<AgencyProfileEntity, Long> {

    @Query("SELECT a FROM AgencyProfileEntity a JOIN FETCH a.owner WHERE a.id = :agencyId")
    Optional<AgencyProfileEntity> findByIdWithOwner(@Param("agencyId") Long agencyId);

    Optional<AgencyProfileEntity> findByOwnerId(Long ownerId);

    Optional<AgencyProfileEntity> findByAgencyCode(String agencyCode);

    boolean existsByAgencyCode(String agencyCode);
}
