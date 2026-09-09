package com.makeup.platform.config;

import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.common.utils.JwtUtils;
import com.makeup.platform.service.RedisTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final RedisTokenService redisTokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = parseJwt(request);
            if (StringUtils.hasText(jwt)) {
                // Check if token is in Redis Blacklist
                if (redisTokenService.isTokenBlacklisted(jwt)) {
                    log.warn("Access token is blacklisted in Redis: {}", jwt);
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token has been revoked/logged out");
                    return;
                }

                if (jwtUtils.validateToken(jwt)) {
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

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userId, null, authorities);
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception e) {
            log.error("Cannot set user authentication: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader(SecurityConstants.HEADER_STRING);
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            return headerAuth.substring(SecurityConstants.TOKEN_PREFIX.length());
        }
        return null;
    }
}
