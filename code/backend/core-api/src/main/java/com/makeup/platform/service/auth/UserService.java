package com.makeup.platform.service.auth;

import com.makeup.platform.dto.request.auth.UpdateProfileReq;
import com.makeup.platform.dto.response.auth.UserInfoRes;

public interface UserService {

    UserInfoRes updateProfile(Long userId, UpdateProfileReq req);
}
