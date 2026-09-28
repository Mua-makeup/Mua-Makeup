package com.makeup.platform.common.constants;

import java.util.List;

public final class MediaConstants {

    private MediaConstants() {}

    public static final long MAX_MAIN_IMAGE_SIZE = 20L * 1024 * 1024; // 20MB
    public static final long MAX_ADDITIONAL_IMAGE_SIZE = 20L * 1024 * 1024; // 20MB
    public static final long MAX_AVATAR_IMAGE_SIZE = 20L * 1024 * 1024; // 20MB
    public static final long MAX_LOGO_IMAGE_SIZE = 20L * 1024 * 1024; // 20MB
    public static final int MAX_ADDITIONAL_IMAGES_COUNT = 5;
    public static final int MAX_FEATURED_PORTFOLIO_COUNT = 6;

    public static final List<String> ALLOWED_IMAGE_EXTENSIONS = List.of("jpg", "jpeg", "png", "webp");
    public static final List<String> ALLOWED_IMAGE_MIME_TYPES = List.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
}
