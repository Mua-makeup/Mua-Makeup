package com.makeup.platform.service;

import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.common.utils.JwtUtils;
import com.makeup.platform.dto.request.auth.AccountType;
import com.makeup.platform.dto.request.auth.LoginReq;
import com.makeup.platform.dto.request.auth.RefreshTokenReq;
import com.makeup.platform.dto.request.auth.RegisterReq;
import com.makeup.platform.dto.response.auth.AuthRes;
import com.makeup.platform.dto.response.auth.UserRegisterRes;
import com.makeup.platform.entity.auth.RoleEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.RolePermissionRepository;
import com.makeup.platform.repository.RoleRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.security.CustomUserDetails;
import com.makeup.platform.service.auth.RedisTokenService;
import com.makeup.platform.service.auth.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RolePermissionRepository rolePermissionRepository;

    @Mock
    private AgencyProfileRepository agencyProfileRepository;

    @Mock
    private MuaProfileRepository muaProfileRepository;

    @Mock
    private RedisTokenService redisTokenService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "accessTokenExpirationMs", 7200000L);
        ReflectionTestUtils.setField(authService, "refreshTokenExpirationDays", 30L);
    }

    @Test
    @DisplayName("Đăng ký tài khoản Khách hàng thành công (1 Role duy nhất)")
    void registerCustomer_Success() {
        RegisterReq req = RegisterReq.builder()
                .phoneNumber("0981234567")
                .email("test@gmail.com")
                .password("Password123@")
                .fullName("Nguyễn Thị Test")
                .accountType(AccountType.CUSTOMER)
                .build();

        RoleEntity customerRole = RoleEntity.builder().id(1).name(SecurityConstants.ROLE_CUSTOMER).build();

        when(userRepository.existsByPhoneNumber(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(SecurityConstants.ROLE_CUSTOMER)).thenReturn(Optional.of(customerRole));
        when(passwordEncoder.encode(anyString())).thenReturn("hashedPassword");

        UserEntity savedUser = UserEntity.builder()
                .phoneNumber(req.getPhoneNumber())
                .email(req.getEmail())
                .passwordHash("hashedPassword")
                .fullName(req.getFullName())
                .role(customerRole)
                .build();
        savedUser.setId(100L);

        when(userRepository.save(any(UserEntity.class))).thenReturn(savedUser);

        UserRegisterRes res = authService.register(req);

        assertNotNull(res);
        assertEquals(100L, res.getUserId());
        assertEquals("0981234567", res.getPhoneNumber());
        assertEquals("CUSTOMER", res.getAccountType());
        assertTrue(res.getRoles().contains(SecurityConstants.ROLE_CUSTOMER));
        assertEquals(1, res.getRoles().size());
        verify(userRepository).save(any(UserEntity.class));
    }

    @Test
    @DisplayName("Đăng nhập chuẩn AuthenticationManager thành công - Lưu Refresh Token vào Redis")
    void login_Success() {
        LoginReq req = LoginReq.builder()
                .loginIdentifier("0981234567")
                .password("Password123@")
                .build();

        RoleEntity role = RoleEntity.builder().id(1).name(SecurityConstants.ROLE_CUSTOMER).build();
        UserEntity user = UserEntity.builder()
                .phoneNumber("0981234567")
                .email("test@gmail.com")
                .passwordHash("hashedPassword")
                .fullName("Nguyễn Thị Test")
                .isActive(true)
                .role(role)
                .build();
        user.setId(100L);

        CustomUserDetails userDetails = CustomUserDetails.build(user, List.of("booking:create"), null, null);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(userDetails);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        when(rolePermissionRepository.findPermissionCodesByRoleId(anyInt()))
                .thenReturn(List.of("booking:create", "booking:view_my_jobs"));
        when(jwtUtils.generateAccessToken(anyLong(), anyString(), anyString(), any(), any(), anyList(), anyList()))
                .thenReturn("mocked.jwt.token");
        when(jwtUtils.generateRefreshToken(anyLong()))
                .thenReturn("mocked.refresh.token");

        AuthRes res = authService.login(req);

        assertNotNull(res);
        assertEquals("mocked.jwt.token", res.getAccessToken());
        assertEquals("mocked.refresh.token", res.getRefreshToken());
        assertEquals("Bearer", res.getTokenType());
        assertEquals(100L, res.getUserInfo().getId());
        verify(redisTokenService).saveRefreshToken("mocked.refresh.token", 100L, 30L);
    }

    @Test
    @DisplayName("Làm mới Refresh Token thành công - Rotation và thu hồi token cũ")
    void refreshToken_Success() {
        RefreshTokenReq req = RefreshTokenReq.builder()
                .refreshToken("valid.refresh.jwt")
                .build();

        RoleEntity role = RoleEntity.builder().id(1).name(SecurityConstants.ROLE_CUSTOMER).build();
        UserEntity user = UserEntity.builder()
                .phoneNumber("0981234567")
                .email("test@gmail.com")
                .fullName("Nguyễn Thị Test")
                .isActive(true)
                .role(role)
                .build();
        user.setId(100L);

        when(jwtUtils.validateToken("valid.refresh.jwt")).thenReturn(true);
        when(jwtUtils.isRefreshToken("valid.refresh.jwt")).thenReturn(true);
        when(redisTokenService.getUserIdByRefreshToken("valid.refresh.jwt")).thenReturn(100L);
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        when(jwtUtils.generateAccessToken(anyLong(), anyString(), anyString(), any(), any(), anyList(), anyList()))
                .thenReturn("new.access.token");
        when(jwtUtils.generateRefreshToken(100L)).thenReturn("new.refresh.token");

        AuthRes res = authService.refreshToken(req);

        assertNotNull(res);
        assertEquals("new.access.token", res.getAccessToken());
        assertEquals("new.refresh.token", res.getRefreshToken());
        verify(redisTokenService).deleteRefreshToken("valid.refresh.jwt");
        verify(redisTokenService).saveRefreshToken("new.refresh.token", 100L, 30L);
    }

    @Test
    @DisplayName("Làm mới Refresh Token thành công kèm Blacklist Access Token cũ nếu còn thời hạn")
    void refreshToken_WithOldAccessToken_BlacklistsOldToken() {
        RefreshTokenReq req = RefreshTokenReq.builder()
                .refreshToken("valid.refresh.jwt")
                .accessToken("Bearer old.access.token")
                .build();

        RoleEntity role = RoleEntity.builder().id(1).name(SecurityConstants.ROLE_CUSTOMER).build();
        UserEntity user = UserEntity.builder()
                .phoneNumber("0981234567")
                .email("test@gmail.com")
                .fullName("Nguyễn Thị Test")
                .isActive(true)
                .role(role)
                .build();
        user.setId(100L);

        when(jwtUtils.validateToken("valid.refresh.jwt")).thenReturn(true);
        when(jwtUtils.isRefreshToken("valid.refresh.jwt")).thenReturn(true);
        when(redisTokenService.getUserIdByRefreshToken("valid.refresh.jwt")).thenReturn(100L);
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
        when(jwtUtils.getRemainingExpirationMs("old.access.token")).thenReturn(50000L);
        when(jwtUtils.generateAccessToken(anyLong(), anyString(), anyString(), any(), any(), anyList(), anyList()))
                .thenReturn("new.access.token");
        when(jwtUtils.generateRefreshToken(100L)).thenReturn("new.refresh.token");

        AuthRes res = authService.refreshToken(req, "Bearer old.access.token");

        assertNotNull(res);
        assertEquals("new.access.token", res.getAccessToken());
        assertEquals("new.refresh.token", res.getRefreshToken());
        verify(redisTokenService).blacklistAccessToken("old.access.token", 50000L);
        verify(redisTokenService).deleteRefreshToken("valid.refresh.jwt");
        verify(redisTokenService).saveRefreshToken("new.refresh.token", 100L, 30L);
    }
}
