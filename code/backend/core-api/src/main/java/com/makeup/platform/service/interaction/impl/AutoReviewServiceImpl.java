package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.common.event.interaction.ReviewSubmittedEvent;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.interaction.ReviewEntity;
import com.makeup.platform.entity.interaction.ReviewStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.repository.interaction.ReviewRepository;
import com.makeup.platform.service.interaction.AutoReviewService;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AutoReviewServiceImpl implements AutoReviewService {

    private static final int DEFAULT_AUTO_REVIEW_MINUTES = 2;
    private static final int BATCH_SIZE = 50;

    private final BookingRepository bookingRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final ReviewRepository reviewRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;

    @Value("${app.scheduling.auto-review-minutes:2}")
    private int autoReviewMinutes = DEFAULT_AUTO_REVIEW_MINUTES;

    @Autowired
    @Lazy
    private AutoReviewService self;

    public AutoReviewServiceImpl(
            BookingRepository bookingRepository,
            BookingStaffAssignmentRepository bookingStaffAssignmentRepository,
            ReviewRepository reviewRepository,
            ApplicationEventPublisher eventPublisher,
            NotificationService notificationService
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingStaffAssignmentRepository = bookingStaffAssignmentRepository;
        this.reviewRepository = reviewRepository;
        this.eventPublisher = eventPublisher;
        this.notificationService = notificationService;
    }

    @Override
    public int processAutoReviews() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(autoReviewMinutes);
        log.info("[AutoReview] Scanning completed bookings older than {} ({} minutes ago)", cutoffTime, autoReviewMinutes);

        List<BookingStatus> eligibleStatuses = List.of(BookingStatus.PAID_OUT);
        List<Long> eligibleBookingIds = bookingRepository.findEligibleBookingIdsForAutoReview(
                eligibleStatuses,
                cutoffTime,
                PageRequest.of(0, BATCH_SIZE)
        );

        if (eligibleBookingIds.isEmpty()) {
            log.debug("[AutoReview] No eligible bookings found for auto 5-star review");
            return 0;
        }

        log.info("[AutoReview] Found {} eligible booking(s) for auto-review", eligibleBookingIds.size());
        int successCount = 0;

        for (Long bookingId : eligibleBookingIds) {
            try {
                self.processSingleAutoReview(bookingId);
                successCount++;
            } catch (Exception e) {
                log.error("[AutoReview] Failed to auto-review booking ID: {}", bookingId, e);
            }
        }

        log.info("[AutoReview] Successfully processed {}/{} auto reviews", successCount, eligibleBookingIds.size());
        return successCount;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processSingleAutoReview(Long bookingId) {
        if (reviewRepository.existsByBookingId(bookingId)) {
            log.debug("[AutoReview] Booking ID: {} already has review, skipping", bookingId);
            return;
        }

        BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            log.warn("[AutoReview] Booking ID: {} not found", bookingId);
            return;
        }

        if (booking.getStatus() != BookingStatus.PAID_OUT) {
            log.warn("[AutoReview] Booking ID: {} status is {} (not PAID_OUT), skipping",
                    bookingId, booking.getStatus());
            return;
        }

        // 1. Xác định hồ sơ MUA: Hỗ trợ cả Freelancer MUA và Agency Staff
        MuaProfileEntity mua = booking.getMua();
        if (mua == null && booking.getAgency() != null) {
            // Trường hợp đơn thuộc Agency Studio: Lấy hồ sơ MUA của thợ nhân viên (Agency Staff) đã thực hiện ca
            List<BookingStaffAssignmentEntity> assignments = bookingStaffAssignmentRepository
                    .findByBookingIdAndStatus(bookingId, AssignmentStatus.ACTIVE);
            if (assignments.isEmpty()) {
                assignments = bookingStaffAssignmentRepository.findByBookingId(bookingId);
            }
            if (!assignments.isEmpty() && assignments.get(0).getStaff() != null) {
                mua = assignments.get(0).getStaff().getMua();
                if (mua != null) {
                    booking.setMua(mua);
                    bookingRepository.save(booking);
                    log.info("[AutoReview] Successfully resolved MUA ID: {} from Agency Staff for booking ID: {}",
                            mua.getId(), bookingId);
                }
            }
        }

        if (mua == null) {
            log.warn("[AutoReview] Booking ID: {} has no assigned Freelancer or Agency Staff MUA, skipping", bookingId);
            return;
        }

        // 2. Tạo bản ghi ReviewEntity tự động 5 sao
        ReviewEntity review = ReviewEntity.builder()
                .booking(booking)
                .customer(booking.getCustomer())
                .mua(mua)
                .agency(booking.getAgency())
                .rating(5)
                .comment("Đơn hàng hoàn tất đạt chuẩn (Hệ thống tự động ghi nhận 5★)")
                .imageUrls(new ArrayList<>())
                .deviceId("SYSTEM_AUTO_REVIEW")
                .clientIp("127.0.0.1")
                .status(ReviewStatus.APPROVED)
                .fraudRiskScore(0)
                .build();

        ReviewEntity saved = reviewRepository.save(review);
        log.info("[AutoReview] Created auto 5-star review ID: {} for booking ID: {}, MUA ID: {}, Agency ID: {}",
                saved.getId(), booking.getId(), mua.getId(),
                booking.getAgency() != null ? booking.getAgency().getId() : null);

        // 3. Bắn Spring EventBus để kích hoạt tính toán Bayesian Rating, Rolling Window, Gamification và Agency Dual-Aggregation
        Long agencyId = booking.getAgency() != null ? booking.getAgency().getId() : null;
        Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;

        eventPublisher.publishEvent(new ReviewSubmittedEvent(
                this,
                saved.getId(),
                booking.getId(),
                mua.getId(),
                customerId,
                5,
                agencyId
        ));

        // 4. Gửi thông báo in-app chúc mừng cho Thợ (Freelancer hoặc Agency Staff)
        if (mua.getUser() != null) {
            try {
                notificationService.createInAppNotification(
                        mua.getUser().getId(),
                        agencyId,
                        booking.getId(),
                        "AUTO_REVIEW_5_STAR",
                        "Đơn hàng được ghi nhận 5★ tự động",
                        "Khách hàng không khiếu nại sau khi hoàn tất. Hệ thống đã tự động ghi nhận đánh giá 5★ cho ca làm #"
                                + (booking.getBookingCode() != null ? booking.getBookingCode() : booking.getId()) + ".",
                        Map.of(
                                "rating", "5",
                                "bookingId", booking.getId().toString(),
                                "autoReviewed", "true"
                        )
                );
            } catch (Exception notifEx) {
                log.warn("[AutoReview] Failed to send in-app notification to MUA user ID: {}",
                        mua.getUser().getId(), notifEx);
            }
        }
    }
}
