package com.makeup.platform.repository.pricing;

import com.makeup.platform.entity.pricing.SurgePricingRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface SurgePricingRuleRepository extends JpaRepository<SurgePricingRuleEntity, Long> {

    List<SurgePricingRuleEntity> findByIsActiveTrue();

    @Query("""
        SELECT r FROM SurgePricingRuleEntity r
        WHERE r.isActive = true
          AND (r.zoneCode = 'ALL' OR r.zoneCode = :zoneCode)
          AND (r.startTime IS NULL OR r.endTime IS NULL OR (r.startTime <= :time AND r.endTime >= :time))
          AND (r.applicableDaysOfWeek IS NULL OR r.applicableDaysOfWeek LIKE CONCAT('%', :dayOfWeek, '%'))
        ORDER BY r.surgeMultiplier DESC
    """)
    List<SurgePricingRuleEntity> findMatchingRules(
            @Param("time") LocalTime time,
            @Param("dayOfWeek") String dayOfWeek,
            @Param("zoneCode") String zoneCode
    );
}
