package com.makeup.platform.dto.response.mua;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificateRes {

    private String certName;
    private String certificateName;
    private String imageUrl;
    private String certificateImageUrl;
    private Boolean isVerified;
    private String status;
    private String notes;
    private LocalDateTime uploadedAt;
    private String scope;
    private String verifierType;
    private String verifierName;
    private Long agencyId;
    private String agencyName;
    private LocalDateTime verifiedAt;
    private String rejectionReason;
}
