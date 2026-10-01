package com.makeup.platform.dto.response.mua;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarDayOverviewRes {

    @JsonProperty("date")
    private LocalDate date;

    @JsonProperty("day_of_week")
    private String dayOfWeek;

    @JsonProperty("is_fully_booked")
    private Boolean isFullyBooked;

    @JsonProperty("available_slots_count")
    private Integer availableSlotsCount;
}
