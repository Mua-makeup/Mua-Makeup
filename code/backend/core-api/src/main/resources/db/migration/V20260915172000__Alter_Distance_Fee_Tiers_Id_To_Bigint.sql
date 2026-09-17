-- ==============================================================================
-- Migration: Alter distance_fee_tiers id column to BIGINT
-- Standard: Timestamp Versioning V20260915172000
-- ==============================================================================

ALTER TABLE catalog_schema.distance_fee_tiers 
    ALTER COLUMN id TYPE BIGINT;
