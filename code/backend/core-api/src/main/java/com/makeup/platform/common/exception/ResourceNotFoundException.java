package com.makeup.platform.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends CustomBusinessException {

    public ResourceNotFoundException(String errorCode, String message) {
        super(errorCode, message, HttpStatus.NOT_FOUND);
    }

    public ResourceNotFoundException(String message) {
        super("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }
}
