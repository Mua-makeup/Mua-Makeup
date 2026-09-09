package com.makeup.platform.service;

import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.common.utils.JwtUtils;
import com.makeup.platform.dto.request.auth.AccountType;
import com.makeup.platform.dto.request.auth.LoginReq;
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
import com.makeup.platform.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
    @DisplayName("Đăng nhập bằng số điện thoại và mật khẩu thành công - Lưu Refresh Token vào Redis")
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

        when(userRepository.findByPhoneNumber("0981234567")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123@", "hashedPassword")).thenReturn(true);
        when(rolePermissionRepository.findPermissionCodesByRoleId(anyInt()))
                .thenReturn(List.of("booking:create", "booking:view_my_jobs"));
        when(jwtUtils.generateAccessToken(anyLong(), anyString(), anyString(), any(), any(), anyList(), anyList()))
                .thenReturn("mocked.jwt.token");

        AuthRes res = authService.login(req);

        assertNotNull(res);
        assertEquals("mocked.jwt.token", res.getAccessToken());
        assertNotNull(res.getRefreshToken());
        assertEquals("Bearer", res.getTokenType());
        assertEquals(100L, res.getUserInfo().getId());
        verify(redisTokenService).saveRefreshToken(anyString(), anyLong(), anyLong());
    }
}
