package com.makeup.platform.common.exception;

import com.makeup.platform.common.constants.ErrorCodes;
import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends CustomBusinessException {

    public ResourceNotFoundException(String errorCode, String message, Object... args) {
        super(errorCode, message, args, HttpStatus.NOT_FOUND);
    }

    public ResourceNotFoundException(String errorCode, String message) {
        super(errorCode, message, new Object[0], HttpStatus.NOT_FOUND);
    }

    public ResourceNotFoundException(String message, Object... args) {
        super(ErrorCodes.ERR_PROFILE_NOT_FOUND, message, args, HttpStatus.NOT_FOUND);
    }

    public ResourceNotFoundException(String message) {
        super(ErrorCodes.ERR_PROFILE_NOT_FOUND, message, new Object[0], HttpStatus.NOT_FOUND);
    }
}

