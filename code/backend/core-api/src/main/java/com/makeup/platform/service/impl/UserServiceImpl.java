package com.makeup.platform.service.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.auth.UpdateProfileReq;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.service.AuthService;
import com.makeup.platform.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AuthService authService;

    @Override
    @Transactional
    public UserInfoRes updateProfile(Long userId, UpdateProfileReq req) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "Không tìm thấy người dùng.", HttpStatus.NOT_FOUND));

        if (StringUtils.hasText(req.getFullName())) {
            user.setFullName(req.getFullName());
        }
        if (StringUtils.hasText(req.getAvatarUrl())) {
            user.setAvatarUrl(req.getAvatarUrl());
        }
        if (StringUtils.hasText(req.getGender())) {
            user.setGender(req.getGender());
        }

        userRepository.save(user);
        log.info("Profile updated successfully for userId: {}", userId);

        return authService.getCurrentUser(userId);
    }
}
