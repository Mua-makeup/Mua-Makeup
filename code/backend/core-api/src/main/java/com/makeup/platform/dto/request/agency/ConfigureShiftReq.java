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

    @NotNull(message = "staffId không được để trống")
    private Long staffId;

    @NotNull(message = "dayOfWeek không được để trống")
    @Min(value = 1, message = "dayOfWeek phải từ 1 (Chủ Nhật) đến 7 (Thứ Bảy)")
    @Max(value = 7, message = "dayOfWeek phải từ 1 (Chủ Nhật) đến 7 (Thứ Bảy)")
    private Integer dayOfWeek; // 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7

    @NotBlank(message = "shiftName không được để trống")
    @Size(max = 100, message = "shiftName tối đa 100 ký tự")
    private String shiftName;

    @NotNull(message = "startTime không được để trống")
    @JsonFormat(pattern = "HH:mm[:ss]")
    private LocalTime startTime;

    @NotNull(message = "endTime không được để trống")
    @JsonFormat(pattern = "HH:mm[:ss]")
    private LocalTime endTime;

    @Builder.Default
    private Boolean isRecurring = true;
}
