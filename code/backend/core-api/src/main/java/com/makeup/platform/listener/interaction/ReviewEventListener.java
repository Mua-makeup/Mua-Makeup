package com.makeup.platform.listener.interaction;

import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.event.interaction.ReviewSubmittedEvent;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.interaction.ReviewStatus;
import com.makeup.platform.entity.mua.BadgeTier;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
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
    private final AgencyProfileRepository agencyProfileRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    private static final double MIN_CONFIDENCE_REVIEWS = 10.0; // m = 10 đánh giá cho MUA cá nhân
    private static final double MIN_CONFIDENCE_AGENCY_REVIEWS = 15.0; // m = 15 đánh giá cho Studio


    // Aggregate inside the publishing transaction: reads see the saved review and
    // the response is not returned before profile statistics have been refreshed.
    @EventListener
    @Transactional(propagation = Propagation.REQUIRED)
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
        // Khi không có auto-review, số lượt review ít hơn: điều chỉnh ngưỡng an toàn 4.40★ (tránh phạt oan thợ có nhiều ca hoàn thành)
        double minQualityThreshold = (totalReviews >= 20) ? 4.30 : 4.40;
        if (bayesianScore < minQualityThreshold && totalReviews >= 10) {
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
                            "Điểm đánh giá của bạn hiện ở mức " + bdBayesian + "★ (dưới " + minQualityThreshold + "★). Quyền nhận ca khẩn cấp 30 phút đã tạm thời bị khóa. Vui lòng nâng cao chất lượng dịch vụ ở các ca tiếp theo.",
                            Map.of("bayesianRating", bdBayesian.toString(), "action", "QUALITY_WARNING")
                    );
                }
            }
        } else if (bayesianScore >= minQualityThreshold && Boolean.TRUE.equals(mua.getIsEmergencyLocked())) {
            // Mở khóa nếu điểm đã cải thiện
            mua.setIsEmergencyLocked(false);
            log.info("[SafetyThreshold] Unlocked instant booking for MUA id={} as Bayesian rating improved to {}",
                    muaId, bdBayesian);
        }

        // 5 & 6. Tính toán Gamification Huy hiệu, Phí hoa hồng và RankScore tổng hợp
        recalculateMuaRankAndBadge(mua);

        log.info("[ReviewEvent] Updated MUA id={} stats: ratingAvg={}, bayesianRating={}, totalReviews={}, badge={}, commission={}",
                muaId, bdRolling, bdBayesian, totalReviews, mua.getBadgeTier(), mua.getCommissionRate());

        // 7. Cơ chế Tích Lũy Kép & Điểm Chuẩn Bayes cho Studio / Agency (Dual-Aggregation & Bayesian Rating)
        Long agencyId = event.getAgencyId();
        if (agencyId != null) {
            AgencyProfileEntity agency = agencyProfileRepository.findById(agencyId).orElse(null);
            if (agency != null) {
                long agencyTotalReviews = reviewRepository.countByAgencyIdAndStatusAndIsDeletedFalse(agencyId, ReviewStatus.APPROVED);
                Double agencyAvg = reviewRepository.getAgencyAverageRating(agencyId);

                if (agencyTotalReviews > 0 && agencyAvg != null) {
                    BigDecimal bdAgencyRating = BigDecimal.valueOf(agencyAvg).setScale(2, RoundingMode.HALF_UP);

                    // Điểm chuẩn sàn Studio
                    Double agencyBenchmark = reviewRepository.getAgencySystemOverallAverageRating();
                    double cAgency = (agencyBenchmark != null && agencyBenchmark > 0) ? agencyBenchmark : 4.65;

                    // Điểm chuẩn Bayes Studio: WR = (v / (v + m)) * R + (m / (v + m)) * C
                    double vAgency = (double) agencyTotalReviews;
                    double mAgency = MIN_CONFIDENCE_AGENCY_REVIEWS;
                    double bayesianScoreAgency = (vAgency / (vAgency + mAgency)) * agencyAvg + (mAgency / (vAgency + mAgency)) * cAgency;
                    BigDecimal bdBayesianAgency = BigDecimal.valueOf(bayesianScoreAgency).setScale(2, RoundingMode.HALF_UP);

                    agency.setRatingAvg(bdAgencyRating);
                    agency.setBayesianRating(bdBayesianAgency);
                    agency.setTotalReviews((int) agencyTotalReviews);
                } else {
                    agency.setRatingAvg(null);
                    agency.setBayesianRating(null);
                    agency.setTotalReviews(0);
                }

                agencyProfileRepository.save(agency);
                log.info("[ReviewEvent] Dual-Aggregation: Updated Agency id={} ratingAvg={}, bayesianRating={}, totalReviews={}",
                        agencyId, agency.getRatingAvg(), agency.getBayesianRating(), agency.getTotalReviews());

                // Gửi thông báo In-app cho Studio về đánh giá mới
                if (agency.getOwner() != null) {
                    String ratingDisplay = agency.getRatingAvg() != null ? agency.getRatingAvg().toString() : "--";
                    notificationService.createInAppNotification(
                            agency.getOwner().getId(),
                            agencyId,
                            event.getBookingId(),
                            "NEW_REVIEW_RECEIVED",
                            "Đánh Giá Mới Cho Ca Làm Studio",
                            "Khách hàng vừa đánh giá " + event.getRating() + "★ cho ca làm của Studio. Điểm uy tín trung bình hiện tại của Studio là "
                                    + ratingDisplay + "★ (" + agency.getTotalReviews() + " lượt đánh giá).",
                            Map.of(
                                    "rating", event.getRating().toString(),
                                    "agencyRating", ratingDisplay,
                                    "totalReviews", agency.getTotalReviews().toString(),
                                    "bookingId", event.getBookingId() != null ? event.getBookingId().toString() : "",
                                    "muaId", muaId.toString()
                            )
                    );
                }
            }
        }

        // 8. Cơ Chế Phân Tầng Trách Nhiệm Thợ Chính & Trợ Lý (Primary vs Assistant MUA)
        if (event.getBookingId() != null) {
            try {
                List<BookingStaffAssignmentEntity> assignments = bookingStaffAssignmentRepository.findByBookingId(event.getBookingId());
                for (BookingStaffAssignmentEntity assignment : assignments) {
                    if (assignment.getAssignmentRole() == AssignmentRole.ASSISTANT_MUA && assignment.getStaff() != null) {
                        MuaProfileEntity assistantMua = assignment.getStaff().getMua();
                        if (assistantMua != null && !assistantMua.getId().equals(muaId)) {
                            // 1. Trợ lý luôn được cộng +1 ca hoàn thành để tích lũy kinh nghiệm
                            int curCompleted = assistantMua.getTotalCompletedJobs() != null ? assistantMua.getTotalCompletedJobs() : 0;
                            assistantMua.setTotalCompletedJobs(curCompleted + 1);

                            // 2. Cơ chế bảo vệ thợ phụ: Review tích cực (>= 4★) mang lại tín nhiệm; Review <= 3★ không phạt điểm tay nghề cá nhân của thợ phụ
                            if (event.getRating() != null && event.getRating() >= 4) {
                                log.info("[ReviewEvent] Assistant MUA id={} credited +1 completed job and positive rating for booking id={}",
                                        assistantMua.getId(), event.getBookingId());
                            } else {
                                log.info("[ReviewEvent] Assistant MUA id={} protected from <=3 star penalty for booking id={}",
                                        assistantMua.getId(), event.getBookingId());
                            }
                            recalculateMuaRankAndBadge(assistantMua);
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("[ReviewEvent] Could not process assistant assignments for bookingId={}", event.getBookingId(), ex);
            }
        }
    }

    /**
     * Tự động cập nhật số ca hoàn thành và tính lại Rank Score ngay khi ca chuyển sang COMPLETED / PAID_OUT,
     * đảm bảo thợ cày cuốc nhiều ca luôn được tăng điểm uy tín ngay cả khi khách hàng không để lại đánh giá.
     */
    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleBookingCompleted(BookingStateChangedEvent event) {
        if (event.getToStatus() != BookingStatus.COMPLETED && event.getToStatus() != BookingStatus.PAID_OUT) {
            return;
        }

        Long bookingId = event.getBookingId();
        if (bookingId == null) return;
        log.info("[ReviewEvent] Handling booking completion event for bookingId={}, status={}", bookingId, event.getToStatus());

        BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) return;

        // 1. Cập nhật thợ chính
        MuaProfileEntity primaryMua = booking.getMua();
        if (primaryMua != null) {
            recalculateMuaRankAndBadge(primaryMua);
        }

        // 2. Cập nhật nhân viên / trợ lý nếu có phân công
        try {
            List<BookingStaffAssignmentEntity> assignments = bookingStaffAssignmentRepository.findByBookingId(bookingId);
            for (BookingStaffAssignmentEntity assignment : assignments) {
                if (assignment.getStaff() != null && assignment.getStaff().getMua() != null) {
                    MuaProfileEntity staffMua = assignment.getStaff().getMua();
                    if (primaryMua == null || !staffMua.getId().equals(primaryMua.getId())) {
                        recalculateMuaRankAndBadge(staffMua);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("[ReviewEvent] Could not update staff completion stats for bookingId={}: {}", bookingId, ex.getMessage());
        }
    }

    /**
     * Động cơ tính toán Rank Score & Gamification:
     * - Trọng số Ca Hoàn Thành: 45% (Tăng từ 20% -> Thưởng xứng đáng cho thợ có nhiều kinh nghiệm thực tế)
     * - Trọng số Điểm Sao (Bayesian Rating): 25% (Giảm từ 40% -> Tránh việc 1 đánh giá xấu làm sụp đổ toàn bộ điểm số)
     * - Trọng số Sẵn Sàng / Trực Tuyến: 30%
     */
    public void recalculateMuaRankAndBadge(MuaProfileEntity mua) {
        if (mua == null) return;
        Long muaId = mua.getId();

        // 1. Đếm chính xác số ca đã hoàn thành từ CSDL
        long completedJobsCount = bookingRepository.countByMuaIdAndStatusIn(muaId, List.of(
                BookingStatus.COMPLETED,
                BookingStatus.PAID_OUT
        ));
        int completedJobs = (int) completedJobsCount;
        mua.setTotalCompletedJobs(completedJobs);

        // 2. Điểm sao chuẩn Bayes (mặc định 4.60 nếu chưa có review nào)
        double bayesianScore = mua.getBayesianRating() != null ? mua.getBayesianRating().doubleValue() : 4.60;
        BigDecimal acceptanceRate = mua.getAcceptanceRate() != null ? mua.getAcceptanceRate() : BigDecimal.valueOf(100.0);

        // 3. Cơ chế Gamification Huy hiệu (Badge Tier)
        // Điều chỉnh ngưỡng sao thực tế hơn khi không có auto-review (4.70★ thay vì 4.90★)
        if (bayesianScore >= 4.70 && completedJobs >= 50 && acceptanceRate.compareTo(BigDecimal.valueOf(85.0)) >= 0) {
            mua.setBadgeTier(BadgeTier.GOLD_TOP_PRO);
            log.info("[Gamification] MUA id={} awarded GOLD_TOP_PRO badge", muaId);
        } else if (bayesianScore >= 4.50 && completedJobs >= 20) {
            mua.setBadgeTier(BadgeTier.SILVER);
        } else {
            mua.setBadgeTier(BadgeTier.STANDARD);
        }

        // 4. Tính toán điểm Xếp hạng Tìm kiếm Explore (Search Ranking Score)
        // Rank Score = (0.25 * RatingScore) + (0.45 * ExperienceScore) + (0.30 * OnlineScore)
        double ratingComp = (bayesianScore / 5.0) * 100.0 * 0.25;
        double expComp = Math.min(100.0, (Math.log10(completedJobs + 1) / Math.log10(101.0)) * 100.0) * 0.45;
        double onlineComp = Boolean.TRUE.equals(mua.getIsOnline()) ? (100.0 * 0.30) : 0.0;
        double baseRankScore = ratingComp + expComp + onlineComp;
        double acceptanceFactor = acceptanceRate.doubleValue() / 100.0;
        double finalRankScore = baseRankScore * (0.70 + 0.30 * acceptanceFactor);
        mua.setRankScore(BigDecimal.valueOf(finalRankScore).setScale(2, RoundingMode.HALF_UP));

        muaProfileRepository.save(mua);
        log.info("[RankEngine] Recalculated MUA id={} stats: completedJobs={}, rankScore={}, badge={}",
                muaId, completedJobs, mua.getRankScore(), mua.getBadgeTier());
    }
}
