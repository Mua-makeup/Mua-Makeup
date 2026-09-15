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

    @NotBlank(message = "Trạng thái không được để trống")
    @Pattern(regexp = "ACTIVE|SUSPENDED|LEFT", message = "Trạng thái phải là: ACTIVE, SUSPENDED hoặc LEFT")
    private String status;

    private String note;
}
