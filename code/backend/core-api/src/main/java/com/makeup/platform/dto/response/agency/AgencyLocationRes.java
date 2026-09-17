package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgencyLocationRes {

    private Long agencyId;
    private String agencyCode;
    private String agencyName;
    private String hotline;
    private String addressStreet;
    private String district;
    private String city;
    private String fullAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;
}
