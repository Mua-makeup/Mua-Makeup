-- =============================================================================
-- V7__Agency_Staff_Management.sql
-- Khởi tạo Bảng quản lý Nhân viên Studio & Mã mời gia nhập
-- =============================================================================

-- 1. BẢNG NHÂN VIÊN STUDIO (agency_staff)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    agreed_commission_rate DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    note TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (agency_id, mua_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_staff_agency ON agency_schema.agency_staff(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_staff_mua ON agency_schema.agency_staff(mua_id);

-- 2. BẢNG MÃ MỜI THỢ GIA NHẬP STUDIO (agency_invitations)
CREATE TABLE IF NOT EXISTS agency_schema.agency_invitations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    invited_by_user_id BIGINT NOT NULL REFERENCES auth_schema.users(id),
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    note TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_by_mua_id BIGINT REFERENCES mua_schema.mua_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON agency_schema.agency_invitations(invite_code, status);
CREATE INDEX IF NOT EXISTS idx_invitations_agency ON agency_schema.agency_invitations(agency_id, status);

-- 3. TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at CHO agency_staff
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agency_staff_updated_at
    BEFORE UPDATE ON agency_schema.agency_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

