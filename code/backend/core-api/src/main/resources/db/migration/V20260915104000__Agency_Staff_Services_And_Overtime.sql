-- =============================================================================
-- V20260915104000__Agency_Staff_Services_And_Overtime.sql
-- Bảng Gán Gói Dịch Vụ Cho Thợ (agency_staff_services - ISSUE-13.4)
-- Bảng Quy Chế Quá Giờ & Giải Trình Quá Giờ Studio (ISSUE-13.6)
-- =============================================================================

-- 1. BẢNG GÁN KỸ NĂNG GÓI DỊCH VỤ CỦA STUDIO CHO THỢ (ISSUE-13.4)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_services (
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL REFERENCES catalog_schema.service_packages(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(30) DEFAULT 'PRIMARY_MUA' NOT NULL, -- PRIMARY_MUA, ASSISTANT_MUA
    is_qualified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (staff_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_staff_services_pkg ON agency_schema.agency_staff_services(package_id);

-- 2. BẢNG QUY ĐỊNH CHÍNH SÁCH QUÁ GIỜ CỦA TỪNG STUDIO (ISSUE-13.6)
CREATE TABLE IF NOT EXISTS agency_schema.agency_overtime_rules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    rule_name VARCHAR(150) NOT NULL,
    min_overtime_minutes INT NOT NULL CHECK (min_overtime_minutes >= 0),
    max_overtime_minutes INT CHECK (max_overtime_minutes IS NULL OR max_overtime_minutes > min_overtime_minutes),
    penalty_type VARCHAR(30) NOT NULL CHECK (penalty_type IN ('PERCENT_COMMISSION', 'FIXED_AMOUNT', 'WARNING_ONLY')),
    penalty_value DECIMAL(12, 2) DEFAULT 0.00 CHECK (penalty_value >= 0),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_overtime_rules ON agency_schema.agency_overtime_rules(agency_id, is_active);

-- 3. BẢNG GIẢI TRÌNH QUÁ GIỜ CỦA THỢ VÀ PHÁN QUYẾT CỦA ADMIN STUDIO (ISSUE-13.6)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_overtime_reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    overtime_minutes INT NOT NULL CHECK (overtime_minutes > 0),
    reason_type VARCHAR(50) NOT NULL CHECK (reason_type IN ('PRESET_RULE', 'OTHER_CUSTOM_REASON')),
    rule_id BIGINT REFERENCES agency_schema.agency_overtime_rules(id) ON DELETE SET NULL,
    explanation_text TEXT NOT NULL,
    proof_image_url TEXT,
    status VARCHAR(30) DEFAULT 'PENDING_AGENCY_REVIEW' NOT NULL CHECK (status IN ('PENDING_AGENCY_REVIEW', 'APPROVED_WAIVED', 'PENALIZED', 'CHARGED_CUSTOMER')),
    penalty_amount_applied DECIMAL(12, 2) DEFAULT 0.00,
    customer_surcharge_amount DECIMAL(12, 2) DEFAULT 0.00,
    charge_reason TEXT,
    admin_notes TEXT,
    reviewed_by_user_id BIGINT REFERENCES auth_schema.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_overtime_reports ON agency_schema.agency_staff_overtime_reports(agency_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_agency_overtime_reports_staff ON agency_schema.agency_staff_overtime_reports(staff_id);
