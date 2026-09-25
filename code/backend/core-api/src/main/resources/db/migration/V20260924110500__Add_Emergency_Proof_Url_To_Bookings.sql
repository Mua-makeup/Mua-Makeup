-- ==============================================================================
-- Migration: V20260924110500__Add_Emergency_Proof_Url_To_Bookings.sql
-- Description: Bổ sung emergency_proof_url trên bookings và proof_document_url trên booking_staff_assignments
-- ==============================================================================

ALTER TABLE booking_schema.bookings 
    ADD COLUMN IF NOT EXISTS emergency_proof_url TEXT;

ALTER TABLE booking_schema.booking_staff_assignments 
    ADD COLUMN IF NOT EXISTS proof_document_url TEXT;

COMMENT ON COLUMN booking_schema.bookings.emergency_proof_url IS 'Đường dẫn ảnh minh chứng lý do báo bận khẩn cấp (tai nạn, giấy khám bệnh, sự cố)';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.proof_document_url IS 'Đường dẫn ảnh minh chứng thợ gửi lên khi báo bận đột xuất';
