package com.makeup.platform.service.agency;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.agency.AgencyInvitationRedisDto;
import com.makeup.platform.dto.request.agency.AcceptInvitationReq;
import com.makeup.platform.dto.request.agency.CreateInvitationReq;
import com.makeup.platform.dto.request.agency.ReviewStaffApplicationReq;
import com.makeup.platform.dto.request.agency.UpdateStaffCommissionReq;
import com.makeup.platform.dto.request.agency.UpdateStaffStatusReq;
import com.makeup.platform.dto.response.agency.AgencyInvitationRes;
import com.makeup.platform.dto.response.agency.AgencyStaffDetailRes;
import com.makeup.platform.dto.response.agency.AgencyStaffRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.agency.AgencyInvitationMapper;
import com.makeup.platform.mapper.agency.AgencyStaffMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.service.agency.impl.AgencyStaffServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgencyStaffServiceImplTest {

    @Mock
    private AgencyProfileRepository agencyProfileRepository;

    @Mock
    private AgencyStaffRepository agencyStaffRepository;

    @Mock
    private MuaProfileRepository muaProfileRepository;

    @Spy
    private AgencyStaffMapper agencyStaffMapper;

    @Spy
    private AgencyInvitationMapper agencyInvitationMapper;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private SetOperations<String, Object> setOperations;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @InjectMocks
    private AgencyStaffServiceImpl agencyStaffService;

    private AgencyProfileEntity mockAgency;
    private UserEntity mockOwner;
    private UserEntity mockMuaUser;
    private MuaProfileEntity mockMua;
    private AgencyStaffEntity mockStaff;

    @BeforeEach
    void setUp() {
        mockOwner = UserEntity.builder()
                .phoneNumber("0912345678")
                .fullName("Chủ Studio")
                .build();
        mockOwner.setId(10L);

        mockAgency = AgencyProfileEntity.builder()
                .agencyCode("AG00105")
                .agencyName("Glamour Bridal Luxury Studio")
                .hotline("02838383838")
                .addressStreet("88 Đồng Khởi")
                .district("Quận 1")
                .city("Hồ Chí Minh")
                .commissionRateInternal(new BigDecimal("25.00"))
                .owner(mockOwner)
                .build();
        mockAgency.setId(1L);

        mockMuaUser = UserEntity.builder()
                .phoneNumber("0987654321")
                .fullName("Trần Thanh Tâm")
                .build();
        mockMuaUser.setId(25L);

        mockMua = MuaProfileEntity.builder()
                .user(mockMuaUser)
                .muaCode("MUA0025")
                .experienceYears(3)
                .ratingAvg(new BigDecimal("4.80"))
                .build();
        mockMua.setId(5L);

        mockStaff = AgencyStaffEntity.builder()
                .agency(mockAgency)
                .mua(mockMua)
                .agreedCommissionRate(new BigDecimal("30.00"))
                .isActive(false)
                .status("PENDING")
                .note("Đang chờ xét duyệt")
                .joinedAt(LocalDateTime.now())
                .build();
        mockStaff.setId(101L);
    }

    @Test
    @DisplayName("US-AGC-02: Tạo mã mời lưu Redis thành công kèm QR Base64")
    void createInvitation_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);

        CreateInvitationReq req = CreateInvitationReq.builder()
                .expireHours(72)
                .note("Mời thợ tham gia đội ngũ Mùa Cưới 2026")
                .proposedCommissionRate(new BigDecimal("30.00"))
                .build();

        AgencyInvitationRes res = agencyStaffService.createInvitation(10L, req);

        assertNotNull(res);
        assertTrue(res.getInviteCode().startsWith("INV-AG00105-"));
        assertEquals(1L, res.getAgencyId());
        assertEquals("Glamour Bridal Luxury Studio", res.getAgencyName());
        assertEquals(new BigDecimal("30.00"), res.getProposedCommissionRate());
        assertNotNull(res.getQrCodeBase64());
        assertTrue(res.getQrCodeBase64().startsWith("data:image/png;base64,"));
        assertNotNull(res.getInviteUrl());

        verify(valueOperations).set(eq("agency:invitation:" + res.getInviteCode()), anyString(), eq(Duration.ofHours(72)));
        verify(setOperations).add("agency:1:invitations", res.getInviteCode());
    }

    @Test
    @DisplayName("US-AGC-02: Lấy danh sách mã mời từ Redis thành công")
    void getInvitations_Success() throws Exception {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(redisTemplate.opsForSet()).thenReturn(setOperations);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        String code = "INV-AG00105-ABC123";
        when(setOperations.members("agency:1:invitations")).thenReturn(Set.of(code));

        AgencyInvitationRedisDto redisDto = AgencyInvitationRedisDto.builder()
                .inviteCode(code)
                .agencyId(1L)
                .agencyName("Glamour Bridal Luxury Studio")
                .proposedCommissionRate(new BigDecimal("30.00"))
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(72))
                .build();
        String json = objectMapper.writeValueAsString(redisDto);
        when(valueOperations.get("agency:invitation:" + code)).thenReturn(json);

        List<AgencyInvitationRes> list = agencyStaffService.getInvitations(10L);

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals(code, list.get(0).getInviteCode());
    }

    @Test
    @DisplayName("US-AGC-02: Hủy mã mời khỏi Redis thành công")
    void cancelInvitation_Success() throws Exception {
        String code = "INV-AG00105-ABC123";
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));

        AgencyInvitationRedisDto redisDto = AgencyInvitationRedisDto.builder()
                .inviteCode(code)
                .agencyId(1L)
                .build();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);
        String json = objectMapper.writeValueAsString(redisDto);
        when(valueOperations.get("agency:invitation:" + code)).thenReturn(json);

        agencyStaffService.cancelInvitation(10L, code);

        verify(redisTemplate).delete("agency:invitation:" + code);
        verify(setOperations).remove("agency:1:invitations", code);
    }

    @Test
    @DisplayName("US-AGC-02: Hủy mã mời khi không tồn tại trong Redis sẽ ném 404")
    void cancelInvitation_WhenNotFound_ThrowsException() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);
        when(valueOperations.get("agency:invitation:INV-NONE")).thenReturn(null);

        assertThrows(ResourceNotFoundException.class, () -> agencyStaffService.cancelInvitation(10L, "INV-NONE"));
    }

    @Test
    @DisplayName("US-AGC-02: Thợ nộp đơn gia nhập Studio thành công (trạng thái PENDING)")
    void acceptInvitation_Success_WhenNewStaff() throws Exception {
        when(muaProfileRepository.findByUserId(25L)).thenReturn(Optional.of(mockMua));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        String code = "INV-AG00105-ABC123";
        AgencyInvitationRedisDto redisDto = AgencyInvitationRedisDto.builder()
                .inviteCode(code)
                .agencyId(1L)
                .agencyName("Glamour Bridal Luxury Studio")
                .proposedCommissionRate(new BigDecimal("30.00"))
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();

        String json = objectMapper.writeValueAsString(redisDto);
        when(valueOperations.get("agency:invitation:" + code)).thenReturn(json);
        when(agencyProfileRepository.findById(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findByAgencyIdAndMuaId(1L, 5L)).thenReturn(Optional.empty());
        when(agencyStaffRepository.save(any(AgencyStaffEntity.class))).thenAnswer(invocation -> {
            AgencyStaffEntity s = invocation.getArgument(0);
            s.setId(101L);
            return s;
        });

        AcceptInvitationReq req = AcceptInvitationReq.builder().inviteCode(code).build();
        AgencyStaffRes res = agencyStaffService.acceptInvitation(25L, req);

        assertNotNull(res);
        assertEquals("PENDING", res.getStatus());
        assertFalse(res.getIsActive());
        assertEquals(new BigDecimal("30.00"), res.getAgreedCommissionRate());

        // Mã mời được giữ lại trong Redis để nhiều thợ có thể cùng dùng nộp đơn
    }

    @Test
    @DisplayName("US-AGC-02: Thợ nộp đơn khi đã là nhân viên ACTIVE sẽ bị chặn 400")
    void acceptInvitation_WhenAlreadyActive_ThrowsException() throws Exception {
        when(muaProfileRepository.findByUserId(25L)).thenReturn(Optional.of(mockMua));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        String code = "INV-AG00105-ABC123";
        AgencyInvitationRedisDto redisDto = AgencyInvitationRedisDto.builder()
                .inviteCode(code)
                .agencyId(1L)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();

        String json = objectMapper.writeValueAsString(redisDto);
        when(valueOperations.get("agency:invitation:" + code)).thenReturn(json);
        when(agencyProfileRepository.findById(1L)).thenReturn(Optional.of(mockAgency));

        mockStaff.setIsActive(true);
        mockStaff.setStatus("ACTIVE");
        when(agencyStaffRepository.findByAgencyIdAndMuaId(1L, 5L)).thenReturn(Optional.of(mockStaff));

        AcceptInvitationReq req = AcceptInvitationReq.builder().inviteCode(code).build();
        CustomBusinessException ex = assertThrows(CustomBusinessException.class,
                () -> agencyStaffService.acceptInvitation(25L, req));

        assertEquals(ErrorCodes.ERR_STAFF_ALREADY_EXISTS, ex.getErrorCode());
    }

    @Test
    @DisplayName("US-AGC-03: Chủ Studio duyệt đơn thợ (APPROVE) cập nhật ACTIVE và hoa hồng")
    void reviewStaffApplication_WhenApprove_ShouldUpdateStatusActiveAndCommission() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(agencyStaffRepository.save(any(AgencyStaffEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewStaffApplicationReq req = ReviewStaffApplicationReq.builder()
                .decision("APPROVE")
                .agreedCommissionRate(new BigDecimal("35.00"))
                .note("Hồ sơ đạt chuẩn")
                .build();

        AgencyStaffRes res = agencyStaffService.reviewStaffApplication(10L, 101L, req);

        assertNotNull(res);
        assertEquals("ACTIVE", res.getStatus());
        assertTrue(res.getIsActive());
        assertEquals(new BigDecimal("35.00"), res.getAgreedCommissionRate());
        verify(agencyStaffRepository).save(mockStaff);
    }

    @Test
    @DisplayName("US-AGC-03: Chủ Studio từ chối đơn thợ (REJECT) cập nhật REJECTED và inactive")
    void reviewStaffApplication_WhenReject_ShouldUpdateStatusRejectedAndInactive() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(agencyStaffRepository.save(any(AgencyStaffEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewStaffApplicationReq req = ReviewStaffApplicationReq.builder()
                .decision("REJECT")
                .note("Chưa phù hợp định hướng")
                .build();

        AgencyStaffRes res = agencyStaffService.reviewStaffApplication(10L, 101L, req);

        assertNotNull(res);
        assertEquals("REJECTED", res.getStatus());
        assertFalse(res.getIsActive());
        assertEquals("Chưa phù hợp định hướng", mockStaff.getNote());
        verify(agencyStaffRepository).save(mockStaff);
    }

    @Test
    @DisplayName("US-AGC-03: IDOR - Duyệt thợ của Studio khác bị ném 404")
    void reviewStaffApplication_WhenStaffBelongsToAnotherAgency_ShouldThrowNotFound() {
        AgencyProfileEntity otherAgency = AgencyProfileEntity.builder().build();
        otherAgency.setId(99L);
        mockStaff.setAgency(otherAgency);

        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));

        ReviewStaffApplicationReq req = ReviewStaffApplicationReq.builder()
                .decision("APPROVE")
                .build();

        assertThrows(ResourceNotFoundException.class,
                () -> agencyStaffService.reviewStaffApplication(10L, 101L, req));
    }

    @Test
    @DisplayName("US-AGC-03: Cập nhật tỷ lệ hoa hồng riêng cho thợ thành công (ISSUE-12.3)")
    void updateStaffCommission_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(agencyStaffRepository.save(any(AgencyStaffEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateStaffCommissionReq req = UpdateStaffCommissionReq.builder()
                .agreedCommissionRate(new BigDecimal("35.00"))
                .build();

        AgencyStaffRes res = agencyStaffService.updateStaffCommission(10L, 101L, req);

        assertNotNull(res);
        assertEquals(new BigDecimal("35.00"), res.getAgreedCommissionRate());
        assertEquals(new BigDecimal("35.00"), mockStaff.getAgreedCommissionRate());
        verify(agencyStaffRepository).save(mockStaff);
    }

    @Test
    @DisplayName("US-AGC-03: Cập nhật trạng thái làm việc thợ (SUSPENDED)")
    void updateStaffStatus_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(agencyStaffRepository.save(any(AgencyStaffEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateStaffStatusReq req = UpdateStaffStatusReq.builder()
                .status("SUSPENDED")
                .note("Tạm nghỉ việc gia đình")
                .build();

        AgencyStaffRes res = agencyStaffService.updateStaffStatus(10L, 101L, req);

        assertNotNull(res);
        assertEquals("SUSPENDED", res.getStatus());
        assertFalse(res.getIsActive());
        assertEquals("Tạm nghỉ việc gia đình", mockStaff.getNote());
    }

    @Test
    @DisplayName("US-AGC-03: Cho thợ rời Studio (Offboarding) đánh dấu LEFT")
    void removeStaff_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(agencyStaffRepository.save(any(AgencyStaffEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        agencyStaffService.removeStaff(10L, 101L);

        assertEquals("LEFT", mockStaff.getStatus());
        assertFalse(mockStaff.getIsActive());
        verify(agencyStaffRepository).save(mockStaff);
    }

    @Test
    @DisplayName("US-AGC-02: Lấy danh sách nhân viên Studio phân trang thành công")
    void getStaffList_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        Pageable pageable = PageRequest.of(0, 10);
        Page<AgencyStaffEntity> page = new PageImpl<>(List.of(mockStaff), pageable, 1);
        when(agencyStaffRepository.findByAgencyId(1L, pageable)).thenReturn(page);

        Page<AgencyStaffRes> res = agencyStaffService.getStaffList(10L, pageable);

        assertNotNull(res);
        assertEquals(1, res.getTotalElements());
        assertEquals(101L, res.getContent().get(0).getId());
    }

    @Test
    @DisplayName("US-AGC-02: Lấy chi tiết nhân viên Studio thành công")
    void getStaffDetail_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findByIdAndAgencyIdWithMuaAndUser(101L, 1L)).thenReturn(Optional.of(mockStaff));

        AgencyStaffDetailRes res = agencyStaffService.getStaffDetail(10L, 101L);

        assertNotNull(res);
        assertEquals(101L, res.getId());
        assertEquals("Trần Thanh Tâm", res.getFullName());
    }
}
