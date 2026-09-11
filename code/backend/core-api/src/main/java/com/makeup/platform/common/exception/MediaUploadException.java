package com.makeup.platform.common.exception;

import org.springframework.http.HttpStatus;

public class MediaUploadException extends CustomBusinessException {

    public MediaUploadException(String errorCode, String message) {
        super(errorCode, message, HttpStatus.BAD_GATEWAY);
    }

    public MediaUploadException(String message) {
        super("MEDIA_STORAGE_FAILED", message, HttpStatus.BAD_GATEWAY);
    }
}
