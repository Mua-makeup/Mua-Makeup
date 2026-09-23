package com.makeup.platform.dto.response.mua;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailableTimeSlotRes {

    @JsonProperty("mua_id")
    private Long muaId;

    @JsonProperty("booking_date")
    private LocalDate bookingDate;

    @JsonProperty("duration_minutes")
    private Integer durationMinutes;

    @JsonProperty("step_minutes")
    private Integer stepMinutes;

    @JsonProperty("slots")
    private List<TimeSlotItemRes> slots;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeSlotItemRes {

        @JsonProperty("start_time")
        private LocalTime startTime;

        @JsonProperty("end_time")
        private LocalTime endTime;

        @JsonProperty("is_available")
        private Boolean isAvailable;

        @JsonProperty("is_buffer_blocked")
        private Boolean isBufferBlocked;

        @JsonProperty("unavailable_reason")
        private String unavailableReason;
    }
}
