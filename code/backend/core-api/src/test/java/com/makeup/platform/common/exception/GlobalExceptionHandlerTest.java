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

    @Test
    @DisplayName("ResourceNotFoundException: Dịch sang tiếng Anh với tham số {0}")
    void testResourceNotFoundExceptionEnglishWithArgs() {
        LocaleContextHolder.setLocale(Locale.ENGLISH);

        ResourceNotFoundException ex = new ResourceNotFoundException(
                "ERR_STYLE_NOT_FOUND",
                "ERR_STYLE_NOT_FOUND",
                33
        );

        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleResourceNotFoundException(ex);

        assertNotNull(response);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ERR_STYLE_NOT_FOUND", response.getBody().getErrorCode());
        assertEquals("Makeup style with ID 33 does not exist in the system catalog.", response.getBody().getMessage());
    }

    @Test
    @DisplayName("ResourceNotFoundException: Dịch sang tiếng Việt với tham số {0}")
    void testResourceNotFoundExceptionVietnameseWithArgs() {
        LocaleContextHolder.setLocale(new Locale("vi"));

        ResourceNotFoundException ex = new ResourceNotFoundException(
                "ERR_STYLE_NOT_FOUND",
                "ERR_STYLE_NOT_FOUND",
                33
        );

        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleResourceNotFoundException(ex);

        assertNotNull(response);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ERR_STYLE_NOT_FOUND", response.getBody().getErrorCode());
        assertEquals("Phong cách ID 33 không tồn tại trong danh mục hệ thống.", response.getBody().getMessage());
    }

    @Test
    @DisplayName("CustomBusinessException: Dịch mã lỗi sang tiếng Anh khi locale là EN")
    void testCustomBusinessExceptionEnglish() {
        LocaleContextHolder.setLocale(Locale.ENGLISH);

        CustomBusinessException ex = new CustomBusinessException(
                "ERR_INVALID_PACKAGE_PRICE",
                "ERR_INVALID_PACKAGE_PRICE",
                HttpStatus.BAD_REQUEST
        );

        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleCustomBusinessException(ex);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ERR_INVALID_PACKAGE_PRICE", response.getBody().getErrorCode());
        assertEquals("Minimum package price is 50,000 VND.", response.getBody().getMessage());
    }
}
