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
import java.util.Collection;
import com.makeup.platform.repository.catalog.projection.MuaStartingPrice;
import java.util.Optional;

@Repository
public interface ServicePackageRepository extends JpaRepository<ServicePackageEntity, Long>, JpaSpecificationExecutor<ServicePackageEntity> {

    List<ServicePackageEntity> findByAgencyIdAndIsDeletedFalse(Long agencyId);

    Page<ServicePackageEntity> findByAgencyIdAndIsDeletedFalse(Long agencyId, Pageable pageable);

    @Query("SELECT p FROM ServicePackageEntity p WHERE p.agency.id = :agencyId AND p.isAvailable = TRUE AND p.isDeleted = FALSE")
    List<ServicePackageEntity> findByAgencyIdAndIsAvailableTrue(@Param("agencyId") Long agencyId);

    List<ServicePackageEntity> findByAgencyIdAndIsAvailableTrueAndIsDeletedFalse(Long agencyId);

    List<ServicePackageEntity> findByMuaIdAndIsDeletedFalse(Long muaId);

    Page<ServicePackageEntity> findByMuaIdAndIsDeletedFalse(Long muaId, Pageable pageable);

    @Query("SELECT p FROM ServicePackageEntity p WHERE p.mua.id = :muaId AND p.isAvailable = TRUE AND p.isDeleted = FALSE")
    List<ServicePackageEntity> findByMuaIdAndIsAvailableTrue(@Param("muaId") Long muaId);

    List<ServicePackageEntity> findByMuaIdAndIsAvailableTrueAndIsDeletedFalse(Long muaId);

    Optional<ServicePackageEntity> findByIdAndAgencyIdAndIsDeletedFalse(Long id, Long agencyId);

    Optional<ServicePackageEntity> findByIdAndMuaIdAndIsDeletedFalse(Long id, Long muaId);

    @Query("SELECT DISTINCT p FROM ServicePackageEntity p LEFT JOIN FETCH p.packageItems LEFT JOIN FETCH p.styles WHERE p.id = :id AND p.isDeleted = false")
    Optional<ServicePackageEntity> findByIdWithDetails(@Param("id") Long id);

    @Query("""
            SELECT p.mua.id AS muaId, MIN(p.price) AS startingPrice
            FROM ServicePackageEntity p
            WHERE p.mua.id IN :muaIds AND p.isAvailable = TRUE AND p.isDeleted = FALSE
            GROUP BY p.mua.id
            """)
    List<MuaStartingPrice> findStartingPrices(@Param("muaIds") Collection<Long> muaIds);

    @Query("""
            SELECT DISTINCT p.mua.id
            FROM ServicePackageEntity p
            LEFT JOIN p.styles s
            WHERE p.mua.id IN :muaIds
              AND p.masterCategory.id = :categoryId
              AND p.isAvailable = TRUE
              AND p.isDeleted = FALSE
              AND (:styleId IS NULL OR s.id = :styleId)
            """)
    List<Long> findMuaIdsByCandidateIdsAndCategoryAndStyle(
            @Param("muaIds") Collection<Long> muaIds,
            @Param("categoryId") Integer categoryId,
            @Param("styleId") Integer styleId);

    @Query("""
            SELECT DISTINCT p
            FROM ServicePackageEntity p
            LEFT JOIN FETCH p.styles s
            WHERE p.mua.id = :muaId
              AND p.masterCategory.id = :categoryId
              AND p.isAvailable = TRUE
              AND p.isDeleted = FALSE
              AND (:styleId IS NULL OR s.id = :styleId)
            ORDER BY p.price ASC
            """)
    List<ServicePackageEntity> findCandidatePackagesForMua(
            @Param("muaId") Long muaId,
            @Param("categoryId") Integer categoryId,
            @Param("styleId") Integer styleId);
}
