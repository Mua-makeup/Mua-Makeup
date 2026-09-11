package com.makeup.platform.common.exception;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.i18n.JsonMessageSource;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.util.StringUtils;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final JsonMessageSource messageSource;

    private String getLocalizedMessage(String key, Object[] args, String defaultMessage) {
        Locale locale = LocaleContextHolder.getLocale();
        return messageSource.getLocalizedMessage(key, args, defaultMessage, locale);
    }

    @ExceptionHandler(CustomBusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustomBusinessException(CustomBusinessException ex) {
        log.warn("Business exception: {} - {}", ex.getErrorCode(), ex.getMessage());
        Locale locale = LocaleContextHolder.getLocale();
        String resolvedMessage = resolveBusinessMessage(ex, locale);
        return ResponseEntity.status(ex.getStatus())
                .body(ApiResponse.error(ex.getErrorCode(), resolvedMessage));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        log.warn("Resource not found: {} - {}", ex.getErrorCode(), ex.getMessage());
        Locale locale = LocaleContextHolder.getLocale();
        String localizedMsg = resolveBusinessMessage(ex, locale);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getErrorCode() != null ? ex.getErrorCode() : "ERR_RESOURCE_NOT_FOUND", localizedMsg));
    }

    private String resolveBusinessMessage(CustomBusinessException ex, Locale locale) {
        if (ex == null) {
            return null;
        }

        if (StringUtils.hasText(ex.getMessage())) {
            String msg = messageSource.getMessageString(ex.getMessage(), locale);
            if (msg != null) {
                return messageSource.getLocalizedMessage(ex.getMessage(), ex.getArgs(), ex.getMessage(), locale);
            }
        }

        if (StringUtils.hasText(ex.getErrorCode())) {
            String codeMsg = messageSource.getMessageString(ex.getErrorCode(), locale);
            if (codeMsg != null) {
                return messageSource.getLocalizedMessage(ex.getErrorCode(), ex.getArgs(), ex.getMessage(), locale);
            }
        }

        if (ex.getArgs() != null && ex.getArgs().length > 0 && StringUtils.hasText(ex.getMessage()) && ex.getMessage().contains("{")) {
            try {
                return java.text.MessageFormat.format(ex.getMessage(), ex.getArgs());
            } catch (Exception ignored) {
            }
        }

        return ex.getMessage();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException ex) {
        Locale locale = LocaleContextHolder.getLocale();
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            String defaultMsg = error.getDefaultMessage();
            String cleanKey = (defaultMsg != null && defaultMsg.startsWith("{") && defaultMsg.endsWith("}"))
                    ? defaultMsg.substring(1, defaultMsg.length() - 1)
                    : defaultMsg;
            String localizedMsg = messageSource.getLocalizedMessage(cleanKey, error.getArguments(), defaultMsg, locale);
            errors.put(error.getField(), localizedMsg);
        }
        log.warn("Validation error: {}", errors);
        String message = getLocalizedMessage("common.validation_failed", null, "Dữ liệu đầu vào không hợp lệ.");
        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .success(false)
                .errorCode(ErrorCodes.ERR_VALIDATION)
                .message(message)
                .data(errors)
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(BadCredentialsException ex) {
        log.warn("Bad credentials: {}", ex.getMessage());
        String message = getLocalizedMessage("ERR_INVALID_CREDENTIALS", null, "Thông tin đăng nhập không chính xác hoặc tài khoản đã bị vô hiệu hóa.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ErrorCodes.ERR_INVALID_CREDENTIALS, message));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        String message = getLocalizedMessage("common.forbidden", null, "Truy cập bị từ chối: Bạn không có quyền thực hiện hành động này.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ErrorCodes.ERR_FORBIDDEN, message));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex) {
        log.warn("File size exceeded: {}", ex.getMessage());
        String message = getLocalizedMessage("common.file_size_exceeded", null, "Dung lượng tệp tải lên vượt quá giới hạn tối đa cho phép.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCodes.ERR_FILE_SIZE_EXCEEDED, message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleConstraintViolationException(ConstraintViolationException ex) {
        Locale locale = LocaleContextHolder.getLocale();
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(cv -> {
            String property = cv.getPropertyPath().toString();
            String defaultMsg = cv.getMessage();
            String cleanKey = (defaultMsg != null && defaultMsg.startsWith("{") && defaultMsg.endsWith("}"))
                    ? defaultMsg.substring(1, defaultMsg.length() - 1)
                    : defaultMsg;
            String localizedMsg = messageSource.getLocalizedMessage(cleanKey, null, defaultMsg, locale);
            errors.put(property, localizedMsg);
        });
        log.warn("Constraint violation: {}", errors);
        String message = getLocalizedMessage("common.validation_failed", null, "Tham số truy vấn không hợp lệ.");
        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .success(false)
                .errorCode(ErrorCodes.ERR_VALIDATION)
                .message(message)
                .data(errors)
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingServletRequestPartException(MissingServletRequestPartException ex) {
        log.warn("Missing multipart part: {}", ex.getRequestPartName());
        String message = getLocalizedMessage("common.missing_file_part", new Object[]{ex.getRequestPartName()}, "Thiếu trường tệp tin bắt buộc: '" + ex.getRequestPartName() + "'");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCodes.ERR_VALIDATION, message));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingServletRequestParameterException(MissingServletRequestParameterException ex) {
        log.warn("Missing request parameter: {}", ex.getParameterName());
        String message = getLocalizedMessage("common.missing_param", new Object[]{ex.getParameterName()}, "Thiếu tham số bắt buộc: '" + ex.getParameterName() + "'");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCodes.ERR_VALIDATION, message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex) {
        log.error("Internal server error: ", ex);
        String message = getLocalizedMessage("common.internal_error", null, "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCodes.ERR_INTERNAL, message));
    }
}
