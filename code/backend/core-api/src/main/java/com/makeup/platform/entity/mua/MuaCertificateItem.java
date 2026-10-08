package com.makeup.platform.entity.mua;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class MuaCertificateItem implements Serializable {

    private String certName;
    private String imageUrl;
    private String publicId;
    
    @Builder.Default
    private Boolean isVerified = false;
    
    @Builder.Default
    private String status = "PENDING";
    
    private String notes;
    
    private LocalDateTime uploadedAt;

    @Builder.Default
    private String scope = "PLATFORM"; // PLATFORM | AGENCY

    private String verifierType; // SUPER_ADMIN | AGENCY_ADMIN

    private String verifierName;

    private Long agencyId;

    private String agencyName;

    private LocalDateTime verifiedAt;

    private String rejectionReason;
}
