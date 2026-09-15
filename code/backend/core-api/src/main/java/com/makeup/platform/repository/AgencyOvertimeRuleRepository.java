package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyOvertimeRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgencyOvertimeRuleRepository extends JpaRepository<AgencyOvertimeRuleEntity, Long> {

    List<AgencyOvertimeRuleEntity> findByAgencyId(Long agencyId);

    List<AgencyOvertimeRuleEntity> findByAgencyIdAndIsActiveTrue(Long agencyId);

    Optional<AgencyOvertimeRuleEntity> findByIdAndAgencyId(Long id, Long agencyId);
}
