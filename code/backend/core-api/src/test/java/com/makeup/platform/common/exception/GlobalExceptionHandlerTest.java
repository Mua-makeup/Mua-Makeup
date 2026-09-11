package com.makeup.platform.common.exception;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.i18n.JsonMessageSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.Collections;
import java.util.Locale;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private JsonMessageSource messageSource;
    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        messageSource = new JsonMessageSource();
        messageSource.init();
        exceptionHandler = new GlobalExceptionHandler(messageSource);
    }

    @AfterEach
    void tearDown() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    @DisplayName("Validation Error: Dịch sang tiếng Anh khi Locale là EN")
    void testValidationExceptionEnglish() {
        LocaleContextHolder.setLocale(Locale.ENGLISH);

        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError(
                "updateMuaProfileReq",
                "maxServiceRadiusKm",
                null,
                false,
                null,
                null,
                "{validation.radius_min}"
        );

        when(bindingResult.getFieldErrors()).thenReturn(Collections.singletonList(fieldError));
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ResponseEntity<ApiResponse<Map<String, String>>> response = exceptionHandler.handleValidationException(ex);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Invalid input data.", response.getBody().getMessage());
        assertEquals("Service radius must be at least 1.0 km.", response.getBody().getData().get("maxServiceRadiusKm"));
    }

    @Test
    @DisplayName("Validation Error: Dịch sang tiếng Việt khi Locale là VI")
    void testValidationExceptionVietnamese() {
        LocaleContextHolder.setLocale(new Locale("vi"));

        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError(
                "updateMuaProfileReq",
                "maxServiceRadiusKm",
                null,
                false,
                null,
                null,
                "{validation.radius_min}"
        );

        when(bindingResult.getFieldErrors()).thenReturn(Collections.singletonList(fieldError));
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ResponseEntity<ApiResponse<Map<String, String>>> response = exceptionHandler.handleValidationException(ex);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Dữ liệu đầu vào không hợp lệ.", response.getBody().getMessage());
        assertEquals("Bán kính phục vụ tối thiểu là 1.0 km.", response.getBody().getData().get("maxServiceRadiusKm"));
    }

    @Test
    @DisplayName("Validation Error Fallback: Dịch cả chuỗi tiếng Việt thô sang tiếng Anh nếu DTO chưa đổi key")
    void testValidationExceptionLegacyVietnameseStringFallback() {
        LocaleContextHolder.setLocale(Locale.ENGLISH);

        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError(
                "updateMuaProfileReq",
                "maxServiceRadiusKm",
                null,
                false,
                null,
                null,
                "Bán kính phục vụ tối thiểu là 1.0 km"
        );

        when(bindingResult.getFieldErrors()).thenReturn(Collections.singletonList(fieldError));
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ResponseEntity<ApiResponse<Map<String, String>>> response = exceptionHandler.handleValidationException(ex);

        assertNotNull(response);
        assertEquals("Minimum service radius is 1.0 km.", response.getBody().getData().get("maxServiceRadiusKm"));
    }
}
