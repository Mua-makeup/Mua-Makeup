package com.makeup.platform.dto.request.booking;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.makeup.platform.common.validation.ValidBookingTime;
import com.makeup.platform.entity.booking.BookingPartner;
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
import java.time.LocalDateTime;
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
    @JsonAlias({"packageId"})
    private Long packageId;

    @JsonProperty("addon_item_ids")
    @JsonAlias({"addOnItemIds", "addonItemIds"})
    private List<Long> addOnItemIds;

    @JsonProperty("style_id")
    @JsonAlias({"styleId", "makeupStyleId"})
    private Integer styleId;

    @NotNull(message = "validation.booking_partner_required")
    @JsonProperty("booking_partner")
    @JsonAlias({"bookingPartner"})
    private BookingPartner bookingPartner;

    @JsonProperty("agency_id")
    @JsonAlias({"agencyId"})
    private Long agencyId;

    @JsonProperty("mua_id")
    @JsonAlias({"muaId"})
    private Long muaId;

    @NotNull(message = "validation.booking_date_required")
    @FutureOrPresent(message = "validation.booking_date_future")
    @JsonProperty("booking_date")
    @JsonAlias({"bookingDate"})
    private LocalDate bookingDate;

    @NotNull(message = "validation.catalog_booking_time_required")
    @JsonProperty("start_time")
    @JsonAlias({"startTime"})
    private LocalTime startTime;

    @NotBlank(message = "validation.booking_destination_address_required")
    @Size(max = 500, message = "validation.booking_destination_address_size")
    @JsonProperty("destination_address")
    @JsonAlias({"destinationAddress"})
    private String destinationAddress;

    @NotNull(message = "validation.booking_latitude_required")
    @DecimalMin(value = "-90.0", message = "validation.latitude_invalid")
    @DecimalMax(value = "90.0", message = "validation.latitude_invalid")
    @JsonProperty("destination_latitude")
    @JsonAlias({"destinationLatitude"})
    private BigDecimal destinationLatitude;

    @NotNull(message = "validation.booking_longitude_required")
    @DecimalMin(value = "-180.0", message = "validation.longitude_invalid")
    @DecimalMax(value = "180.0", message = "validation.longitude_invalid")
    @JsonProperty("destination_longitude")
    @JsonAlias({"destinationLongitude"})
    private BigDecimal destinationLongitude;

    @JsonProperty("customer_notes")
    @JsonAlias({"customerNotes", "note"})
    private String customerNotes;

    @JsonProperty("voucher_code")
    @JsonAlias({"voucherCode"})
    private String voucherCode;

    /**
     * Tự động giải mã chuỗi bookingTime dạng ISO LocalDateTime (VD: 2026-10-02T05:45:00)
     * thành bookingDate và startTime
     */
    @JsonProperty("booking_time")
    @JsonAlias({"bookingTime"})
    public void setBookingTime(LocalDateTime bookingTime) {
        if (bookingTime != null) {
            if (this.bookingDate == null) {
                this.bookingDate = bookingTime.toLocalDate();
            }
            if (this.startTime == null) {
                this.startTime = bookingTime.toLocalTime();
            }
        }
    }

    /**
     * Tự động gán bookingPartner từ providerType ("FREELANCER" | "AGENCY")
     */
    @JsonProperty("provider_type")
    @JsonAlias({"providerType"})
    public void setProviderType(String providerType) {
        if (providerType != null) {
            if ("FREELANCER".equalsIgnoreCase(providerType) || "FREELANCER_DIRECT".equalsIgnoreCase(providerType)) {
                this.bookingPartner = BookingPartner.FREELANCER_DIRECT;
            } else if ("AGENCY".equalsIgnoreCase(providerType) || "AGENCY_DISPATCH".equalsIgnoreCase(providerType)) {
                this.bookingPartner = BookingPartner.AGENCY_DISPATCH;
            }
        }
    }

    /**
     * Tự động gán providerId thành muaId hoặc agencyId tùy theo loại đối tác
     */
    @JsonProperty("provider_id")
    @JsonAlias({"providerId"})
    public void setProviderId(Long providerId) {
        if (providerId != null) {
            if (this.bookingPartner == null || this.bookingPartner == BookingPartner.FREELANCER_DIRECT) {
                this.muaId = providerId;
            } else {
                this.agencyId = providerId;
            }
        }
    }
}
