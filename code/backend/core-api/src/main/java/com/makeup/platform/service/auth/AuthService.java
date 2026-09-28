package com.makeup.platform.service.auth;

import com.makeup.platform.dto.request.auth.ChangePasswordReq;
import com.makeup.platform.dto.request.auth.LoginReq;
import com.makeup.platform.dto.request.auth.LogoutReq;
import com.makeup.platform.dto.request.auth.RefreshTokenReq;
import com.makeup.platform.dto.request.auth.RegisterReq;
import com.makeup.platform.dto.request.auth.Resend2FaReq;
import com.makeup.platform.dto.request.auth.UpdateLanguageReq;
import com.makeup.platform.dto.request.auth.Verify2FaReq;
import com.makeup.platform.dto.response.auth.AuthRes;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.dto.response.auth.UserRegisterRes;

public interface AuthService {

    UserRegisterRes register(RegisterReq req);

    AuthRes login(LoginReq req);

    AuthRes refreshToken(RefreshTokenReq req, String oldAccessToken);

    void logout(LogoutReq req, String accessToken);

    void changePassword(Long userId, ChangePasswordReq req);

    UserInfoRes getCurrentUser(Long userId);

    UserInfoRes updateLanguage(Long userId, UpdateLanguageReq req);

    AuthRes verify2Fa(Verify2FaReq req);

    void resend2FaOtp(Resend2FaReq req);
}
