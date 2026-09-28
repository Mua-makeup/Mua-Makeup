package com.makeup.platform.service.customer;

import com.makeup.platform.common.constants.InstantBookingKeys;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.util.List;

/** Atomic candidate leases; only the owning booking may release a lease. */
@Slf4j
@Service
@RequiredArgsConstructor
public class InstantDispatchLeaseService {
    private static final Duration LEASE_TTL = Duration.ofSeconds(25);
    private static final DefaultRedisScript<Long> RELEASE = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class);
    private final StringRedisTemplate redis;

    public boolean tryClaim(Long bookingId, String muaId) {
        boolean acquired = Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(
                InstantBookingKeys.candidateLease(muaId), bookingId.toString(), LEASE_TTL));
        if (acquired && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        try {
                            release(bookingId, muaId);
                        } catch (RuntimeException ex) {
                            log.warn("Failed to release candidate lease after rollback; TTL will expire it", ex);
                        }
                    }
                }
            });
        }
        return acquired;
    }

    public void release(Long bookingId, String muaId) {
        redis.execute(RELEASE, List.of(InstantBookingKeys.candidateLease(muaId)), bookingId.toString());
    }
}
