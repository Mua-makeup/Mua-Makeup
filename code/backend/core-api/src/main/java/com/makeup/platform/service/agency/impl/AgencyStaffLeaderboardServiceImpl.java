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
        Double agencyAvg = projections.stream().map(StaffLeaderboardProjection::getAgencyRating)
                .filter(java.util.Objects::nonNull).findFirst().map(BigDecimal::doubleValue).orElse(null);

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

            StaffLeaderboardItemRes item = StaffLeaderboardItemRes.builder()
                    .rank(null)
                    .primaryJobs(p.getPrimaryJobs())
                    .assistantJobs(p.getAssistantJobs())
                    .rankingScore(totalReviews > 0 ? p.getRatingAvg().doubleValue() : null)
                    .staffId(p.getStaffId())
                    .muaId(p.getMuaId())
                    .staffCode(p.getStaffCode())
                    .fullName(p.getFullName())
                    .phone(p.getPhone())
                    .avatarUrl(p.getAvatarUrl())
                    .averageRating(avgRating)
                    .totalReviews(totalReviews)
                    .fiveStarCount(fiveStarCount)
                    .fiveStarRate(totalReviews > 0 ? fiveStarRate : null)
                    .completedJobs(completedJobs)
                    .performanceBadge("INSUFFICIENT_DATA")
                    .badgeLabel("leaderboard_insufficient_data")
                    .joinedAt(p.getJoinedAt())
                    .build();

            items.add(item);
        }

        items.sort(java.util.Comparator
                .comparing((StaffLeaderboardItemRes i) -> i.getTotalReviews() >= 5).reversed()
                .thenComparing(StaffLeaderboardItemRes::getRankingScore,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder()))
                .thenComparing(StaffLeaderboardItemRes::getTotalReviews, java.util.Comparator.reverseOrder())
                .thenComparing(StaffLeaderboardItemRes::getStaffId));
        int rank = 0;
        int position = 0;
        Double previousScore = null;
        Integer previousCount = null;
        for (StaffLeaderboardItemRes item : items) {
            if (item.getTotalReviews() < 5) continue;
            position++;
            if (!java.util.Objects.equals(previousScore, item.getRankingScore())
                    || !java.util.Objects.equals(previousCount, item.getTotalReviews())) rank = position;
            item.setRank(rank);
            item.setPerformanceBadge(rank == 1 ? "CHAMPION" : rank == 2 ? "RUNNER_UP_1" : rank == 3 ? "RUNNER_UP_2" : "RANKED");
            item.setBadgeLabel(rank == 1 ? "leaderboard_quality_leader" : rank == 2 ? "leaderboard_rank_silver" : rank == 3 ? "leaderboard_rank_bronze" : "leaderboard_eligible");
            previousScore = item.getRankingScore();
            previousCount = item.getTotalReviews();
        }

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
