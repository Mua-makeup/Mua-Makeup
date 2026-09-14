package com.makeup.platform.common.constants;

public final class ErrorCodes {

    private ErrorCodes() {}

    public static final String ERR_USER_NOT_FOUND = "ERR_USER_NOT_FOUND";
    public static final String ERR_PHONE_ALREADY_EXISTS = "ERR_PHONE_ALREADY_EXISTS";
    public static final String ERR_EMAIL_ALREADY_EXISTS = "ERR_EMAIL_ALREADY_EXISTS";
    public static final String ERR_INVALID_CREDENTIALS = "ERR_INVALID_CREDENTIALS";
    public static final String ERR_UNAUTHORIZED = "ERR_UNAUTHORIZED";
    public static final String ERR_FORBIDDEN = "ERR_FORBIDDEN";
    public static final String ERR_TOKEN_BLACKLISTED = "ERR_TOKEN_BLACKLISTED";
    public static final String ERR_TOKEN_INVALID = "ERR_TOKEN_INVALID";
    public static final String ERR_TOKEN_EXPIRED = "ERR_TOKEN_EXPIRED";
    public static final String ERR_TOKEN_MALFORMED = "ERR_TOKEN_MALFORMED";
    public static final String ERR_TOKEN_INVALID_SIGNATURE = "ERR_TOKEN_INVALID_SIGNATURE";
    public static final String ERR_TOKEN_UNSUPPORTED = "ERR_TOKEN_UNSUPPORTED";
    public static final String ERR_TOKEN_TYPE_INVALID = "ERR_TOKEN_TYPE_INVALID";
    public static final String ERR_PASSWORD_MISMATCH = "ERR_PASSWORD_MISMATCH";
    public static final String ERR_PASSWORD_SAME_AS_OLD = "ERR_PASSWORD_SAME_AS_OLD";
    public static final String ERR_CURRENT_PASSWORD_INCORRECT = "ERR_CURRENT_PASSWORD_INCORRECT";
    public static final String ERR_ACCOUNT_TYPE_INVALID = "ERR_ACCOUNT_TYPE_INVALID";
    public static final String ERR_MUA_DETAILS_REQUIRED = "ERR_MUA_DETAILS_REQUIRED";
    public static final String ERR_AGENCY_DETAILS_REQUIRED = "ERR_AGENCY_DETAILS_REQUIRED";
    public static final String ERR_PROFILE_NOT_FOUND = "ERR_PROFILE_NOT_FOUND";
    public static final String ERR_PACKAGE_NOT_FOUND = "ERR_PACKAGE_NOT_FOUND";
    public static final String ERR_PACKAGE_ACCESS_DENIED = "ERR_PACKAGE_ACCESS_DENIED";
    public static final String ERR_INVALID_PACKAGE_PRICE = "ERR_INVALID_PACKAGE_PRICE";
    public static final String ERR_INVALID_ITEM_PRICE = "ERR_INVALID_ITEM_PRICE";
    public static final String ERR_SURCHARGE_NOT_FOUND = "ERR_SURCHARGE_NOT_FOUND";
    public static final String ERR_SURCHARGE_ACCESS_DENIED = "ERR_SURCHARGE_ACCESS_DENIED";
    public static final String ERR_INVALID_SURCHARGE_AMOUNT = "ERR_INVALID_SURCHARGE_AMOUNT";
    public static final String ERR_MASTER_CATEGORY_NOT_FOUND = "ERR_MASTER_CATEGORY_NOT_FOUND";
    public static final String ERR_STYLE_NOT_FOUND = "ERR_STYLE_NOT_FOUND";
    public static final String ERR_INVALID_SURCHARGE_CALCULATION = "ERR_INVALID_SURCHARGE_CALCULATION";
    public static final String ERR_VALIDATION = "ERR_VALIDATION";
    public static final String ERR_INTERNAL = "ERR_INTERNAL";

    // Phân hệ MUA Profile & Portfolio Showcase
    public static final String ERR_EMPTY_FILE_UPLOADED = "EMPTY_FILE_UPLOADED";
    public static final String ERR_INVALID_FILE_FORMAT = "INVALID_FILE_FORMAT";
    public static final String ERR_INVALID_FILE_MAGIC_BYTES = "INVALID_FILE_MAGIC_BYTES";
    public static final String ERR_FILE_SIZE_EXCEEDED = "FILE_SIZE_EXCEEDED";
    public static final String ERR_TOO_MANY_ADDITIONAL_IMAGES = "TOO_MANY_ADDITIONAL_IMAGES";
    public static final String ERR_PORTFOLIO_FEATURED_LIMIT_EXCEEDED = "PORTFOLIO_FEATURED_LIMIT_EXCEEDED";
    public static final String ERR_CANNOT_FEATURE_HIDDEN_PORTFOLIO = "CANNOT_FEATURE_HIDDEN_PORTFOLIO";
    public static final String ERR_PORTFOLIO_ACCESS_DENIED = "PORTFOLIO_ACCESS_DENIED";
    public static final String ERR_PACKAGE_NOT_OWNED = "PACKAGE_NOT_OWNED";
    public static final String ERR_MUA_PROFILE_NOT_FOUND = "MUA_PROFILE_NOT_FOUND";
    public static final String ERR_PORTFOLIO_NOT_FOUND = "PORTFOLIO_NOT_FOUND";
    public static final String ERR_MEDIA_STORAGE_FAILED = "MEDIA_STORAGE_FAILED";

    // Phân hệ Agency Management
    public static final String ERR_AGENCY_NOT_FOUND = "ERR_AGENCY_NOT_FOUND";
    public static final String ERR_AGENCY_ACCESS_DENIED = "ERR_AGENCY_ACCESS_DENIED";
    public static final String ERR_STAFF_NOT_FOUND = "ERR_STAFF_NOT_FOUND";
    public static final String ERR_STAFF_ALREADY_EXISTS = "ERR_STAFF_ALREADY_EXISTS";
    public static final String ERR_INVITATION_NOT_FOUND = "ERR_INVITATION_NOT_FOUND";
    public static final String ERR_INVITATION_EXPIRED = "ERR_INVITATION_EXPIRED";
    public static final String ERR_INVITATION_ALREADY_USED = "ERR_INVITATION_ALREADY_USED";

    // Phân hệ Agency Shift Dispatching (ISSUE-12.5)
    public static final String ERR_SHIFT_OVERLAPPING = "ERR_SHIFT_OVERLAPPING";
    public static final String ERR_SHIFT_NOT_FOUND = "ERR_SHIFT_NOT_FOUND";
    public static final String ERR_INVALID_SHIFT_TIME = "ERR_INVALID_SHIFT_TIME";
}

