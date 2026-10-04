package com.makeup.platform.service.telemetry;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.telemetry.ToggleAvailabilityReq;
import com.makeup.platform.dto.request.telemetry.LocationStreamReq;
import com.makeup.platform.entity.mua.MuaCertificateItem;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.telemetry.impl.TelemetryStreamServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReceivingLocationTest {
    @Mock MuaProfileRepository muaProfileRepository;
    @Mock ServicePackageRepository servicePackageRepository;
    @Mock BookingRepository bookingRepository;
    @Mock RedisGeoService redisGeoService;
    @Mock TelemetryLogService telemetryLogService;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock ObjectMapper objectMapper;
    @InjectMocks TelemetryStreamServiceImpl service;

    private MuaProfileEntity profile() {
        MuaProfileEntity mua = new MuaProfileEntity();
        mua.setId(7L);
        mua.setIsOnline(true);
        mua.setBaseAddressLat(new BigDecimal("10.77"));
        mua.setBaseAddressLng(new BigDecimal("106.70"));
        mua.setLastKnownLat(new BigDecimal("21.03"));
        mua.setLastKnownLng(new BigDecimal("105.85"));
        MuaCertificateItem certificate = new MuaCertificateItem();
        certificate.setIsVerified(true);
        mua.setCertificates(List.of(certificate));
        when(muaProfileRepository.findByUserId(1L)).thenReturn(Optional.of(mua));
        return mua;
    }

    @Test
    void goingOnlineUsesSavedPointAndPreservesTripGps() {
        MuaProfileEntity mua = profile();
        when(servicePackageRepository.findByMuaIdAndIsAvailableTrue(7L)).thenReturn(List.of());
        service.toggleAvailability(1L, ToggleAvailabilityReq.builder()
                .isAvailable(true).latitude(21.03).longitude(105.85).build());
        verify(redisGeoService).addActiveMua(7L, 10.77, 106.70);
        assertEquals(new BigDecimal("21.03"), mua.getLastKnownLat());
        assertEquals(new BigDecimal("105.85"), mua.getLastKnownLng());
    }

    @Test
    void heartbeatUsesUpdatedReceivingPointInsteadOfLastGps() {
        MuaProfileEntity mua = profile();
        mua.setBaseAddressLat(new BigDecimal("16.05"));
        mua.setBaseAddressLng(new BigDecimal("108.20"));
        service.recordHeartbeat(1L);
        verify(redisGeoService).addActiveMua(7L, 16.05, 108.20);
    }

    @Test
    void missingReceivingPointCannotGoOnlineUsingDeviceGps() {
        MuaProfileEntity mua = profile();
        mua.setBaseAddressLat(null);
        assertThrows(CustomBusinessException.class, () -> service.toggleAvailability(1L,
                ToggleAvailabilityReq.builder().isAvailable(true).latitude(21.03).longitude(105.85).build()));
        verifyNoInteractions(redisGeoService);
    }

    @Test
    void heartbeatRemovesStaleIndexWhenReceivingPointIsMissing() {
        MuaProfileEntity mua = profile();
        mua.setBaseAddressLng(null);
        service.recordHeartbeat(1L);
        verify(redisGeoService).removeActiveMua(7L);
        verify(redisGeoService, never()).addActiveMua(anyLong(), anyDouble(), anyDouble());
    }

    @Test
    void tripGpsStillStreamsWithoutMovingReceivingPoint() {
        profile();
        var request = LocationStreamReq.builder().bookingId(20L)
                .latitude(21.04).longitude(105.86).accuracy(10.0).build();
        var response = service.processLocationStream(1L, request);
        assertEquals(21.04, response.getCurrentLat());
        assertEquals(105.86, response.getCurrentLng());
        assertEquals("LIVE", response.getLocationStatus());
        verify(telemetryLogService).saveTelemetryLog(7L, request);
        verify(redisGeoService, never()).addActiveMua(anyLong(), anyDouble(), anyDouble());
    }
}
