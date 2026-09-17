package com.makeup.platform.common.i18n;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonMessageSourceTest {

    private JsonMessageSource messageSource;

    @BeforeEach
    void setUp() {
        messageSource = new JsonMessageSource();
        messageSource.init();
    }

    @Test
    @DisplayName("Kiểm tra đọc message tiếng Anh mặc định")
    void testGetMessageEnglish() {
        String msg = messageSource.getMessageString("common.success", Locale.ENGLISH);
        assertNotNull(msg);
        assertEquals("Operation completed successfully.", msg);

        String errNotFound = messageSource.getMessageString("ERR_USER_NOT_FOUND", Locale.ENGLISH);
        assertEquals("User not found.", errNotFound);
    }

    @Test
    @DisplayName("Kiểm tra đọc message tiếng Việt khi truyền Locale vi")
    void testGetMessageVietnamese() {
        String msg = messageSource.getMessageString("common.success", new Locale("vi"));
        assertNotNull(msg);
        assertEquals("Thao tác thành công.", msg);

        String errNotFound = messageSource.getMessageString("ERR_USER_NOT_FOUND", new Locale("vi"));
        assertEquals("Không tìm thấy người dùng trong hệ thống.", errNotFound);
    }

    @Test
    @DisplayName("Kiểm tra format tham số trong message")
    void testGetMessageWithArgs() {
        String formatted = messageSource.getLocalizedMessage(
                "common.missing_file_part",
                new Object[]{"file"},
                "Default",
                Locale.ENGLISH
        );
        assertEquals("Required file part is missing: 'file'.", formatted);

        String formattedVi = messageSource.getLocalizedMessage(
                "common.missing_file_part",
                new Object[]{"file"},
                "Default",
                new Locale("vi")
        );
        assertEquals("Thiếu trường tệp tin bắt buộc: 'file'.", formattedVi);
    }

    @Test
    @DisplayName("Kiểm tra fallback khi không tìm thấy key")
    void testFallback() {
        String result = messageSource.getLocalizedMessage(
                "non.existent.key",
                null,
                "Fallback Message",
                Locale.ENGLISH
        );
        assertEquals("Fallback Message", result);
    }
}
