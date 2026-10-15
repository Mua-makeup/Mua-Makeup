package com.makeup.platform.dto.request.agency;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateLeaveRequestReq {

    @NotNull(message = "validation.leave_date_required")
    private LocalDate leaveDate;

    @NotNull(message = "validation.start_time_required")
    @JsonFormat(pattern = "HH:mm[:ss]")
    private LocalTime startTime;

    @NotNull(message = "validation.end_time_required")
    @JsonFormat(pattern = "HH:mm[:ss]")
    private LocalTime endTime;

    @NotBlank(message = "validation.shift_name_required")
    @Size(max = 100, message = "validation.shift_name_max_100")
    private String shiftName;

    @NotBlank(message = "validation.reason_required")
    @Size(max = 255, message = "validation.reason_max_255")
    private String reason;
}
