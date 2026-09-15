package com.makeup.platform.common.constants;

public final class BookingConstants {

    private BookingConstants() {
    }

    public static final String REDLOCK_KEY_PREFIX = "lock:booking:accept:";
    public static final long LOCK_WAIT_TIME_MS = 2000L;
    public static final long LOCK_LEASE_TIME_MS = 5000L;

    public static final double DEFAULT_DEPOSIT_RATIO = 0.30; // 30% cọc
    public static final int MAX_DISPUTE_HOURS = 24;
}
