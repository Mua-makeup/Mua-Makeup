package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotBlank;
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
public class ReassignStaffReq {

    @NotNull(message = "{dispatch.old_staff_id.required}")
    private Long oldStaffId;

    @NotNull(message = "{dispatch.new_staff_id.required}")
    private Long newStaffId;

    @NotBlank(message = "{dispatch.reassign_reason.required}")
    @Size(max = 255, message = "{dispatch.reassign_reason.max_len}")
    private String reassignmentReason;
}
