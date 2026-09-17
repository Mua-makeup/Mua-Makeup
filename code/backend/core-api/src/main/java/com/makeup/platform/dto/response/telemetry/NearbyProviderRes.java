package com.makeup.platform.dto.response.telemetry;

import com.makeup.platform.entity.telemetry.ProviderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NearbyProviderRes {

    private Long providerId; // muaId hoặc agencyId

    private ProviderType providerType;

    private String code; // muaCode hoặc agencyCode

    private String fullName;

    private String avatarUrl;

    private Double distanceKm;

    private BigDecimal ratingAvg;

    private BigDecimal startingPrice;

    // Tọa độ công khai đã được làm mờ (Privacy Fuzzing +/- 30-50m)
    private Double fuzzedLatitude;

    private Double fuzzedLongitude;

    private List<String> styles;
}
