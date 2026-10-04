package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.service.interaction.NotificationDeduplicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationDeduplicationServiceImpl implements NotificationDeduplicationService {

    private static final String DEDUP_KEY_PREFIX = "notif:event:dedup:";
    private static final Duration DEFAULT_TTL = Duration.ofHours(24);

    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public boolean tryAcquire(String eventId) {
        if (!StringUtils.hasText(eventId)) {
            return true;
        }

        try {
            String key = DEDUP_KEY_PREFIX + eventId.trim();
            Boolean success = stringRedisTemplate.opsForValue().setIfAbsent(key, "PROCESSED", DEFAULT_TTL);
            if (Boolean.TRUE.equals(success)) {
                return true;
            }
            log.warn("[NotificationDeduplication] Duplicate event detected for eventId={}. Dropping notification.", eventId);
            return false;
        } catch (Exception e) {
            log.error("[NotificationDeduplication] Redis error during deduplication check for eventId={}. Falling back to allow.", eventId, e);
            return true;
        }
    }
}
