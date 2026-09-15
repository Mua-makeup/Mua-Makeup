package com.makeup.platform.service.telemetry;

import com.makeup.platform.common.constants.TelemetryConstants;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.repository.MuaProfileRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
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

    @PostConstruct
    public void init() {
        container.addMessageListener(this, new PatternTopic("__keyevent@*__:expired"));
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
        }
    }
}
