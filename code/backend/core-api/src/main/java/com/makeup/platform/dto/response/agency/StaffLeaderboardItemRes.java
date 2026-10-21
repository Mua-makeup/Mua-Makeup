package com.makeup.platform.dto.response.agency;

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
public class StaffLeaderboardItemRes {

    private Integer rank;
    private Long staffId;
    private Long muaId;
    private String staffCode;
    private String fullName;
    private String phone;
    private String avatarUrl;
    private Double averageRating;
    private Integer totalReviews;
    private Integer fiveStarCount;
    private Double fiveStarRate;
    private Integer completedJobs;
    private String performanceBadge;
    private String badgeLabel;
    private LocalDateTime joinedAt;
}
