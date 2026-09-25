-- ==============================================================================
-- Migration: V20260924083000__Create_Agency_Dispatch_And_Multi_Staff_Assignments.sql
-- Description: Bổ sung style_id, cờ điều phối khẩn cấp trên bookings, tạo bảng booking_staff_assignments kèm Partial Unique Indexes
-- ==============================================================================

-- 1. BỔ SUNG CỘT PHỤC VỤ ĐIỀU PHỐI VÀ STYLE MAKEUP TRÊN BẢNG BOOKINGS
ALTER TABLE booking_schema.bookings 
    ADD COLUMN IF NOT EXISTS style_id INT REFERENCES catalog_schema.makeup_styles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS needs_emergency_reassignment BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS emergency_reason VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emergency_reported_at TIMESTAMP WITH TIME ZONE;

-- Chỉ mục tối ưu truy vấn danh sách đơn chờ điều phối Studio
CREATE INDEX IF NOT EXISTS idx_bookings_agency_dispatch 
    ON booking_schema.bookings(agency_id, status) 
    WHERE status IN ('PENDING_AGENCY_DISPATCH', 'AGENCY_ASSIGNED');

-- Chỉ mục lọc khẩn cấp: Đẩy đơn cần đổi thợ lên đầu danh sách
CREATE INDEX IF NOT EXISTS idx_bookings_agency_emergency 
    ON booking_schema.bookings(agency_id) 
    WHERE needs_emergency_reassignment = TRUE;

CREATE INDEX IF NOT EXISTS idx_bookings_style 
    ON booking_schema.bookings(style_id);

-- 2. BẢNG PHÂN CÔNG ĐA NHÂN SỰ CHO ĐƠN HÀNG (MULTI-STAFF ASSIGNMENTS - ISSUE-19.2)
CREATE TABLE IF NOT EXISTS booking_schema.booking_staff_assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    assignment_role VARCHAR(30) NOT NULL CHECK (assignment_role IN ('PRIMARY_MUA', 'ASSISTANT_MUA')),
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'EMERGENCY_CANCELLED', 'REPLACED')),
    dispatch_notes TEXT,
    is_confirmed_by_staff BOOLEAN DEFAULT FALSE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason VARCHAR(255),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    replaced_by_staff_id BIGINT REFERENCES agency_schema.agency_staff(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_staff_assign 
    ON booking_schema.booking_staff_assignments(booking_id, staff_id, assignment_role);

-- Một thợ không được có 2 phân công ACTIVE trên cùng 1 booking, nhưng vẫn cho phép lưu nhiều bản ghi lịch sử CANCELLED/REPLACED.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_staff_per_booking
    ON booking_schema.booking_staff_assignments(booking_id, staff_id)
    WHERE status = 'ACTIVE';

-- [CHỐT CHẶN VẬT LÝ DATABASE]: Duy nhất 1 Thợ chính đang ACTIVE trên mỗi đơn hàng
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_primary_mua_per_booking 
    ON booking_schema.booking_staff_assignments(booking_id) 
    WHERE assignment_role = 'PRIMARY_MUA' AND status = 'ACTIVE';

-- 3. BÌNH LUẬN SCHEMA
COMMENT ON TABLE booking_schema.booking_staff_assignments IS 'Bảng phân công thợ chính và thợ phụ cho đơn hàng của Studio kèm trạng thái ACTIVE/EMERGENCY_CANCELLED/REPLACED';
COMMENT ON COLUMN booking_schema.bookings.style_id IS 'Mã phong cách make-up (Tone) khách hàng yêu cầu cho đơn';
COMMENT ON COLUMN booking_schema.bookings.needs_emergency_reassignment IS 'Cờ báo động Studio cần đổi thợ dự phòng khẩn cấp do thợ chính báo bận';
