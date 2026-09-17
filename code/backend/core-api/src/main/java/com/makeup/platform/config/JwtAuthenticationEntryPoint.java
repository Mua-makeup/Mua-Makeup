package com.makeup.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import com.makeup.platform.common.i18n.JsonMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import java.util.Locale;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;
    private final JsonMessageSource messageSource;
    private final LocaleResolver localeResolver;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        log.warn("Unauthorized request to {}: {}", request.getRequestURI(), authException.getMessage());

        if (!response.isCommitted()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());

            Locale locale = localeResolver.resolveLocale(request);
            String message = messageSource.getMessageString("auth.unauthorized_token", locale);
            if (message == null) {
                message = "Authentication required. Please log in or provide a valid token.";
            }

            ApiResponse<Void> errorResponse = ApiResponse.error(
                    ErrorCodes.ERR_UNAUTHORIZED,
                    message
            );

            objectMapper.writeValue(response.getWriter(), errorResponse);
        }
    }
}
