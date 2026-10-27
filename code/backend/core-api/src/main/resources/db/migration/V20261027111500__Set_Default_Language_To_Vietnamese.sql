-- =============================================================================
-- V20261027111500__Set_Default_Language_To_Vietnamese.sql
-- NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
-- CHUYỂN TOÀN BỘ NGÔN NGỮ MẶC ĐỊNH HỆ THỐNG VÀ NGƯỜI DÙNG SANG TIẾNG VIỆT ('vi')
-- =============================================================================

-- 1. Đổi giá trị mặc định của cột language trong bảng auth_schema.users thành 'vi'
ALTER TABLE auth_schema.users 
ALTER COLUMN language SET DEFAULT 'vi';

-- 2. Cập nhật các tài khoản hiện có đang có language là 'en' hoặc NULL về 'vi'
UPDATE auth_schema.users 
SET language = 'vi' 
WHERE language = 'en' OR language IS NULL;
