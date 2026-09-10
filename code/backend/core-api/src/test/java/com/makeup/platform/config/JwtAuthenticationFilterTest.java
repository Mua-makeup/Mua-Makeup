package com.makeup.platform.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.JwtUtils;
import com.makeup.platform.service.RedisTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private RedisTokenService redisTokenService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private ObjectMapper objectMapper;
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    private JwtAuthenticationEntryPoint entryPoint;
    private CustomAccessDeniedHandler accessDeniedHandler;

    private StringWriter responseWriter;

    @BeforeEach
    void setUp() throws IOException {
        SecurityContextHolder.clearContext();
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        jwtAuthenticationFilter = new JwtAuthenticationFilter(jwtUtils, redisTokenService, objectMapper);
        entryPoint = new JwtAuthenticationEntryPoint(objectMapper);
        accessDeniedHandler = new CustomAccessDeniedHandler(objectMapper);

        responseWriter = new StringWriter();
        lenient().when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Không có token -> Cho qua FilterChain, không xác thực")
    void testDoFilter_WhenNoToken_ShouldContinueFilterChain() throws ServletException, IOException {
        when(request.getHeader(SecurityConstants.HEADER_STRING)).thenReturn(null);

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Token nằm trong Redis Blacklist -> Trả về 401 ERR_TOKEN_BLACKLISTED")
    void testDoFilter_WhenTokenBlacklisted_ShouldReturn401() throws ServletException, IOException {
        String token = "blacklisted.jwt.token";
        when(request.getHeader(SecurityConstants.HEADER_STRING)).thenReturn(SecurityConstants.TOKEN_PREFIX + token);
        when(redisTokenService.isTokenBlacklisted(token)).thenReturn(true);

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(any(), any());

        JsonNode json = objectMapper.readTree(responseWriter.toString());
        assertFalse(json.get("success").asBoolean());
        assertEquals(ErrorCodes.ERR_TOKEN_BLACKLISTED, json.get("errorCode").asText());
    }

    @Test
    @DisplayName("Token đã hết hạn -> jwtUtils.validateToken ném CustomBusinessException ERR_TOKEN_EXPIRED")
    void testDoFilter_WhenTokenExpired_ShouldReturn401Expired() throws ServletException, IOException {
        String token = "expired.jwt.token";
        when(request.getHeader(SecurityConstants.HEADER_STRING)).thenReturn(SecurityConstants.TOKEN_PREFIX + token);
        when(redisTokenService.isTokenBlacklisted(token)).thenReturn(false);
        when(jwtUtils.validateToken(token)).thenThrow(new CustomBusinessException(
                ErrorCodes.ERR_TOKEN_EXPIRED, "Token đã hết hạn.", HttpStatus.UNAUTHORIZED));

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(any(), any());

        JsonNode json = objectMapper.readTree(responseWriter.toString());
        assertFalse(json.get("success").asBoolean());
        assertEquals(ErrorCodes.ERR_TOKEN_EXPIRED, json.get("errorCode").asText());
    }

    @Test
    @DisplayName("Chữ ký không hợp lệ -> jwtUtils.validateToken ném ERR_TOKEN_INVALID_SIGNATURE")
    void testDoFilter_WhenSignatureInvalid_ShouldReturn401Signature() throws ServletException, IOException {
        String token = "tampered.jwt.token";
        when(request.getHeader(SecurityConstants.HEADER_STRING)).thenReturn(SecurityConstants.TOKEN_PREFIX + token);
        when(redisTokenService.isTokenBlacklisted(token)).thenReturn(false);
        when(jwtUtils.validateToken(token)).thenThrow(new CustomBusinessException(
                ErrorCodes.ERR_TOKEN_INVALID_SIGNATURE, "Chữ ký token không hợp lệ.", HttpStatus.UNAUTHORIZED));

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(any(), any());

        JsonNode json = objectMapper.readTree(responseWriter.toString());
        assertFalse(json.get("success").asBoolean());
        assertEquals(ErrorCodes.ERR_TOKEN_INVALID_SIGNATURE, json.get("errorCode").asText());
    }

    @Test
    @DisplayName("Cấu trúc sai định dạng -> jwtUtils.validateToken ném ERR_TOKEN_MALFORMED")
    void testDoFilter_WhenMalformedToken_ShouldReturn401Malformed() throws ServletException, IOException {
        String token = "not.a.valid.jwt";
        when(request.getHeader(SecurityConstants.HEADER_STRING)).thenReturn(SecurityConstants.TOKEN_PREFIX + token);
        when(redisTokenService.isTokenBlacklisted(token)).thenReturn(false);
        when(jwtUtils.validateToken(token)).thenThrow(new CustomBusinessException(
                ErrorCodes.ERR_TOKEN_MALFORMED, "Cấu trúc token không đúng định dạng.", HttpStatus.UNAUTHORIZED));

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(any(), any());

        JsonNode json = objectMapper.readTree(responseWriter.toString());
        assertFalse(json.get("success").asBoolean());
        assertEquals(ErrorCodes.ERR_TOKEN_MALFORMED, json.get("errorCode").asText());
    }

    @Test
    @DisplayName("Token không hỗ trợ -> jwtUtils.validateToken ném ERR_TOKEN_UNSUPPORTED")
    void testDoFilter_WhenUnsupportedToken_ShouldReturn401Unsupported() throws ServletException, IOException {
        String token = "unsupported.jwt.token";
        when(request.getHeader(SecurityConstants.HEADER_STRING)).thenReturn(SecurityConstants.TOKEN_PREFIX + token);
        when(redisTokenService.isTokenBlacklisted(token)).thenReturn(false);
        when(jwtUtils.validateToken(token)).thenThrow(new CustomBusinessException(
                ErrorCodes.ERR_TOKEN_UNSUPPORTED, "Token không được hỗ trợ.", HttpStatus.UNAUTHORIZED));

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(any(), any());

        JsonNode json = objectMapper.readTree(responseWriter.toString());
        assertFalse(json.get("success").asBoolean());
        assertEquals(ErrorCodes.ERR_TOKEN_UNSUPPORTED, json.get("errorCode").asText());
    }

    @Test
    @DisplayName("Token là REFRESH_TOKEN thay vì ACCESS_TOKEN -> Trả về 401 ERR_TOKEN_TYPE_INVALID")
    void testDoFilter_WhenRefreshTokenProvided_ShouldReturn401TypeInvalid() throws ServletException, IOException {
        String token = "refresh.jwt.token";
        when(request.getHeader(SecurityConstants.HEADER_STRING)).thenReturn(SecurityConstants.TOKEN_PREFIX + token);
        when(redisTokenService.isTokenBlacklisted(token)).thenReturn(false);
        when(jwtUtils.validateToken(token)).thenReturn(true);
        when(jwtUtils.isAccessToken(token)).thenReturn(false);
        when(jwtUtils.getTokenType(token)).thenReturn(JwtUtils.REFRESH_TOKEN_TYPE);

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(filterChain, never()).doFilter(any(), any());

        JsonNode json = objectMapper.readTree(responseWriter.toString());
        assertFalse(json.get("success").asBoolean());
        assertEquals(ErrorCodes.ERR_TOKEN_TYPE_INVALID, json.get("errorCode").asText());
    }

    @Test
    @DisplayName("Token hợp lệ ACCESS_TOKEN -> Thiết lập SecurityContext và cho qua FilterChain")
    void testDoFilter_WhenTokenValid_ShouldAuthenticate() throws ServletException, IOException {
        String token = "valid.access.token";
        when(request.getHeader(SecurityConstants.HEADER_STRING)).thenReturn(SecurityConstants.TOKEN_PREFIX + token);
        when(redisTokenService.isTokenBlacklisted(token)).thenReturn(false);
        when(jwtUtils.validateToken(token)).thenReturn(true);
        when(jwtUtils.isAccessToken(token)).thenReturn(true);
        when(jwtUtils.getUserId(token)).thenReturn(100L);
        when(jwtUtils.getRoles(token)).thenReturn(List.of("ROLE_CUSTOMER"));
        when(jwtUtils.getPermissions(token)).thenReturn(List.of("PERM_BOOKING_CREATE"));

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(100L, SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        assertTrue(SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER")));
    }

    @Test
    @DisplayName("JwtAuthenticationEntryPoint -> Trả về 401 ERR_UNAUTHORIZED")
    void testEntryPoint_ShouldReturn401() throws IOException {
        when(request.getRequestURI()).thenReturn("/api/v1/customer/bookings");

        entryPoint.commence(request, response, new BadCredentialsException("Full authentication is required"));

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        JsonNode json = objectMapper.readTree(responseWriter.toString());
        assertFalse(json.get("success").asBoolean());
        assertEquals(ErrorCodes.ERR_UNAUTHORIZED, json.get("errorCode").asText());
    }

    @Test
    @DisplayName("CustomAccessDeniedHandler -> Trả về 403 ERR_FORBIDDEN")
    void testAccessDeniedHandler_ShouldReturn403() throws IOException {
        when(request.getRequestURI()).thenReturn("/api/v1/admin/users");

        accessDeniedHandler.handle(request, response, new AccessDeniedException("Access is denied"));

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        JsonNode json = objectMapper.readTree(responseWriter.toString());
        assertFalse(json.get("success").asBoolean());
        assertEquals(ErrorCodes.ERR_FORBIDDEN, json.get("errorCode").asText());
    }
}
