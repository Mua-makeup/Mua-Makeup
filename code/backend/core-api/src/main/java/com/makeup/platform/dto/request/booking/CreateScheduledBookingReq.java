package com.makeup.platform.dto.request.booking;

import com.makeup.platform.common.validation.ValidBookingTime;
import com.makeup.platform.entity.booking.BookingPartner;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ValidBookingTime
public class CreateScheduledBookingReq {

    @NotNull(message = "validation.package_id_required")
    @JsonProperty("package_id")
    private Long packageId;

    @JsonProperty("addon_item_ids")
    private List<Long> addOnItemIds;

    @NotNull(message = "validation.booking_partner_required")
    @JsonProperty("booking_partner")
    private BookingPartner bookingPartner;

    @JsonProperty("agency_id")
    private Long agencyId;

    @JsonProperty("mua_id")
    private Long muaId;

    @NotNull(message = "validation.booking_date_required")
    @FutureOrPresent(message = "validation.booking_date_future")
    @JsonProperty("booking_date")
    private LocalDate bookingDate;

    @NotNull(message = "validation.catalog_booking_time_required")
    @JsonProperty("start_time")
    private LocalTime startTime;

    @NotBlank(message = "validation.booking_destination_address_required")
    @Size(max = 500, message = "validation.booking_destination_address_size")
    @JsonProperty("destination_address")
    private String destinationAddress;

    @NotNull(message = "validation.booking_latitude_required")
    @DecimalMin(value = "-90.0", message = "validation.latitude_invalid")
    @DecimalMax(value = "90.0", message = "validation.latitude_invalid")
    @JsonProperty("destination_latitude")
    private BigDecimal destinationLatitude;

    @NotNull(message = "validation.booking_longitude_required")
    @DecimalMin(value = "-180.0", message = "validation.longitude_invalid")
    @DecimalMax(value = "180.0", message = "validation.longitude_invalid")
    @JsonProperty("destination_longitude")
    private BigDecimal destinationLongitude;

    @JsonProperty("voucher_code")
    private String voucherCode;
}
