package com.makeup.platform.repository.pricing;

import com.makeup.platform.entity.pricing.DistanceFeeTierEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface DistanceFeeTierRepository extends JpaRepository<DistanceFeeTierEntity, Long> {

    @Query("""
        SELECT t FROM DistanceFeeTierEntity t
        WHERE t.isActive = true
          AND t.minDistanceKm <= :distanceKm
          AND t.maxDistanceKm >= :distanceKm
        ORDER BY t.minDistanceKm ASC
    """)
    Optional<DistanceFeeTierEntity> findApplicableTier(@Param("distanceKm") BigDecimal distanceKm);
}
