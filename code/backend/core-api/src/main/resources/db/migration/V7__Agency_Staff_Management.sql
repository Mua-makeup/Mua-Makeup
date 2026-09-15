-- =============================================================================
-- V7__Agency_Staff_Management.sql
-- Khởi tạo Bảng quản lý Nhân viên Studio (agency_staff)
-- Ghi chú: Mã mời (agency invitations) được quản lý In-Memory qua Redis kèm TTL.
-- =============================================================================

-- 1. BẢNG NHÂN VIÊN STUDIO (agency_staff)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    agreed_commission_rate DECIMAL(5, 2) CHECK (agreed_commission_rate >= 0.00 AND agreed_commission_rate <= 100.00),
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT', 'REJECTED')),
    note TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (agency_id, mua_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_staff_agency ON agency_schema.agency_staff(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_staff_mua ON agency_schema.agency_staff(mua_id);

-- 2. TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at CHO agency_staff
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_agency_staff_updated_at ON agency_schema.agency_staff;
CREATE TRIGGER trg_update_agency_staff_updated_at
    BEFORE UPDATE ON agency_schema.agency_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
