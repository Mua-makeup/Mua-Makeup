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
            SELECT r.* FROM interaction_schema.reviews r
            JOIN booking_schema.bookings b ON r.booking_id = b.id
            LEFT JOIN catalog_schema.service_packages sp ON b.package_id = sp.id
            WHERE r.mua_id = :muaId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
              AND (:rating IS NULL OR r.rating = :rating)
              AND (:hasImages IS NULL OR (:hasImages = true AND jsonb_array_length(r.image_urls) > 0) OR (:hasImages = false AND (r.image_urls IS NULL OR jsonb_array_length(r.image_urls) = 0)))
              AND (:categoryId IS NULL OR sp.master_category_id = :categoryId)
            ORDER BY r.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM interaction_schema.reviews r
            JOIN booking_schema.bookings b ON r.booking_id = b.id
            LEFT JOIN catalog_schema.service_packages sp ON b.package_id = sp.id
            WHERE r.mua_id = :muaId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
              AND (:rating IS NULL OR r.rating = :rating)
              AND (:hasImages IS NULL OR (:hasImages = true AND jsonb_array_length(r.image_urls) > 0) OR (:hasImages = false AND (r.image_urls IS NULL OR jsonb_array_length(r.image_urls) = 0)))
              AND (:categoryId IS NULL OR sp.master_category_id = :categoryId)
            """,
            nativeQuery = true)
    Page<ReviewEntity> findByMuaIdWithFilters(
            @Param("muaId") Long muaId,
            @Param("rating") Integer rating,
            @Param("hasImages") Boolean hasImages,
            @Param("categoryId") Integer categoryId,
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

    @Query(value = """
            SELECT mc.id, mc.category_name, count(r.id)
            FROM interaction_schema.reviews r
            JOIN booking_schema.bookings b ON r.booking_id = b.id
            JOIN catalog_schema.service_packages sp ON b.package_id = sp.id
            JOIN catalog_schema.master_service_categories mc ON sp.master_category_id = mc.id
            WHERE r.mua_id = :muaId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
            GROUP BY mc.id, mc.category_name
            ORDER BY count(r.id) DESC
            """, nativeQuery = true)
    List<Object[]> countCategoriesGroupedByMuaId(@Param("muaId") Long muaId);

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
            SELECT AVG(r.rating)
            FROM interaction_schema.reviews r
            WHERE r.agency_id = :agencyId
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
            """, nativeQuery = true)
    Double getAgencyAverageRating(@Param("agencyId") Long agencyId);

    @Query(value = """
            SELECT COALESCE(AVG(r.rating), 4.65)
            FROM interaction_schema.reviews r
            WHERE r.agency_id IS NOT NULL
              AND r.status = 'APPROVED'
              AND r.is_deleted = false
            """, nativeQuery = true)
    Double getAgencySystemOverallAverageRating();

    @Query(value = """
            SELECT r FROM ReviewEntity r
            LEFT JOIN r.booking b
            WHERE (r.agency.id = :agencyId OR b.agency.id = :agencyId)
              AND r.isDeleted = false
              AND (:rating IS NULL OR r.rating = :rating)
            ORDER BY r.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(r.id) FROM ReviewEntity r
            LEFT JOIN r.booking b
            WHERE (r.agency.id = :agencyId OR b.agency.id = :agencyId)
              AND r.isDeleted = false
              AND (:rating IS NULL OR r.rating = :rating)
            """)
    Page<ReviewEntity> findAgencyReviews(
            @Param("agencyId") Long agencyId,
            @Param("rating") Integer rating,
            Pageable pageable
    );

    @Query(value = """
            SELECT r FROM ReviewEntity r
            LEFT JOIN r.booking b
            LEFT JOIN b.customer c
            WHERE (r.agency.id = :agencyId OR b.agency.id = :agencyId)
              AND r.isDeleted = false
              AND (:rating IS NULL OR r.rating = :rating)
              AND (LOWER(b.bookingCode) LIKE :pattern
                   OR LOWER(c.fullName) LIKE :pattern
                   OR LOWER(r.comment) LIKE :pattern)
            ORDER BY r.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(r.id) FROM ReviewEntity r
            LEFT JOIN r.booking b
            LEFT JOIN b.customer c
            WHERE (r.agency.id = :agencyId OR b.agency.id = :agencyId)
              AND r.isDeleted = false
              AND (:rating IS NULL OR r.rating = :rating)
              AND (LOWER(b.bookingCode) LIKE :pattern
                   OR LOWER(c.fullName) LIKE :pattern
                   OR LOWER(r.comment) LIKE :pattern)
            """)
    Page<ReviewEntity> findAgencyReviewsWithKeyword(
            @Param("agencyId") Long agencyId,
            @Param("rating") Integer rating,
            @Param("pattern") String pattern,
            Pageable pageable
    );

    @Query(value = """
            SELECT r.rating, COUNT(r.id)
            FROM interaction_schema.reviews r
            LEFT JOIN booking_schema.bookings b ON r.booking_id = b.id
            WHERE (r.agency_id = :agencyId OR b.agency_id = :agencyId)
              AND r.is_deleted = false
            GROUP BY r.rating
            """, nativeQuery = true)
    List<Object[]> getAgencyRatingCounts(@Param("agencyId") Long agencyId);
}
