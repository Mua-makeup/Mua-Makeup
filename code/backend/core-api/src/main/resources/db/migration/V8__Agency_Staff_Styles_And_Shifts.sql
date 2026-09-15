-- =============================================================================
-- V8__Agency_Staff_Styles_And_Shifts.sql
-- Quản lý Phong cách kỹ năng của Thợ & Ca làm việc cố định theo tuần
-- =============================================================================

-- 1. BẢNG GÁN PHONG CÁCH MAKE-UP CHO THỢ STUDIO (agency_staff_styles)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_styles (
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    style_id INT NOT NULL REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (staff_id, style_id)
);

-- 2. BẢNG XẾP CA LÀM VIỆC CỐ ĐỊNH THEO TUẦN (agency_staff_shifts)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_shifts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_shift_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_shifts_agency_day ON agency_schema.agency_staff_shifts(agency_id, day_of_week, is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON agency_schema.agency_staff_shifts(staff_id, day_of_week);

CREATE TRIGGER trg_update_agency_staff_shifts_updated_at
    BEFORE UPDATE ON agency_schema.agency_staff_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
