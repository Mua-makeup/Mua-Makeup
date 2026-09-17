package com.makeup.platform.common.base;

import com.makeup.platform.common.i18n.JsonMessageSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Locale;

public abstract class BaseController {

    @Autowired(required = false)
    private JsonMessageSource messageSource;

    private String resolveMessage(String messageOrKey, Object[] args, String defaultMessage) {
        if (messageSource != null && messageOrKey != null) {
            Locale locale = LocaleContextHolder.getLocale();
            String msg = messageSource.getMessageString(messageOrKey, locale);
            if (msg != null) {
                return messageSource.getLocalizedMessage(messageOrKey, args, msg, locale);
            }
        }
        return defaultMessage != null ? defaultMessage : messageOrKey;
    }

    protected <T> ResponseEntity<ApiResponse<T>> ok(T data, String message) {
        String localized = resolveMessage(message, null, message);
        return ResponseEntity.ok(ApiResponse.success(data, localized));
    }

    protected <T> ResponseEntity<ApiResponse<T>> ok(T data) {
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    protected <T> ResponseEntity<ApiResponse<T>> okWithKey(T data, String messageKey, Object... args) {
        String localized = resolveMessage(messageKey, args, messageKey);
        return ResponseEntity.ok(ApiResponse.success(data, localized));
    }

    protected <T> ResponseEntity<ApiResponse<T>> created(T data, String message) {
        String localized = resolveMessage(message, null, message);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(data, localized));
    }

    protected <T> ResponseEntity<ApiResponse<T>> createdWithKey(T data, String messageKey, Object... args) {
        String localized = resolveMessage(messageKey, args, messageKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(data, localized));
    }

    protected <T> ResponseEntity<ApiResponse<T>> error(HttpStatus status, String errorCode, String message) {
        String localized = resolveMessage(message, null, message);
        return ResponseEntity.status(status).body(ApiResponse.error(errorCode, localized));
    }
}
