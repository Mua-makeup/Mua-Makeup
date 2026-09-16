package com.makeup.platform.service.telemetry;

import com.makeup.platform.common.constants.TelemetryConstants;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.service.customer.CustomerInstantBookingService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor 
public class RedisExpirationListener implements MessageListener {

    private final RedisMessageListenerContainer container;
    private final RedisGeoService redisGeoService;
    private final MuaProfileRepository muaProfileRepository;
    private final CustomerInstantBookingService customerInstantBookingService;
    private final StringRedisTemplate stringRedisTemplate;

    @PostConstruct
    public void init() {
        container.addMessageListener(this, new PatternTopic("__keyevent@*__:expired"));
        try {
            if (stringRedisTemplate.getConnectionFactory() != null) {
                stringRedisTemplate.getConnectionFactory().getConnection().serverCommands().setConfig("notify-keyspace-events", "KEA");
                log.info("Configured Redis notify-keyspace-events to KEA");
            }
        } catch (Exception e) {
            log.warn("Could not set Redis notify-keyspace-events: {}", e.getMessage());
        }
        log.info("Registered RedisExpirationListener on pattern __keyevent@*__:expired");
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String expiredKey = message.toString();
        log.debug("Received expired Redis key event: {}", expiredKey);

        if (expiredKey != null && expiredKey.startsWith(TelemetryConstants.REDIS_KEY_HEARTBEAT_PREFIX)) {
            String muaIdStr = expiredKey.substring(TelemetryConstants.REDIS_KEY_HEARTBEAT_PREFIX.length());
            try {
                Long muaId = Long.parseLong(muaIdStr);
                log.info("Heartbeat expired for MUA {}. Evicting from active geospatial index (0ms latency)", muaId);

                // 1. ZREM mua:geo:active <muaId>
                redisGeoService.removeActiveMua(muaId);

                // 2. DEL mua:summary:<muaId>
                redisGeoService.removeMuaSummary(muaId);

                // 3. Cập nhật database: availability_status = 'OFFLINE'
                muaProfileRepository.findById(muaId).ifPresent(mua -> {
                    mua.setAvailabilityStatus(AvailabilityStatus.OFFLINE);
                    mua.setIsOnline(false);
                    mua.setIsBusy(false);
                    muaProfileRepository.save(mua);
                    log.info("Updated MUA {} availability status to OFFLINE in database", muaId);
                });
            } catch (NumberFormatException e) {
                log.error("Failed to parse MUA id from expired heartbeat key: {}", expiredKey);
            } catch (Exception e) {
                log.error("Error processing expiration for MUA heartbeat {}: {}", expiredKey, e.getMessage(), e);
            }
        } else if (expiredKey != null && expiredKey.startsWith("booking:instant:expire:")) {
            String bookingIdStr = expiredKey.substring("booking:instant:expire:".length());
            try {
                Long bookingId = Long.parseLong(bookingIdStr);
                log.info("[RedisExpiration] Instant booking id={} reached 45s TTL. Triggering auto-cancel.", bookingId);
                customerInstantBookingService.expireInstantBooking(bookingId);
            } catch (NumberFormatException e) {
                log.error("Failed to parse booking id from expired instant booking key: {}", expiredKey);
            } catch (Exception e) {
                log.error("Error processing expiration for booking {}: {}", expiredKey, e.getMessage(), e);
            }
        } else if (expiredKey != null && expiredKey.startsWith("booking:dispatch:timer:")) {
            // Key pattern: booking:dispatch:timer:{bookingId}:{targetMuaId}
            String[] parts = expiredKey.split(":");
            if (parts.length >= 5) {
                try {
                    Long bookingId = Long.parseLong(parts[3]);
                    Long targetMuaId = Long.parseLong(parts[4]);
                    log.info("[RedisExpiration] MUA offer 20s TTL expired for bookingId={}, targetMuaId={}", bookingId, targetMuaId);

                    // Kiểm tra thợ hiện tại còn là targetMuaId không
                    String currentMuaStr = stringRedisTemplate.opsForValue().get("booking:dispatch:current:" + bookingId);
                    if (currentMuaStr != null && currentMuaStr.equals(String.valueOf(targetMuaId))) {
                        log.info("[RedisExpiration] Auto-cascading bookingId={} to next candidate because MUA {} did not respond within 20s",
                                bookingId, targetMuaId);
                        customerInstantBookingService.dispatchNextCandidate(bookingId);
                    }
                } catch (Exception e) {
                    log.error("Error processing expiration for dispatch timer {}: {}", expiredKey, e.getMessage(), e);
                }
            }
        }
    }
}
