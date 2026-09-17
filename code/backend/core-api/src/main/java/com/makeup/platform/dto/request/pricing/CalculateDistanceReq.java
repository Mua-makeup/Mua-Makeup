package com.makeup.platform.dto.request.pricing;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalculateDistanceReq {

    @NotNull(message = "{validation.pricing_customer_lat_required}")
    @DecimalMin(value = "-90.0", message = "{validation.pricing_lat_range}")
    @DecimalMax(value = "90.0", message = "{validation.pricing_lat_range}")
    private BigDecimal originLatitude;

    @NotNull(message = "{validation.pricing_customer_lng_required}")
    @DecimalMin(value = "-180.0", message = "{validation.pricing_lng_range}")
    @DecimalMax(value = "180.0", message = "{validation.pricing_lng_range}")
    private BigDecimal originLongitude;

    @NotNull(message = "{validation.pricing_customer_lat_required}")
    @DecimalMin(value = "-90.0", message = "{validation.pricing_lat_range}")
    @DecimalMax(value = "90.0", message = "{validation.pricing_lat_range}")
    private BigDecimal destinationLatitude;

    @NotNull(message = "{validation.pricing_customer_lng_required}")
    @DecimalMin(value = "-180.0", message = "{validation.pricing_lng_range}")
    @DecimalMax(value = "180.0", message = "{validation.pricing_lng_range}")
    private BigDecimal destinationLongitude;
}
