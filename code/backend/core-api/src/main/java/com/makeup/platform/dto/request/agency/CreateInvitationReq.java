package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvitationReq {

    @Min(value = 1, message = "Thời hạn mã mời tối thiểu là 1 giờ")
    @Max(value = 720, message = "Thời hạn mã mời tối đa là 720 giờ (30 ngày)")
    @Builder.Default
    private Integer expireHours = 72;

    private String note;

    @DecimalMin(value = "0.00", message = "Tỷ lệ hoa hồng tối thiểu là 0%")
    @DecimalMax(value = "100.00", message = "Tỷ lệ hoa hồng tối đa là 100%")
    private BigDecimal proposedCommissionRate;
}
