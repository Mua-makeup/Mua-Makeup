-- ==============================================================================
-- Migration: V20261005151500__Add_Selected_Addons_To_Bookings.sql
-- Description: Add selected_addons column to store customer-chosen add-on items
-- ==============================================================================

ALTER TABLE booking_schema.bookings
ADD COLUMN IF NOT EXISTS selected_addons TEXT;
