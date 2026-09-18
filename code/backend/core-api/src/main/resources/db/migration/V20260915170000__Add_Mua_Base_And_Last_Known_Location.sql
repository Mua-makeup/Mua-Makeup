-- ==============================================================================
-- Migration: Add Base Address and Last Known Location to mua_profiles
-- Standard: Timestamp Versioning V20260915170000
-- ==============================================================================

ALTER TABLE mua_schema.mua_profiles
    ADD COLUMN IF NOT EXISTS last_known_lat DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS last_known_lng DECIMAL(11, 8),
    ADD COLUMN IF NOT EXISTS last_known_updated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS base_address_lat DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS base_address_lng DECIMAL(11, 8),
    ADD COLUMN IF NOT EXISTS base_address_text TEXT;
