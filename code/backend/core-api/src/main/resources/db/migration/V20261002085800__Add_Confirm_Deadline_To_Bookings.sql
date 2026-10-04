-- Flyway Migration: Add confirm_deadline column to booking_schema.bookings
-- Timestamp: 20261002085800

ALTER TABLE booking_schema.bookings
ADD COLUMN IF NOT EXISTS confirm_deadline TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_confirm_deadline 
ON booking_schema.bookings(confirm_deadline) 
WHERE status = 'REQUESTED';
