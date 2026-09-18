package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgencyProfileRes {

    private Long id;
    private Long ownerId;
    private String ownerName;
    private String ownerEmail;
    private String ownerPhone;
    private String agencyCode;
    private String agencyName;
    private String logoUrl;
    private String hotline;
    private String addressStreet;
    private String district;
    private String city;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal commissionRateInternal;
    private Boolean isVerified;
    private BigDecimal ratingAvg;
    private Boolean isSurgeEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
