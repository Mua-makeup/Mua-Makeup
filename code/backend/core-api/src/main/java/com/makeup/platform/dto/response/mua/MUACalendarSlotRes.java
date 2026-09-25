package com.makeup.platform.dto.response.mua;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MUACalendarSlotRes {

    @JsonProperty("calendar_id")
    private Long calendarId;

    @JsonProperty("mua_id")
    private Long muaId;

    @JsonProperty("booking_id")
    private Long bookingId;

    @JsonProperty("booking_date")
    private LocalDate bookingDate;

    @JsonProperty("start_at")
    private OffsetDateTime startAt;

    @JsonProperty("end_at")
    private OffsetDateTime endAt;

    @JsonProperty("is_locked")
    private Boolean isLocked;

    @JsonProperty("reason")
    private String reason;
}
