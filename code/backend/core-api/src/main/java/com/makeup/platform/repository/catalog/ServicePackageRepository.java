package com.makeup.platform.repository.catalog;

import com.makeup.platform.entity.catalog.ServicePackageEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServicePackageRepository extends JpaRepository<ServicePackageEntity, Long>, JpaSpecificationExecutor<ServicePackageEntity> {

    List<ServicePackageEntity> findByAgencyId(Long agencyId);

    Page<ServicePackageEntity> findByAgencyId(Long agencyId, Pageable pageable);

    List<ServicePackageEntity> findByAgencyIdAndIsAvailableTrue(Long agencyId);

    List<ServicePackageEntity> findByMuaId(Long muaId);

    Page<ServicePackageEntity> findByMuaId(Long muaId, Pageable pageable);

    List<ServicePackageEntity> findByMuaIdAndIsAvailableTrue(Long muaId);

    Optional<ServicePackageEntity> findByIdAndAgencyId(Long id, Long agencyId);

    Optional<ServicePackageEntity> findByIdAndMuaId(Long id, Long muaId);

    @Query("SELECT p FROM ServicePackageEntity p LEFT JOIN FETCH p.packageItems LEFT JOIN FETCH p.styles WHERE p.id = :id")
    Optional<ServicePackageEntity> findByIdWithDetails(@Param("id") Long id);
}
