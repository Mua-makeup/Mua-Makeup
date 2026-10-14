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
}
