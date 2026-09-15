package com.makeup.platform.dto.request.agency;

import com.makeup.platform.entity.agency.OvertimeReasonType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitOvertimeReportReq {

    @NotNull(message = "{validation.booking_id_required}")
    private Long bookingId;

    @NotNull(message = "{validation.overtime_minutes_required}")
    @Min(value = 1, message = "{validation.overtime_minutes_min}")
    private Integer overtimeMinutes;

    @NotNull(message = "{validation.reason_type_required}")
    private OvertimeReasonType reasonType;

    private Long ruleId;

    @NotBlank(message = "{validation.explanation_text_required}")
    private String explanationText;

    private String proofImageUrl;
}
