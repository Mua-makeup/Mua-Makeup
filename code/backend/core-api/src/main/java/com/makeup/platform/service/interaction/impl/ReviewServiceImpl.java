package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.interaction.ReviewSubmittedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.interaction.CreateReviewReq;
import com.makeup.platform.dto.response.interaction.MuaRatingSummaryRes;
import com.makeup.platform.dto.response.interaction.ReviewDetailRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.interaction.ReviewEntity;
import com.makeup.platform.entity.interaction.ReviewStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.interaction.ReviewMapper;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.interaction.ReviewRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.service.interaction.ReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final ReviewMapper reviewMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public ReviewDetailRes submitReview(Long customerUserId, CreateReviewReq req, String clientIp) {
        log.info("[Review] Customer id={} submitting review for booking id={}", customerUserId, req.getBookingId());

        // 1. Kiểm tra đơn hàng hợp lệ
        BookingEntity booking = bookingRepository.findById(req.getBookingId())
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "review.unauthorized", HttpStatus.FORBIDDEN);
        }

        if (booking.getStatus() != BookingStatus.COMPLETED && booking.getStatus() != BookingStatus.PAID_OUT) {
            log.warn("[Review] Booking id={} status is {}, not eligible for review", booking.getId(), booking.getStatus());
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "review.booking_not_completed", HttpStatus.BAD_REQUEST);
        }

        if (reviewRepository.existsByBookingId(booking.getId())) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "review.already_reviewed", HttpStatus.CONFLICT);
        }

        if (booking.getMua() == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                    "review.mua_not_found", HttpStatus.BAD_REQUEST);
        }

        MuaProfileEntity mua = booking.getMua();
        Long muaId = mua.getId();

        // 2. Thuật toán phát hiện gian lận và thông đồng (Review Fraud & Collusion Detection)
        int fraudScore = 0;
        StringBuilder fraudReason = new StringBuilder();

        // Tiêu chí 1: Trùng lặp thiết bị (Device ID)
        if (req.getDeviceId() != null && !req.getDeviceId().isBlank()) {
            long deviceReviewCount = reviewRepository.countReviewsByDeviceIdAndMua(req.getDeviceId().trim(), muaId);
            if (deviceReviewCount >= 2) {
                fraudScore += 50;
                fraudReason.append("Cùng mã thiết bị (Device ID) đã đánh giá thợ này ").append(deviceReviewCount).append(" lần; ");
            }
        }

        // Tiêu chí 2: Tần suất đánh giá chéo giữa cùng 1 khách và 1 thợ trong 30 ngày qua
        Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);
        long recentCrossReviews = reviewRepository.countReviewsBetweenCustomerAndMuaSince(customerUserId, muaId, thirtyDaysAgo);
        if (recentCrossReviews >= 3) {
            fraudScore += 30;
            fraudReason.append("Khách hàng đã đánh giá thợ này ").append(recentCrossReviews).append(" lần trong 30 ngày qua; ");
        }

        // Tiêu chí 3: Phân loại trạng thái kiểm duyệt
        ReviewStatus reviewStatus = ReviewStatus.APPROVED;
        if (fraudScore >= 50) {
            reviewStatus = ReviewStatus.FLAGGED_FRAUD;
            log.warn("[ReviewFraud] FLAGGED_FRAUD booking id={} customer id={} mua id={} score={}: {}",
                    booking.getId(), customerUserId, muaId, fraudScore, fraudReason);
        } else if (fraudScore >= 25) {
            reviewStatus = ReviewStatus.PENDING_AUDIT;
            log.warn("[ReviewFraud] PENDING_AUDIT booking id={} customer id={} mua id={} score={}: {}",
                    booking.getId(), customerUserId, muaId, fraudScore, fraudReason);
        }

        // 3. Khởi tạo và lưu ReviewEntity
        ReviewEntity review = ReviewEntity.builder()
                .booking(booking)
                .customer(booking.getCustomer())
                .mua(mua)
                .agency(booking.getAgency())
                .rating(req.getRating())
                .comment(req.getComment())
                .imageUrls(req.getImageUrls() != null ? new ArrayList<>(req.getImageUrls()) : new ArrayList<>())
                .deviceId(req.getDeviceId())
                .clientIp(clientIp)
                .bankHash(req.getBankHash())
                .status(reviewStatus)
                .fraudRiskScore(fraudScore)
                .fraudReason(fraudReason.length() > 0 ? fraudReason.toString() : null)
                .build();

        ReviewEntity saved = reviewRepository.save(review);

        // 4. Bắn Spring EventBus để cập nhật bất đồng bộ Bayesian Rating, Rolling Rating và Gamification
        if (reviewStatus == ReviewStatus.APPROVED) {
            eventPublisher.publishEvent(new ReviewSubmittedEvent(
                    this,
                    saved.getId(),
                    booking.getId(),
                    muaId,
                    customerUserId,
                    req.getRating()
            ));
        }

        return reviewMapper.toDetailRes(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewDetailRes getReviewByBookingId(Long bookingId) {
        return reviewRepository.findByBookingId(bookingId)
                .map(reviewMapper::toDetailRes)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewDetailRes> getReviewsForMua(Long muaId, int page, int size) {
        int pageNumber = Math.max(0, page);
        int pageSize = (size > 0 && size <= 50) ? size : 10;
        PageRequest pageRequest = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return reviewRepository.findByMuaIdAndStatusAndIsDeletedFalse(muaId, ReviewStatus.APPROVED, pageRequest)
                .map(reviewMapper::toDetailRes);
    }

    @Override
    @Transactional(readOnly = true)
    public MuaRatingSummaryRes getMuaRatingSummary(Long muaId) {
        MuaProfileEntity mua = muaProfileRepository.findById(muaId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "mua.not_found", HttpStatus.NOT_FOUND));

        return MuaRatingSummaryRes.builder()
                .muaId(mua.getId())
                .ratingAvg(mua.getRatingAvg())
                .bayesianRating(mua.getBayesianRating())
                .rollingRating(mua.getRollingRating())
                .totalReviews(mua.getTotalReviews())
                .totalCompletedJobs(mua.getTotalCompletedJobs())
                .acceptanceRate(mua.getAcceptanceRate())
                .rankScore(mua.getRankScore())
                .badgeTier(mua.getBadgeTier())
                .isEmergencyLocked(mua.getIsEmergencyLocked())
                .build();
    }
}
