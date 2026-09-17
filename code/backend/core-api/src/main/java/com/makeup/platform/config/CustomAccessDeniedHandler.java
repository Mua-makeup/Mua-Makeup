package com.makeup.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import com.makeup.platform.common.i18n.JsonMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import java.util.Locale;

@Slf4j
@Component
@RequiredArgsConstructor
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;
    private final JsonMessageSource messageSource;
    private final LocaleResolver localeResolver;

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        log.warn("Access denied for request to {}: {}", request.getRequestURI(), accessDeniedException.getMessage());

        if (!response.isCommitted()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());

            Locale locale = localeResolver.resolveLocale(request);
            String message = messageSource.getMessageString("auth.access_denied", locale);
            if (message == null) {
                message = "Access denied: You do not have permission to perform this action.";
            }

            ApiResponse<Void> errorResponse = ApiResponse.error(
                    ErrorCodes.ERR_FORBIDDEN,
                    message
            );

            objectMapper.writeValue(response.getWriter(), errorResponse);
        }
    }
}
