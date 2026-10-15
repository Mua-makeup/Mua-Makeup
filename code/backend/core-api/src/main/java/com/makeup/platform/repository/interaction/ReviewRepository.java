package com.makeup.platform.repository.interaction;

import com.makeup.platform.entity.interaction.ReviewEntity;
import com.makeup.platform.entity.interaction.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<ReviewEntity, Long> {

    boolean existsByBookingId(Long bookingId);

    Optional<ReviewEntity> findByBookingId(Long bookingId);

    Page<ReviewEntity> findByMuaIdAndStatusAndIsDeletedFalse(Long muaId, ReviewStatus status, Pageable pageable);

    @Query(value = """
            SELECT * FROM interaction_schema.reviews r
            WHERE r.mua_id = :muaId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
              AND (:rating IS NULL OR r.rating = :rating)
              AND (:hasImages IS NULL OR (:hasImages = true AND jsonb_array_length(r.image_urls) > 0) OR (:hasImages = false AND (r.image_urls IS NULL OR jsonb_array_length(r.image_urls) = 0)))
            ORDER BY r.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM interaction_schema.reviews r
            WHERE r.mua_id = :muaId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
              AND (:rating IS NULL OR r.rating = :rating)
              AND (:hasImages IS NULL OR (:hasImages = true AND jsonb_array_length(r.image_urls) > 0) OR (:hasImages = false AND (r.image_urls IS NULL OR jsonb_array_length(r.image_urls) = 0)))
            """,
            nativeQuery = true)
    Page<ReviewEntity> findByMuaIdWithFilters(
            @Param("muaId") Long muaId,
            @Param("rating") Integer rating,
            @Param("hasImages") Boolean hasImages,
            Pageable pageable
    );

    @Query(value = """
            SELECT count(*) FROM interaction_schema.reviews r
            WHERE r.mua_id = :muaId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
              AND jsonb_array_length(r.image_urls) > 0
            """, nativeQuery = true)
    long countReviewsWithImagesByMuaId(@Param("muaId") Long muaId);

    @Query(value = """
            SELECT r.rating, count(r.id) FROM interaction_schema.reviews r
            WHERE r.mua_id = :muaId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
            GROUP BY r.rating
            """, nativeQuery = true)
    List<Object[]> countRatingsGroupedByMuaId(@Param("muaId") Long muaId);

    long countByMuaIdAndStatusAndIsDeletedFalse(Long muaId, ReviewStatus status);

    @Query(value = """
            SELECT r.rating FROM interaction_schema.reviews r
            WHERE r.mua_id = :muaId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
            ORDER BY r.created_at DESC
            LIMIT 100
            """, nativeQuery = true)
    List<Integer> findTop100RatingsByMuaId(@Param("muaId") Long muaId);

    @Query(value = """
            SELECT COALESCE(AVG(r.rating), 4.60)
            FROM interaction_schema.reviews r
            WHERE r.status = 'APPROVED'
              AND r.is_deleted = false
            """, nativeQuery = true)
    Double getSystemOverallAverageRating();

    @Query(value = """
            SELECT COUNT(r.id)
            FROM interaction_schema.reviews r
            WHERE r.customer_id = :customerId
              AND r.mua_id = :muaId
              AND r.created_at >= :sinceTime
              AND r.is_deleted = false
            """, nativeQuery = true)
    long countReviewsBetweenCustomerAndMuaSince(
            @Param("customerId") Long customerId,
            @Param("muaId") Long muaId,
            @Param("sinceTime") Instant sinceTime
    );

    @Query(value = """
            SELECT COUNT(r.id)
            FROM interaction_schema.reviews r
            WHERE r.device_id = :deviceId
              AND r.mua_id = :muaId
              AND r.is_deleted = false
            """, nativeQuery = true)
    long countReviewsByDeviceIdAndMua(
            @Param("deviceId") String deviceId,
            @Param("muaId") Long muaId
    );

    Page<ReviewEntity> findByAgencyIdAndStatusAndIsDeletedFalse(Long agencyId, ReviewStatus status, Pageable pageable);

    long countByAgencyIdAndStatusAndIsDeletedFalse(Long agencyId, ReviewStatus status);

    @Query(value = """
            SELECT COALESCE(AVG(r.rating), 5.00)
            FROM interaction_schema.reviews r
            WHERE r.agency_id = :agencyId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
            """, nativeQuery = true)
    Double getAgencyAverageRating(@Param("agencyId") Long agencyId);
}
