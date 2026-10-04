package com.makeup.platform.dto.response.maps;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeocodeRes {

    private String formattedAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String placeId;
    private String district;
    private String city;
    private String provider;
}
