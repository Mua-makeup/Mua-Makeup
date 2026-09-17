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
public class UpdateStaffStatusReq {

    @NotBlank(message = "{validation.staff_status_required}")
    @Pattern(regexp = "ACTIVE|SUSPENDED|LEFT", message = "{validation.staff_status_invalid}")
    private String status;

    private String note;
}
