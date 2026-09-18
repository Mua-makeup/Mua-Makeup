package com.makeup.platform.service.pricing;

import com.makeup.platform.service.pricing.impl.SurgeDemandTrackerImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.GeoOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SurgeDemandTracker Unit Tests")
class SurgeDemandTrackerTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private GeoOperations<String, Object> geoOperations;

    @InjectMocks
    private SurgeDemandTrackerImpl surgeDemandTracker;

    private final BigDecimal benThanhLat = new BigDecimal("10.7721");
    private final BigDecimal benThanhLng = new BigDecimal("106.6983");

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("Should calculate 1.25x surge multiplier when Demand is 10 and Supply is 5 (Ratio = 2.0)")
    void testDemandExceedsSupply() {
        when(valueOperations.increment(anyString())).thenReturn(10L);
        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);

        List<GeoResult<RedisGeoCommands.GeoLocation<Object>>> mockList = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            mockList.add(new GeoResult<>(new RedisGeoCommands.GeoLocation<>("mua_" + i, null), new Distance(1.0, Metrics.KILOMETERS)));
        }
        when(geoOperations.radius(eq("geo:muas:active"), any(Circle.class)))
                .thenReturn(new GeoResults<>(mockList));

        SurgeDemandTracker.RealtimeSurgeResult result = surgeDemandTracker.evaluateRealtimeSurge(benThanhLat, benThanhLng);

        assertNotNull(result);
        assertEquals(new BigDecimal("1.25"), result.multiplier());
        assertEquals(10, result.demandCount());
        assertEquals(5, result.supplyCount());
        assertEquals(new BigDecimal("2.00"), result.demandRatio());
        assertEquals("REALTIME_DEMAND_SURGE", result.surgeType());
    }

    @Test
    @DisplayName("Should return 1.00x normal multiplier when Supply >= Demand (5 customers / 10 MUAs)")
    void testSupplyExceedsDemand() {
        when(valueOperations.increment(anyString())).thenReturn(5L);
        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);

        List<GeoResult<RedisGeoCommands.GeoLocation<Object>>> mockList = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            mockList.add(new GeoResult<>(new RedisGeoCommands.GeoLocation<>("mua_" + i, null), new Distance(1.0, Metrics.KILOMETERS)));
        }
        when(geoOperations.radius(eq("geo:muas:active"), any(Circle.class)))
                .thenReturn(new GeoResults<>(mockList));

        SurgeDemandTracker.RealtimeSurgeResult result = surgeDemandTracker.evaluateRealtimeSurge(benThanhLat, benThanhLng);

        assertNotNull(result);
        assertEquals(new BigDecimal("1.00"), result.multiplier());
        assertEquals(5, result.demandCount());
        assertEquals(10, result.supplyCount());
        assertEquals("NORMAL", result.surgeType());
    }

    @Test
    @DisplayName("Should clamp multiplier to max 1.50x when Demand dramatically exceeds Supply (30 customers / 2 MUAs)")
    void testClampMaxSurgeMultiplier() {
        when(valueOperations.increment(anyString())).thenReturn(30L);
        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);

        List<GeoResult<RedisGeoCommands.GeoLocation<Object>>> mockList = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            mockList.add(new GeoResult<>(new RedisGeoCommands.GeoLocation<>("mua_" + i, null), new Distance(1.0, Metrics.KILOMETERS)));
        }
        when(geoOperations.radius(eq("geo:muas:active"), any(Circle.class)))
                .thenReturn(new GeoResults<>(mockList));

        SurgeDemandTracker.RealtimeSurgeResult result = surgeDemandTracker.evaluateRealtimeSurge(benThanhLat, benThanhLng);

        assertNotNull(result);
        assertEquals(new BigDecimal("1.50"), result.multiplier());
        assertEquals("REALTIME_DEMAND_SURGE", result.surgeType());
    }

    @Test
    @DisplayName("Fault Tolerance: Should gracefully return 1.00x without throwing exception when Redis fails")
    void testRedisFailureGracefulFallback() {
        when(valueOperations.increment(anyString())).thenThrow(new RuntimeException("Redis connection refused"));

        SurgeDemandTracker.RealtimeSurgeResult result = surgeDemandTracker.evaluateRealtimeSurge(benThanhLat, benThanhLng);

        assertNotNull(result);
        assertEquals(new BigDecimal("1.00"), result.multiplier());
        assertEquals("NORMAL", result.surgeType());
        assertTrue(result.surgeReason().contains("fallback"));
    }
}
