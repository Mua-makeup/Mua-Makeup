package com.makeup.platform.listener.interaction;

import com.makeup.platform.common.event.interaction.ReviewSubmittedEvent;
import com.makeup.platform.entity.mua.BadgeTier;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.interaction.ReviewStatus;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.interaction.ReviewRepository;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReviewEventListener {

    private final ReviewRepository reviewRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final NotificationService notificationService;

    private static final double MIN_CONFIDENCE_REVIEWS = 10.0; // m = 10 đánh giá

    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleReviewSubmitted(ReviewSubmittedEvent event) {
        Long muaId = event.getMuaId();
        log.info("[ReviewEvent] Handling ReviewSubmittedEvent for MUA id={}", muaId);

        MuaProfileEntity mua = muaProfileRepository.findById(muaId).orElse(null);
        if (mua == null) {
            log.warn("[ReviewEvent] MUA profile id={} not found", muaId);
            return;
        }

        // 1. Tính toán điểm trượt Rolling Window 100 đơn gần nhất
        List<Integer> recentRatings = reviewRepository.findTop100RatingsByMuaId(muaId);
        double rollingAvg = recentRatings.isEmpty() ? 5.0
                : recentRatings.stream().mapToInt(Integer::intValue).average().orElse(5.0);

        long totalReviews = reviewRepository.countByMuaIdAndStatusAndIsDeletedFalse(muaId, ReviewStatus.APPROVED);

        // 2. Điểm trung bình toàn sàn (System Benchmark C)
        Double systemBenchmark = reviewRepository.getSystemOverallAverageRating();
        double c = (systemBenchmark != null && systemBenchmark > 0) ? systemBenchmark : 4.60;

        // 3. Tính toán điểm chuẩn Bayes (Bayesian Average Rating: WR)
        // WR = (v / (v + m)) * R + (m / (v + m)) * C
        double v = (double) totalReviews;
        double m = MIN_CONFIDENCE_REVIEWS;
        double bayesianScore = (v / (v + m)) * rollingAvg + (m / (v + m)) * c;

        BigDecimal bdRolling = BigDecimal.valueOf(rollingAvg).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bdBayesian = BigDecimal.valueOf(bayesianScore).setScale(2, RoundingMode.HALF_UP);

        mua.setRatingAvg(bdRolling);
        mua.setRollingRating(bdRolling);
        mua.setBayesianRating(bdBayesian);
        mua.setTotalReviews((int) totalReviews);

        // 4. Cơ chế Đào thải & Cảnh cáo tự động (Deactivation Thresholds)
        if (bayesianScore < 4.60 && totalReviews >= 10) {
            if (!Boolean.TRUE.equals(mua.getIsEmergencyLocked())) {
                mua.setIsEmergencyLocked(true);
                log.warn("[SafetyThreshold] Locked instant booking for MUA id={} due to low Bayesian rating={}",
                        muaId, bdBayesian);

                // Gửi thông báo cảnh báo In-app cho thợ
                if (mua.getUser() != null) {
                    notificationService.createInAppNotification(
                            mua.getUser().getId(),
                            null,
                            null,
                            "WARNING_QUALITY_DROP",
                            "Cảnh Báo Chất Lượng Dịch Vụ",
                            "Điểm đánh giá của bạn hiện ở mức " + bdBayesian + "★ (dưới 4.60★). Quyền nhận ca khẩn cấp 30 phút đã tạm thời bị khóa. Vui lòng nâng cao chất lượng dịch vụ ở các ca tiếp theo.",
                            Map.of("bayesianRating", bdBayesian.toString(), "action", "QUALITY_WARNING")
                    );
                }
            }
        } else if (bayesianScore >= 4.60 && Boolean.TRUE.equals(mua.getIsEmergencyLocked())) {
            // Mở khóa nếu điểm đã cải thiện
            mua.setIsEmergencyLocked(false);
            log.info("[SafetyThreshold] Unlocked instant booking for MUA id={} as Bayesian rating improved to {}",
                    muaId, bdBayesian);
        }

        // 5. Cơ chế Gamification Huy hiệu & Phí hoa hồng ưu đãi
        int completedJobs = mua.getTotalCompletedJobs() != null ? mua.getTotalCompletedJobs() : 0;
        BigDecimal acceptanceRate = mua.getAcceptanceRate() != null ? mua.getAcceptanceRate() : BigDecimal.valueOf(100.0);

        if (bayesianScore >= 4.90 && completedJobs >= 50 && acceptanceRate.compareTo(BigDecimal.valueOf(85.0)) >= 0) {
            mua.setBadgeTier(BadgeTier.GOLD_TOP_PRO);
            mua.setCommissionRate(new BigDecimal("0.10")); // Giảm phí sàn còn 10%
            log.info("[Gamification] MUA id={} awarded GOLD_TOP_PRO badge (10% commission)", muaId);
        } else if (bayesianScore >= 4.75 && completedJobs >= 20) {
            mua.setBadgeTier(BadgeTier.SILVER);
            mua.setCommissionRate(new BigDecimal("0.15")); // Phí sàn 15%
        } else {
            mua.setBadgeTier(BadgeTier.STANDARD);
            mua.setCommissionRate(new BigDecimal("0.20")); // Phí sàn tiêu chuẩn 20%
        }

        // 6. Tính toán điểm Xếp hạng Tìm kiếm Explore (Search Ranking Score)
        // Rank Score = (0.4 * RatingScore) + (0.2 * ExperienceScore) + (0.1 * OnlineScore)
        double ratingComp = (bayesianScore / 5.0) * 100.0 * 0.40;
        double expComp = Math.min(100.0, (Math.log10(completedJobs + 1) / Math.log10(101.0)) * 100.0) * 0.20;
        double onlineComp = Boolean.TRUE.equals(mua.getIsOnline()) ? (100.0 * 0.10) : 0.0;
        // Phần khoảng cách GPS sẽ được cộng động ở lúc truy vấn Explore của khách hàng
        double baseRankScore = ratingComp + expComp + onlineComp;
        mua.setRankScore(BigDecimal.valueOf(baseRankScore).setScale(2, RoundingMode.HALF_UP));

        muaProfileRepository.save(mua);
        log.info("[ReviewEvent] Updated MUA id={} stats: ratingAvg={}, bayesianRating={}, totalReviews={}, badge={}, commission={}",
                muaId, bdRolling, bdBayesian, totalReviews, mua.getBadgeTier(), mua.getCommissionRate());
    }
}
