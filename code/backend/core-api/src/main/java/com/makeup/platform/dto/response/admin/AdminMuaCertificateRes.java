package com.makeup.platform.dto.response.admin;

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
public class AdminMuaCertificateRes {

    private Long muaId;
    private Long userId;
    private String muaName;
    private String phoneNumber;
    private String email;
    private Integer experienceYears;
    private Integer certIndex;
    private String certName;
    private String imageUrl;
    private Boolean isVerified;
    private String status;
    private String notes;
    private LocalDateTime uploadedAt;
}
