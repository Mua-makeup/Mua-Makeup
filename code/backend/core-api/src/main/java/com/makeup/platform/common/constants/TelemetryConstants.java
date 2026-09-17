package com.makeup.platform.common.constants;

public final class TelemetryConstants {

    private TelemetryConstants() {}

    // Redis Keys
    public static final String REDIS_KEY_MUA_GEO = "mua:geo:active";
    public static final String REDIS_KEY_HEARTBEAT_PREFIX = "mua:geo:heartbeat:";
    public static final String REDIS_KEY_SUMMARY_PREFIX = "mua:summary:";
    public static final String REDIS_KEY_TRIP_PREFIX = "booking:geo:trip:";
    public static final String REDIS_KEY_AGENCY_GEO = "agency:geo:locations";

    // TTLs
    public static final long HEARTBEAT_TTL_SECONDS = 180L;
    public static final long SUMMARY_TTL_HOURS = 24L;
    public static final long SUMMARY_TTL_SECONDS = 24 * 3600L;
    public static final long TRIP_TTL_HOURS = 4L;
    public static final long TRIP_TTL_SECONDS = 4 * 3600L;

    // Radius limits (km)
    public static final double DEFAULT_RADIUS_KM = 5.0;
    public static final double MAX_RADIUS_KM = 30.0;
    public static final double MIN_RADIUS_KM = 0.5;

    // GPS Quality & Noise Filtering
    public static final double MAX_ACCURACY_METERS = 50.0;
    public static final double MAX_SPEED_KMH = 120.0;

    // Dead-Reckoning thresholds
    public static final double DEAD_RECKONING_DISTANCE_METERS = 30.0;
    public static final long DEAD_RECKONING_TIME_SECONDS = 30L;

    // Privacy Fuzzing / Jittering (meters)
    public static final double FUZZING_MIN_METERS = 30.0;
    public static final double FUZZING_MAX_METERS = 50.0;

    // Adaptive Sampling rate speeds (km/h) and distances (meters)
    public static final double ADAPTIVE_STOPPED_SPEED_THRESHOLD_KMH = 3.0;
    public static final double ADAPTIVE_APPROACHING_DISTANCE_METERS = 300.0;

    // STOMP Topics
    public static final String TOPIC_GPS_STREAM_PREFIX = "/topic/gps-stream/";
    public static final String TOPIC_BOOKING_BROADCAST = "/topic/booking-broadcast";
}
