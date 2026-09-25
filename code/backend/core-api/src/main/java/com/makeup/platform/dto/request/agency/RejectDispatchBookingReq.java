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
public class RejectDispatchBookingReq {

    @NotBlank(message = "{dispatch.rejection_reason.required}")
    @Size(max = 200, message = "{dispatch.rejection_reason.too_long}")
    private String rejectionReason;

    @Size(max = 500, message = "{dispatch.rejection_note.too_long}")
    private String rejectionNote;
}
