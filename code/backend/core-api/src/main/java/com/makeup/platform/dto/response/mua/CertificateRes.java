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
    private String imageUrl;
    private Boolean isVerified;
    private String status;
    private String notes;
    private LocalDateTime uploadedAt;
}
