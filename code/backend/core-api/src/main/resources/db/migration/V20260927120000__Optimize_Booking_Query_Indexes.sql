-- Support bounded instant-booking scans and stable agency pagination.
CREATE INDEX IF NOT EXISTS idx_bookings_type_status_id
    ON booking_schema.bookings (booking_type, status, id);
CREATE INDEX IF NOT EXISTS idx_bookings_agency_created_id
    ON booking_schema.bookings (agency_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_created_id
    ON booking_schema.bookings (created_at DESC, id DESC);
