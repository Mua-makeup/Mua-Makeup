package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.interaction.ReviewSubmittedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.interaction.CreateReviewReq;
import com.makeup.platform.dto.request.interaction.UpdateReviewReq;
import com.makeup.platform.dto.response.interaction.CategoryReviewCountRes;
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
import com.makeup.platform.service.media.MediaStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final ReviewMapper reviewMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final MediaStorageService mediaStorageService;

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

        if (booking.getStatus() != BookingStatus.PAID_OUT && booking.getStatus() != BookingStatus.COMPLETED) {
            log.warn("[Review] Booking id={} status is {}, not eligible for review (must be COMPLETED or PAID_OUT)", booking.getId(), booking.getStatus());
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "review.booking_not_paid_out", HttpStatus.BAD_REQUEST);
        }

        if (reviewRepository.existsByBookingId(booking.getId())) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "review.already_reviewed", HttpStatus.CONFLICT);
        }

        // Kiểm tra thời hạn đánh giá trong vòng 7 ngày kể từ khi hoàn tất/quyết toán đơn
        LocalDateTime completionTime = booking.getUpdatedAt() != null
                ? booking.getUpdatedAt()
                : (booking.getBookingDate() != null && booking.getStartTime() != null
                    ? booking.getBookingDate().atTime(booking.getStartTime())
                    : booking.getCreatedAt());

        if (completionTime != null && completionTime.isBefore(LocalDateTime.now().minusDays(7))) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "review.create_expired", HttpStatus.BAD_REQUEST);
        }

        if (booking.getMua() == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                    "review.mua_not_found", HttpStatus.BAD_REQUEST);
        }

        MuaProfileEntity mua = booking.getMua();
        Long muaId = mua.getId();

        // Verified completed bookings are published automatically, including repeat customers.
        ReviewStatus reviewStatus = ReviewStatus.APPROVED;

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
                .fraudRiskScore(0)
                .fraudReason(null)
                .build();

        ReviewEntity saved = reviewRepository.save(review);

        // 4. Bắn Spring EventBus để cập nhật bất đồng bộ Bayesian Rating, Rolling Rating, Gamification và Tích lũy kép Agency
        if (reviewStatus == ReviewStatus.APPROVED) {
            Long agencyId = booking.getAgency() != null ? booking.getAgency().getId() : null;
            eventPublisher.publishEvent(new ReviewSubmittedEvent(
                    this,
                    saved.getId(),
                    booking.getId(),
                    muaId,
                    customerUserId,
                    req.getRating(),
                    agencyId
            ));
        }

        return reviewMapper.toDetailRes(saved);
    }

    @Override
    @Transactional
    public ReviewDetailRes updateReview(Long customerUserId, Long reviewId, UpdateReviewReq req) {
        log.info("[Review] Customer id={} updating review id={}", customerUserId, reviewId);

        ReviewEntity review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_REVIEW_NOT_FOUND,
                        "review.not_found", HttpStatus.NOT_FOUND));

        if (review.getCustomer() == null || !review.getCustomer().getId().equals(customerUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "review.unauthorized", HttpStatus.FORBIDDEN);
        }

        // Chỉ cho phép chỉnh sửa đánh giá trong vòng 48 giờ (2 ngày) kể từ khi tạo
        LocalDateTime fortyEightHoursAgo = LocalDateTime.now().minusHours(48);
        if (review.getCreatedAt() != null && review.getCreatedAt().isBefore(fortyEightHoursAgo)) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "review.edit_expired", HttpStatus.BAD_REQUEST);
        }

        // Editing must not restore deleted reviews or bypass booking eligibility.
        if (Boolean.TRUE.equals(review.getIsDeleted()) || review.getBooking() == null
                || (review.getBooking().getStatus() != BookingStatus.COMPLETED
                    && review.getBooking().getStatus() != BookingStatus.PAID_OUT)) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "review.booking_not_paid_out", HttpStatus.BAD_REQUEST);
        }
        review.setStatus(ReviewStatus.APPROVED);
        review.setFraudRiskScore(0);
        review.setFraudReason(null);
        review.setRating(req.getRating());
        review.setComment(req.getComment());
        if (req.getImageUrls() != null) {
            review.setImageUrls(new ArrayList<>(req.getImageUrls()));
        }

        ReviewEntity updated = reviewRepository.save(review);

        // Bắn lại Spring EventBus để cập nhật lại Rolling Window và Bayesian Score
        if (updated.getStatus() == ReviewStatus.APPROVED) {
            Long agencyId = updated.getAgency() != null ? updated.getAgency().getId() : null;
            Long muaId = updated.getMua() != null ? updated.getMua().getId() : null;
            Long bookingId = updated.getBooking() != null ? updated.getBooking().getId() : null;

            if (muaId != null) {
                eventPublisher.publishEvent(new ReviewSubmittedEvent(
                        this,
                        updated.getId(),
                        bookingId,
                        muaId,
                        customerUserId,
                        req.getRating(),
                        agencyId
                ));
            }
        }

        return reviewMapper.toDetailRes(updated);
    }

    @Override
    public List<String> uploadReviewImages(Long customerUserId, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return List.of();
        }
        List<String> uploadedUrls = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                var uploadRes = mediaStorageService.uploadImage(file, "reviews/" + customerUserId);
                if (uploadRes != null && uploadRes.getImageUrl() != null) {
                    uploadedUrls.add(uploadRes.getImageUrl());
                }
            }
        }
        return uploadedUrls;
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
    public Page<ReviewDetailRes> getReviewsForMua(Long muaId, Integer rating, Boolean hasImages, Integer categoryId, int page, int size) {
        int pageNumber = Math.max(0, page);
        int pageSize = (size > 0 && size <= 50) ? size : 10;
        PageRequest pageRequest = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "created_at"));
        return reviewRepository.findByMuaIdWithFilters(muaId, rating, hasImages, categoryId, pageRequest)
                .map(reviewMapper::toDetailRes);
    }

    @Override
    @Transactional(readOnly = true)
    public MuaRatingSummaryRes getMuaRatingSummary(Long muaId) {
        MuaProfileEntity mua = muaProfileRepository.findById(muaId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "mua.not_found", HttpStatus.NOT_FOUND));

        BigDecimal effectiveRating = (mua.getTotalReviews() != null && mua.getTotalReviews() > 0) ? mua.getRatingAvg() : null;

        // Thống kê phân bố đánh giá cho các chip lọc Shopee
        long countWithImages = reviewRepository.countReviewsWithImagesByMuaId(muaId);
        List<Object[]> ratingCounts = reviewRepository.countRatingsGroupedByMuaId(muaId);

        long c5 = 0, c4 = 0, c3 = 0, c2 = 0, c1 = 0;
        if (ratingCounts != null) {
            for (Object[] row : ratingCounts) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    int r = ((Number) row[0]).intValue();
                    long count = ((Number) row[1]).longValue();
                    switch (r) {
                        case 5 -> c5 = count;
                        case 4 -> c4 = count;
                        case 3 -> c3 = count;
                        case 2 -> c2 = count;
                        case 1 -> c1 = count;
                    }
                }
            }
        }

        // Thống kê phân loại danh mục dịch vụ theo chuẩn Shopee
        List<Object[]> categoryCounts = reviewRepository.countCategoriesGroupedByMuaId(muaId);
        List<CategoryReviewCountRes> categoryBreakdown = new ArrayList<>();
        if (categoryCounts != null) {
            for (Object[] row : categoryCounts) {
                if (row != null && row.length >= 3 && row[0] != null && row[1] != null && row[2] != null) {
                    categoryBreakdown.add(CategoryReviewCountRes.builder()
                            .categoryId(((Number) row[0]).intValue())
                            .categoryName((String) row[1])
                            .count(((Number) row[2]).longValue())
                            .build());
                }
            }
        }

        return MuaRatingSummaryRes.builder()
                .muaId(mua.getId())
                .ratingAvg(effectiveRating)
                .bayesianRating(mua.getBayesianRating())
                .rollingRating(mua.getRollingRating())
                .totalReviews(mua.getTotalReviews())
                .totalCompletedJobs(mua.getTotalCompletedJobs())
                .acceptanceRate(mua.getAcceptanceRate())
                .rankScore(mua.getRankScore())
                .badgeTier(mua.getBadgeTier())
                .isEmergencyLocked(mua.getIsEmergencyLocked())
                .countWithImages(countWithImages)
                .count5Star(c5)
                .count4Star(c4)
                .count3Star(c3)
                .count2Star(c2)
                .count1Star(c1)
                .categoryBreakdown(categoryBreakdown)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewDetailRes> getReviewsForAgency(Long agencyId, int page, int size) {
        int pageNumber = Math.max(0, page);
        int pageSize = (size > 0 && size <= 50) ? size : 10;
        PageRequest pageRequest = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return reviewRepository.findByAgencyIdAndStatusAndIsDeletedFalse(agencyId, ReviewStatus.APPROVED, pageRequest)
                .map(reviewMapper::toDetailRes);
    }
}
