-- =============================================================================
-- V6__Seed_Super_Admin_And_Permissions.sql
-- Cấu hình vai trò, đặc quyền toàn diện và tài khoản mặc định cho ROLE_SUPER_ADMIN
-- =============================================================================

-- 1. Đảm bảo vai trò ROLE_SUPER_ADMIN tồn tại
INSERT INTO auth_schema.roles (name, description)
VALUES ('ROLE_SUPER_ADMIN', 'Quản trị viên tối cao của nền tảng')
ON CONFLICT (name) DO NOTHING;

-- 2. Gán toàn bộ đặc quyền quản trị hệ thống cho ROLE_SUPER_ADMIN
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('booking:create', 'Tạo đặt lịch trang điểm'),
    ('booking:view_my_jobs', 'Xem lịch hẹn'),
    ('booking:view_all', 'Xem toàn bộ lịch hẹn hệ thống'),
    ('booking:dispatch', 'Điều phối và gán thợ'),
    ('booking:update_status', 'Cập nhật tiến trình ca trang điểm'),
    ('booking:cancel', 'Hủy đơn đặt lịch'),
    ('agency:manage', 'Quản lý thông tin Studio / Đại lý'),
    ('agency:verify', 'Kiểm duyệt và kích hoạt Studio'),
    ('agency:invite_staff', 'Mời và duyệt thợ gia nhập Studio'),
    ('agency:set_commission', 'Thiết lập % hoa hồng nội bộ Studio'),
    ('agency:view_staff', 'Xem danh sách nhân sự Studio'),
    ('mua:verify_cert', 'Duyệt bằng cấp, chứng chỉ hành nghề của MUA'),
    ('mua:view_all', 'Xem danh sách tất cả hồ sơ MUA'),
    ('portfolio:upload', 'Upload ảnh portfolio'),
    ('portfolio:delete', 'Xóa ảnh portfolio'),
    ('portfolio:view_all', 'Xem toàn bộ portfolio trên nền tảng'),
    ('package:create', 'Tạo mới gói dịch vụ'),
    ('package:update', 'Chỉnh sửa gói dịch vụ'),
    ('package:delete', 'Xóa gói dịch vụ'),
    ('surcharge:configure', 'Cấu hình bảng phụ phí'),
    ('wallet:view_balance', 'Xem số dư ví'),
    ('wallet:withdraw', 'Rút tiền hoàn / doanh thu'),
    ('wallet:manage_all', 'Quản lý giao dịch ví toàn hệ thống'),
    ('user:view', 'Xem danh sách người dùng'),
    ('user:manage', 'Khóa / Kích hoạt / Phân quyền người dùng'),
    ('system:configure', 'Cấu hình tham số hệ thống'),
    ('system:view_metrics', 'Xem số liệu vận hành và giám sát hệ thống')
) AS p(code, descr)
WHERE r.name = 'ROLE_SUPER_ADMIN'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- 3. Khởi tạo tài khoản Super Admin mặc định nếu chưa tồn tại
DO $$
DECLARE
    v_admin_role_id INT;
    v_user_id BIGINT;
BEGIN
    SELECT id INTO v_admin_role_id FROM auth_schema.roles WHERE name = 'ROLE_SUPER_ADMIN';

    IF NOT EXISTS (SELECT 1 FROM auth_schema.users WHERE phone_number = '0900000001' OR email = 'superadmin@makeup.com') THEN
        INSERT INTO auth_schema.users (
            phone_number,
            email,
            password_hash,
            full_name,
            gender,
            is_active,
            is_verified,
            language
        ) VALUES (
            '0900000001',
            'superadmin@makeup.com',
            '$2a$12$UAwz0kgVijncUjI6wlCY9.tB4CQewnt4r51D2UVnW8BGg624fhqk.',
            'Platform Super Admin',
            'OTHER',
            TRUE,
            TRUE,
            'en'
        )
        RETURNING id INTO v_user_id;

        INSERT INTO auth_schema.user_roles (user_id, role_id)
        VALUES (v_user_id, v_admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END $$;
