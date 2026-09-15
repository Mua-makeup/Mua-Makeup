package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewStaffApplicationReq {

    @NotBlank(message = "Quyết định phê duyệt không được để trống")
    @Pattern(regexp = "APPROVE|REJECT", message = "Quyết định phê duyệt phải là: APPROVE hoặc REJECT")
    private String decision;

    @DecimalMin(value = "0.00", message = "Tỷ lệ hoa hồng tối thiểu là 0%")
    @DecimalMax(value = "100.00", message = "Tỷ lệ hoa hồng tối đa là 100%")
    private BigDecimal agreedCommissionRate;

    private String note;
}
