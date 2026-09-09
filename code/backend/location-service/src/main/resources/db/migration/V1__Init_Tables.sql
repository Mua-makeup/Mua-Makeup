-- =============================================================================
-- V1__Init_Tables.sql - location-service (location_tracking_db)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL,     -- Logical ref: mua_profiles.id (user_profile_db)
    booking_id BIGINT,          -- Logical ref: bookings.id (booking_dispatch_db)
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_point GEOMETRY(Point, 4326) NOT NULL,
    speed_kmh DECIMAL(5, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_spatial ON telemetry_logs USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_telemetry_mua_recorded ON telemetry_logs(mua_id, recorded_at DESC);
