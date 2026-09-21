package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import com.makeup.platform.entity.mua.MuaCertificateItem;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgencyStaffDetailRes {

    private Long id;
    private Long agencyId;
    private String agencyName;
    private Long muaId;
    private String muaCode;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private String bio;
    private Integer experienceYears;
    private BigDecimal ratingAvg;
    private Boolean isOnline;
    private Boolean isBusy;
    private BigDecimal agreedCommissionRate;
    private Boolean isActive;
    private String status;
    private String note;
    private LocalDateTime joinedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<AssignedStyleRes> assignedStyles;
    private List<MuaCertificateItem> certificates;
    private List<String> portfolioImages;
    private Integer totalCompletedJobs;
    private Integer totalReviews;
}
