package com.makeup.platform.repository.catalog;

import com.makeup.platform.entity.catalog.SurchargeEntity;
import com.makeup.platform.entity.catalog.SurchargeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SurchargeRepository extends JpaRepository<SurchargeEntity, Long> {

    List<SurchargeEntity> findByAgencyId(Long agencyId);

    List<SurchargeEntity> findByAgencyIdAndIsActiveTrue(Long agencyId);

    Optional<SurchargeEntity> findByAgencyIdAndSurchargeTypeAndIsActiveTrue(Long agencyId, SurchargeType surchargeType);

    List<SurchargeEntity> findByMuaId(Long muaId);

    List<SurchargeEntity> findByMuaIdAndIsActiveTrue(Long muaId);

    Optional<SurchargeEntity> findByMuaIdAndSurchargeTypeAndIsActiveTrue(Long muaId, SurchargeType surchargeType);

    Optional<SurchargeEntity> findByIdAndAgencyId(Long id, Long agencyId);

    Optional<SurchargeEntity> findByIdAndMuaId(Long id, Long muaId);
}
