package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.agency.StaffLeaderboardItemRes;
import com.makeup.platform.dto.response.agency.StaffLeaderboardRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.custom.projection.StaffLeaderboardProjection;
import com.makeup.platform.service.agency.AgencyStaffLeaderboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyStaffLeaderboardServiceImpl implements AgencyStaffLeaderboardService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;

    @Override
    @Transactional(readOnly = true)
    public StaffLeaderboardRes getStaffLeaderboard(Long currentUserId, String period) {
        Long agencyId = resolveAgencyId(currentUserId);

        LocalDateTime startDate = null;
        LocalDateTime endDate = null;
        String normalizedPeriod = period != null ? period.toUpperCase().trim() : "ALL_TIME";

        LocalDate today = LocalDate.now();
        if ("THIS_MONTH".equals(normalizedPeriod)) {
            startDate = today.withDayOfMonth(1).atStartOfDay();
            endDate = today.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusNanos(1);
        } else if ("LAST_MONTH".equals(normalizedPeriod)) {
            LocalDate lastMonth = today.minusMonths(1);
            startDate = lastMonth.withDayOfMonth(1).atStartOfDay();
            endDate = today.withDayOfMonth(1).atStartOfDay().minusNanos(1);
        } else {
            normalizedPeriod = "ALL_TIME";
        }

        List<StaffLeaderboardProjection> projections = agencyStaffRepository.findStaffLeaderboard(
                agencyId,
                startDate,
                endDate
        );

        List<StaffLeaderboardItemRes> items = new ArrayList<>();
        double totalRatingSum = 0.0;
        int ratingCount = 0;
        int currentRank = 1;

        for (StaffLeaderboardProjection p : projections) {
            int totalReviews = p.getTotalReviews() != null ? p.getTotalReviews() : 0;
            int fiveStarCount = p.getFiveStarCount() != null ? p.getFiveStarCount() : 0;
            int completedJobs = p.getTotalCompletedJobs() != null ? p.getTotalCompletedJobs() : 0;

            Double avgRating = (totalReviews > 0 && p.getRatingAvg() != null)
                    ? p.getRatingAvg().setScale(1, RoundingMode.HALF_UP).doubleValue()
                    : null;

            double fiveStarRate = totalReviews > 0
                    ? BigDecimal.valueOf((double) fiveStarCount / totalReviews * 100)
                    .setScale(1, RoundingMode.HALF_UP)
                    .doubleValue()
                    : 0.0;

            if (avgRating != null) {
                totalRatingSum += avgRating;
                ratingCount++;
            }

            String badge;
            String badgeLabel;

            if (completedJobs == 0 && totalReviews == 0) {
                badge = "NEW_ARTIST";
                badgeLabel = "leaderboard_badge_new";
            } else if (currentRank == 1) {
                badge = "CHAMPION";
                badgeLabel = "leaderboard_rank_gold";
            } else if (currentRank == 2) {
                badge = "RUNNER_UP_1";
                badgeLabel = "leaderboard_rank_silver";
            } else if (currentRank == 3) {
                badge = "RUNNER_UP_2";
                badgeLabel = "leaderboard_rank_bronze";
            } else if (totalReviews >= 3 && avgRating != null && avgRating >= 4.8) {
                badge = "SUPER_STAR";
                badgeLabel = "leaderboard_badge_super_star";
            } else if (totalReviews >= 3 && avgRating != null && avgRating >= 4.0) {
                badge = "RELIABLE";
                badgeLabel = "leaderboard_badge_reliable";
            } else if (totalReviews >= 3 && avgRating != null && avgRating < 4.0) {
                badge = "NEED_IMPROVEMENT";
                badgeLabel = "leaderboard_badge_need_improvement";
            } else {
                badge = "NEW_ARTIST";
                badgeLabel = "leaderboard_badge_new";
            }

            StaffLeaderboardItemRes item = StaffLeaderboardItemRes.builder()
                    .rank(currentRank++)
                    .staffId(p.getStaffId())
                    .muaId(p.getMuaId())
                    .staffCode(p.getStaffCode())
                    .fullName(p.getFullName())
                    .phone(p.getPhone())
                    .avatarUrl(p.getAvatarUrl())
                    .averageRating(avgRating)
                    .totalReviews(totalReviews)
                    .fiveStarCount(fiveStarCount)
                    .fiveStarRate(fiveStarRate)
                    .completedJobs(completedJobs)
                    .performanceBadge(badge)
                    .badgeLabel(badgeLabel)
                    .joinedAt(p.getJoinedAt())
                    .build();

            items.add(item);
        }

        Double agencyAvg = ratingCount > 0
                ? BigDecimal.valueOf(totalRatingSum / ratingCount).setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 5.0;

        return StaffLeaderboardRes.builder()
                .period(normalizedPeriod)
                .totalStaff(items.size())
                .agencyAverageRating(agencyAvg)
                .items(items)
                .build();
    }

    private Long resolveAgencyId(Long userId) {
        Optional<AgencyProfileEntity> agencyOpt = agencyProfileRepository.findByOwnerId(userId);
        if (agencyOpt.isPresent()) {
            return agencyOpt.get().getId();
        }

        Optional<AgencyStaffEntity> staffOpt = agencyStaffRepository.findActiveStaffByUserId(userId);
        if (staffOpt.isPresent() && staffOpt.get().getAgency() != null) {
            return staffOpt.get().getAgency().getId();
        }

        throw new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND, "agency.not_found");
    }
}
