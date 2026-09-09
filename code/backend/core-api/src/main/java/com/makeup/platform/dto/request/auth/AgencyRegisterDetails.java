package com.makeup.platform.dto.request.auth;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgencyRegisterDetails {

    @NotBlank(message = "Tên Studio không được để trống")
    private String agencyName;

    @NotBlank(message = "Hotline Studio không được để trống")
    private String hotline;

    @NotBlank(message = "Địa chỉ đường/phố không được để trống")
    private String addressStreet;

    @NotBlank(message = "Quận/Huyện không được để trống")
    private String district;

    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    private String city;

    @DecimalMin(value = "0.00", message = "Tỷ lệ hoa hồng tối thiểu là 0%")
    @DecimalMax(value = "100.00", message = "Tỷ lệ hoa hồng tối đa là 100%")
    private BigDecimal commissionRateInternal;
}
