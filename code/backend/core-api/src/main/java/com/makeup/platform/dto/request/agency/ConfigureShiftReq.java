package com.makeup.platform.dto.request.agency;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigureShiftReq {

    @NotNull(message = "{validation.staff_id_required}")
    private Long staffId;

    @NotNull(message = "{validation.day_of_week_required}")
    @Min(value = 1, message = "{validation.day_of_week_range}")
    @Max(value = 7, message = "{validation.day_of_week_range}")
    private Integer dayOfWeek; // 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7

    @NotBlank(message = "{validation.shift_name_required}")
    @Size(max = 100, message = "{validation.shift_name_max}")
    private String shiftName;

    @NotNull(message = "{validation.shift_start_time_required}")
    @JsonFormat(pattern = "HH:mm[:ss]")
    private LocalTime startTime;

    @NotNull(message = "{validation.shift_end_time_required}")
    @JsonFormat(pattern = "HH:mm[:ss]")
    private LocalTime endTime;

    @Builder.Default
    private Boolean isRecurring = true;
}
