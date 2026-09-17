-- ==============================================================================
-- Migration: Add is_surge_enabled column to agency_profiles and mua_profiles
-- Standard: Timestamp Versioning V20260916143500
-- ==============================================================================

-- 1. Bổ sung cờ bật/tắt tính giá động cho Agency Profiles
ALTER TABLE agency_schema.agency_profiles 
ADD COLUMN IF NOT EXISTS is_surge_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Bổ sung cờ bật/tắt tính giá động cho Freelancer MUA Profiles
ALTER TABLE mua_schema.mua_profiles 
ADD COLUMN IF NOT EXISTS is_surge_enabled BOOLEAN NOT NULL DEFAULT TRUE;
