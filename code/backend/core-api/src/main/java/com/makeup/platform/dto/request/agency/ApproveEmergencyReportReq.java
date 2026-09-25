package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveEmergencyReportReq {

    @NotNull(message = "{emergency.approved.required}")
    private Boolean approved;

    @Size(max = 500, message = "{emergency.note.too_long}")
    private String adminReviewNote;
}
