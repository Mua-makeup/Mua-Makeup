package com.makeup.platform.service.auth;

public interface RedisTokenService {

    void saveRefreshToken(String refreshToken, Long userId, long ttlDays);

    Long getUserIdByRefreshToken(String refreshToken);

    void deleteRefreshToken(String refreshToken);

    void blacklistAccessToken(String accessToken, long remainingMs);

    boolean isTokenBlacklisted(String accessToken);
}
