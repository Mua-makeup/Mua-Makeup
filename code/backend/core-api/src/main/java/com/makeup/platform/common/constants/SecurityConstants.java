package com.makeup.platform.common.constants;

public final class SecurityConstants {

    private SecurityConstants() {}

    // Roles
    public static final String ROLE_CUSTOMER = "ROLE_CUSTOMER";
    public static final String ROLE_FREELANCE_MUA = "ROLE_FREELANCE_MUA";
    public static final String ROLE_AGENCY_ADMIN = "ROLE_AGENCY_ADMIN";
    public static final String ROLE_AGENCY_STAFF = "ROLE_AGENCY_STAFF";
    public static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";

    // Redis Key Prefixes
    public static final String REDIS_PREFIX_REFRESH_TOKEN = "rt:";
    public static final String REDIS_PREFIX_BLACKLIST = "jwt:blacklist:";

    // Headers & Token prefix
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String HEADER_STRING = "Authorization";
}
