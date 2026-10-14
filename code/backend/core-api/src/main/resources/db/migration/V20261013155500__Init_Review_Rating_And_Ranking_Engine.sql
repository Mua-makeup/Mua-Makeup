-- ==============================================================================
-- Migration: V20261013155500__Init_Review_Rating_And_Ranking_Engine.sql
-- Description: Tạo bảng interaction_schema.reviews, mở rộng các trường Bayesian
--              Rating, Rolling Window, Rank Score, Badge Tier và Phí hoa hồng cho MUA.
-- ==============================================================================

-- 1. Bổ sung các cột xếp hạng và kiểm soát chất lượng vào mua_schema.mua_profiles
ALTER TABLE mua_schema.mua_profiles
    ADD COLUMN IF NOT EXISTS bayesian_rating NUMERIC(3, 2) DEFAULT 4.60 NOT NULL,
    ADD COLUMN IF NOT EXISTS rolling_rating NUMERIC(3, 2) DEFAULT 5.00 NOT NULL,
    ADD COLUMN IF NOT EXISTS acceptance_rate NUMERIC(5, 2) DEFAULT 100.00 NOT NULL,
    ADD COLUMN IF NOT EXISTS rank_score NUMERIC(6, 2) DEFAULT 50.00 NOT NULL,
    ADD COLUMN IF NOT EXISTS badge_tier VARCHAR(30) DEFAULT 'STANDARD' NOT NULL,
    ADD COLUMN IF NOT EXISTS is_emergency_locked BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(4, 2) DEFAULT 0.20 NOT NULL;

-- Ràng buộc giá trị hợp lệ cho badge_tier và commission_rate
ALTER TABLE mua_schema.mua_profiles
    DROP CONSTRAINT IF EXISTS chk_mua_badge_tier;
ALTER TABLE mua_schema.mua_profiles
    ADD CONSTRAINT chk_mua_badge_tier CHECK (badge_tier IN ('STANDARD', 'SILVER', 'GOLD_TOP_PRO'));

ALTER TABLE mua_schema.mua_profiles
    DROP CONSTRAINT IF EXISTS chk_mua_commission_rate;
ALTER TABLE mua_schema.mua_profiles
    ADD CONSTRAINT chk_mua_commission_rate CHECK (commission_rate >= 0.00 AND commission_rate <= 1.00);

COMMENT ON COLUMN mua_schema.mua_profiles.bayesian_rating IS 'Điểm đánh giá chuẩn Bayes kết hợp điểm trung bình của sàn để loại bỏ thiên lệch thợ ít đơn';
COMMENT ON COLUMN mua_schema.mua_profiles.rolling_rating IS 'Điểm trung bình trượt của 100 đơn hàng gần nhất phản ánh phong độ hiện tại';
COMMENT ON COLUMN mua_schema.mua_profiles.acceptance_rate IS 'Tỷ lệ nhận ca trong 30 ngày gần nhất (%)';
COMMENT ON COLUMN mua_schema.mua_profiles.rank_score IS 'Điểm xếp hạng tổng hợp đa chiều dùng cho trang Khám phá Explore [0 - 100]';
COMMENT ON COLUMN mua_schema.mua_profiles.badge_tier IS 'Cấp độ huy hiệu tín nhiệm: STANDARD, SILVER, GOLD_TOP_PRO';
COMMENT ON COLUMN mua_schema.mua_profiles.is_emergency_locked IS 'Cờ cảnh báo/khóa quyền nhận ca khẩn cấp 30p khi rating rơi xuống dưới 4.60';
COMMENT ON COLUMN mua_schema.mua_profiles.commission_rate IS 'Tỷ lệ phí hoa hồng nền tảng (0.20 cho thợ thường, 0.10 cho Top Pro)';

-- 2. Tạo bảng đánh giá dịch vụ interaction_schema.reviews
CREATE TABLE IF NOT EXISTS interaction_schema.reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE RESTRICT,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb NOT NULL,
    device_id VARCHAR(128),
    client_ip VARCHAR(45),
    bank_hash VARCHAR(64),
    status VARCHAR(30) DEFAULT 'APPROVED' NOT NULL CHECK (status IN ('APPROVED', 'PENDING_AUDIT', 'FLAGGED_FRAUD')),
    fraud_risk_score INT DEFAULT 0 NOT NULL,
    fraud_reason TEXT,
    admin_note TEXT,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index tối ưu truy vấn đánh giá và audit gian lận
CREATE INDEX IF NOT EXISTS idx_reviews_mua_status ON interaction_schema.reviews(mua_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON interaction_schema.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON interaction_schema.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON interaction_schema.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_device_id ON interaction_schema.reviews(device_id);

COMMENT ON TABLE interaction_schema.reviews IS 'Bảng lưu trữ đánh giá sao và nhận xét của khách hàng kèm dấu vết chống gian lận';
COMMENT ON COLUMN interaction_schema.reviews.status IS 'Trạng thái đánh giá: APPROVED (hợp lệ), PENDING_AUDIT (chờ duyệt), FLAGGED_FRAUD (gian lận)';
COMMENT ON COLUMN interaction_schema.reviews.fraud_risk_score IS 'Điểm rủi ro gian lận tính theo IP, Device ID và tài khoản ngân hàng [0 - 100]';
