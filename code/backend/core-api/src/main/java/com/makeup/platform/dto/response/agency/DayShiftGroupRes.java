package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayShiftGroupRes {

    private Integer dayOfWeek;
    private String dayName;
    private List<ShiftDetailRes> shifts;
}
