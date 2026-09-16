package com.makeup.platform.dto.request.pricing;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreviewInvoiceReq {

    @NotNull(message = "{validation.pricing_package_id_required}")
    private Long packageId;

    private List<Long> addOnItemIds;

    @NotNull(message = "{validation.pricing_booking_time_required}")
    @Future(message = "{validation.pricing_booking_time_future}")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm[:ss][.SSS][XXX][X]")
    private LocalDateTime bookingTime;

    @NotNull(message = "{validation.pricing_customer_lat_required}")
    @DecimalMin(value = "-90.0", message = "{validation.pricing_lat_range}")
    @DecimalMax(value = "90.0", message = "{validation.pricing_lat_range}")
    private BigDecimal customerLatitude;

    @NotNull(message = "{validation.pricing_customer_lng_required}")
    @DecimalMin(value = "-180.0", message = "{validation.pricing_lng_range}")
    @DecimalMax(value = "180.0", message = "{validation.pricing_lng_range}")
    private BigDecimal customerLongitude;

    @NotNull(message = "{validation.pricing_provider_type_required}")
    @Pattern(regexp = "^(FREELANCER|AGENCY)$", message = "{validation.pricing_provider_type_invalid}")
    private String providerType;

    @NotNull(message = "{validation.pricing_provider_id_required}")
    private Long providerId;

    private String voucherCode;
}
