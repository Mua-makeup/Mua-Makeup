package com.makeup.platform.common.utils;

import com.makeup.platform.common.exception.CustomBusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.mock.web.MockMultipartFile;
import java.util.HexFormat;
import static org.junit.jupiter.api.Assertions.*;

class FileValidationUtilsTest {
    @ParameterizedTest @CsvSource({"jpg,ffd8ff000000000000000000", "png,89504e470d0a1a0a00000000", "webp,524946460000000057454250"})
    void acceptsSupportedImageHeaders(String ext, String hex) {
        var file = new MockMultipartFile("file", "photo."+ext, "application/octet-stream", HexFormat.of().parseHex(hex));
        assertDoesNotThrow(() -> FileValidationUtils.validateImageFile(file, 12));
    }
    @ParameterizedTest @ValueSource(strings={"image.jpg", "image.png", "image.webp"})
    void renamedExecutableDoesNotPassImageValidation(String name) {
        var file = new MockMultipartFile("file", name, "image/jpeg", "MZ-not-an-image-header".getBytes());
        assertThrows(CustomBusinessException.class, () -> FileValidationUtils.validateImageFile(file, 100));
    }
    @Test void rejectsEmptyAndOversizedUploads() {
        assertThrows(CustomBusinessException.class, () -> FileValidationUtils.validateImageFile(null, 100));
        var file = new MockMultipartFile("file", "a.png", "image/png", new byte[101]);
        assertEquals(com.makeup.platform.common.constants.ErrorCodes.ERR_FILE_SIZE_EXCEEDED, assertThrows(CustomBusinessException.class,
            () -> FileValidationUtils.validateImageFile(file, 100)).getErrorCode());
    }
}
