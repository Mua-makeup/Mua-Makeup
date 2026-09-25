package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportEmergencyBusyReq {

    @NotBlank(message = "{emergency.reason.required}")
    @Size(max = 500, message = "{emergency.reason.too_long}")
    private String emergencyReason;

    private String proofDocumentUrl;
}
