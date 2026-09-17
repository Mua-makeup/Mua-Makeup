package com.makeup.platform.dto.request.catalog;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalculateSurchargeReq {

    private Long agencyId;

    private Long muaId;

    @NotNull(message = "{validation.catalog_booking_time_required}")
    private LocalDateTime bookingTime;

    @DecimalMin(value = "0.00", message = "{validation.catalog_distance_min}")
    @Builder.Default
    private BigDecimal distanceKm = BigDecimal.ZERO;
}
