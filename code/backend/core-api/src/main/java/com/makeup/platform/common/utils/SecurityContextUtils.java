package com.makeup.platform.common.utils;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityContextUtils {

    private SecurityContextUtils() {}

    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED, "ERR_UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof Long id) {
            return id;
        }
        if (principal instanceof String str) {
            try {
                return Long.parseLong(str);
            } catch (NumberFormatException e) {
                throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED, "ERR_UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
            }
        }
        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED, "ERR_UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
    }
}
