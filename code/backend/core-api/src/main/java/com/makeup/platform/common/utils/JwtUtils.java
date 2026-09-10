package com.makeup.platform.common.utils;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.List;

@Slf4j
@Component
public class JwtUtils {

    public static final String TOKEN_TYPE_CLAIM = "token_type";
    public static final String ACCESS_TOKEN_TYPE = "ACCESS_TOKEN";
    public static final String REFRESH_TOKEN_TYPE = "REFRESH_TOKEN";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token-expiration-ms:86400000}")
    private long accessTokenExpirationMs;

    @Value("${jwt.refresh-token-expiration-days:30}")
    private long refreshTokenExpirationDays;

    private Key getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(Long userId, String phoneNumber, String fullName,
                                      Long agencyId, Long muaId,
                                      List<String> roles, List<String> permissions) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .setSubject(phoneNumber)
                .claim("user_id", userId)
                .claim("full_name", fullName)
                .claim("agency_id", agencyId)
                .claim("mua_id", muaId)
                .claim("roles", roles)
                .claim("permissions", permissions)
                .claim(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .setIssuer("makeup-booking-platform")
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationDays * 24L * 60 * 60 * 1000L);

        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("user_id", userId)
                .claim(TOKEN_TYPE_CLAIM, REFRESH_TOKEN_TYPE)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .setIssuer("makeup-booking-platform")
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("Invalid JWT token - Expired: {}", e.getMessage());
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_EXPIRED,
                    "Token đã hết hạn. Vui lòng làm mới token hoặc đăng nhập lại.",
                    HttpStatus.UNAUTHORIZED);
        } catch (SecurityException e) {
            log.warn("Invalid JWT token - Signature invalid: {}", e.getMessage());
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_INVALID_SIGNATURE,
                    "Chữ ký token không hợp lệ hoặc đã bị chỉnh sửa.",
                    HttpStatus.UNAUTHORIZED);
        } catch (MalformedJwtException e) {
            log.warn("Invalid JWT token - Malformed: {}", e.getMessage());
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_MALFORMED,
                    "Cấu trúc token không đúng định dạng.",
                    HttpStatus.UNAUTHORIZED);
        } catch (UnsupportedJwtException e) {
            log.warn("Invalid JWT token - Unsupported: {}", e.getMessage());
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_UNSUPPORTED,
                    "Token không được hỗ trợ bởi hệ thống.",
                    HttpStatus.UNAUTHORIZED);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid JWT token - Empty or illegal claims: {}", e.getMessage());
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_INVALID,
                    "Chuỗi token không hợp lệ hoặc rỗng.",
                    HttpStatus.UNAUTHORIZED);
        }
    }

    public String getTokenType(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            return claims.get(TOKEN_TYPE_CLAIM, String.class);
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isAccessToken(String token) {
        return ACCESS_TOKEN_TYPE.equals(getTokenType(token));
    }

    public boolean isRefreshToken(String token) {
        return REFRESH_TOKEN_TYPE.equals(getTokenType(token));
    }

    public long getRemainingExpirationMs(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            long diff = claims.getExpiration().getTime() - System.currentTimeMillis();
            return Math.max(diff, 0);
        } catch (Exception e) {
            return 0;
        }
    }

    public Long getUserId(String token) {
        Claims claims = getClaimsFromToken(token);
        Number userId = (Number) claims.get("user_id");
        return userId != null ? userId.longValue() : null;
    }

    @SuppressWarnings("unchecked")
    public List<String> getRoles(String token) {
        Claims claims = getClaimsFromToken(token);
        return (List<String>) claims.get("roles");
    }

    @SuppressWarnings("unchecked")
    public List<String> getPermissions(String token) {
        Claims claims = getClaimsFromToken(token);
        return (List<String>) claims.get("permissions");
    }
}
