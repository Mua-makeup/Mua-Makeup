package com.makeup.platform.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class CustomBusinessException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus status;
    private final Object[] args;

    public CustomBusinessException(String errorCode, String message, Object[] args, HttpStatus status) {
        super(message);
        this.errorCode = errorCode;
        this.args = args != null ? args : new Object[0];
        this.status = status != null ? status : HttpStatus.BAD_REQUEST;
    }

    public CustomBusinessException(String errorCode, String message, HttpStatus status) {
        this(errorCode, message, new Object[0], status);
    }

    public CustomBusinessException(String errorCode, String message) {
        this(errorCode, message, new Object[0], HttpStatus.BAD_REQUEST);
    }

    public CustomBusinessException(String errorCode, String message, Object... args) {
        this(errorCode, message, args, HttpStatus.BAD_REQUEST);
    }
}
