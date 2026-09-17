package com.makeup.platform.repository.telemetry;

import com.makeup.platform.entity.telemetry.AgencyBranchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgencyBranchRepository extends JpaRepository<AgencyBranchEntity, Long> {

    List<AgencyBranchEntity> findByAgencyIdAndIsActiveTrue(Long agencyId);

    List<AgencyBranchEntity> findByIsActiveTrue();
}
