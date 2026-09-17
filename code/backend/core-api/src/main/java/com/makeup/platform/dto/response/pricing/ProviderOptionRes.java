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
public class ProviderOptionRes {

    private Long id;
    private String type; // AGENCY hoặc FREELANCER
    private String name;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Boolean isSurgeEnabled;
    private BigDecimal ratingAvg;
}
