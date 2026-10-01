package com.makeup.platform.dto.request.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResolveDisputeReq {

    @NotBlank(message = "dispute.resolution_required")
    private String resolution; // "APPROVE_REFUND_CUSTOMER" or "REJECT_AND_PAYOUT_MUA"

    @NotBlank(message = "dispute.note_required")
    private String note;
}
