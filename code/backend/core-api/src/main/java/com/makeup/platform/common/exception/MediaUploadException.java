package com.makeup.platform.common.exception;

import com.makeup.platform.common.constants.ErrorCodes;
import org.springframework.http.HttpStatus;

public class MediaUploadException extends CustomBusinessException {

    public MediaUploadException(String errorCode, String message, Object... args) {
        super(errorCode, message, args, HttpStatus.BAD_GATEWAY);
    }

    public MediaUploadException(String errorCode, String message) {
        super(errorCode, message, new Object[0], HttpStatus.BAD_GATEWAY);
    }

    public MediaUploadException(String message, Object... args) {
        super(ErrorCodes.ERR_MEDIA_STORAGE_FAILED, message, args, HttpStatus.BAD_GATEWAY);
    }

    public MediaUploadException(String message) {
        super(ErrorCodes.ERR_MEDIA_STORAGE_FAILED, message, new Object[0], HttpStatus.BAD_GATEWAY);
    }
}

