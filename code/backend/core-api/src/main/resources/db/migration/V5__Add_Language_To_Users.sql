-- =========================================================================================
-- V5: Thêm trường language đa ngôn ngữ (i18n) cho bảng users trong auth_schema
-- Mặc định: 'en' (English), hỗ trợ: 'en', 'vi'
-- =========================================================================================

ALTER TABLE auth_schema.users 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'en';

-- Thêm CHECK CONSTRAINT đảm bảo giá trị hợp lệ
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_language'
    ) THEN
        ALTER TABLE auth_schema.users 
        ADD CONSTRAINT chk_users_language CHECK (language IN ('en', 'vi'));
    END IF;
END $$;

COMMENT ON COLUMN auth_schema.users.language IS 'Ngôn ngữ giao diện người dùng lựa chọn (en = English, vi = Tiếng Việt)';
