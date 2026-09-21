package com.makeup.platform.service.auth.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.MediaConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.FileValidationUtils;
import com.makeup.platform.dto.request.auth.UpdateProfileReq;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.dto.response.media.CloudMediaUploadResult;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.service.auth.AuthService;
import com.makeup.platform.service.auth.UserService;
import com.makeup.platform.service.media.MediaStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final MediaStorageService mediaStorageService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserInfoRes updateProfile(Long userId, UpdateProfileReq req) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "Không tìm thấy người dùng.", HttpStatus.NOT_FOUND));

        if (StringUtils.hasText(req.getFullName())) {
            user.setFullName(req.getFullName().trim());
        }
        if (StringUtils.hasText(req.getEmail())) {
            String newEmail = req.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.existsByEmailAndIdNot(newEmail, userId)) {
                    throw new CustomBusinessException(ErrorCodes.ERR_EMAIL_ALREADY_EXISTS,
                            "ERR_EMAIL_ALREADY_EXISTS", HttpStatus.CONFLICT);
                }
                user.setEmail(newEmail);
            }
        }
        if (StringUtils.hasText(req.getGender())) {
            user.setGender(req.getGender().trim());
        }

        userRepository.save(user);
        log.info("Profile updated successfully for userId: {}", userId);

        return authService.getCurrentUser(userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserInfoRes uploadAvatar(Long userId, MultipartFile file) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "Không tìm thấy người dùng.", HttpStatus.NOT_FOUND));

        FileValidationUtils.validateImageFile(file, MediaConstants.MAX_AVATAR_IMAGE_SIZE);

        CloudMediaUploadResult result = mediaStorageService.uploadImage(file, "avatars/" + userId);
        user.setAvatarUrl(result.getImageUrl());
        userRepository.save(user);
        log.info("Avatar uploaded to Cloudinary and updated successfully for userId: {}", userId);

        return authService.getCurrentUser(userId);
    }
}
