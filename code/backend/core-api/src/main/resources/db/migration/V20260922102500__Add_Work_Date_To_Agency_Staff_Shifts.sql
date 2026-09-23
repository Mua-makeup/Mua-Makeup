-- ==============================================================================
-- Migration: Bổ sung work_date vào agency_staff_shifts để quản lý ca theo ngày cụ thể
-- Version: V20260922102500
-- ==============================================================================

-- 1. Thêm cột work_date (NULL cho các ca định kỳ lặp lại hàng tuần, có giá trị cho ca ngày cụ thể)
ALTER TABLE agency_schema.agency_staff_shifts
ADD COLUMN IF NOT EXISTS work_date DATE NULL;

-- 2. Đánh chỉ mục tối ưu truy vấn ma trận ca tuần theo khoảng ngày
CREATE INDEX IF NOT EXISTS idx_shifts_agency_work_date
ON agency_schema.agency_staff_shifts(agency_id, work_date, is_active);

CREATE INDEX IF NOT EXISTS idx_shifts_staff_work_date
ON agency_schema.agency_staff_shifts(staff_id, work_date, is_active);
