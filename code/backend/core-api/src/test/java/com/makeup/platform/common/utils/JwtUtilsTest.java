package com.makeup.platform.common.utils;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtUtilsTest {

    private JwtUtils jwtUtils;
    private static final String SECRET_KEY = "TestSecretKeyForJwtTokenValidationMustBeLongEnough1234567890!";

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", SECRET_KEY);
        ReflectionTestUtils.setField(jwtUtils, "accessTokenExpirationMs", 3600000L); // 1 hour
        ReflectionTestUtils.setField(jwtUtils, "refreshTokenExpirationDays", 30L);
    }

    @Test
    @DisplayName("Token hợp lệ -> validateToken trả về true")
    void testValidateToken_Success() {
        String token = jwtUtils.generateAccessToken(1L, "0901234567", "Test User", null, null, List.of("ROLE_USER"), List.of());
        assertTrue(jwtUtils.validateToken(token));
    }

    @Test
    @DisplayName("Token hết hạn -> validateToken ném CustomBusinessException ERR_TOKEN_EXPIRED")
    void testValidateToken_Expired() {
        ReflectionTestUtils.setField(jwtUtils, "accessTokenExpirationMs", -1000L); // Expired immediately
        String expiredToken = jwtUtils.generateAccessToken(1L, "0901234567", "Test User", null, null, List.of("ROLE_USER"), List.of());

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () -> jwtUtils.validateToken(expiredToken));
        assertEquals(ErrorCodes.ERR_TOKEN_EXPIRED, ex.getErrorCode());
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    }

    @Test
    @DisplayName("Chữ ký token không hợp lệ -> validateToken ném CustomBusinessException ERR_TOKEN_INVALID_SIGNATURE")
    void testValidateToken_InvalidSignature() {
        String token = jwtUtils.generateAccessToken(1L, "0901234567", "Test User", null, null, List.of("ROLE_USER"), List.of());
        // Modify signature part
        String tamperedToken = token.substring(0, token.lastIndexOf('.') + 1) + "invalidSignatureHere";

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () -> jwtUtils.validateToken(tamperedToken));
        assertEquals(ErrorCodes.ERR_TOKEN_INVALID_SIGNATURE, ex.getErrorCode());
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    }

    @Test
    @DisplayName("Cấu trúc token dị dạng -> validateToken ném CustomBusinessException ERR_TOKEN_MALFORMED")
    void testValidateToken_Malformed() {
        String malformedToken = "this.is.not.a.valid.jwt";

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () -> jwtUtils.validateToken(malformedToken));
        assertEquals(ErrorCodes.ERR_TOKEN_MALFORMED, ex.getErrorCode());
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    }

    @Test
    @DisplayName("Chuỗi token rỗng -> validateToken ném CustomBusinessException ERR_TOKEN_INVALID")
    void testValidateToken_Empty() {
        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () -> jwtUtils.validateToken(""));
        assertEquals(ErrorCodes.ERR_TOKEN_INVALID, ex.getErrorCode());
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    }
}
