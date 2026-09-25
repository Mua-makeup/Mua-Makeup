package com.makeup.platform.dto.request.mua;

import com.makeup.platform.common.validation.ValidTimeRange;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ValidTimeRange
public class BlockCalendarSlotReq {

    @NotNull(message = "validation.booking_date_required")
    @FutureOrPresent(message = "validation.booking_date_future")
    @JsonProperty("booking_date")
    private LocalDate bookingDate;

    @NotNull(message = "validation.shift_start_time_required")
    @JsonProperty("start_time")
    private LocalTime startTime;

    @NotNull(message = "validation.shift_end_time_required")
    @JsonProperty("end_time")
    private LocalTime endTime;

    @NotBlank(message = "validation.explanation_text_required")
    @Size(max = 255, message = "validation.booking_reason_max")
    @JsonProperty("reason")
    private String reason;
}
