package com.makeup.platform.service.telemetry;

import com.makeup.platform.common.constants.TelemetryConstants;
import com.makeup.platform.service.telemetry.impl.RedisGeoServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.*;
import java.time.Duration;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Arrays;

@ExtendWith(MockitoExtension.class)
class RedisGeoServiceTest {
    @Mock StringRedisTemplate redis;
    @Mock GeoOperations<String,String> geo;
    @Mock ValueOperations<String,String> values;
    @InjectMocks RedisGeoServiceImpl service;
    @Test void longitudePrecedesLatitudeInRedisCoordinates() {
        when(redis.opsForGeo()).thenReturn(geo); service.addActiveMua(7L, 10.77, 106.69);
        verify(geo).add(TelemetryConstants.REDIS_KEY_MUA_GEO, new Point(106.69,10.77), "7");
    }
    @Test void heartbeatHasExpiry() {
        when(redis.opsForValue()).thenReturn(values); service.setHeartbeat(7L, 45);
        verify(values).set(TelemetryConstants.REDIS_KEY_HEARTBEAT_PREFIX+7, "ALIVE", Duration.ofSeconds(45));
    }
    @Test void missingHeartbeatMeansOffline() {
        when(redis.hasKey(TelemetryConstants.REDIS_KEY_HEARTBEAT_PREFIX+7)).thenReturn(null, false, true);
        assertFalse(service.hasHeartbeat(7L)); assertFalse(service.hasHeartbeat(7L)); assertTrue(service.hasHeartbeat(7L));
    }
    @Test void emptySummaryRequestDoesNotAccessRedis() {
        assertTrue(service.getMuaSummaries(List.of()).isEmpty()); assertTrue(service.getMuaSummaries(null).isEmpty()); verifyNoInteractions(redis);
    }
    @Test void summaryBatchPreservesMissingEntriesAndOrder() {
        when(redis.opsForValue()).thenReturn(values);
        when(values.multiGet(List.of(TelemetryConstants.REDIS_KEY_SUMMARY_PREFIX+1, TelemetryConstants.REDIS_KEY_SUMMARY_PREFIX+2)))
            .thenReturn(Arrays.asList("first", null));
        assertEquals(Arrays.asList("first",null), service.getMuaSummaries(List.of(1L,2L)));
    }
}
