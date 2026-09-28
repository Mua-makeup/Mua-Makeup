package com.makeup.platform.common.constants;

public final class InstantBookingKeys {
    public static final String EXPIRATION_PREFIX = "booking:instant:expire:";
    public static final String OFFER_TIMER_PREFIX = "booking:dispatch:timer:";
    private InstantBookingKeys() {}
    public static String candidates(Long bookingId) { return "booking:dispatch:candidates:" + bookingId; }
    public static String current(Long bookingId) { return "booking:dispatch:current:" + bookingId; }
    public static String skipped(Long bookingId) { return "booking:dispatch:skipped:" + bookingId; }
    public static String sentAt(Long bookingId) { return "booking:dispatch:sent_at:" + bookingId; }
    public static String expiration(Long bookingId) { return EXPIRATION_PREFIX + bookingId; }
    public static String timer(Long bookingId, Object muaId) { return OFFER_TIMER_PREFIX + bookingId + ":" + muaId; }
    public static String candidateLease(Object muaId) { return "mua:dispatch:locked:" + muaId; }
}
