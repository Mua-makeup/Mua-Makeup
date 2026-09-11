package com.makeup.platform.mapper.auth;

import com.makeup.platform.dto.response.auth.AuthRes;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.dto.response.auth.UserRegisterRes;
import com.makeup.platform.entity.auth.UserEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AuthMapper {

    public UserRegisterRes toRegisterRes(UserEntity user, String accountType, String muaCode, String agencyCode, List<String> roles) {
        if (user == null) {
            return null;
        }
        return UserRegisterRes.builder()
                .userId(user.getId())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .accountType(accountType)
                .muaCode(muaCode)
                .agencyCode(agencyCode)
                .roles(roles)
                .createdAt(user.getCreatedAt())
                .build();
    }

    public UserInfoRes toUserInfoRes(UserEntity user, Long agencyId, Long muaId, List<String> roles, List<String> permissions) {
        if (user == null) {
            return null;
        }
        return UserInfoRes.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .gender(user.getGender())
                .isVerified(user.getIsVerified())
                .agencyId(agencyId)
                .muaId(muaId)
                .language(user.getLanguage() != null ? user.getLanguage() : "en")
                .roles(roles)
                .permissions(permissions)
                .build();
    }

    public AuthRes toAuthRes(String accessToken, String refreshToken, long expiresIn, UserInfoRes userInfo) {
        return AuthRes.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .userInfo(userInfo)
                .build();
    }
}
