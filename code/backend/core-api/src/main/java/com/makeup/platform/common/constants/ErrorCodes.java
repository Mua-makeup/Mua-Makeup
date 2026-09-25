package com.makeup.platform.common.constants;

public final class ErrorCodes {

    private ErrorCodes() {}

    public static final String ERR_USER_NOT_FOUND = "ERR_USER_NOT_FOUND";
    public static final String ERR_ROLE_NOT_FOUND = "ERR_ROLE_NOT_FOUND";
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
    public static final String ERR_DUPLICATE_STEP_ORDER = "ERR_DUPLICATE_STEP_ORDER";
    public static final String ERR_PACKAGE_DURATION_EXCEEDED = "ERR_PACKAGE_DURATION_EXCEEDED";
    public static final String ERR_SURCHARGE_NOT_FOUND = "ERR_SURCHARGE_NOT_FOUND";
    public static final String ERR_SURCHARGE_ACCESS_DENIED = "ERR_SURCHARGE_ACCESS_DENIED";
    public static final String ERR_INVALID_SURCHARGE_AMOUNT = "ERR_INVALID_SURCHARGE_AMOUNT";
    public static final String ERR_MASTER_CATEGORY_NOT_FOUND = "ERR_MASTER_CATEGORY_NOT_FOUND";
    public static final String ERR_STYLE_NOT_FOUND = "ERR_STYLE_NOT_FOUND";
    public static final String ERR_TAXONOMY_CODE_CONFLICT = "ERR_TAXONOMY_CODE_CONFLICT";
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
    public static final String ERR_AGENCY_NOT_VERIFIED = "ERR_AGENCY_NOT_VERIFIED";
    public static final String ERR_MUA_CERTIFICATE_NOT_VERIFIED = "ERR_MUA_CERTIFICATE_NOT_VERIFIED";
    public static final String ERR_AGENCY_ACCESS_DENIED = "ERR_AGENCY_ACCESS_DENIED";
    public static final String ERR_STAFF_NOT_FOUND = "ERR_STAFF_NOT_FOUND";
    public static final String ERR_STAFF_ALREADY_EXISTS = "ERR_STAFF_ALREADY_EXISTS";
    public static final String ERR_STAFF_APPLICATION_PENDING = "ERR_STAFF_APPLICATION_PENDING";
    public static final String ERR_INVITATION_NOT_FOUND = "ERR_INVITATION_NOT_FOUND";
    public static final String ERR_INVITATION_EXPIRED = "ERR_INVITATION_EXPIRED";
    public static final String ERR_INVITATION_ALREADY_USED = "ERR_INVITATION_ALREADY_USED";
    public static final String ERR_AGENCY_LOCATION_NOT_CONFIGURED = "ERR_AGENCY_LOCATION_NOT_CONFIGURED";

    // Phân hệ Agency Shift Dispatching (ISSUE-12.5)
    public static final String ERR_SHIFT_OVERLAPPING = "ERR_SHIFT_OVERLAPPING";
    public static final String ERR_SHIFT_NOT_FOUND = "ERR_SHIFT_NOT_FOUND";
    public static final String ERR_INVALID_SHIFT_TIME = "ERR_INVALID_SHIFT_TIME";

    // Phân hệ Location Telemetry & Redis GEO
    public static final String ERR_LOCATION_INVALID = "ERR_LOCATION_INVALID";
    public static final String ERR_GEO_EMPTY = "ERR_GEO_EMPTY";
    public static final String ERR_MUA_NOT_AVAILABLE = "ERR_MUA_NOT_AVAILABLE";
    public static final String ERR_GPS_ACCURACY_TOO_LOW = "ERR_GPS_ACCURACY_TOO_LOW";
    public static final String ERR_SPEED_ABNORMAL = "ERR_SPEED_ABNORMAL";
    public static final String ERR_TRIP_NOT_FOUND = "ERR_TRIP_NOT_FOUND";

    // Phân hệ Agency Staff Services & Overtime Rules (ISSUE-13.4, ISSUE-13.6)
    public static final String ERR_PACKAGE_NOT_OWNED_BY_AGENCY = "ERR_PACKAGE_NOT_OWNED_BY_AGENCY";
    public static final String ERR_STAFF_NOT_IN_AGENCY = "ERR_STAFF_NOT_IN_AGENCY";
    public static final String ERR_OVERTIME_RULE_NOT_FOUND = "ERR_OVERTIME_RULE_NOT_FOUND";
    public static final String ERR_OVERTIME_REPORT_NOT_FOUND = "ERR_OVERTIME_REPORT_NOT_FOUND";
    public static final String ERR_INVALID_OVERTIME_ACTION = "ERR_INVALID_OVERTIME_ACTION";
    public static final String ERR_OVERTIME_ALREADY_REVIEWED = "ERR_OVERTIME_ALREADY_REVIEWED";

    // Phân hệ Booking State Machine, Audit Log & Redlock (ISSUE-16)
    public static final String ERR_BOOKING_NOT_FOUND = "ERR_BOOKING_NOT_FOUND";
    public static final String ERR_INVALID_STATE_TRANSITION = "ERR_INVALID_STATE_TRANSITION";
    public static final String ERR_UNAUTHORIZED_TRANSITION = "ERR_UNAUTHORIZED_TRANSITION";
    public static final String ERR_COMPLETION_PHOTO_REQUIRED = "ERR_COMPLETION_PHOTO_REQUIRED";
    public static final String ERR_CANCELLATION_REASON_REQUIRED = "ERR_CANCELLATION_REASON_REQUIRED";
    public static final String ERR_CANNOT_CANCEL_WITHIN_TWO_HOURS = "ERR_CANNOT_CANCEL_WITHIN_TWO_HOURS";
    public static final String ERR_EMERGENCY_PROOF_REQUIRED_CRITICAL = "ERR_EMERGENCY_PROOF_REQUIRED_CRITICAL";
    public static final String ERR_BOOKING_ALREADY_TAKEN = "ERR_BOOKING_ALREADY_TAKEN";
    public static final String ERR_LOCK_ACQUISITION_TIMEOUT = "ERR_LOCK_ACQUISITION_TIMEOUT";
    public static final String ERR_OPTIMISTIC_LOCK_CONFLICT = "ERR_OPTIMISTIC_LOCK_CONFLICT";
    public static final String ERR_MUA_MUST_BE_ONLINE = "ERR_MUA_MUST_BE_ONLINE";
    public static final String ERR_MUA_ALREADY_BUSY = "ERR_MUA_ALREADY_BUSY";
    public static final String ERR_BOOKING_ALREADY_EXISTS = "ERR_BOOKING_ALREADY_EXISTS";

    // Phân hệ Dynamic Pricing, Distance Fees & Surge Rules
    public static final String ERR_DISTANCE_EXCEEDS_MAX_RADIUS = "ERR_DISTANCE_EXCEEDS_MAX_RADIUS";
    public static final String ERR_PROVIDER_LOCATION_MISSING = "ERR_PROVIDER_LOCATION_MISSING";
    public static final String ERR_SURGE_RULE_INVALID = "ERR_SURGE_RULE_INVALID";
    public static final String ERR_SURGE_RULE_NOT_FOUND = "ERR_SURGE_RULE_NOT_FOUND";
    public static final String ERR_PACKAGE_NOT_AVAILABLE = "ERR_PACKAGE_NOT_AVAILABLE";
    public static final String ERR_ADDON_NOT_IN_PACKAGE = "ERR_ADDON_NOT_IN_PACKAGE";

    // Phân hệ Scheduled Booking & MUA Calendar Engine (ISSUE-18)
    public static final String ERR_SLOT_ALREADY_BOOKED = "ERR_SLOT_ALREADY_BOOKED";
    public static final String ERR_BUFFER_TIME_VIOLATION = "ERR_BUFFER_TIME_VIOLATION";
    public static final String ERR_DEPOSIT_PAYMENT_TIMEOUT = "ERR_DEPOSIT_PAYMENT_TIMEOUT";
    public static final String ERR_INVALID_TIME_RANGE = "ERR_INVALID_TIME_RANGE";
    public static final String ERR_BOOKING_TIME_OUT_OF_SERVICE = "ERR_BOOKING_TIME_OUT_OF_SERVICE";
    public static final String ERR_BOOKING_DATE_TOO_FAR = "ERR_BOOKING_DATE_TOO_FAR";
    public static final String ERR_CANNOT_UNBLOCK_BOOKED_SLOT = "ERR_CANNOT_UNBLOCK_BOOKED_SLOT";
    public static final String ERR_CALENDAR_SLOT_NOT_FOUND = "ERR_CALENDAR_SLOT_NOT_FOUND";
    public static final String ERR_NO_AVAILABLE_STAFF = "ERR_NO_AVAILABLE_STAFF";

    // Phân hệ Notifications (In-App & Multi-platform)
    public static final String ERR_NOTIFICATION_NOT_FOUND = "ERR_NOTIFICATION_NOT_FOUND";

    // Phân hệ Agency Dispatching Engine & Multi-Staff Assignment (ISSUE-19)
    public static final String ERR_DISPATCH_PRIMARY_REQUIRED = "ERR_DISPATCH_PRIMARY_REQUIRED";
    public static final String ERR_DISPATCH_STAFF_UNQUALIFIED = "ERR_DISPATCH_STAFF_UNQUALIFIED";
    public static final String ERR_DISPATCH_STAFF_CONFLICT = "ERR_DISPATCH_STAFF_CONFLICT";
    public static final String ERR_DISPATCH_MAX_ASSISTANTS_EXCEEDED = "ERR_DISPATCH_MAX_ASSISTANTS_EXCEEDED";
    public static final String ERR_ASSIGNMENT_NOT_FOUND = "ERR_ASSIGNMENT_NOT_FOUND";
    public static final String ERR_EMERGENCY_REPORT_NOT_FOUND = "ERR_EMERGENCY_REPORT_NOT_FOUND";
    public static final String ERR_CANNOT_DISPATCH_IN_CURRENT_STATUS = "ERR_CANNOT_DISPATCH_IN_CURRENT_STATUS";
}


