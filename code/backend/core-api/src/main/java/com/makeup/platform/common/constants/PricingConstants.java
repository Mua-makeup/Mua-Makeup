package com.makeup.platform.common.constants;

import java.math.BigDecimal;

public final class PricingConstants {

    private PricingConstants() {}

    public static final BigDecimal DEFAULT_FREE_RADIUS_KM = new BigDecimal("5.0");
    public static final BigDecimal DEFAULT_PRICE_PER_KM = new BigDecimal("15000.00");
    public static final BigDecimal DEFAULT_MAX_SERVICE_RADIUS_KM = new BigDecimal("30.0");
    public static final BigDecimal MAX_SURGE_MULTIPLIER = new BigDecimal("1.50");
    public static final BigDecimal MIN_SURGE_MULTIPLIER = new BigDecimal("1.00");
    public static final BigDecimal ESCROW_DEPOSIT_RATIO = new BigDecimal("0.30"); // 30% tiền cọc
    public static final double HAVERSINE_ROAD_FACTOR = 1.35; // Hệ số uốn khúc đường bộ đô thị VN
    public static final double AVERAGE_DRIVING_SPEED_KMH = 25.0; // Tốc độ lái xe máy trung bình trong đô thị
    public static final long MAPS_CACHE_TTL_SECONDS = 86400L; // 24 hours
    public static final int H3_SURGE_RESOLUTION = 7; // Bán kính lục giác ~1.2km
    public static final long DEMAND_TTL_SECONDS = 300L; // Cửa sổ trượt đếm Cầu 5 phút
    public static final double DEMAND_SURGE_STEP = 0.25; // Độ dốc tăng giá theo tỷ lệ Cung/Cầu
}
