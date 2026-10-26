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

    List<SurchargeEntity> findByAgencyIdAndIsDeletedFalse(Long agencyId);

    List<SurchargeEntity> findByAgencyIdAndIsActiveTrue(Long agencyId);

    List<SurchargeEntity> findByAgencyIdAndIsActiveTrueAndIsDeletedFalse(Long agencyId);

    Optional<SurchargeEntity> findByAgencyIdAndSurchargeTypeAndIsActiveTrue(Long agencyId, SurchargeType surchargeType);

    Optional<SurchargeEntity> findByAgencyIdAndSurchargeTypeAndIsActiveTrueAndIsDeletedFalse(Long agencyId, SurchargeType surchargeType);

    List<SurchargeEntity> findByMuaId(Long muaId);

    List<SurchargeEntity> findByMuaIdAndIsDeletedFalse(Long muaId);

    List<SurchargeEntity> findByMuaIdAndIsActiveTrue(Long muaId);

    List<SurchargeEntity> findByMuaIdAndIsActiveTrueAndIsDeletedFalse(Long muaId);

    Optional<SurchargeEntity> findByMuaIdAndSurchargeTypeAndIsActiveTrue(Long muaId, SurchargeType surchargeType);

    Optional<SurchargeEntity> findByMuaIdAndSurchargeTypeAndIsActiveTrueAndIsDeletedFalse(Long muaId, SurchargeType surchargeType);

    Optional<SurchargeEntity> findByIdAndAgencyId(Long id, Long agencyId);

    Optional<SurchargeEntity> findByIdAndAgencyIdAndIsDeletedFalse(Long id, Long agencyId);

    Optional<SurchargeEntity> findByIdAndMuaId(Long id, Long muaId);

    Optional<SurchargeEntity> findByIdAndMuaIdAndIsDeletedFalse(Long id, Long muaId);
}
