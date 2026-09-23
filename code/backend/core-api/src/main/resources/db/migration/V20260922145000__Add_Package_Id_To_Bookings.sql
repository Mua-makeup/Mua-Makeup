-- ==============================================================================
-- Migration: Add package_id to bookings in booking_schema
-- Standard: Timestamp Versioning V20260922145000
-- ==============================================================================

ALTER TABLE booking_schema.bookings 
    ADD COLUMN IF NOT EXISTS package_id BIGINT REFERENCES catalog_schema.service_packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_package ON booking_schema.bookings(package_id);
