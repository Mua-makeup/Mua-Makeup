package com.makeup.platform.service.wallet;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Slf4j
@Component
public class PlatformFeeService {

    /** Primary Redis key where Admin persists the live platform fee rate. */
    public static final String REDIS_KEY = "settings:platform_fee_rate";

    /** Legacy key maintained in sync for backward compatibility. */
    public static final String LEGACY_FREELANCER_KEY = "settings:freelancer_commission_rate";

    @Value("${app.settlement.platform-fee-rate:${app.settlement.commission-rate:0.15}}")
    private BigDecimal defaultRate;

    private final StringRedisTemplate stringRedisTemplate;

    public PlatformFeeService(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }


    public BigDecimal getRate() {
        try {
            if (stringRedisTemplate != null) {
                String raw = stringRedisTemplate.opsForValue().get(REDIS_KEY);
                if (raw == null || raw.isBlank()) {
                    raw = stringRedisTemplate.opsForValue().get(LEGACY_FREELANCER_KEY);
                }
                if (raw != null && !raw.isBlank()) {
                    BigDecimal rate = new BigDecimal(raw.trim());
                    if (rate.compareTo(BigDecimal.ZERO) >= 0 && rate.compareTo(BigDecimal.ONE) <= 0) {
                        return rate;
                    }
                    log.warn("[PlatformFee] Redis value '{}' is out of [0,1] range; using default {}", raw, defaultRate);
                }
            }
        } catch (Exception e) {
            log.warn("[PlatformFee] Failed to read Redis fee rate: {}; using default {}", e.getMessage(), defaultRate);
        }
        return defaultRate != null ? defaultRate : new BigDecimal("0.15");
    }


    public void updateRate(BigDecimal rate) {
        if (rate == null || rate.compareTo(BigDecimal.ZERO) < 0 || rate.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("Platform fee rate must be between 0 and 1 (inclusive).");
        }
        if (stringRedisTemplate != null) {
            stringRedisTemplate.opsForValue().set(REDIS_KEY, rate.toPlainString());
            stringRedisTemplate.opsForValue().set(LEGACY_FREELANCER_KEY, rate.toPlainString());
        }
        log.info("[PlatformFee] Platform fee rate updated to {}", rate.toPlainString());
    }
}
