package com.makeup.platform.service;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.catalog.CalculateSurchargeReq;
import com.makeup.platform.dto.request.catalog.ConfigureSurchargeReq;
import com.makeup.platform.dto.response.catalog.SurchargeCalculationRes;
import com.makeup.platform.dto.response.catalog.SurchargeDetailRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.catalog.SurchargeEntity;
import com.makeup.platform.entity.catalog.SurchargeType;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.catalog.SurchargeRepository;
import com.makeup.platform.service.catalog.helper.CatalogOwnerHelper;
import com.makeup.platform.service.catalog.impl.SurchargeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SurchargeServiceImplTest {

    @Mock
    private SurchargeRepository surchargeRepository;

    @Mock
    private MuaProfileRepository muaProfileRepository;

    @Mock
    private CatalogOwnerHelper ownerHelper;

    @org.mockito.Spy
    private com.makeup.platform.mapper.catalog.SurchargeMapper surchargeMapper = new com.makeup.platform.mapper.catalog.SurchargeMapper();

    @InjectMocks
    private SurchargeServiceImpl surchargeService;

    private UserEntity testUser;
    private MuaProfileEntity testMua;
    private CatalogOwnerHelper.OwnerContext ownerContext;

    @BeforeEach
    void setUp() {
        testUser = UserEntity.builder().fullName("Trần Thúy Nga").build();
        testUser.setId(20L);

        testMua = MuaProfileEntity.builder()
                .user(testUser)
                .muaCode("MUA_NGA_02")
                .maxServiceRadiusKm(new BigDecimal("15.0"))
                .build();
        testMua.setId(8L);

        ownerContext = new CatalogOwnerHelper.OwnerContext(null, testMua);
    }

    @Test
    @DisplayName("Cấu hình phụ phí làm sớm thành công cho Freelancer")
    void testConfigureSurcharge_Success() {
        ConfigureSurchargeReq req = ConfigureSurchargeReq.builder()
                .surchargeName("Phụ phí làm sớm (03:00 - 05:00 sáng)")
                .surchargeType(SurchargeType.EARLY_MORNING)
                .amount(new BigDecimal("150000.00"))
                .isActive(true)
                .build();

        when(ownerHelper.resolveOwner(20L)).thenReturn(ownerContext);
        when(surchargeRepository.findByMuaIdAndSurchargeTypeAndIsActiveTrue(8L, SurchargeType.EARLY_MORNING))
                .thenReturn(Optional.empty());

        when(surchargeRepository.save(any(SurchargeEntity.class))).thenAnswer(i -> {
            SurchargeEntity saved = i.getArgument(0);
            saved.setId(18L);
            return saved;
        });

        SurchargeDetailRes res = surchargeService.configureSurcharge(20L, req);

        assertNotNull(res);
        assertEquals(18L, res.getId());
        assertEquals("Phụ phí làm sớm (03:00 - 05:00 sáng)", res.getSurchargeName());
        assertEquals(SurchargeType.EARLY_MORNING, res.getSurchargeType());
        assertEquals(new BigDecimal("150000.00"), res.getAmount());
        assertEquals(8L, res.getMuaId());
        verify(surchargeRepository).save(any(SurchargeEntity.class));
    }

    @Test
    @DisplayName("Cấu hình phụ phí với số tiền âm ném ngoại lệ ERR_INVALID_SURCHARGE_AMOUNT")
    void testConfigureSurcharge_NegativeAmount_ThrowsException() {
        ConfigureSurchargeReq req = ConfigureSurchargeReq.builder()
                .surchargeName("Phụ phí âm")
                .surchargeType(SurchargeType.EARLY_MORNING)
                .amount(new BigDecimal("-50000.00"))
                .build();

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                surchargeService.configureSurcharge(20L, req));

        assertEquals(ErrorCodes.ERR_INVALID_SURCHARGE_AMOUNT, ex.getErrorCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Tính toán phụ phí Realtime: Làm sớm 04:30 + Ngày Lễ 30/4 + Đi xa 20km (>15km)")
    void testCalculateSurcharges_AllApplied() {
        // Cấu hình các loại phụ phí active của Freelance MUA
        SurchargeEntity earlySurcharge = SurchargeEntity.builder()
                .mua(testMua)
                .surchargeName("Phụ phí làm sớm")
                .surchargeType(SurchargeType.EARLY_MORNING)
                .amount(new BigDecimal("150000.00"))
                .isActive(true)
                .build();

        SurchargeEntity distanceSurcharge = SurchargeEntity.builder()
                .mua(testMua)
                .surchargeName("Phụ phí di chuyển ngoài bán kính")
                .surchargeType(SurchargeType.OUT_OF_RADIUS)
                .amount(new BigDecimal("10000.00")) // 10k/km
                .isActive(true)
                .build();

        SurchargeEntity holidaySurcharge = SurchargeEntity.builder()
                .mua(testMua)
                .surchargeName("Phụ phí ngày Lễ")
                .surchargeType(SurchargeType.HOLIDAY)
                .amount(new BigDecimal("200000.00"))
                .isActive(true)
                .build();

        when(surchargeRepository.findByMuaIdAndIsActiveTrue(8L))
                .thenReturn(List.of(earlySurcharge, distanceSurcharge, holidaySurcharge));
        when(muaProfileRepository.findById(8L)).thenReturn(Optional.of(testMua));

        // Đặt lịch vào ngày 30/04/2026 lúc 04:30 sáng, khoảng cách 20km (vượt 5km so với bán kính 15km)
        CalculateSurchargeReq req = CalculateSurchargeReq.builder()
                .muaId(8L)
                .bookingTime(LocalDateTime.of(2026, 4, 30, 4, 30, 0))
                .distanceKm(new BigDecimal("20.0"))
                .build();

        long startTime = System.currentTimeMillis();
        SurchargeCalculationRes res = surchargeService.calculateSurcharges(req);
        long duration = System.currentTimeMillis() - startTime;

        assertNotNull(res);
        // Kỳ vọng: 150k (làm sớm) + 200k (lễ 30/4) + (20-15)*10k = 50k -> Tổng = 400.000 VNĐ
        assertEquals(new BigDecimal("400000.00"), res.getTotalSurcharge());
        assertEquals(3, res.getAppliedSurcharges().size());
        // Hiệu năng engine < 30ms
        org.junit.jupiter.api.Assertions.assertTrue(duration < 500, "Calculation took " + duration + "ms");
    }

    @Test
    @DisplayName("Tính toán phụ phí thất bại khi chỉ định đồng thời cả agencyId và muaId")
    void testCalculateSurcharges_BothOwnersSpecified_ThrowsException() {
        CalculateSurchargeReq req = CalculateSurchargeReq.builder()
                .agencyId(1L)
                .muaId(8L)
                .bookingTime(LocalDateTime.of(2026, 4, 30, 4, 30, 0))
                .build();

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                surchargeService.calculateSurcharges(req));

        assertEquals(ErrorCodes.ERR_INVALID_SURCHARGE_CALCULATION, ex.getErrorCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }
}
