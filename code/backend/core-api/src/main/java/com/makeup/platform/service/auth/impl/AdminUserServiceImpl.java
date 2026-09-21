package com.makeup.platform.service.auth.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.admin.AdminUserRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.mapper.auth.AuthMapper;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.service.auth.AdminUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.makeup.platform.common.base.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.dto.request.admin.AdminCreateUserReq;
import com.makeup.platform.entity.auth.RoleEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.RoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Year;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final MuaProfileRepository muaProfileRepository;
    private final AuthMapper authMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminUserRes> getAllUsers(String role, String keyword, Pageable pageable) {
        List<UserEntity> users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<AdminUserRes> filtered = users.stream()
                .filter(u -> {
                    // Filter by role
                    if (role != null && !role.isBlank() && !role.equalsIgnoreCase("ALL")) {
                        if (u.getRole() == null || !u.getRole().getName().equalsIgnoreCase(role.trim())) {
                            return false;
                        }
                    }

                    // Filter by keyword (fullName, email, phoneNumber)
                    if (keyword != null && !keyword.isBlank()) {
                        String kw = keyword.toLowerCase().trim();
                        boolean matchName = u.getFullName() != null && u.getFullName().toLowerCase().contains(kw);
                        boolean matchEmail = u.getEmail() != null && u.getEmail().toLowerCase().contains(kw);
                        boolean matchPhone = u.getPhoneNumber() != null && u.getPhoneNumber().contains(kw);
                        return matchName || matchEmail || matchPhone;
                    }

                    return true;
                })
                .map(authMapper::toAdminUserRes)
                .collect(Collectors.toList());

        if (pageable == null || pageable.isUnpaged()) {
            return PageResponse.<AdminUserRes>builder()
                    .content(filtered)
                    .page(0)
                    .size(filtered.size())
                    .totalElements(filtered.size())
                    .totalPages(filtered.isEmpty() ? 0 : 1)
                    .last(true)
                    .build();
        }

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        List<AdminUserRes> pagedList = start > filtered.size() ? List.of() : filtered.subList(start, end);
        Page<AdminUserRes> page = new PageImpl<>(pagedList, pageable, filtered.size());
        return PageResponse.from(page);
    }

    @Override
    @Transactional
    public AdminUserRes updateUserStatus(Long userId, Boolean active) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        user.setIsActive(Boolean.TRUE.equals(active));
        UserEntity updated = userRepository.save(user);

        log.info("Admin changed user status: userId={}, newStatus={}", userId, user.getIsActive());
        return authMapper.toAdminUserRes(updated);
    }

    @Override
    @Transactional
    public AdminUserRes createUser(AdminCreateUserReq req) {
        // 1. Kiểm tra trùng số điện thoại
        if (userRepository.existsByPhoneNumber(req.getPhoneNumber())) {
            throw new CustomBusinessException(ErrorCodes.ERR_PHONE_ALREADY_EXISTS,
                    "auth.phone_already_exists", HttpStatus.CONFLICT);
        }

        // 2. Kiểm tra trùng email (nếu có)
        if (StringUtils.hasText(req.getEmail()) && userRepository.existsByEmail(req.getEmail())) {
            throw new CustomBusinessException(ErrorCodes.ERR_EMAIL_ALREADY_EXISTS,
                    "auth.email_already_exists", HttpStatus.CONFLICT);
        }

        // 3. Phân định Role
        String targetRoleName = StringUtils.hasText(req.getRole()) ? req.getRole().trim() : SecurityConstants.ROLE_CUSTOMER;
        RoleEntity role = roleRepository.findByName(targetRoleName)
                .orElseGet(() -> roleRepository.findByName(SecurityConstants.ROLE_CUSTOMER)
                        .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ROLE_NOT_FOUND,
                                "auth.role_not_found", HttpStatus.NOT_FOUND)));

        // 4. Tạo UserEntity
        UserEntity user = UserEntity.builder()
                .fullName(req.getFullName().trim())
                .phoneNumber(req.getPhoneNumber().trim())
                .email(StringUtils.hasText(req.getEmail()) ? req.getEmail().trim() : null)
                .gender(StringUtils.hasText(req.getGender()) ? req.getGender().trim() : null)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .isActive(true)
                .isVerified(true)
                .language("vi")
                .role(role)
                .build();

        user = userRepository.save(user);

        // 5. Nếu là Freelance MUA, khởi tạo Profile
        if (SecurityConstants.ROLE_FREELANCE_MUA.equalsIgnoreCase(role.getName())) {
            int currentYear = Year.now().getValue();
            String generatedMuaCode = String.format("MUA-%d-%05d", currentYear, user.getId());

            Integer experienceYears = req.getExperienceYears() != null ? req.getExperienceYears() : 1;
            BigDecimal maxServiceRadiusKm = req.getMaxServiceRadiusKm() != null ? req.getMaxServiceRadiusKm() : new BigDecimal("15.0");
            String bio = StringUtils.hasText(req.getBio()) ? req.getBio().trim() : null;

            MuaProfileEntity muaProfile = MuaProfileEntity.builder()
                    .user(user)
                    .muaCode(generatedMuaCode)
                    .bio(bio)
                    .experienceYears(experienceYears)
                    .maxServiceRadiusKm(maxServiceRadiusKm)
                    .ratingAvg(null) 
                    .totalCompletedJobs(0)
                    .totalReviews(0)
                    .isOnline(false)
                    .isBusy(false)
                    .build();

            muaProfileRepository.save(muaProfile);
        }

        log.info("Super Admin created new user: id={}, phone={}, role={}", user.getId(), user.getPhoneNumber(), role.getName());
        return authMapper.toAdminUserRes(user);
    }
}
