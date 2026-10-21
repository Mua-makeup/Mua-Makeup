-- ==============================================================================
-- Migration: V20261021160000__Add_Agency_Reply_To_Reviews.sql
-- Description: Thêm trường agency_reply và agency_replied_at vào bảng interaction_schema.reviews
-- ==============================================================================

ALTER TABLE interaction_schema.reviews
    ADD COLUMN IF NOT EXISTS agency_reply TEXT,
    ADD COLUMN IF NOT EXISTS agency_replied_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_reviews_agency_created 
    ON interaction_schema.reviews(agency_id, created_at DESC);

COMMENT ON COLUMN interaction_schema.reviews.agency_reply IS 'Nội dung phản hồi chính thức từ Studio tới khách hàng';
COMMENT ON COLUMN interaction_schema.reviews.agency_replied_at IS 'Thời điểm Studio đăng tải phản hồi';
