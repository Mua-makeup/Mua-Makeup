package com.makeup.platform.service.interaction;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.scheduling.auto-review-enabled", havingValue = "true", matchIfMissing = false)
public class AutoReviewScheduler {

    private final AutoReviewService autoReviewService;

    /**
     * Quét định kỳ mỗi giờ để tự động ghi nhận đánh giá 5★ cho các ca làm việc
     * hoàn tất quá 72 giờ mà khách hàng không khiếu nại.
     */
    @Scheduled(cron = "${app.scheduling.auto-review-cron:0 */1 * * * *}")
    public void scanAndApplyAutoReviews() {
        log.info("[AutoReviewScheduler] Starting scheduled auto 5-star review scan...");
        try {
            int processedCount = autoReviewService.processAutoReviews();
            if (processedCount > 0) {
                log.info("[AutoReviewScheduler] Completed auto-review scan. Successfully processed {} booking(s)", processedCount);
            } else {
                log.debug("[AutoReviewScheduler] Completed auto-review scan. No eligible bookings found.");
            }
        } catch (Exception e) {
            log.error("[AutoReviewScheduler] Error occurred during scheduled auto-review scan", e);
        }
    }
}
