package com.makeup.platform.service.auth;

import com.makeup.platform.dto.request.auth.UpdateProfileReq;
import com.makeup.platform.dto.response.auth.UserInfoRes;

import org.springframework.web.multipart.MultipartFile;

public interface UserService {

    UserInfoRes updateProfile(Long userId, UpdateProfileReq req);

    UserInfoRes uploadAvatar(Long userId, MultipartFile file);
}

