package com.makeup.platform.dto.response.mua;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MuaProfileRes {

    private Long muaId;
    private String muaCode;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private Integer experienceYears;
    private BigDecimal maxServiceRadiusKm;
    private BigDecimal ratingAverage;
    private Integer totalReviews;
    private Integer totalCompletedJobs;
    private List<CertificateRes> certificates;
    private List<MuaStyleRes> styles;
    private LocalDateTime updatedAt;
}
