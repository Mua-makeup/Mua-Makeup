package com.makeup.platform.dto.request.agency;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class UpdateAgencyProfileReq {

    @NotBlank(message = "{validation.studio_name_required}")
    @Size(max = 150, message = "{validation.studio_name_max}")
    private String agencyName;

    @NotBlank(message = "{validation.studio_hotline_required}")
    @Size(max = 20, message = "{validation.studio_hotline_max}")
    private String hotline;

    @NotBlank(message = "{validation.street_address_required}")
    private String addressStreet;

    @NotBlank(message = "{validation.district_required}")
    @Size(max = 50, message = "{validation.district_max}")
    @JsonAlias({"addressDistrict", "district"})
    private String district;

    @NotBlank(message = "{validation.city_required}")
    @Size(max = 50, message = "{validation.city_max}")
    @JsonAlias({"addressCity", "city"})
    private String city;

    private String logoUrl;

    @DecimalMin(value = "-90.0", message = "{validation.latitude_invalid}")
    @DecimalMax (value = "90.0", message = "{validation.latitude_invalid}")
    private BigDecimal latitude;

    @DecimalMin(value = "-180.0", message = "{validation.longitude_invalid}")
    @DecimalMax(value = "180.0", message = "{validation.longitude_invalid}")
    private BigDecimal longitude;
}
