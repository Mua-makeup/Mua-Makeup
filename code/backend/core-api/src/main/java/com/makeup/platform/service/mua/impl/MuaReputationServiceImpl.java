package com.makeup.platform.service.mua.impl;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.MuaJobOfferEntity;
import com.makeup.platform.entity.mua.BadgeTier;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.MuaJobOfferRepository;
import com.makeup.platform.service.mua.MuaReputationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MuaReputationServiceImpl implements MuaReputationService {

    private final MuaJobOfferRepository muaJobOfferRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingRepository bookingRepository;

    @Override
    @Transactional
    public void recordOfferAndRecalculate(Long muaId, Long bookingId, String offerType, String responseStatus, String reason) {
        if (muaId == null || bookingId == null) {
            return;
        }

        MuaProfileEntity mua = muaProfileRepository.findById(muaId).orElse(null);
        BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
        if (mua == null || booking == null) {
            log.warn("[MuaReputation] Cannot record offer response, muaId={} or bookingId={} not found", muaId, bookingId);
            return;
        }

        MuaJobOfferEntity offer = muaJobOfferRepository.findFirstByMuaIdAndBookingIdOrderByIdDesc(muaId, bookingId)
                .orElse(null);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (offer != null) {
            offer.setResponseStatus(responseStatus);
            offer.setReason(reason);
            offer.setRespondedAt(now);
            muaJobOfferRepository.save(offer);
        } else {
            offer = MuaJobOfferEntity.builder()
                    .mua(mua)
                    .booking(booking)
                    .offerType(offerType != null ? offerType : "SCHEDULED")
                    .responseStatus(responseStatus)
                    .reason(reason)
                    .respondedAt(now)
                    .build();
            muaJobOfferRepository.save(offer);
        }

        recalculateAcceptanceRate(muaId);
    }

    @Override
    @Transactional
    public void recalculateAcceptanceRate(Long muaId) {
        if (muaId == null) {
            return;
        }
        MuaProfileEntity mua = muaProfileRepository.findById(muaId).orElse(null);
        if (mua == null) {
            return;
        }

        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(30);
        long totalOffers = muaJobOfferRepository.countTotalOffersInPeriod(muaId, since);
        long acceptedOffers = muaJobOfferRepository.countAcceptedOffersInPeriod(muaId, since);

        BigDecimal rate;
        if (totalOffers == 0) {
            rate = BigDecimal.valueOf(100.00).setScale(2, RoundingMode.HALF_UP);
        } else {
            double rateDouble = (acceptedOffers * 100.0) / totalOffers;
            rate = BigDecimal.valueOf(rateDouble).setScale(2, RoundingMode.HALF_UP);
        }
        mua.setAcceptanceRate(rate);

        long completedJobsCount = bookingRepository.countByMuaIdAndStatusIn(muaId, List.of(
                BookingStatus.COMPLETED,
                BookingStatus.PAID_OUT
        ));
        int completedJobs = (int) completedJobsCount;
        mua.setTotalCompletedJobs(completedJobs);

        double bayesianScore = mua.getBayesianRating() != null ? mua.getBayesianRating().doubleValue() : 4.60;

        // Gamification: Điều kiện GOLD_TOP_PRO cần sao >= 4.70, số ca >= 50 và tỷ lệ nhận >= 85%
        if (bayesianScore >= 4.70 && completedJobs >= 50 && rate.compareTo(BigDecimal.valueOf(85.0)) >= 0) {
            mua.setBadgeTier(BadgeTier.GOLD_TOP_PRO);
        } else if (bayesianScore >= 4.50 && completedJobs >= 20) {
            mua.setBadgeTier(BadgeTier.SILVER);
        } else {
            mua.setBadgeTier(BadgeTier.STANDARD);
        }

        // Tính lại điểm tìm kiếm (Rank Score) kết hợp điểm sao, kinh nghiệm, online và tỷ lệ nhận đơn
        double ratingComp = (bayesianScore / 5.0) * 100.0 * 0.25;
        double expComp = Math.min(100.0, (Math.log10(completedJobs + 1) / Math.log10(101.0)) * 100.0) * 0.45;
        double onlineComp = Boolean.TRUE.equals(mua.getIsOnline()) ? (100.0 * 0.30) : 0.0;
        double baseRankScore = ratingComp + expComp + onlineComp;

        double acceptanceFactor = rate.doubleValue() / 100.0;
        double finalRankScore = baseRankScore * (0.70 + 0.30 * acceptanceFactor);
        mua.setRankScore(BigDecimal.valueOf(finalRankScore).setScale(2, RoundingMode.HALF_UP));

        muaProfileRepository.save(mua);
        log.info("[MuaReputation] Updated MUA id={} stats: totalOffers={}, accepted={}, rate={}% -> badge={}, rankScore={}",
                muaId, totalOffers, acceptedOffers, rate, mua.getBadgeTier(), mua.getRankScore());
    }
}
