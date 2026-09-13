package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvitationReq {

    @Min(value = 1, message = "Thời hạn mã mời tối thiểu là 1 ngày")
    @Max(value = 30, message = "Thời hạn mã mời tối đa là 30 ngày")
    @Builder.Default
    private Integer expiresInDays = 7;

    private String note;
}
