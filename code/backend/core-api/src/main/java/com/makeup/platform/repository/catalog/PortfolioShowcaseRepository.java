package com.makeup.platform.repository.catalog;

import com.makeup.platform.entity.catalog.PortfolioShowcaseEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioShowcaseRepository extends JpaRepository<PortfolioShowcaseEntity, Long> {

   
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PortfolioShowcaseEntity p WHERE p.mua.id = :muaId AND p.isFeatured = true AND p.isVisible = true AND p.isDeleted = false")
    List<PortfolioShowcaseEntity> findFeaturedForUpdate(@Param("muaId") Long muaId);

  
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PortfolioShowcaseEntity p WHERE p.id = :id AND p.isDeleted = false")
    Optional<PortfolioShowcaseEntity> findByIdForUpdate(@Param("id") Long id);

    @Query(value = "SELECT p FROM PortfolioShowcaseEntity p " +
            "LEFT JOIN FETCH p.style " +
            "LEFT JOIN FETCH p.servicePackage " +
            "WHERE p.mua.id = :muaId " +
            "AND (:styleId IS NULL OR p.style.id = :styleId) " +
            "AND (:packageId IS NULL OR p.servicePackage.id = :packageId) " +
            "AND (:isFeatured IS NULL OR p.isFeatured = :isFeatured) " +
            "AND p.isVisible = true AND p.isDeleted = false " +
            "ORDER BY p.isFeatured DESC, p.createdAt DESC",
            countQuery = "SELECT count(p) FROM PortfolioShowcaseEntity p " +
            "WHERE p.mua.id = :muaId " +
            "AND (:styleId IS NULL OR p.style.id = :styleId) " +
            "AND (:packageId IS NULL OR p.servicePackage.id = :packageId) " +
            "AND (:isFeatured IS NULL OR p.isFeatured = :isFeatured) " +
            "AND p.isVisible = true AND p.isDeleted = false")
    Page<PortfolioShowcaseEntity> findPublicGallery(
            @Param("muaId") Long muaId,
            @Param("styleId") Integer styleId,
            @Param("packageId") Long packageId,
            @Param("isFeatured") Boolean isFeatured,
            Pageable pageable
    );

    @Query("SELECT p FROM PortfolioShowcaseEntity p WHERE p.mua.id = :muaId AND p.isDeleted = false ORDER BY p.createdAt DESC")
    Page<PortfolioShowcaseEntity> findAllByMuaIdOrderByCreatedAtDesc(@Param("muaId") Long muaId, Pageable pageable);

    @Query("SELECT p FROM PortfolioShowcaseEntity p WHERE p.id = :id AND p.mua.id = :muaId AND p.isDeleted = false")
    Optional<PortfolioShowcaseEntity> findByIdAndMuaId(@Param("id") Long id, @Param("muaId") Long muaId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PortfolioShowcaseEntity p WHERE p.agency.id = :agencyId AND p.isFeatured = true AND p.isVisible = true AND p.isDeleted = false")
    List<PortfolioShowcaseEntity> findAgencyFeaturedForUpdate(@Param("agencyId") Long agencyId);

    @Query(value = "SELECT p FROM PortfolioShowcaseEntity p " +
            "LEFT JOIN FETCH p.style " +
            "LEFT JOIN FETCH p.servicePackage " +
            "WHERE p.agency.id = :agencyId " +
            "AND (:styleId IS NULL OR p.style.id = :styleId) " +
            "AND (:packageId IS NULL OR p.servicePackage.id = :packageId) " +
            "AND (:isFeatured IS NULL OR p.isFeatured = :isFeatured) " +
            "AND p.isVisible = true AND p.isDeleted = false " +
            "ORDER BY p.isFeatured DESC, p.createdAt DESC",
            countQuery = "SELECT count(p) FROM PortfolioShowcaseEntity p " +
            "WHERE p.agency.id = :agencyId " +
            "AND (:styleId IS NULL OR p.style.id = :styleId) " +
            "AND (:packageId IS NULL OR p.servicePackage.id = :packageId) " +
            "AND (:isFeatured IS NULL OR p.isFeatured = :isFeatured) " +
            "AND p.isVisible = true AND p.isDeleted = false")
    Page<PortfolioShowcaseEntity> findAgencyPublicGallery(
            @Param("agencyId") Long agencyId,
            @Param("styleId") Integer styleId,
            @Param("packageId") Long packageId,
            @Param("isFeatured") Boolean isFeatured,
            Pageable pageable
    );

    @Query("SELECT p FROM PortfolioShowcaseEntity p WHERE p.agency.id = :agencyId AND p.isDeleted = false ORDER BY p.createdAt DESC")
    Page<PortfolioShowcaseEntity> findAllByAgencyIdOrderByCreatedAtDesc(@Param("agencyId") Long agencyId, Pageable pageable);

    @Query("SELECT p FROM PortfolioShowcaseEntity p WHERE p.id = :id AND p.agency.id = :agencyId AND p.isDeleted = false")
    Optional<PortfolioShowcaseEntity> findByIdAndAgencyId(@Param("id") Long id, @Param("agencyId") Long agencyId);


   
    @Query(value = "SELECT * FROM catalog_schema.portfolio_showcases " +
            "WHERE is_deleted = true AND deleted_at <= :cutoffTime", nativeQuery = true)
    List<PortfolioShowcaseEntity> findDeletedBeforeCutoff(@Param("cutoffTime") LocalDateTime cutoffTime);

    @Modifying
    @Query(value = "DELETE FROM catalog_schema.portfolio_showcases WHERE id = :id", nativeQuery = true)
    void hardDeleteById(@Param("id") Long id);

    @Query("SELECT p.imageUrl FROM PortfolioShowcaseEntity p " +
            "WHERE p.servicePackage.id = :packageId AND p.isVisible = true AND p.isDeleted = false " +
            "ORDER BY p.isFeatured DESC, p.createdAt DESC")
    List<String> findCoverImagesByPackageId(@Param("packageId") Long packageId, Pageable pageable);

    @Query(value = "SELECT DISTINCT ON (package_id) package_id, image_url " +
            "FROM catalog_schema.portfolio_showcases " +
            "WHERE package_id IN (:packageIds) AND is_visible = true AND is_deleted = false " +
            "ORDER BY package_id, is_featured DESC, created_at DESC", nativeQuery = true)
    List<Object[]> findCoverImagesByPackageIds(@Param("packageIds") List<Long> packageIds);

    @Query("SELECT p FROM PortfolioShowcaseEntity p " +
            "WHERE p.servicePackage.id = :packageId AND p.isVisible = true AND p.isDeleted = false " +
            "ORDER BY p.isFeatured DESC, p.createdAt DESC")
    List<PortfolioShowcaseEntity> findAllByPackageId(@Param("packageId") Long packageId);
}
