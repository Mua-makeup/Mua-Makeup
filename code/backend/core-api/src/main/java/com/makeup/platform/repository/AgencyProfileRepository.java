package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AgencyProfileRepository extends JpaRepository<AgencyProfileEntity, Long> {

    Optional<AgencyProfileEntity> findByOwnerId(Long ownerId);

    Optional<AgencyProfileEntity> findByAgencyCode(String agencyCode);

    boolean existsByAgencyCode(String agencyCode);
}
