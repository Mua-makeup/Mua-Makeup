package com.makeup.platform.dto.response.booking;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledBookingCreatedRes {

    @JsonProperty("booking_id")
    private Long bookingId;

    @JsonProperty("booking_code")
    private String bookingCode;

    @JsonProperty("status")
    private String status;

    @JsonProperty("deposit_expired_at")
    private OffsetDateTime depositExpiredAt;

    @JsonProperty("booking_type")
    private String bookingType;

    @JsonProperty("booking_partner")
    private String bookingPartner;

    @JsonProperty("booking_date")
    private LocalDate bookingDate;

    @JsonProperty("start_time")
    private LocalTime startTime;

    @JsonProperty("estimated_end_time")
    private LocalTime estimatedEndTime;

    @JsonProperty("package_name")
    private String packageName;

    @JsonProperty("schedule_summary")
    private String scheduleSummary;

    @JsonProperty("total_amount")
    private BigDecimal totalAmount;

    @JsonProperty("deposit_amount")
    private BigDecimal depositAmount;

    @JsonProperty("assigned_mua")
    private AssignedMuaRes assignedMua;

    @JsonProperty("financial_summary")
    private FinancialSummaryRes financialSummary;

    @JsonProperty("reminders")
    private RemindersRes reminders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignedMuaRes {
        @JsonProperty("mua_id")
        private Long muaId;

        @JsonProperty("full_name")
        private String fullName;

        @JsonProperty("phone_number")
        private String phoneNumber;

        @JsonProperty("avatar_url")
        private String avatarUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinancialSummaryRes {
        @JsonProperty("service_subtotal")
        private BigDecimal serviceSubtotal;

        @JsonProperty("distance_fee")
        private BigDecimal distanceFee;

        @JsonProperty("surcharge_fee")
        private BigDecimal surchargeFee;

        @JsonProperty("discount_amount")
        private BigDecimal discountAmount;

        @JsonProperty("total_amount")
        private BigDecimal totalAmount;

        @JsonProperty("deposit_amount")
        private BigDecimal depositAmount;

        @JsonProperty("remaining_amount")
        private BigDecimal remainingAmount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RemindersRes {
        @JsonProperty("reminder_24h_at")
        private OffsetDateTime reminder24hAt;

        @JsonProperty("reminder_2h_at")
        private OffsetDateTime reminder2hAt;
    }
}
