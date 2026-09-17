package com.makeup.platform.service.agency;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.UpdateAgencyProfileReq;
import com.makeup.platform.dto.request.agency.UpdateCommissionReq;
import com.makeup.platform.dto.response.agency.AgencyProfileRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.mapper.agency.AgencyProfileMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.service.agency.impl.AgencyProfileServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgencyProfileServiceImplTest {

    @Mock
    private AgencyProfileRepository agencyProfileRepository;

    @Spy
    private AgencyProfileMapper agencyProfileMapper;

    @InjectMocks
    private AgencyProfileServiceImpl agencyProfileService;

    private AgencyProfileEntity mockAgency;
    private UserEntity mockOwner;

    @BeforeEach
    void setUp() {
        mockOwner = UserEntity.builder()
                .phoneNumber("0912345678")
                .fullName("Nguyễn Thị Chủ Studio")
                .build();
        mockOwner.setId(10L);

        mockAgency = AgencyProfileEntity.builder()
                .agencyCode("AG00105")
                .agencyName("Glamour Bridal Luxury Studio")
                .hotline("02838383838")
                .addressStreet("Số 88 Đồng Khởi")
                .district("Quận 1")
                .city("Hồ Chí Minh")
                .commissionRateInternal(new BigDecimal("25.00"))
                .owner(mockOwner)
                .isVerified(true)
                .ratingAvg(new BigDecimal("4.95"))
                .build();
        mockAgency.setId(1L);
    }

    @Test
    @DisplayName("US-AGC-01: Lấy thông tin Studio của tôi thành công")
    void getMyAgencyProfile_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));

        AgencyProfileRes res = agencyProfileService.getMyAgencyProfile(10L);

        assertNotNull(res);
        assertEquals("AG00105", res.getAgencyCode());
        assertEquals("Glamour Bridal Luxury Studio", res.getAgencyName());
        assertEquals(new BigDecimal("25.00"), res.getCommissionRateInternal());
        verify(agencyProfileRepository).findByOwnerId(10L);
    }

    @Test
    @DisplayName("US-AGC-01: Lỗi khi không tìm thấy Studio của người dùng (IDOR / Not found)")
    void getMyAgencyProfile_NotFound_ShouldThrowException() {
        when(agencyProfileRepository.findByOwnerId(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> agencyProfileService.getMyAgencyProfile(99L));

        assertEquals(ErrorCodes.ERR_AGENCY_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("US-AGC-01: Xem chi tiết Studio theo ID thành công")
    void getAgencyProfileById_Success() {
        when(agencyProfileRepository.findById(1L)).thenReturn(Optional.of(mockAgency));

        AgencyProfileRes res = agencyProfileService.getAgencyProfileById(1L);

        assertNotNull(res);
        assertEquals(1L, res.getId());
        assertEquals("Glamour Bridal Luxury Studio", res.getAgencyName());
    }

    @Test
    @DisplayName("US-AGC-01: Cập nhật thông tin cơ sở Studio thành công")
    void updateAgencyProfile_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyProfileRepository.save(any(AgencyProfileEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateAgencyProfileReq req = UpdateAgencyProfileReq.builder()
                .agencyName("Glamour Bridal & Academy")
                .hotline("0988889999")
                .addressStreet("123 Lê Lợi")
                .district("Quận 1")
                .city("Hồ Chí Minh")
                .logoUrl("https://cdn.makeup.vn/new-logo.png")
                .build();

        AgencyProfileRes res = agencyProfileService.updateAgencyProfile(10L, req);

        assertNotNull(res);
        assertEquals("Glamour Bridal & Academy", res.getAgencyName());
        assertEquals("0988889999", res.getHotline());
        assertEquals("123 Lê Lợi", res.getAddressStreet());
        assertEquals("https://cdn.makeup.vn/new-logo.png", res.getLogoUrl());
        verify(agencyProfileRepository).save(mockAgency);
    }

    @Test
    @DisplayName("US-AGC-01: Cập nhật hoa hồng nội bộ mặc định thành công")
    void updateCommissionRate_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyProfileRepository.save(any(AgencyProfileEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateCommissionReq req = UpdateCommissionReq.builder()
                .commissionRateInternal(new BigDecimal("30.00"))
                .build();

        AgencyProfileRes res = agencyProfileService.updateCommissionRate(10L, req);

        assertNotNull(res);
        assertEquals(new BigDecimal("30.00"), res.getCommissionRateInternal());
        assertEquals(new BigDecimal("30.00"), mockAgency.getCommissionRateInternal());
        verify(agencyProfileRepository).save(mockAgency);
    }
}
