-- =============================================================================
-- SCRIPT KHỞI TẠO TÀI KHOẢN MẪU HỆ THỐNG MAKEUP BOOKING PLATFORM
-- =============================================================================
-- Danh sách tài khoản:
-- 1. Khách hàng (ROLE_CUSTOMER):       0912345678 / customer@makeup.com
-- 2. Agency Admin (ROLE_AGENCY_ADMIN):  0922000001 / agency.admin@glamour.com
-- 3. Thợ MUA Tự Do (ROLE_FREELANCE_MUA): 0933000001 / mua.freelancer@gmail.com
-- 4. Nhân viên 1 (ROLE_AGENCY_STAFF):  0944000001 / staff1.vy@glamour.com
-- 5. Nhân viên 2 (ROLE_AGENCY_STAFF):  0944000002 / staff2.ngoc@glamour.com
-- 6. Nhân viên 3 (ROLE_AGENCY_STAFF):  0944000003 / staff3.phuong@glamour.com
-- 7. Nhân viên 4 (ROLE_AGENCY_STAFF):  0944000004 / staff4.huong@glamour.com
-- 
-- MẬT KHẨU MẶC ĐỊNH CHUNG: 123456
-- BCrypt Hash (Cost 12): $2a$12$QzR.hgBOduTBq2s3Edhmy.c7yP1DTpow7JKDB.lxTLFJPkooZdlcq
-- =============================================================================

DO $$
DECLARE
    -- Hash BCrypt chuẩn cho mật khẩu: 123456 (strength 12)
    v_password_hash VARCHAR(255) := '$2a$12$QzR.hgBOduTBq2s3Edhmy.c7yP1DTpow7JKDB.lxTLFJPkooZdlcq';

    -- Role IDs
    v_role_customer_id INT;
    v_role_agency_admin_id INT;
    v_role_freelance_mua_id INT;
    v_role_agency_staff_id INT;

    -- User IDs
    v_cust_id BIGINT;
    v_agency_owner_id BIGINT;
    v_freelance_mua_user_id BIGINT;
    v_staff1_user_id BIGINT;
    v_staff2_user_id BIGINT;
    v_staff3_user_id BIGINT;
    v_staff4_user_id BIGINT;

    -- Profile IDs
    v_agency_id BIGINT;
    v_freelance_mua_profile_id BIGINT;
    v_staff1_mua_id BIGINT;
    v_staff2_mua_id BIGINT;
    v_staff3_mua_id BIGINT;
    v_staff4_mua_id BIGINT;

    -- Agency Staff IDs
    v_staff1_agency_staff_id BIGINT;
    v_staff2_agency_staff_id BIGINT;
    v_staff3_agency_staff_id BIGINT;
    v_staff4_agency_staff_id BIGINT;

    v_day INT;
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. LẤY ROLE IDS TỪ auth_schema.roles
    -- -------------------------------------------------------------------------
    SELECT id INTO v_role_customer_id FROM auth_schema.roles WHERE name = 'ROLE_CUSTOMER';
    SELECT id INTO v_role_agency_admin_id FROM auth_schema.roles WHERE name = 'ROLE_AGENCY_ADMIN';
    SELECT id INTO v_role_freelance_mua_id FROM auth_schema.roles WHERE name = 'ROLE_FREELANCE_MUA';
    SELECT id INTO v_role_agency_staff_id FROM auth_schema.roles WHERE name = 'ROLE_AGENCY_STAFF';

    IF v_role_customer_id IS NULL OR v_role_agency_admin_id IS NULL OR 
       v_role_freelance_mua_id IS NULL OR v_role_agency_staff_id IS NULL THEN
        RAISE EXCEPTION 'Chưa tìm thấy đầy đủ các Roles cơ bản trong auth_schema.roles. Vui lòng kiểm tra lại migrations!';
    END IF;

    -- =========================================================================
    -- 2. TẠO TÀI KHOẢN KHÁCH HÀNG (ROLE_CUSTOMER)
    -- =========================================================================
    SELECT id INTO v_cust_id FROM auth_schema.users WHERE phone_number = '0912345678';
    IF v_cust_id IS NULL THEN
        INSERT INTO auth_schema.users (
            phone_number, email, password_hash, full_name, gender, 
            is_active, is_verified, language
        ) VALUES (
            '0912345678', 'customer@makeup.com', v_password_hash, 'Nguyễn Thùy Linh', 'FEMALE',
            TRUE, TRUE, 'vi'
        ) RETURNING id INTO v_cust_id;
    ELSE
        UPDATE auth_schema.users 
        SET password_hash = v_password_hash, is_active = TRUE, is_verified = TRUE 
        WHERE id = v_cust_id;
    END IF;

    -- Gán Role Khách Hàng
    INSERT INTO auth_schema.user_roles (user_id, role_id)
    VALUES (v_cust_id, v_role_customer_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Tạo ví cho Khách Hàng (Số dư 5.000.000 VNĐ)
    INSERT INTO wallet_schema.wallets (user_id, available_balance, frozen_balance, currency)
    VALUES (v_cust_id, 5000000.00, 0.00, 'VND')
    ON CONFLICT (user_id) DO UPDATE 
    SET available_balance = EXCLUDED.available_balance;

    -- =========================================================================
    -- 3. TẠO TÀI KHOẢN AGENCY ADMIN (ROLE_AGENCY_ADMIN) & STUDIO GLAMOUR
    -- =========================================================================
    SELECT id INTO v_agency_owner_id FROM auth_schema.users WHERE phone_number = '0922000001';
    IF v_agency_owner_id IS NULL THEN
        INSERT INTO auth_schema.users (
            phone_number, email, password_hash, full_name, gender, 
            is_active, is_verified, language
        ) VALUES (
            '0922000001', 'agency.admin@glamour.com', v_password_hash, 'Lê Hoàng Nam', 'MALE',
            TRUE, TRUE, 'vi'
        ) RETURNING id INTO v_agency_owner_id;
    ELSE
        UPDATE auth_schema.users 
        SET password_hash = v_password_hash, is_active = TRUE, is_verified = TRUE 
        WHERE id = v_agency_owner_id;
    END IF;

    -- Gán Role Agency Admin
    INSERT INTO auth_schema.user_roles (user_id, role_id)
    VALUES (v_agency_owner_id, v_role_agency_admin_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Tạo Profile Studio / Đại lý Glamour
    SELECT id INTO v_agency_id FROM agency_schema.agency_profiles WHERE owner_id = v_agency_owner_id;
    IF v_agency_id IS NULL THEN
        INSERT INTO agency_schema.agency_profiles (
            owner_id, agency_code, agency_name, hotline, address_street,
            district, city, latitude, longitude, location_point,
            commission_rate_internal, is_verified, rating_avg, is_surge_enabled
        ) VALUES (
            v_agency_owner_id, 'AGY-GLAMOUR-01', 'Glamour Bridal Studio', '02838383838', '123 Nguyễn Huệ',
            'Quận 1', 'Hồ Chí Minh', 10.776889, 106.700806, ST_SetSRID(ST_MakePoint(106.700806, 10.776889), 4326),
            25.00, TRUE, 5.00, TRUE
        ) RETURNING id INTO v_agency_id;
    ELSE
        UPDATE agency_schema.agency_profiles
        SET agency_code = 'AGY-GLAMOUR-01', agency_name = 'Glamour Bridal Studio',
            is_verified = TRUE, latitude = 10.776889, longitude = 106.700806,
            location_point = ST_SetSRID(ST_MakePoint(106.700806, 10.776889), 4326)
        WHERE id = v_agency_id;
    END IF;

    -- Chi nhánh chính (Main Branch)
    INSERT INTO agency_schema.agency_branches (
        agency_id, branch_name, phone_number, address_line, 
        latitude, longitude, location_point, is_main_branch, is_active
    ) VALUES (
        v_agency_id, 'Glamour Bridal Studio (Trụ sở chính)', '02838383838', '123 Nguyễn Huệ, Quận 1, Hồ Chí Minh',
        10.776889, 106.700806, ST_SetSRID(ST_MakePoint(106.700806, 10.776889), 4326), TRUE, TRUE
    ) ON CONFLICT DO NOTHING;

    -- Tạo ví doanh nghiệp cho Studio (Số dư 10.000.000 VNĐ)
    INSERT INTO wallet_schema.wallets (user_id, available_balance, frozen_balance, currency)
    VALUES (v_agency_owner_id, 10000000.00, 0.00, 'VND')
    ON CONFLICT (user_id) DO UPDATE 
    SET available_balance = EXCLUDED.available_balance;

    -- =========================================================================
    -- 4. TẠO TÀI KHOẢN THỢ MUA TỰ DO (ROLE_FREELANCE_MUA)
    -- =========================================================================
    SELECT id INTO v_freelance_mua_user_id FROM auth_schema.users WHERE phone_number = '0933000001';
    IF v_freelance_mua_user_id IS NULL THEN
        INSERT INTO auth_schema.users (
            phone_number, email, password_hash, full_name, gender, 
            is_active, is_verified, language
        ) VALUES (
            '0933000001', 'mua.freelancer@gmail.com', v_password_hash, 'Trần Hoàng Linh', 'FEMALE',
            TRUE, TRUE, 'vi'
        ) RETURNING id INTO v_freelance_mua_user_id;
    ELSE
        UPDATE auth_schema.users 
        SET password_hash = v_password_hash, is_active = TRUE, is_verified = TRUE 
        WHERE id = v_freelance_mua_user_id;
    END IF;

    -- Gán Role Freelance MUA
    INSERT INTO auth_schema.user_roles (user_id, role_id)
    VALUES (v_freelance_mua_user_id, v_role_freelance_mua_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Tạo Profile Thợ Tự Do
    SELECT id INTO v_freelance_mua_profile_id FROM mua_schema.mua_profiles WHERE user_id = v_freelance_mua_user_id;
    IF v_freelance_mua_profile_id IS NULL THEN
        INSERT INTO mua_schema.mua_profiles (
            user_id, mua_code, bio, experience_years, max_service_radius_km,
            is_online, is_busy, rating_avg, total_completed_jobs,
            base_address_lat, base_address_lng, base_address_text, is_surge_enabled
        ) VALUES (
            v_freelance_mua_user_id, 'MUA-FREE-001', 'Chuyên viên make-up cô dâu, sự kiện phong cách Hàn Quốc và Glamour', 5, 20.0,
            TRUE, FALSE, 5.00, 36,
            10.776889, 106.700806, 'Quận 1, TP. Hồ Chí Minh', TRUE
        ) RETURNING id INTO v_freelance_mua_profile_id;
    ELSE
        UPDATE mua_schema.mua_profiles
        SET mua_code = 'MUA-FREE-001', is_online = TRUE, is_busy = FALSE,
            base_address_lat = 10.776889, base_address_lng = 106.700806
        WHERE id = v_freelance_mua_profile_id;
    END IF;

    -- Tạo ví cho Thợ Tự Do (Số dư 3.000.000 VNĐ)
    INSERT INTO wallet_schema.wallets (user_id, available_balance, frozen_balance, currency)
    VALUES (v_freelance_mua_user_id, 3000000.00, 0.00, 'VND')
    ON CONFLICT (user_id) DO UPDATE 
    SET available_balance = EXCLUDED.available_balance;

    -- =========================================================================
    -- 5. TẠO 4 TÀI KHOẢN NHÂN VIÊN STUDIO (ROLE_AGENCY_STAFF)
    -- =========================================================================

    -- -------------------------------------------------------------------------
    -- Nhân viên 1: Phạm Thảo Vy (MUA-STAFF-001)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_staff1_user_id FROM auth_schema.users WHERE phone_number = '0944000001';
    IF v_staff1_user_id IS NULL THEN
        INSERT INTO auth_schema.users (
            phone_number, email, password_hash, full_name, gender, 
            is_active, is_verified, language
        ) VALUES (
            '0944000001', 'staff1.vy@glamour.com', v_password_hash, 'Phạm Thảo Vy', 'FEMALE',
            TRUE, TRUE, 'vi'
        ) RETURNING id INTO v_staff1_user_id;
    ELSE
        UPDATE auth_schema.users SET password_hash = v_password_hash, is_active = TRUE, is_verified = TRUE WHERE id = v_staff1_user_id;
    END IF;

    INSERT INTO auth_schema.user_roles (user_id, role_id) VALUES (v_staff1_user_id, v_role_agency_staff_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    SELECT id INTO v_staff1_mua_id FROM mua_schema.mua_profiles WHERE user_id = v_staff1_user_id;
    IF v_staff1_mua_id IS NULL THEN
        INSERT INTO mua_schema.mua_profiles (
            user_id, mua_code, bio, experience_years, max_service_radius_km, is_online, is_busy, rating_avg, total_completed_jobs
        ) VALUES (
            v_staff1_user_id, 'MUA-STAFF-001', 'Chuyên viên make-up cao cấp Studio Glamour', 3, 15.0, TRUE, FALSE, 5.00, 15
        ) RETURNING id INTO v_staff1_mua_id;
    END IF;

    SELECT id INTO v_staff1_agency_staff_id FROM agency_schema.agency_staff WHERE agency_id = v_agency_id AND mua_id = v_staff1_mua_id;
    IF v_staff1_agency_staff_id IS NULL THEN
        INSERT INTO agency_schema.agency_staff (
            agency_id, mua_id, agreed_commission_rate, is_active, status, note
        ) VALUES (
            v_agency_id, v_staff1_mua_id, 30.00, TRUE, 'ACTIVE', 'Nhân viên make-up chính thức'
        ) RETURNING id INTO v_staff1_agency_staff_id;
    ELSE
        UPDATE agency_schema.agency_staff SET is_active = TRUE, status = 'ACTIVE' WHERE id = v_staff1_agency_staff_id;
    END IF;

    INSERT INTO wallet_schema.wallets (user_id, available_balance, frozen_balance, currency)
    VALUES (v_staff1_user_id, 1000000.00, 0.00, 'VND')
    ON CONFLICT (user_id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- Nhân viên 2: Đặng Bảo Ngọc (MUA-STAFF-002)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_staff2_user_id FROM auth_schema.users WHERE phone_number = '0944000002';
    IF v_staff2_user_id IS NULL THEN
        INSERT INTO auth_schema.users (
            phone_number, email, password_hash, full_name, gender, 
            is_active, is_verified, language
        ) VALUES (
            '0944000002', 'staff2.ngoc@glamour.com', v_password_hash, 'Đặng Bảo Ngọc', 'FEMALE',
            TRUE, TRUE, 'vi'
        ) RETURNING id INTO v_staff2_user_id;
    ELSE
        UPDATE auth_schema.users SET password_hash = v_password_hash, is_active = TRUE, is_verified = TRUE WHERE id = v_staff2_user_id;
    END IF;

    INSERT INTO auth_schema.user_roles (user_id, role_id) VALUES (v_staff2_user_id, v_role_agency_staff_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    SELECT id INTO v_staff2_mua_id FROM mua_schema.mua_profiles WHERE user_id = v_staff2_user_id;
    IF v_staff2_mua_id IS NULL THEN
        INSERT INTO mua_schema.mua_profiles (
            user_id, mua_code, bio, experience_years, max_service_radius_km, is_online, is_busy, rating_avg, total_completed_jobs
        ) VALUES (
            v_staff2_user_id, 'MUA-STAFF-002', 'Chuyên viên layout cô dâu truyền thống và hiện đại', 4, 15.0, TRUE, FALSE, 5.00, 22
        ) RETURNING id INTO v_staff2_mua_id;
    END IF;

    SELECT id INTO v_staff2_agency_staff_id FROM agency_schema.agency_staff WHERE agency_id = v_agency_id AND mua_id = v_staff2_mua_id;
    IF v_staff2_agency_staff_id IS NULL THEN
        INSERT INTO agency_schema.agency_staff (
            agency_id, mua_id, agreed_commission_rate, is_active, status, note
        ) VALUES (
            v_agency_id, v_staff2_mua_id, 30.00, TRUE, 'ACTIVE', 'Nhân viên make-up chính thức'
        ) RETURNING id INTO v_staff2_agency_staff_id;
    ELSE
        UPDATE agency_schema.agency_staff SET is_active = TRUE, status = 'ACTIVE' WHERE id = v_staff2_agency_staff_id;
    END IF;

    INSERT INTO wallet_schema.wallets (user_id, available_balance, frozen_balance, currency)
    VALUES (v_staff2_user_id, 1000000.00, 0.00, 'VND')
    ON CONFLICT (user_id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- Nhân viên 3: Vũ Mai Phương (MUA-STAFF-003)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_staff3_user_id FROM auth_schema.users WHERE phone_number = '0944000003';
    IF v_staff3_user_id IS NULL THEN
        INSERT INTO auth_schema.users (
            phone_number, email, password_hash, full_name, gender, 
            is_active, is_verified, language
        ) VALUES (
            '0944000003', 'staff3.phuong@glamour.com', v_password_hash, 'Vũ Mai Phương', 'FEMALE',
            TRUE, TRUE, 'vi'
        ) RETURNING id INTO v_staff3_user_id;
    ELSE
        UPDATE auth_schema.users SET password_hash = v_password_hash, is_active = TRUE, is_verified = TRUE WHERE id = v_staff3_user_id;
    END IF;

    INSERT INTO auth_schema.user_roles (user_id, role_id) VALUES (v_staff3_user_id, v_role_agency_staff_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    SELECT id INTO v_staff3_mua_id FROM mua_schema.mua_profiles WHERE user_id = v_staff3_user_id;
    IF v_staff3_mua_id IS NULL THEN
        INSERT INTO mua_schema.mua_profiles (
            user_id, mua_code, bio, experience_years, max_service_radius_km, is_online, is_busy, rating_avg, total_completed_jobs
        ) VALUES (
            v_staff3_user_id, 'MUA-STAFF-003', 'Chuyên viên make-up kỷ yếu, chụp ngoại cảnh', 2, 15.0, TRUE, FALSE, 4.90, 18
        ) RETURNING id INTO v_staff3_mua_id;
    END IF;

    SELECT id INTO v_staff3_agency_staff_id FROM agency_schema.agency_staff WHERE agency_id = v_agency_id AND mua_id = v_staff3_mua_id;
    IF v_staff3_agency_staff_id IS NULL THEN
        INSERT INTO agency_schema.agency_staff (
            agency_id, mua_id, agreed_commission_rate, is_active, status, note
        ) VALUES (
            v_agency_id, v_staff3_mua_id, 25.00, TRUE, 'ACTIVE', 'Nhân viên make-up chính thức'
        ) RETURNING id INTO v_staff3_agency_staff_id;
    ELSE
        UPDATE agency_schema.agency_staff SET is_active = TRUE, status = 'ACTIVE' WHERE id = v_staff3_agency_staff_id;
    END IF;

    INSERT INTO wallet_schema.wallets (user_id, available_balance, frozen_balance, currency)
    VALUES (v_staff3_user_id, 1000000.00, 0.00, 'VND')
    ON CONFLICT (user_id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- Nhân viên 4: Bùi Thanh Hương (MUA-STAFF-004)
    -- -------------------------------------------------------------------------
    SELECT id INTO v_staff4_user_id FROM auth_schema.users WHERE phone_number = '0944000004';
    IF v_staff4_user_id IS NULL THEN
        INSERT INTO auth_schema.users (
            phone_number, email, password_hash, full_name, gender, 
            is_active, is_verified, language
        ) VALUES (
            '0944000004', 'staff4.huong@glamour.com', v_password_hash, 'Bùi Thanh Hương', 'FEMALE',
            TRUE, TRUE, 'vi'
        ) RETURNING id INTO v_staff4_user_id;
    ELSE
        UPDATE auth_schema.users SET password_hash = v_password_hash, is_active = TRUE, is_verified = TRUE WHERE id = v_staff4_user_id;
    END IF;

    INSERT INTO auth_schema.user_roles (user_id, role_id) VALUES (v_staff4_user_id, v_role_agency_staff_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    SELECT id INTO v_staff4_mua_id FROM mua_schema.mua_profiles WHERE user_id = v_staff4_user_id;
    IF v_staff4_mua_id IS NULL THEN
        INSERT INTO mua_schema.mua_profiles (
            user_id, mua_code, bio, experience_years, max_service_radius_km, is_online, is_busy, rating_avg, total_completed_jobs
        ) VALUES (
            v_staff4_user_id, 'MUA-STAFF-004', 'Chuyên viên make-up tone Tây sắc sảo & Fashion', 3, 15.0, TRUE, FALSE, 5.00, 20
        ) RETURNING id INTO v_staff4_mua_id;
    END IF;

    SELECT id INTO v_staff4_agency_staff_id FROM agency_schema.agency_staff WHERE agency_id = v_agency_id AND mua_id = v_staff4_mua_id;
    IF v_staff4_agency_staff_id IS NULL THEN
        INSERT INTO agency_schema.agency_staff (
            agency_id, mua_id, agreed_commission_rate, is_active, status, note
        ) VALUES (
            v_agency_id, v_staff4_mua_id, 25.00, TRUE, 'ACTIVE', 'Nhân viên make-up chính thức'
        ) RETURNING id INTO v_staff4_agency_staff_id;
    ELSE
        UPDATE agency_schema.agency_staff SET is_active = TRUE, status = 'ACTIVE' WHERE id = v_staff4_agency_staff_id;
    END IF;

    INSERT INTO wallet_schema.wallets (user_id, available_balance, frozen_balance, currency)
    VALUES (v_staff4_user_id, 1000000.00, 0.00, 'VND')
    ON CONFLICT (user_id) DO NOTHING;

    -- =========================================================================
    -- 6. THIẾT LẬP CA LÀM VIỆC & KỸ NĂNG CHO 4 NHÂN VIÊN STUDIO
    --    (Phục vụ ma trận điều phối Dispatch Matrix & tìm thợ rảnh)
    -- =========================================================================

    -- Tạo ca làm việc từ Thứ 2 đến Chủ Nhật (1..7), 07:00 - 22:00 cho cả 4 nhân viên nếu chưa có
    FOR v_day IN 1..7 LOOP
        INSERT INTO agency_schema.agency_staff_shifts (
            agency_id, staff_id, day_of_week, shift_name, start_time, end_time, is_recurring, is_active
        )
        SELECT v_agency_id, s_id, v_day, 'Ca Tiêu Chuẩn Studio', '07:00:00', '22:00:00', TRUE, TRUE
        FROM (VALUES 
            (v_staff1_agency_staff_id), 
            (v_staff2_agency_staff_id), 
            (v_staff3_agency_staff_id), 
            (v_staff4_agency_staff_id)
        ) AS staff_list(s_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM agency_schema.agency_staff_shifts
            WHERE agency_id = v_agency_id AND staff_id = staff_list.s_id AND day_of_week = v_day
        );
    END LOOP;

    -- Gán tất cả Gói Dịch Vụ và Phong Cách Trang Điểm cho 4 nhân viên (is_qualified = TRUE)
    INSERT INTO agency_schema.agency_staff_services (staff_id, package_id, proficiency_level, is_qualified)
    SELECT s.id, p.id, 'PRIMARY_MUA', TRUE
    FROM agency_schema.agency_staff s
    CROSS JOIN catalog_schema.service_packages p
    WHERE s.id IN (v_staff1_agency_staff_id, v_staff2_agency_staff_id, v_staff3_agency_staff_id, v_staff4_agency_staff_id)
    ON CONFLICT (staff_id, package_id) DO UPDATE SET is_qualified = TRUE;

    INSERT INTO agency_schema.agency_staff_styles (staff_id, style_id, is_qualified)
    SELECT s.id, st.id, TRUE
    FROM agency_schema.agency_staff s
    CROSS JOIN catalog_schema.makeup_styles st
    WHERE s.id IN (v_staff1_agency_staff_id, v_staff2_agency_staff_id, v_staff3_agency_staff_id, v_staff4_agency_staff_id)
    ON CONFLICT (staff_id, style_id) DO UPDATE SET is_qualified = TRUE;

    RAISE NOTICE '>>> ĐÃ KHỞI TẠO THÀNH CÔNG 7 TÀI KHOẢN (1 CUSTOMER, 1 AGENCY ADMIN, 1 FREELANCE MUA, 4 AGENCY STAFF)! MẬT KHẨU CHUNG: 123456';
END $$;
