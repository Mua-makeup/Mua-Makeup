package com.makeup.platform.service.pricing;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.service.pricing.impl.DistanceFeeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("DistanceFeeServiceImpl Unit Tests")
class DistanceFeeServiceImplTest {

    private DistanceFeeService distanceFeeService;

    @BeforeEach
    void setUp() {
        distanceFeeService = new DistanceFeeServiceImpl();
    }

    @Test
    @DisplayName("Should return 0 VND fee when distance is within free radius (3.8km <= 5.0km)")
    void testWithinFreeRadius() {
        BigDecimal distanceKm = new BigDecimal("3.8");
        BigDecimal maxRadius = new BigDecimal("25.0");
        BigDecimal freeRadius = new BigDecimal("5.0");
        BigDecimal pricePerKm = new BigDecimal("15000.00");

        InvoicePreviewRes.DistanceInfo info = distanceFeeService.calculateDistanceFee(
                distanceKm, 15, "GOONG_MAPS", maxRadius, freeRadius, pricePerKm
        );

        assertNotNull(info);
        assertEquals(new BigDecimal("3.8"), info.getDistanceKm());
        assertEquals(new BigDecimal("0.00"), info.getExcessDistanceKm());
        assertEquals(new BigDecimal("0.00"), info.getDistanceFee());
        assertEquals("GOONG_MAPS", info.getRoutingProvider());
    }

    @Test
    @DisplayName("Should calculate excess distance fee correctly (12.4km - 5.0km = 7.4km * 15,000 = 111,000 VND)")
    void testExcessDistanceFee() {
        BigDecimal distanceKm = new BigDecimal("12.4");
        BigDecimal maxRadius = new BigDecimal("25.0");
        BigDecimal freeRadius = new BigDecimal("5.0");
        BigDecimal pricePerKm = new BigDecimal("15000.00");

        InvoicePreviewRes.DistanceInfo info = distanceFeeService.calculateDistanceFee(
                distanceKm, 30, "GOONG_MAPS", maxRadius, freeRadius, pricePerKm
        );

        assertNotNull(info);
        assertEquals(new BigDecimal("12.4"), info.getDistanceKm());
        assertEquals(new BigDecimal("7.40"), info.getExcessDistanceKm());
        assertEquals(new BigDecimal("111000.00"), info.getDistanceFee());
    }

    @Test
    @DisplayName("Should throw ERR_DISTANCE_EXCEEDS_MAX_RADIUS when distance exceeds max radius (32.0km > 25.0km)")
    void testExceedsMaxRadiusThrowsException() {
        BigDecimal distanceKm = new BigDecimal("32.0");
        BigDecimal maxRadius = new BigDecimal("25.0");
        BigDecimal freeRadius = new BigDecimal("5.0");
        BigDecimal pricePerKm = new BigDecimal("15000.00");

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                distanceFeeService.calculateDistanceFee(
                        distanceKm, 60, "GOONG_MAPS", maxRadius, freeRadius, pricePerKm
                )
        );

        assertEquals(ErrorCodes.ERR_DISTANCE_EXCEEDS_MAX_RADIUS, ex.getErrorCode());
    }
}
