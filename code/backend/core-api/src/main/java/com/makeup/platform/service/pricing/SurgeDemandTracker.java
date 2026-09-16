package com.makeup.platform.service.pricing;

import java.math.BigDecimal;

public interface SurgeDemandTracker {

    record RealtimeSurgeResult(
            BigDecimal multiplier,
            int demandCount,
            int supplyCount,
            BigDecimal demandRatio,
            String surgeReason,
            String surgeType
    ) {}

    RealtimeSurgeResult evaluateRealtimeSurge(BigDecimal customerLat, BigDecimal customerLng);
}
