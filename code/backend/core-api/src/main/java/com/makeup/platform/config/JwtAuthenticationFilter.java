package com.makeup.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.JwtUtils;
import com.makeup.platform.service.auth.RedisTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final RedisTokenService redisTokenService;
    private final ObjectMapper objectMapper;

    @Override
    @SuppressWarnings("null")
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String jwt = parseJwt(request);

        if (StringUtils.hasText(jwt)) {
            try {
                // 1. Kiểm tra Redis Blacklist (Token đã logout hoặc bị thu hồi)
                if (redisTokenService.isTokenBlacklisted(jwt)) {
                    log.warn("Access token is blacklisted in Redis: {}", jwt);
                    throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_BLACKLISTED,
                            "Phiên đăng nhập đã bị hủy hoặc đã đăng xuất. Vui lòng đăng nhập lại.",
                            HttpStatus.UNAUTHORIZED);
                }

                // 2. Validate token (Tất cả exception JWT chi tiết được bắt & ném tại jwtUtils.validateToken)
                jwtUtils.validateToken(jwt);

                // 3. Strict Check: Xác minh token_type là ACCESS_TOKEN (chống Token Type Confusion Attack)
                if (!jwtUtils.isAccessToken(jwt)) {
                    log.warn("Token is not of ACCESS_TOKEN type: {}", jwtUtils.getTokenType(jwt));
                    throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_TYPE_INVALID,
                            "Loại token không hợp lệ cho tài nguyên này.",
                            HttpStatus.UNAUTHORIZED);
                }

                // 4. Trích xuất thông tin người dùng và thiết lập Security Context
                Long userId = jwtUtils.getUserId(jwt);
                List<String> roles = jwtUtils.getRoles(jwt);
                List<String> permissions = jwtUtils.getPermissions(jwt);

                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                if (roles != null) {
                    roles.forEach(role -> authorities.add(new SimpleGrantedAuthority(role)));
                }
                if (permissions != null) {
                    permissions.forEach(perm -> authorities.add(new SimpleGrantedAuthority(perm)));
                }

                String language = jwtUtils.getLanguage(jwt);
                request.setAttribute("USER_LANGUAGE", language);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userId, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (CustomBusinessException e) {
                sendErrorResponse(response, e.getStatus().value(), e.getErrorCode(), e.getMessage());
                return;
            } catch (Exception e) {
                log.error("Unexpected JWT processing error: {}", e.getMessage(), e);
                sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                        ErrorCodes.ERR_UNAUTHORIZED, "Xác thực không thành công: " + e.getMessage());
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private void sendErrorResponse(HttpServletResponse response, int status, String errorCode, String message) throws IOException {
        if (!response.isCommitted()) {
            response.setStatus(status);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());

            ApiResponse<Void> errorResponse = ApiResponse.error(errorCode, message);
            objectMapper.writeValue(response.getWriter(), errorResponse);
        }
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader(SecurityConstants.HEADER_STRING);
        if (StringUtils.hasText(headerAuth)) {
            String token = headerAuth.trim();
            while (token.regionMatches(true, 0, SecurityConstants.TOKEN_PREFIX, 0, SecurityConstants.TOKEN_PREFIX.length())) {
                token = token.substring(SecurityConstants.TOKEN_PREFIX.length()).trim();
            }
            if (!token.isEmpty() && !"null".equalsIgnoreCase(token) && !"undefined".equalsIgnoreCase(token)) {
                return token;
            }
        }
        return null;
    }
}

