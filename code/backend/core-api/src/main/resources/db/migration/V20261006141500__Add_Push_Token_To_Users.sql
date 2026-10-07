-- =========================================================================================
-- V20261006141500: Thêm trường push_token cho bảng auth_schema.users
-- Phục vụ gửi Remote Push Notification (Expo / APNs / FCM) tới Màn hình khóa khi tắt app
-- =========================================================================================

ALTER TABLE auth_schema.users 
ADD COLUMN IF NOT EXISTS push_token VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_push_token 
ON auth_schema.users (push_token) 
WHERE push_token IS NOT NULL;

COMMENT ON COLUMN auth_schema.users.push_token IS 'Expo Push Token hoặc thiết bị phục vụ đánh thức màn hình khóa khi tắt app';
