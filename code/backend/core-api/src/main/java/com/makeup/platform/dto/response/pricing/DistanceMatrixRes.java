package com.makeup.platform.dto.response.pricing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DistanceMatrixRes {

    private BigDecimal distanceKm;
    private Integer durationMinutes;
    private Boolean isCached;
    private String routingProvider; // "GOONG_MAPS" hoặc "HAVERSINE_FALLBACK"
}
