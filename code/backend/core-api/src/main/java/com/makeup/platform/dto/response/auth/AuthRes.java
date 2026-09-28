package com.makeup.platform.dto.response.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthRes {

    private String accessToken;
    private String refreshToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private long expiresIn;
    private UserInfoRes userInfo;

    // 2FA Fields for Admin Login
    private Boolean requires2fa;
    private String tempToken;
    private String emailMasked;
}
