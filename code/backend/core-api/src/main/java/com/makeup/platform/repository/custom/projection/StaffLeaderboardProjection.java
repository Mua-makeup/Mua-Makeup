package com.makeup.platform.repository.custom.projection;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface StaffLeaderboardProjection {
    Long getStaffId();
    Long getMuaId();
    String getStaffCode();
    String getFullName();
    String getPhone();
    String getAvatarUrl();
    BigDecimal getRatingAvg();
    Integer getTotalReviews();
    Integer getFiveStarCount();
    Integer getTotalCompletedJobs();
    LocalDateTime getJoinedAt();
}
