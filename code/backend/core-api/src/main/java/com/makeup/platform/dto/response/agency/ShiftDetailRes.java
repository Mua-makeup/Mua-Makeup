package com.makeup.platform.dto.response.agency;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftDetailRes {

    private Long id;
    private Long shiftId;
    private Long staffId;
    private String staffName;
    private java.time.LocalDate workDate;
    private Integer dayOfWeek;
    private String dayName;
    private String shiftName;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime endTime;

    private Boolean isRecurring;
    private Boolean isActive;

    public static String getVietnameseDayName(Integer dayOfWeek) {
        if (dayOfWeek == null) return "";
        return switch (dayOfWeek) {
            case 1 -> "Chủ Nhật";
            case 2 -> "Thứ Hai";
            case 3 -> "Thứ Ba";
            case 4 -> "Thứ Tư";
            case 5 -> "Thứ Năm";
            case 6 -> "Thứ Sáu";
            case 7 -> "Thứ Bảy";
            default -> "";
        };
    }
}
