package com.makeup.platform.service.pricing;

import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.entity.pricing.SurgePricingRuleEntity;
import com.makeup.platform.mapper.pricing.SurgePricingRuleMapper;
import com.makeup.platform.repository.pricing.SurgePricingRuleRepository;
import com.makeup.platform.service.pricing.impl.SurgePricingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SurgePricingServiceImpl Unit Tests")
class SurgePricingServiceImplTest {

    @Mock
    private SurgePricingRuleRepository surgePricingRuleRepository;

    @Mock
    private SurgePricingRuleMapper surgePricingRuleMapper;

    @Mock
    private SurgeDemandTracker surgeDemandTracker;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private SurgePricingServiceImpl surgePricingService;

    private SurgePricingRuleEntity morningWeekendRule;

    @BeforeEach
    void setUp() {
        morningWeekendRule = SurgePricingRuleEntity.builder()
                .ruleName("Giờ Sáng Rước Dâu Cuối Tuần")
                .zoneCode("ALL")
                .startTime(LocalTime.of(5, 0))
                .endTime(LocalTime.of(7, 0))
                .applicableDaysOfWeek("SATURDAY,SUNDAY")
                .surgeMultiplier(new BigDecimal("1.20"))
                .minDemandRatio(new BigDecimal("1.00"))
                .isActive(true)
                .build();

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(surgeDemandTracker.evaluateRealtimeSurge(any(), any()))
                .thenReturn(new SurgeDemandTracker.RealtimeSurgeResult(
                        new BigDecimal("1.00"), 0, 0, BigDecimal.ONE, "Khung giờ bình thường", "NORMAL"
                ));
    }

    @Test
    @DisplayName("Should apply 1.20x surge multiplier during weekend morning peak hours")
    void testApplyWeekendSurge() {
        // Chủ nhật lúc 05:30 sáng
        LocalDateTime bookingTime = LocalDateTime.of(2027, 1, 3, 5, 30);
        BigDecimal subtotal = new BigDecimal("1000000.00");

        when(surgePricingRuleRepository.findMatchingRules(any(LocalTime.class), eq("SUNDAY"), eq("ALL")))
                .thenReturn(List.of(morningWeekendRule));

        InvoicePreviewRes.SurgePricingInfo info = surgePricingService.calculateSurge(subtotal, bookingTime, "ALL");

        assertNotNull(info);
        assertTrue(info.getIsSurgeApplied());
        assertEquals(new BigDecimal("1.20"), info.getMultiplier());
        assertEquals(new BigDecimal("200000.00"), info.getSurgeAmount());
        assertEquals("Giờ Sáng Rước Dâu Cuối Tuần", info.getSurgeReason());
    }

    @Test
    @DisplayName("Should return 1.00x multiplier and 0 surge amount during normal hours")
    void testNormalHoursNoSurge() {
        // Thứ ba lúc 10:00 sáng
        LocalDateTime bookingTime = LocalDateTime.of(2027, 1, 5, 10, 0);
        BigDecimal subtotal = new BigDecimal("1000000.00");

        when(surgePricingRuleRepository.findMatchingRules(any(LocalTime.class), eq("TUESDAY"), eq("ALL")))
                .thenReturn(Collections.emptyList());

        InvoicePreviewRes.SurgePricingInfo info = surgePricingService.calculateSurge(subtotal, bookingTime, "ALL");

        assertNotNull(info);
        assertFalse(info.getIsSurgeApplied());
        assertEquals(new BigDecimal("1.00"), info.getMultiplier());
        assertEquals(new BigDecimal("0.00"), info.getSurgeAmount());
    }

    @Test
    @DisplayName("Should clamp multiplier to max 1.50x if rule specifies higher multiplier")
    void testClampMaxSurgeMultiplier() {
        morningWeekendRule.setSurgeMultiplier(new BigDecimal("1.80"));
        LocalDateTime bookingTime = LocalDateTime.of(2027, 1, 3, 5, 30);
        BigDecimal subtotal = new BigDecimal("1000000.00");

        when(surgePricingRuleRepository.findMatchingRules(any(LocalTime.class), eq("SUNDAY"), eq("ALL")))
                .thenReturn(List.of(morningWeekendRule));

        InvoicePreviewRes.SurgePricingInfo info = surgePricingService.calculateSurge(subtotal, bookingTime, "ALL");

        assertNotNull(info);
        assertEquals(new BigDecimal("1.50"), info.getMultiplier());
        assertEquals(new BigDecimal("500000.00"), info.getSurgeAmount());
    }

    @Test
    @DisplayName("Should apply higher realtime demand multiplier when it exceeds schedule rule")
    void testRealtimeDemandExceedsScheduleRule() {
        LocalDateTime bookingTime = LocalDateTime.of(2027, 1, 3, 5, 30);
        BigDecimal subtotal = new BigDecimal("1000000.00");

        when(surgePricingRuleRepository.findMatchingRules(any(LocalTime.class), eq("SUNDAY"), eq("ALL")))
                .thenReturn(List.of(morningWeekendRule)); // 1.20x

        when(surgeDemandTracker.evaluateRealtimeSurge(any(), any()))
                .thenReturn(new SurgeDemandTracker.RealtimeSurgeResult(
                        new BigDecimal("1.35"), 15, 4, new BigDecimal("3.75"),
                        "Nhu cầu đặt thợ tăng cao tại khu vực (15 khách / 4 thợ)", "REALTIME_DEMAND_SURGE"
                )); // 1.35x > 1.20x

        InvoicePreviewRes.SurgePricingInfo info = surgePricingService.calculateSurge(
                subtotal, bookingTime, "ALL", new BigDecimal("10.77"), new BigDecimal("106.69"));

        assertNotNull(info);
        assertTrue(info.getIsSurgeApplied());
        assertEquals(new BigDecimal("1.35"), info.getMultiplier());
        assertEquals(new BigDecimal("350000.00"), info.getSurgeAmount());
        assertEquals("REALTIME_DEMAND_SURGE", info.getSurgeType());
        assertEquals(15, info.getDemandCount());
        assertEquals(4, info.getSupplyCount());
    }

    @Test
    @DisplayName("Should ignore realtime H3 demand surge when globally disabled by Super Admin")
    void testH3SurgeDisabledByAdmin() {
        LocalDateTime bookingTime = LocalDateTime.of(2027, 1, 5, 10, 0); // Giờ thường, không có rule
        BigDecimal subtotal = new BigDecimal("1000000.00");

        when(valueOperations.get("pricing:settings:h3_surge_enabled")).thenReturn("false");
        when(surgePricingRuleRepository.findMatchingRules(any(LocalTime.class), eq("TUESDAY"), eq("ALL")))
                .thenReturn(Collections.emptyList());

        InvoicePreviewRes.SurgePricingInfo info = surgePricingService.calculateSurge(
                subtotal, bookingTime, "ALL", new BigDecimal("10.77"), new BigDecimal("106.69"));

        assertNotNull(info);
        assertFalse(info.getIsSurgeApplied());
        assertEquals(new BigDecimal("1.00"), info.getMultiplier());
        assertEquals(new BigDecimal("0.00"), info.getSurgeAmount());
        assertEquals("NORMAL", info.getSurgeType());
    }

    @Test
    @DisplayName("Should toggle H3 surge status in Redis")
    void testToggleH3Surge() {
        boolean result = surgePricingService.toggleH3Surge(false);
        assertFalse(result);
    }
}
