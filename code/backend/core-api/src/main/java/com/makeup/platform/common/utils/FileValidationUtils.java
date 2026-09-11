package com.makeup.platform.common.utils;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.MediaConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

public final class FileValidationUtils {

    private FileValidationUtils() {}

    public static void validateImageFile(MultipartFile file, long maxSizeBytes) {
        if (file == null || file.isEmpty()) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_EMPTY_FILE_UPLOADED,
                    "EMPTY_FILE_UPLOADED",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (file.getSize() > maxSizeBytes) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_FILE_SIZE_EXCEEDED,
                    "FILE_SIZE_EXCEEDED",
                    new Object[]{file.getSize() / (1024 * 1024), maxSizeBytes / (1024 * 1024)},
                    HttpStatus.BAD_REQUEST
            );
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_FILE_FORMAT,
                    "INVALID_FILE_FORMAT",
                    HttpStatus.BAD_REQUEST
            );
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        if (!MediaConstants.ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_FILE_FORMAT,
                    "INVALID_FILE_FORMAT",
                    new Object[]{MediaConstants.ALLOWED_IMAGE_EXTENSIONS},
                    HttpStatus.BAD_REQUEST
            );
        }

        validateMagicBytes(file);
    }

    public static void validateMagicBytes(MultipartFile file) {
        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int bytesRead = is.read(header, 0, header.length);
            if (bytesRead < 12) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_INVALID_FILE_MAGIC_BYTES,
                        "INVALID_FILE_MAGIC_BYTES",
                        HttpStatus.BAD_REQUEST
                );
            }
        } catch (IOException e) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_FILE_MAGIC_BYTES,
                    "INVALID_FILE_MAGIC_BYTES",
                    HttpStatus.BAD_REQUEST
            );
        }

        boolean isJpeg = (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;
        boolean isPng = (header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 &&
                (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47 &&
                (header[4] & 0xFF) == 0x0D && (header[5] & 0xFF) == 0x0A &&
                (header[6] & 0xFF) == 0x1A && (header[7] & 0xFF) == 0x0A;
        boolean isWebp = (header[0] & 0xFF) == 0x52 && (header[1] & 0xFF) == 0x49 &&
                (header[2] & 0xFF) == 0x46 && (header[3] & 0xFF) == 0x46 &&
                (header[8] & 0xFF) == 0x57 && (header[9] & 0xFF) == 0x45 &&
                (header[10] & 0xFF) == 0x42 && (header[11] & 0xFF) == 0x50;

        if (!isJpeg && !isPng && !isWebp) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_FILE_MAGIC_BYTES,
                    "INVALID_FILE_MAGIC_BYTES",
                    HttpStatus.BAD_REQUEST
            );
        }
    }
}
