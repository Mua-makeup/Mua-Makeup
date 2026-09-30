package com.makeup.platform.dto.request.booking;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInstantBookingReq {

    private Long targetMuaId;

    private Long packageId;

    @NotNull(message = "{validation.master_category_required}")
    private Integer masterCategoryId;

    private Integer styleId;

    @DecimalMin(value = "1.0", message = "{validation.radius_invalid}")
    @DecimalMax(value = "30.0", message = "{validation.radius_invalid}")
    @Builder.Default
    private Double radiusKm = 10.0;

    @NotBlank(message = "{validation.booking_destination_address_required}")
    @Size(max = 500, message = "{validation.booking_destination_address_size}")
    private String destinationAddress;

    @NotNull(message = "{validation.booking_latitude_required}")
    @DecimalMin(value = "-90.0", message = "{validation.latitude_invalid}")
    @DecimalMax(value = "90.0", message = "{validation.latitude_invalid}")
    @JsonAlias({"customerLatitude", "destinationLatitude", "lat", "latitude"})
    private BigDecimal destinationLatitude;

    @NotNull(message = "{validation.booking_longitude_required}")
    @DecimalMin(value = "-180.0", message = "{validation.longitude_invalid}")
    @DecimalMax(value = "180.0", message = "{validation.longitude_invalid}")
    @JsonAlias({"customerLongitude", "destinationLongitude", "lng", "longitude"})
    private BigDecimal destinationLongitude;

    private String note;
}
