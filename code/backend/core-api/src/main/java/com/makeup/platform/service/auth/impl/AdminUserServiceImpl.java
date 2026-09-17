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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;
    private final AuthMapper authMapper;

    @Override
    @Transactional(readOnly = true)
    public List<AdminUserRes> getAllUsers(String role, String keyword) {
        List<UserEntity> users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        return users.stream()
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
}
