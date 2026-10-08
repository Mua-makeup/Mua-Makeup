package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewStaffCertificateReq {

    @NotBlank(message = "{agency.review.decision_required}")
    @Pattern(regexp = "VERIFIED|REJECTED", message = "{agency.review.decision_invalid}")
    private String decision;

    private String rejectionReason;
}
