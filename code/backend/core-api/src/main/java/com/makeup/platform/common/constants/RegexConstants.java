package com.makeup.platform.common.constants;

public final class RegexConstants {

    private RegexConstants() {}

    public static final String VIETNAM_PHONE_REGEX = "^(0|\\+84)(\\d{9})$";
    public static final String STRONG_PASSWORD_REGEX = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).*$";
}
