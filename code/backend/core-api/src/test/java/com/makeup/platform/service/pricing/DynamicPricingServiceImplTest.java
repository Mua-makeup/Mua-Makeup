package com.makeup.platform.service.pricing;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.catalog.CalculateSurchargeReq;
import com.makeup.platform.dto.request.pricing.CalculateDistanceReq;
import com.makeup.platform.dto.request.pricing.PreviewInvoiceReq;
import com.makeup.platform.dto.response.catalog.SurchargeCalculationRes;
import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.entity.catalog.SurchargeType;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AgencyBranchEntity;
import com.makeup.platform.entity.telemetry.TelemetryLogEntity;
import com.makeup.platform.mapper.pricing.InvoicePreviewMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.catalog.PackageItemRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.repository.catalog.SurchargeRepository;
import com.makeup.platform.repository.telemetry.AgencyBranchRepository;
import com.makeup.platform.repository.telemetry.TelemetryLogRepository;
import com.makeup.platform.service.catalog.SurchargeService;
import com.makeup.platform.service.pricing.impl.DynamicPricingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.GeoOperations;
import org.springframework.data.redis.core.RedisTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("DynamicPricingServiceImpl Unit Tests")
class DynamicPricingServiceImplTest {

    @Mock
    private ServicePackageRepository servicePackageRepository;

    @Mock
    private PackageItemRepository packageItemRepository;

    @Mock
    private MuaProfileRepository muaProfileRepository;

    @Mock
    private AgencyProfileRepository agencyProfileRepository;

    @Mock
    private SurchargeRepository surchargeRepository;

    @Mock
    private SurchargeService surchargeService;

    @Mock
    private MapsClientService mapsClientService;

    @Mock
    private DistanceFeeService distanceFeeService;

    @Mock
    private SurgePricingService surgePricingService;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private GeoOperations<String, Object> geoOperations;

    @Mock
    private TelemetryLogRepository telemetryLogRepository;

    @Mock
    private AgencyBranchRepository agencyBranchRepository;

    @Spy
    private InvoicePreviewMapper invoicePreviewMapper = new InvoicePreviewMapper();

    @InjectMocks
    private DynamicPricingServiceImpl dynamicPricingService;

    private ServicePackageEntity mockPackage;
    private PackageItemEntity mockItem1;
    private MuaProfileEntity mockMua;
    private DistanceMatrixRes mockMatrix;
    private InvoicePreviewRes.DistanceInfo mockDistanceInfo;
    private InvoicePreviewRes.SurgePricingInfo mockSurgeInfo;
    private SurchargeCalculationRes mockSurcharges;

    @BeforeEach
    void setUp() {
        mockPackage = ServicePackageEntity.builder()
                .packageName("Gói Trang điểm Cô Dâu Luxury")
                .price(new BigDecimal("2500000.00"))
                .isAvailable(true)
                .build();
        mockPackage.setId(45L);

        mockItem1 = PackageItemEntity.builder()
                .itemName("Dán mi gẩy sợi")
                .itemPrice(new BigDecimal("80000.00"))
                .servicePackage(mockPackage)
                .build();
        mockItem1.setId(112L);

        mockMua = MuaProfileEntity.builder()
                .maxServiceRadiusKm(new BigDecimal("25.0"))
                .build();
        mockMua.setId(89L);

        mockMatrix = DistanceMatrixRes.builder()
                .distanceKm(new BigDecimal("14.50"))
                .durationMinutes(35)
                .isCached(true)
                .routingProvider("GOONG_MAPS")
                .build();

        mockDistanceInfo = InvoicePreviewRes.DistanceInfo.builder()
                .distanceKm(new BigDecimal("14.50"))
                .freeRadiusKm(new BigDecimal("5.00"))
                .excessDistanceKm(new BigDecimal("9.50"))
                .pricePerKm(new BigDecimal("15000.00"))
                .distanceFee(new BigDecimal("142500.00"))
                .estimatedTravelMinutes(35)
                .routingProvider("GOONG_MAPS")
                .build();

        mockSurgeInfo = InvoicePreviewRes.SurgePricingInfo.builder()
                .isSurgeApplied(true)
                .multiplier(new BigDecimal("1.10"))
                .surgeReason("Giờ cao điểm sáng sớm")
                .surgeAmount(new BigDecimal("258000.00"))
                .build();

        mockSurcharges = SurchargeCalculationRes.builder()
                .totalSurcharge(new BigDecimal("350000.00"))
                .appliedSurcharges(List.of(
                        SurchargeCalculationRes.AppliedSurchargeItem.builder()
                                .surchargeType(SurchargeType.EARLY_MORNING)
                                .surchargeName("Phụ phí làm sớm")
                                .amount(new BigDecimal("150000.00"))
                                .build(),
                        SurchargeCalculationRes.AppliedSurchargeItem.builder()
                                .surchargeType(SurchargeType.HOLIDAY)
                                .surchargeName("Phụ phí Tết")
                                .amount(new BigDecimal("200000.00"))
                                .build()
                ))
                .build();
    }

    private void stubStandardPricingFlow() {
        when(servicePackageRepository.findById(45L)).thenReturn(Optional.of(mockPackage));
        when(packageItemRepository.findAllById(List.of(112L))).thenReturn(List.of(mockItem1));
        when(muaProfileRepository.findById(89L)).thenReturn(Optional.of(mockMua));
        when(surchargeService.listSurchargesByOwner(any(), any())).thenReturn(Collections.emptyList());
        when(mapsClientService.getDistanceAndDuration(any(), any(), any(), any()))
                .thenReturn(mockMatrix);
        when(distanceFeeService.calculateDistanceFee(any(), any(), any(), any(), any(), any()))
                .thenReturn(mockDistanceInfo);
        lenient().when(surgePricingService.calculateSurge(any(), any(), any(), any(), any()))
                .thenReturn(mockSurgeInfo);
        when(surchargeService.calculateSurcharges(any(CalculateSurchargeReq.class)))
                .thenReturn(mockSurcharges);
    }

    @Test
    @DisplayName("Tier 1: Should resolve provider location from Redis GEO realtime")
    void testCalculatePreviewInvoice_Tier1_RedisGeo() {
        stubStandardPricingFlow();
        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);
        when(geoOperations.position("geo:muas:active", "89"))
                .thenReturn(List.of(new Point(106.629664, 10.823099)));

        PreviewInvoiceReq req = PreviewInvoiceReq.builder()
                .packageId(45L)
                .addOnItemIds(List.of(112L))
                .bookingTime(LocalDateTime.of(2027, 1, 1, 4, 30))
                .customerLatitude(new BigDecimal("10.823099"))
                .customerLongitude(new BigDecimal("106.629664"))
                .providerType("FREELANCER")
                .providerId(89L)
                .voucherCode("NEWYEAR2027")
                .build();

        InvoicePreviewRes res = dynamicPricingService.calculatePreviewInvoice(req);

        assertNotNull(res);
        assertEquals("Gói Trang điểm Cô Dâu Luxury", res.getPackageInfo().getPackageName());
        assertEquals(new BigDecimal("2580000.00"), res.getServiceSubtotal());
        assertEquals(new BigDecimal("3230500.00"), res.getFinancialSummary().getTotalAmount());
        assertEquals(new BigDecimal("969000.00"), res.getFinancialSummary().getDepositRequiredAmount());
        assertEquals(new BigDecimal("2261500.00"), res.getFinancialSummary().getRemainingPayableAmount());
    }

    @Test
    @DisplayName("Tier 2: Should resolve provider location from MUA Profile last_known coordinates")
    void testCalculatePreviewInvoice_Tier2_ProfileLastKnown() {
        stubStandardPricingFlow();
        mockMua.setLastKnownLat(new BigDecimal("10.800000"));
        mockMua.setLastKnownLng(new BigDecimal("106.600000"));

        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);
        when(geoOperations.position("geo:muas:active", "89")).thenReturn(null);

        PreviewInvoiceReq req = PreviewInvoiceReq.builder()
                .packageId(45L)
                .addOnItemIds(List.of(112L))
                .bookingTime(LocalDateTime.of(2027, 1, 1, 4, 30))
                .customerLatitude(new BigDecimal("10.823099"))
                .customerLongitude(new BigDecimal("106.629664"))
                .providerType("FREELANCER")
                .providerId(89L)
                .build();

        InvoicePreviewRes res = dynamicPricingService.calculatePreviewInvoice(req);

        assertNotNull(res);
        assertEquals(new BigDecimal("2580000.00"), res.getServiceSubtotal());
    }

    @Test
    @DisplayName("Tier 2: Should resolve provider location from Telemetry Logs when profile coordinates are null")
    void testCalculatePreviewInvoice_Tier2_TelemetryLog() {
        stubStandardPricingFlow();
        mockMua.setLastKnownLat(null);
        mockMua.setLastKnownLng(null);

        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);
        when(geoOperations.position("geo:muas:active", "89")).thenReturn(null);

        TelemetryLogEntity mockLog = TelemetryLogEntity.builder()
                .muaId(89L)
                .latitude(new BigDecimal("10.790000"))
                .longitude(new BigDecimal("106.610000"))
                .recordedAt(Instant.now())
                .build();
        when(telemetryLogRepository.findByMuaIdOrderByRecordedAtDesc(89L))
                .thenReturn(List.of(mockLog));

        PreviewInvoiceReq req = PreviewInvoiceReq.builder()
                .packageId(45L)
                .addOnItemIds(List.of(112L))
                .bookingTime(LocalDateTime.of(2027, 1, 1, 4, 30))
                .customerLatitude(new BigDecimal("10.823099"))
                .customerLongitude(new BigDecimal("106.629664"))
                .providerType("FREELANCER")
                .providerId(89L)
                .build();

        InvoicePreviewRes res = dynamicPricingService.calculatePreviewInvoice(req);

        assertNotNull(res);
        assertEquals(new BigDecimal("2580000.00"), res.getServiceSubtotal());
    }

    @Test
    @DisplayName("Tier 3: Should resolve provider location from MUA Base Working Address")
    void testCalculatePreviewInvoice_Tier3_MuaBaseAddress() {
        stubStandardPricingFlow();
        mockMua.setLastKnownLat(null);
        mockMua.setLastKnownLng(null);
        mockMua.setBaseAddressLat(new BigDecimal("10.776530"));
        mockMua.setBaseAddressLng(new BigDecimal("106.700980"));

        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);
        when(geoOperations.position("geo:muas:active", "89")).thenReturn(null);
        when(telemetryLogRepository.findByMuaIdOrderByRecordedAtDesc(89L)).thenReturn(Collections.emptyList());

        PreviewInvoiceReq req = PreviewInvoiceReq.builder()
                .packageId(45L)
                .addOnItemIds(List.of(112L))
                .bookingTime(LocalDateTime.of(2027, 1, 1, 4, 30))
                .customerLatitude(new BigDecimal("10.823099"))
                .customerLongitude(new BigDecimal("106.629664"))
                .providerType("FREELANCER")
                .providerId(89L)
                .build();

        InvoicePreviewRes res = dynamicPricingService.calculatePreviewInvoice(req);

        assertNotNull(res);
        assertEquals(new BigDecimal("2580000.00"), res.getServiceSubtotal());
    }

    @Test
    @DisplayName("Tier 3: Should resolve Agency location from active Agency Branch")
    void testCalculatePreviewInvoice_Tier3_AgencyBranch() {
        AgencyProfileEntity mockAgency = AgencyProfileEntity.builder()
                .agencyName("Lumiere Beauty Studio")
                .isVerified(true)
                .build();
        mockAgency.setId(10L);

        when(servicePackageRepository.findById(45L)).thenReturn(Optional.of(mockPackage));
        when(packageItemRepository.findAllById(List.of(112L))).thenReturn(List.of(mockItem1));
        when(agencyProfileRepository.findById(10L)).thenReturn(Optional.of(mockAgency));
        when(surchargeService.listSurchargesByOwner(any(), any())).thenReturn(Collections.emptyList());

        AgencyBranchEntity mockBranch = AgencyBranchEntity.builder()
                .agencyId(10L)
                .branchName("Chi nhánh 1 Quận 1")
                .latitude(new BigDecimal("10.776530"))
                .longitude(new BigDecimal("106.700980"))
                .isActive(true)
                .build();
        when(agencyBranchRepository.findByAgencyIdAndIsActiveTrue(10L)).thenReturn(List.of(mockBranch));

        when(mapsClientService.getDistanceAndDuration(any(), any(), any(), any())).thenReturn(mockMatrix);
        when(distanceFeeService.calculateDistanceFee(any(), any(), any(), any(), any(), any())).thenReturn(mockDistanceInfo);
        when(surgePricingService.calculateSurge(any(), any(), any(), any(), any())).thenReturn(mockSurgeInfo);
        when(surchargeService.calculateSurcharges(any(CalculateSurchargeReq.class))).thenReturn(mockSurcharges);

        PreviewInvoiceReq req = PreviewInvoiceReq.builder()
                .packageId(45L)
                .addOnItemIds(List.of(112L))
                .bookingTime(LocalDateTime.of(2027, 1, 1, 4, 30))
                .customerLatitude(new BigDecimal("10.823099"))
                .customerLongitude(new BigDecimal("106.629664"))
                .providerType("AGENCY")
                .providerId(10L)
                .build();

        InvoicePreviewRes res = dynamicPricingService.calculatePreviewInvoice(req);

        assertNotNull(res);
        assertEquals("Gói Trang điểm Cô Dâu Luxury", res.getPackageInfo().getPackageName());
    }

    @Test
    @DisplayName("Tier 4: Should throw ERR_PROVIDER_LOCATION_MISSING when all location tiers are empty")
    void testCalculatePreviewInvoice_Tier4_HardReject() {
        when(servicePackageRepository.findById(45L)).thenReturn(Optional.of(mockPackage));
        when(packageItemRepository.findAllById(List.of(112L))).thenReturn(List.of(mockItem1));
        when(muaProfileRepository.findById(89L)).thenReturn(Optional.of(mockMua));

        // Tier 1 empty
        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);
        when(geoOperations.position("geo:muas:active", "89")).thenReturn(null);

        // Tier 2 empty
        mockMua.setLastKnownLat(null);
        mockMua.setLastKnownLng(null);
        when(telemetryLogRepository.findByMuaIdOrderByRecordedAtDesc(89L)).thenReturn(Collections.emptyList());

        // Tier 3 empty
        mockMua.setBaseAddressLat(null);
        mockMua.setBaseAddressLng(null);

        PreviewInvoiceReq req = PreviewInvoiceReq.builder()
                .packageId(45L)
                .addOnItemIds(List.of(112L))
                .bookingTime(LocalDateTime.of(2027, 1, 1, 4, 30))
                .customerLatitude(new BigDecimal("10.823099"))
                .customerLongitude(new BigDecimal("106.629664"))
                .providerType("FREELANCER")
                .providerId(89L)
                .build();

        CustomBusinessException exception = assertThrows(
                CustomBusinessException.class,
                () -> dynamicPricingService.calculatePreviewInvoice(req)
        );

        assertEquals(ErrorCodes.ERR_PROVIDER_LOCATION_MISSING, exception.getErrorCode());
    }

    @Test
    @DisplayName("Should calculate distance and travel duration via MapsClientService")
    void testCalculateDistance() {
        CalculateDistanceReq req = CalculateDistanceReq.builder()
                .originLatitude(new BigDecimal("10.776530"))
                .originLongitude(new BigDecimal("106.700980"))
                .destinationLatitude(new BigDecimal("10.823099"))
                .destinationLongitude(new BigDecimal("106.629664"))
                .build();

        when(mapsClientService.getDistanceAndDuration(
                req.getOriginLatitude(),
                req.getOriginLongitude(),
                req.getDestinationLatitude(),
                req.getDestinationLongitude()
        )).thenReturn(mockMatrix);

        DistanceMatrixRes res = dynamicPricingService.calculateDistance(req);

        assertNotNull(res);
        assertEquals(new BigDecimal("14.50"), res.getDistanceKm());
        assertEquals(35, res.getDurationMinutes());
        assertEquals("GOONG_MAPS", res.getRoutingProvider());
    }

    @Test
    @DisplayName("Should not apply surge when Provider explicitly disables Surge Pricing")
    void testCalculatePreviewInvoice_WhenProviderDisabledSurge() {
        stubStandardPricingFlow();
        mockMua.setIsSurgeEnabled(false);
        when(redisTemplate.opsForGeo()).thenReturn(geoOperations);
        when(geoOperations.position("geo:muas:active", "89"))
                .thenReturn(List.of(new Point(106.629664, 10.823099)));

        PreviewInvoiceReq req = PreviewInvoiceReq.builder()
                .packageId(45L)
                .addOnItemIds(List.of(112L))
                .bookingTime(LocalDateTime.of(2027, 1, 1, 4, 30))
                .customerLatitude(new BigDecimal("10.823099"))
                .customerLongitude(new BigDecimal("106.629664"))
                .providerType("FREELANCER")
                .providerId(89L)
                .build();

        InvoicePreviewRes res = dynamicPricingService.calculatePreviewInvoice(req);

        assertNotNull(res);
        assertNotNull(res.getSurgePricing());
        assertFalse(res.getSurgePricing().getIsSurgeApplied());
        assertEquals(new BigDecimal("1.00"), res.getSurgePricing().getMultiplier());
        assertEquals(new BigDecimal("0.00"), res.getSurgePricing().getSurgeAmount());
        assertEquals("DISABLED_BY_PROVIDER", res.getSurgePricing().getSurgeType());
        assertEquals("Nhà cung cấp không áp dụng tăng giá cao điểm", res.getSurgePricing().getSurgeReason());
    }
}
