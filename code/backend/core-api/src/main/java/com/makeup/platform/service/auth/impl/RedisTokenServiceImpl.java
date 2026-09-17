package com.makeup.platform.service.auth.impl;

import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.service.auth.RedisTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisTokenServiceImpl implements RedisTokenService {

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public void saveRefreshToken(String refreshToken, Long userId, long ttlDays) {
        String key = SecurityConstants.REDIS_PREFIX_REFRESH_TOKEN + refreshToken;
        redisTemplate.opsForValue().set(key, String.valueOf(userId), ttlDays, TimeUnit.DAYS);
        log.debug("Saved refresh token to Redis for userId: {}", userId);
    }

    @Override
    public Long getUserIdByRefreshToken(String refreshToken) {
        String key = SecurityConstants.REDIS_PREFIX_REFRESH_TOKEN + refreshToken;
        Object val = redisTemplate.opsForValue().get(key);
        if (val != null) {
            try {
                return Long.parseLong(val.toString());
            } catch (NumberFormatException e) {
                log.warn("Invalid userId stored in Redis for refresh token: {}", val);
            }
        }
        return null;
    }

    @Override
    public void deleteRefreshToken(String refreshToken) {
        String key = SecurityConstants.REDIS_PREFIX_REFRESH_TOKEN + refreshToken;
        redisTemplate.delete(key);
        log.debug("Deleted refresh token from Redis: {}", refreshToken);
    }

    @Override
    public void blacklistAccessToken(String accessToken, long remainingMs) {
        if (remainingMs <= 0) {
            return;
        }
        String key = SecurityConstants.REDIS_PREFIX_BLACKLIST + accessToken;
        redisTemplate.opsForValue().set(key, "revoked", remainingMs, TimeUnit.MILLISECONDS);
        log.debug("Blacklisted access token for {} ms", remainingMs);
    }

    @Override
    public boolean isTokenBlacklisted(String accessToken) {
        String key = SecurityConstants.REDIS_PREFIX_BLACKLIST + accessToken;
        Boolean exists = redisTemplate.hasKey(key);
        return Boolean.TRUE.equals(exists);
    }
}
