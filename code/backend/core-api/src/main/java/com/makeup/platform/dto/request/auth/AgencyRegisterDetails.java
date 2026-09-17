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

    @NotBlank(message = "{validation.studio_name_required}")
    private String agencyName;

    @NotBlank(message = "{validation.studio_hotline_required}")
    private String hotline;

    @NotBlank(message = "{validation.street_address_required}")
    private String addressStreet;

    @NotBlank(message = "{validation.district_required}")
    private String district;

    @NotBlank(message = "{validation.city_required}")
    private String city;

    @DecimalMin(value = "0.00", message = "{validation.commission_rate_min}")
    @DecimalMax(value = "100.00", message = "{validation.commission_rate_max}")
    private BigDecimal commissionRateInternal;
}
