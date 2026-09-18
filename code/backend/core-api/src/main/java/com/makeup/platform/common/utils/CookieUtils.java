package com.makeup.platform.common.utils;

import com.makeup.platform.common.constants.SecurityConstants;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

@Slf4j
@Component
public class CookieUtils {

    @Value("${jwt.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${jwt.access-token-expiration-ms:86400000}")
    private long accessTokenExpirationMs;

    @Value("${jwt.refresh-token-expiration-days:30}")
    private long refreshTokenExpirationDays;

    /**
     * Ghi Access Token vào HttpOnly Cookie để bảo vệ chống XSS.
     */
    public void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        long maxAgeSeconds = Math.max(1, accessTokenExpirationMs / 1000);
        ResponseCookie cookie = ResponseCookie.from(SecurityConstants.ACCESS_TOKEN_COOKIE_NAME, accessToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        log.debug("Set access token cookie with maxAge: {}s", maxAgeSeconds);
    }

    /**
     * Thu hồi/xóa Access Token Cookie khi Logout.
     */
    public void deleteAccessTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(SecurityConstants.ACCESS_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        log.debug("Deleted access token cookie");
    }

    /**
     * Trích xuất Access Token từ Cookie trong request.
     */
    public Optional<String> getAccessTokenFromCookie(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) {
            return Optional.empty();
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> SecurityConstants.ACCESS_TOKEN_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }

    /**
     * Ghi Refresh Token vào HttpOnly Cookie để bảo vệ chống XSS.
     */
    public void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        long maxAgeSeconds = refreshTokenExpirationDays * 24L * 60 * 60;
        ResponseCookie cookie = ResponseCookie.from(SecurityConstants.REFRESH_TOKEN_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        log.debug("Set refresh token cookie with maxAge: {}s", maxAgeSeconds);
    }

    /**
     * Thu hồi/xóa Refresh Token Cookie khi Logout.
     */
    public void deleteRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(SecurityConstants.REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        log.debug("Deleted refresh token cookie");
    }

    /**
     * Trích xuất Refresh Token từ Cookie trong request.
     */
    public Optional<String> getRefreshTokenFromCookie(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) {
            return Optional.empty();
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> SecurityConstants.REFRESH_TOKEN_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }
}
