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
public class AgencyStaffRes {

    private Long id;
    private Long agencyId;
    private Long muaId;
    private String muaCode;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private BigDecimal agreedCommissionRate;
    private Boolean isActive;
    private String status;
    private String note;
    private LocalDateTime joinedAt;
}
