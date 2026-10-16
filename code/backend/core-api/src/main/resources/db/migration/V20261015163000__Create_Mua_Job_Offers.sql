-- Flyway Migration: Tạo bảng mua_job_offers để lưu vết các ca mời, phản hồi của MUA và phục vụ tính acceptance_rate
CREATE TABLE IF NOT EXISTS booking_schema.mua_job_offers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL,
    booking_id BIGINT NOT NULL,
    offer_type VARCHAR(30) NOT NULL, -- INSTANT, SCHEDULED, AGENCY_DISPATCH
    response_status VARCHAR(30) NOT NULL, -- ACCEPTED, REJECTED, SKIPPED, EXPIRED, CANCELLED_BY_MUA
    reason TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mua_job_offers_mua FOREIGN KEY (mua_id) REFERENCES mua_schema.mua_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_mua_job_offers_booking FOREIGN KEY (booking_id) REFERENCES booking_schema.bookings (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mua_job_offers_mua_created ON booking_schema.mua_job_offers (mua_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mua_job_offers_booking ON booking_schema.mua_job_offers (booking_id);

COMMENT ON TABLE booking_schema.mua_job_offers IS 'Lưu lịch sử điều phối ca và phản hồi của MUA (Nhận/Từ chối/Bỏ qua/Hết hạn) phục vụ tính acceptance_rate';

-- Đồng bộ dữ liệu lịch sử các ca đã nhận vào bảng mua_job_offers
INSERT INTO booking_schema.mua_job_offers (mua_id, booking_id, offer_type, response_status, reason, created_at, responded_at)
SELECT 
    b.mua_id,
    b.id,
    COALESCE(b.booking_type::varchar, 'SCHEDULED'),
    'ACCEPTED',
    'Ca đã tiếp nhận thành công trong lịch sử',
    b.created_at,
    COALESCE(b.updated_at, b.created_at)
FROM booking_schema.bookings b
WHERE b.mua_id IS NOT NULL 
  AND b.status IN ('ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'PAID_OUT')
ON CONFLICT DO NOTHING;
