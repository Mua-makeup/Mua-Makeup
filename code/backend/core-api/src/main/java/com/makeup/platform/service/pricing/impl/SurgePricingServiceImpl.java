package com.makeup.platform.service.pricing.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.PricingConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.pricing.ConfigureSurgeRuleReq;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.dto.response.pricing.SurgeRuleRes;
import com.makeup.platform.entity.pricing.SurgePricingRuleEntity;
import com.makeup.platform.mapper.pricing.SurgePricingRuleMapper;
import com.makeup.platform.repository.pricing.SurgePricingRuleRepository;
import com.makeup.platform.service.pricing.SurgeDemandTracker;
import com.makeup.platform.service.pricing.SurgePricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SurgePricingServiceImpl implements SurgePricingService {

    private static final String H3_SURGE_GLOBAL_KEY = "pricing:settings:h3_surge_enabled";

    private final SurgePricingRuleRepository surgePricingRuleRepository;
    private final SurgePricingRuleMapper surgePricingRuleMapper;
    private final SurgeDemandTracker surgeDemandTracker;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Transactional(readOnly = true)
    public InvoicePreviewRes.SurgePricingInfo calculateSurge(
            BigDecimal serviceSubtotal,
            LocalDateTime bookingTime,
            String zoneCode,
            BigDecimal customerLat,
            BigDecimal customerLng
    ) {
        BigDecimal subtotal = serviceSubtotal != null ? serviceSubtotal : BigDecimal.ZERO;
        if (bookingTime == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return InvoicePreviewRes.SurgePricingInfo.builder()
                    .isSurgeApplied(false)
                    .multiplier(PricingConstants.MIN_SURGE_MULTIPLIER)
                    .surgeReason("Không áp dụng tăng giá cao điểm")
                    .surgeAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .demandCount(0)
                    .supplyCount(0)
                    .demandRatio(BigDecimal.ONE)
                    .surgeType("NORMAL")
                    .build();
        }

        LocalTime time = bookingTime.toLocalTime();
        String dayOfWeek = bookingTime.getDayOfWeek().name();
        String targetZone = (zoneCode != null && !zoneCode.isBlank()) ? zoneCode.trim() : "ALL";

        // 1. Đánh giá hệ số từ Quy tắc Khung giờ cố định (Schedule Rule)
        List<SurgePricingRuleEntity> matchingRules = surgePricingRuleRepository.findMatchingRules(time, dayOfWeek, targetZone);
        BigDecimal scheduleMultiplier = PricingConstants.MIN_SURGE_MULTIPLIER;
        String scheduleReason = "Khung giờ bình thường";

        if (!matchingRules.isEmpty()) {
            SurgePricingRuleEntity activeRule = matchingRules.get(0);
            scheduleMultiplier = activeRule.getSurgeMultiplier();
            scheduleReason = activeRule.getRuleName();
        }

        // 2. Đánh giá hệ số từ Cung / Cầu Thời gian thực (Uber H3 Spatial Binning)
        BigDecimal realtimeMultiplier = PricingConstants.MIN_SURGE_MULTIPLIER;
        SurgeDemandTracker.RealtimeSurgeResult realtimeResult = null;
        if (isH3SurgeGloballyEnabled()) {
            realtimeResult = surgeDemandTracker.evaluateRealtimeSurge(customerLat, customerLng);
            realtimeMultiplier = realtimeResult.multiplier();
        }

        // 3. Kết hợp hệ số: Lấy giá trị lớn nhất max(schedule, realtime)
        BigDecimal finalMultiplier;
        String finalReason;
        String finalSurgeType;

        if (realtimeResult != null && realtimeMultiplier.compareTo(scheduleMultiplier) > 0) {
            finalMultiplier = realtimeMultiplier;
            finalReason = realtimeResult.surgeReason();
            finalSurgeType = realtimeResult.surgeType();
        } else if (scheduleMultiplier.compareTo(PricingConstants.MIN_SURGE_MULTIPLIER) > 0) {
            finalMultiplier = scheduleMultiplier;
            finalReason = scheduleReason;
            finalSurgeType = "SCHEDULE_PEAK_HOUR";
        } else {
            finalMultiplier = PricingConstants.MIN_SURGE_MULTIPLIER;
            finalReason = "Khung giờ bình thường";
            finalSurgeType = "NORMAL";
        }

        // 4. Ràng buộc trần tối đa bảo vệ khách hàng [1.00x - 1.50x]
        if (finalMultiplier.compareTo(PricingConstants.MAX_SURGE_MULTIPLIER) > 0) {
            finalMultiplier = PricingConstants.MAX_SURGE_MULTIPLIER;
        } else if (finalMultiplier.compareTo(PricingConstants.MIN_SURGE_MULTIPLIER) < 0) {
            finalMultiplier = PricingConstants.MIN_SURGE_MULTIPLIER;
        }

        boolean isSurgeApplied = finalMultiplier.compareTo(PricingConstants.MIN_SURGE_MULTIPLIER) > 0;
        BigDecimal surgeMultiplierOffset = finalMultiplier.subtract(BigDecimal.ONE);
        BigDecimal surgeAmount = subtotal.multiply(surgeMultiplierOffset).setScale(2, RoundingMode.HALF_UP);

        return InvoicePreviewRes.SurgePricingInfo.builder()
                .isSurgeApplied(isSurgeApplied)
                .multiplier(finalMultiplier)
                .surgeReason(finalReason)
                .surgeAmount(surgeAmount)
                .demandCount(realtimeResult != null ? realtimeResult.demandCount() : 0)
                .supplyCount(realtimeResult != null ? realtimeResult.supplyCount() : 0)
                .demandRatio(realtimeResult != null ? realtimeResult.demandRatio() : BigDecimal.ONE)
                .surgeType(finalSurgeType)
                .build();
    }

    @Override
    @CacheEvict(value = {"surge_pricing_rules", "surge_rule_list"}, allEntries = true)
    public SurgeRuleRes createRule(ConfigureSurgeRuleReq req) {
        if (req.getSurgeMultiplier().compareTo(PricingConstants.MIN_SURGE_MULTIPLIER) < 0
                || req.getSurgeMultiplier().compareTo(PricingConstants.MAX_SURGE_MULTIPLIER) > 0) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_SURGE_RULE_INVALID,
                    "ERR_SURGE_RULE_INVALID",
                    HttpStatus.BAD_REQUEST
            );
        }

        SurgePricingRuleEntity entity = surgePricingRuleMapper.toEntity(req);
        SurgePricingRuleEntity saved = surgePricingRuleRepository.save(entity);
        return surgePricingRuleMapper.toRes(saved);
    }

    @Override
    @CacheEvict(value = {"surge_pricing_rules", "surge_rule_list"}, allEntries = true)
    public SurgeRuleRes updateRule(Long id, ConfigureSurgeRuleReq req) {
        SurgePricingRuleEntity rule = surgePricingRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_SURGE_RULE_INVALID,
                        "ERR_SURGE_RULE_INVALID",
                        id
                ));

        if (req.getSurgeMultiplier().compareTo(PricingConstants.MIN_SURGE_MULTIPLIER) < 0
                || req.getSurgeMultiplier().compareTo(PricingConstants.MAX_SURGE_MULTIPLIER) > 0) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_SURGE_RULE_INVALID,
                    "ERR_SURGE_RULE_INVALID",
                    HttpStatus.BAD_REQUEST
            );
        }

        rule.setRuleName(req.getRuleName().trim());
        rule.setZoneCode(req.getZoneCode() != null ? req.getZoneCode().trim() : "ALL");
        rule.setStartTime(req.getStartTime());
        rule.setEndTime(req.getEndTime());
        rule.setApplicableDaysOfWeek(req.getApplicableDaysOfWeek());
        rule.setSurgeMultiplier(req.getSurgeMultiplier());
        rule.setMinDemandRatio(req.getMinDemandRatio());
        if (req.getIsActive() != null) {
            rule.setIsActive(req.getIsActive());
        }

        SurgePricingRuleEntity saved = surgePricingRuleRepository.save(rule);
        return surgePricingRuleMapper.toRes(saved);
    }

    @Override
    @CacheEvict(value = {"surge_pricing_rules", "surge_rule_list"}, allEntries = true)
    public void deleteRule(Long id) {
        SurgePricingRuleEntity rule = surgePricingRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_SURGE_RULE_INVALID,
                        "ERR_SURGE_RULE_INVALID",
                        id
                ));
        surgePricingRuleRepository.delete(rule);
    }

    @Override
    @Cacheable(value = "surge_rule_list")
    @Transactional(readOnly = true)
    public List<SurgeRuleRes> listRules() {
        return surgePricingRuleMapper.toResList(surgePricingRuleRepository.findAll());
    }

    @Override
    public boolean isH3SurgeGloballyEnabled() {
        try {
            String val = redisTemplate.opsForValue().get(H3_SURGE_GLOBAL_KEY);
            if (val == null) {
                return true; // default enabled
            }
            return Boolean.parseBoolean(val);
        } catch (Exception ex) {
            log.warn("Failed to check H3 surge global status from Redis, fallback to true: {}", ex.getMessage());
            return true;
        }
    }

    @Override
    public boolean toggleH3Surge(boolean enabled) {
        try {
            redisTemplate.opsForValue().set(H3_SURGE_GLOBAL_KEY, String.valueOf(enabled));
            log.info("Global H3 Surge pricing mechanism toggled: enabled={}", enabled);
            return enabled;
        } catch (Exception ex) {
            log.error("Failed to update H3 surge global status in Redis: {}", ex.getMessage());
            return enabled;
        }
    }
}
