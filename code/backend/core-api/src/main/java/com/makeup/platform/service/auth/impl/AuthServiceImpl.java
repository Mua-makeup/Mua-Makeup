package com.makeup.platform.service.auth.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.JwtUtils;
import com.makeup.platform.dto.request.auth.AccountType;
import com.makeup.platform.dto.request.auth.AgencyRegisterDetails;
import com.makeup.platform.dto.request.auth.ChangePasswordReq;
import com.makeup.platform.dto.request.auth.LoginReq;
import com.makeup.platform.dto.request.auth.LogoutReq;
import com.makeup.platform.dto.request.auth.MuaRegisterDetails;
import com.makeup.platform.dto.request.auth.RefreshTokenReq;
import com.makeup.platform.dto.request.auth.RegisterReq;
import com.makeup.platform.dto.response.auth.AuthRes;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.dto.response.auth.UserRegisterRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.RoleEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.RolePermissionRepository;
import com.makeup.platform.repository.RoleRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.security.CustomUserDetails;
import com.makeup.platform.service.auth.AuthService;
import com.makeup.platform.service.auth.RedisTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Year;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final RedisTokenService redisTokenService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;
    private final com.makeup.platform.mapper.auth.AuthMapper authMapper;

    @Value("${jwt.access-token-expiration-ms:86400000}")
    private long accessTokenExpirationMs;

    @Value("${jwt.refresh-token-expiration-days:30}")
    private long refreshTokenExpirationDays;

    @Override
    @Transactional
    public UserRegisterRes register(RegisterReq req) {
        AccountType accountType = req.getAccountType() != null ? req.getAccountType() : AccountType.CUSTOMER;
        log.info("Processing registration for phone: {}, type: {}", req.getPhoneNumber(), accountType);

        // 1. Kiểm tra tính duy nhất của SĐT và Email
        if (userRepository.existsByPhoneNumber(req.getPhoneNumber())) {
            throw new CustomBusinessException(ErrorCodes.ERR_PHONE_ALREADY_EXISTS,
                    "ERR_PHONE_ALREADY_EXISTS", HttpStatus.CONFLICT);
        }

        if (StringUtils.hasText(req.getEmail()) && userRepository.existsByEmail(req.getEmail())) {
            throw new CustomBusinessException(ErrorCodes.ERR_EMAIL_ALREADY_EXISTS,
                    "ERR_EMAIL_ALREADY_EXISTS", HttpStatus.CONFLICT);
        }

        // 2. Xác định Role duy nhất cho tài khoản (1 user = 1 role)
        RoleEntity assignedRole;
        if (accountType == AccountType.FREELANCER_MUA) {
            assignedRole = getRoleOrThrow(SecurityConstants.ROLE_FREELANCE_MUA);
        } else if (accountType == AccountType.AGENCY_ADMIN) {
            assignedRole = getRoleOrThrow(SecurityConstants.ROLE_AGENCY_ADMIN);
        } else if (accountType == AccountType.SUPER_ADMIN) {
            assignedRole = getRoleOrThrow(SecurityConstants.ROLE_SUPER_ADMIN);
        } else {
            assignedRole = getRoleOrThrow(SecurityConstants.ROLE_CUSTOMER);
        }

        // 3. Khởi tạo UserEntity
        UserEntity user = UserEntity.builder()
                .phoneNumber(req.getPhoneNumber())
                .email(StringUtils.hasText(req.getEmail()) ? req.getEmail() : null)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .gender(req.getGender())
                .isActive(true)
                .isVerified(false)
                .role(assignedRole)
                .build();

        user = userRepository.save(user);

        String generatedMuaCode = null;
        String generatedAgencyCode = null;

        // 4. Xử lý logic khởi tạo Profile theo loại tài khoản
        if (accountType == AccountType.FREELANCER_MUA) {
            MuaRegisterDetails details = req.getMuaDetails();
            int currentYear = Year.now().getValue();
            generatedMuaCode = String.format("MUA-%d-%05d", currentYear, user.getId());

            MuaProfileEntity muaProfile = MuaProfileEntity.builder()
                    .user(user)
                    .muaCode(generatedMuaCode)
                    .bio(details != null ? details.getBio() : null)
                    .experienceYears(details != null && details.getExperienceYears() != null ? details.getExperienceYears() : 1)
                    .maxServiceRadiusKm(details != null && details.getMaxServiceRadiusKm() != null ? details.getMaxServiceRadiusKm() : new BigDecimal("15.0"))
                    .isOnline(false)
                    .isBusy(false)
                    .ratingAvg(new BigDecimal("5.00"))
                    .totalCompletedJobs(0)
                    .build();

            muaProfileRepository.save(muaProfile);
        } else if (accountType == AccountType.AGENCY_ADMIN) {
            AgencyRegisterDetails details = req.getAgencyDetails();
            if (details == null) {
                throw new CustomBusinessException(ErrorCodes.ERR_AGENCY_DETAILS_REQUIRED,
                        "ERR_AGENCY_DETAILS_REQUIRED", HttpStatus.BAD_REQUEST);
            }

            String provinceCode = extractProvinceCode(details.getCity());
            generatedAgencyCode = String.format("AG-%s-%05d", provinceCode, user.getId());

            AgencyProfileEntity agencyProfile = AgencyProfileEntity.builder()
                    .owner(user)
                    .agencyCode(generatedAgencyCode)
                    .agencyName(details.getAgencyName())
                    .hotline(details.getHotline())
                    .addressStreet(details.getAddressStreet())
                    .district(details.getDistrict())
                    .city(details.getCity())
                    .commissionRateInternal(details.getCommissionRateInternal() != null ? details.getCommissionRateInternal() : new BigDecimal("30.00"))
                    .isVerified(false)
                    .ratingAvg(new BigDecimal("5.00"))
                    .build();

            agencyProfileRepository.save(agencyProfile);
        }

        List<String> roleNames = assignedRole != null ? List.of(assignedRole.getName()) : Collections.emptyList();

        return authMapper.toRegisterRes(
                user,
                accountType.name(),
                generatedMuaCode,
                generatedAgencyCode,
                roleNames
        );
    }

    @Override
    @Transactional(readOnly = true)
    public AuthRes login(LoginReq req) {
        log.info("Processing login via AuthenticationManager for identifier: {}", req.getLoginIdentifier());

        try {
            // Xác thực tập trung bằng AuthenticationManager & CustomUserDetailsService
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getLoginIdentifier(), req.getPassword())
            );

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            UserEntity user = userRepository.findById(userDetails.getUserId())
                    .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                            "ERR_USER_NOT_FOUND", HttpStatus.NOT_FOUND));

            return generateAuthResponse(user);
        } catch (BadCredentialsException e) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_CREDENTIALS,
                    "ERR_INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);
        } catch (DisabledException e) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_CREDENTIALS,
                    "ERR_INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);
        }
    }

    @Override
    @Transactional
    public AuthRes refreshToken(RefreshTokenReq req, String oldAccessToken) {
        String token = req.getRefreshToken();
        if (!jwtUtils.validateToken(token) || !jwtUtils.isRefreshToken(token)) {
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_INVALID,
                    "ERR_TOKEN_INVALID", HttpStatus.UNAUTHORIZED);
        }

        Long userId = redisTokenService.getUserIdByRefreshToken(token);

        if (userId == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_INVALID,
                    "ERR_TOKEN_INVALID", HttpStatus.UNAUTHORIZED);
        }

        // Refresh Token Rotation: Xóa token cũ ngay lập tức
        redisTokenService.deleteRefreshToken(token);

        // Blacklist Access Token cũ nếu nó còn thời hạn tồn tại
        if (StringUtils.hasText(oldAccessToken)) {
            String cleanToken = oldAccessToken.startsWith(SecurityConstants.TOKEN_PREFIX)
                    ? oldAccessToken.substring(SecurityConstants.TOKEN_PREFIX.length())
                    : oldAccessToken;

            long remainingMs = jwtUtils.getRemainingExpirationMs(cleanToken);
            if (remainingMs > 0) {
                redisTokenService.blacklistAccessToken(cleanToken, remainingMs);
                log.info("Blacklisted old access token during refresh: remaining {} ms", remainingMs);
            }
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "ERR_USER_NOT_FOUND", HttpStatus.UNAUTHORIZED));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED,
                    "ERR_UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
        }

        return generateAuthResponse(user);
    }

    @Override
    public void logout(LogoutReq req, String accessToken) {
        if (StringUtils.hasText(req.getRefreshToken())) {
            redisTokenService.deleteRefreshToken(req.getRefreshToken());
        }

        if (StringUtils.hasText(accessToken)) {
            String cleanToken = accessToken.startsWith(SecurityConstants.TOKEN_PREFIX)
                    ? accessToken.substring(SecurityConstants.TOKEN_PREFIX.length())
                    : accessToken;

            long remainingMs = jwtUtils.getRemainingExpirationMs(cleanToken);
            if (remainingMs > 0) {
                redisTokenService.blacklistAccessToken(cleanToken, remainingMs);
                log.info("Blacklisted access token successfully on logout: remaining {} ms", remainingMs);
            }
        }
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordReq req) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "ERR_USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
            throw new CustomBusinessException(ErrorCodes.ERR_CURRENT_PASSWORD_INCORRECT,
                    "ERR_CURRENT_PASSWORD_INCORRECT", HttpStatus.BAD_REQUEST);
        }

        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new CustomBusinessException(ErrorCodes.ERR_PASSWORD_MISMATCH,
                    "ERR_PASSWORD_MISMATCH", HttpStatus.BAD_REQUEST);
        }

        if (passwordEncoder.matches(req.getNewPassword(), user.getPasswordHash())) {
            throw new CustomBusinessException(ErrorCodes.ERR_PASSWORD_SAME_AS_OLD,
                    "ERR_PASSWORD_SAME_AS_OLD", HttpStatus.BAD_REQUEST);
        }

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed successfully for userId: {}", userId);
    }

    @Override
    @Transactional(readOnly = true)
    public UserInfoRes getCurrentUser(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "Không tìm thấy người dùng.", HttpStatus.NOT_FOUND));

        RoleEntity role = user.getRole();
        List<String> roles = role != null ? List.of(role.getName()) : Collections.emptyList();
        List<String> permissions = role != null ? rolePermissionRepository.findPermissionCodesByRoleId(role.getId()) : Collections.emptyList();

        Long agencyId = agencyProfileRepository.findByOwnerId(userId)
                .map(AgencyProfileEntity::getId)
                .orElse(null);

        Long muaId = muaProfileRepository.findByUserId(userId)
                .map(MuaProfileEntity::getId)
                .orElse(null);

        return authMapper.toUserInfoRes(user, agencyId, muaId, roles, permissions);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserInfoRes updateLanguage(Long userId, com.makeup.platform.dto.request.auth.UpdateLanguageReq req) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "ERR_USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        user.setLanguage(req.getLanguage().toLowerCase());
        userRepository.save(user);

        return getCurrentUser(userId);
    }

    private AuthRes generateAuthResponse(UserEntity user) {
        RoleEntity role = user.getRole();
        List<String> roles = role != null ? List.of(role.getName()) : Collections.emptyList();
        List<String> permissions = role != null ? rolePermissionRepository.findPermissionCodesByRoleId(role.getId()) : Collections.emptyList();

        Long agencyId = agencyProfileRepository.findByOwnerId(user.getId())
                .map(AgencyProfileEntity::getId)
                .orElse(null);

        Long muaId = muaProfileRepository.findByUserId(user.getId())
                .map(MuaProfileEntity::getId)
                .orElse(null);

        String accessToken = jwtUtils.generateAccessToken(
                user.getId(),
                user.getPhoneNumber(),
                user.getFullName(),
                agencyId,
                muaId,
                roles,
                permissions,
                user.getLanguage() != null ? user.getLanguage() : "en"
        );

        String refreshToken = jwtUtils.generateRefreshToken(user.getId());
        redisTokenService.saveRefreshToken(refreshToken, user.getId(), refreshTokenExpirationDays);

        UserInfoRes userInfo = authMapper.toUserInfoRes(user, agencyId, muaId, roles, permissions);

        return authMapper.toAuthRes(accessToken, refreshToken, accessTokenExpirationMs / 1000, userInfo);
    }

    private RoleEntity getRoleOrThrow(String roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_INTERNAL,
                        "Hệ thống chưa khởi tạo vai trò: " + roleName, HttpStatus.INTERNAL_SERVER_ERROR));
    }

    private String extractProvinceCode(String city) {
        if (!StringUtils.hasText(city)) {
            return "VN";
        }
        String normalized = city.toLowerCase(Locale.ROOT);
        if (normalized.contains("hà nội") || normalized.contains("ha noi")) {
            return "HN";
        }
        if (normalized.contains("hồ chí minh") || normalized.contains("ho chi minh") || normalized.contains("hcm")) {
            return "HCM";
        }
        if (normalized.contains("đà nẵng") || normalized.contains("da nang")) {
            return "DN";
        }
        if (normalized.contains("hải phòng") || normalized.contains("hai phong")) {
            return "HP";
        }
        if (normalized.contains("cần thơ") || normalized.contains("can tho")) {
            return "CT";
        }
        return "VN";
    }
}
