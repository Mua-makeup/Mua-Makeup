-- =============================================================================
-- Migration: V20260930141500__Seed_Package_Items_Catalog.sql
-- Description: Seed real steps (COMPONENT) and add-on services (ADD_ON)
--              for Service Packages in catalog_schema.package_items.
--              Guarded with JOIN catalog_schema.service_packages to ensure FK safety.
-- =============================================================================

-- 1. Xóa các items trùng lặp hoặc cũ của các gói cần seed lại chuẩn
DELETE FROM catalog_schema.package_items WHERE package_id IN (1, 2, 3, 4, 5, 13, 15);

-- 2. Gói 13: Trang điểm ăn hỏi (MUA ID 3)
INSERT INTO catalog_schema.package_items (package_id, item_type, item_name, step_order, item_price, duration_minutes, is_required, is_active)
SELECT p.id, v.item_type, v.item_name, v.step_order, v.item_price, v.duration_minutes, v.is_required, v.is_active
FROM (
    VALUES
        ('COMPONENT', 'Làm sạch da & Cấp ẩm chuyên sâu', 1, 0.00, 10, true, true),
        ('COMPONENT', 'Lót nền kiềm dầu & Đánh nền che khuyết điểm', 2, 0.00, 25, true, true),
        ('COMPONENT', 'Kẻ chân mày & Phối màu mắt chuẩn phong cách', 3, 0.00, 20, true, true),
        ('COMPONENT', 'Tạo khối gò má, sống mũi & Đánh son lòng môi', 4, 0.00, 15, true, true),
        ('COMPONENT', 'Tạo kiểu tóc đi kèm phù hợp trang phục', 5, 0.00, 20, true, true),
        ('ADD_ON', 'Dán mi giả sợi 3D cao cấp gân trong', 6, 70000.00, 10, false, true),
        ('ADD_ON', 'Đính đá / Ngọc trai nghệ thuật quanh mắt', 7, 100000.00, 15, false, true),
        ('ADD_ON', 'Uốn sấy tạo kiểu tóc dạ hội', 8, 150000.00, 20, false, true),
        ('ADD_ON', 'Đánh phấn nền nhũ body bắt sáng vùng cổ/vai', 9, 120000.00, 10, false, true)
) AS v(item_type, item_name, step_order, item_price, duration_minutes, is_required, is_active)
JOIN catalog_schema.service_packages p ON p.id = 13;

-- 3. Gói 1: Gói Trang Điểm Cô Dâu VIP (Tone Thái Luxury) (MUA ID 1 - Nguyễn Hương Ly)
INSERT INTO catalog_schema.package_items (package_id, item_type, item_name, step_order, item_price, duration_minutes, is_required, is_active)
SELECT p.id, v.item_type, v.item_name, v.step_order, v.item_price, v.duration_minutes, v.is_required, v.is_active
FROM (
    VALUES
        ('COMPONENT', 'Làm sạch da & Cấp ẩm chuyên sâu', 1, 0.00, 10, true, true),
        ('COMPONENT', 'Lót nền kiềm dầu & Đánh nền che khuyết điểm', 2, 0.00, 25, true, true),
        ('COMPONENT', 'Kẻ chân mày & Phối màu mắt chuẩn phong cách', 3, 0.00, 20, true, true),
        ('COMPONENT', 'Tạo khối gò má, sống mũi & Đánh son lòng môi', 4, 0.00, 15, true, true),
        ('COMPONENT', 'Tạo kiểu tóc cô dâu cài vương miện/hoa tươi', 5, 0.00, 25, true, true),
        ('ADD_ON', 'Dán mi giả sợi 3D cao cấp gân trong', 6, 70000.00, 10, false, true),
        ('ADD_ON', 'Đính đá / Ngọc trai nghệ thuật quanh mắt', 7, 100000.00, 15, false, true),
        ('ADD_ON', 'Trang điểm mẹ cô dâu / người nhà đi kèm', 8, 450000.00, 45, false, true),
        ('ADD_ON', 'Đánh phấn nền nhũ body bắt sáng vùng cổ/vai', 9, 120000.00, 10, false, true)
) AS v(item_type, item_name, step_order, item_price, duration_minutes, is_required, is_active)
JOIN catalog_schema.service_packages p ON p.id = 1;

-- 4. Gói 4: Gói Trang Điểm Cô Dâu VIP (MUA ID 4 - Trần Thanh Tâm)
INSERT INTO catalog_schema.package_items (package_id, item_type, item_name, step_order, item_price, duration_minutes, is_required, is_active)
SELECT p.id, v.item_type, v.item_name, v.step_order, v.item_price, v.duration_minutes, v.is_required, v.is_active
FROM (
    VALUES
        ('COMPONENT', 'Làm sạch da & Cấp ẩm chuyên sâu', 1, 0.00, 10, true, true),
        ('COMPONENT', 'Lót nền kiềm dầu & Đánh nền che khuyết điểm', 2, 0.00, 25, true, true),
        ('COMPONENT', 'Kẻ chân mày & Phối màu mắt chuẩn phong cách', 3, 0.00, 20, true, true),
        ('COMPONENT', 'Tạo khối gò má, sống mũi & Đánh son lòng môi', 4, 0.00, 15, true, true),
        ('COMPONENT', 'Tạo kiểu tóc đi kèm phù hợp trang phục', 5, 0.00, 20, true, true),
        ('ADD_ON', 'Dán mi giả sợi 3D cao cấp gân trong', 6, 70000.00, 10, false, true),
        ('ADD_ON', 'Đính đá / Ngọc trai nghệ thuật quanh mắt', 7, 100000.00, 15, false, true),
        ('ADD_ON', 'Uốn sấy tạo kiểu tóc dạ hội', 8, 150000.00, 20, false, true),
        ('ADD_ON', 'Đánh phấn nền nhũ body bắt sáng vùng cổ/vai', 9, 120000.00, 10, false, true)
) AS v(item_type, item_name, step_order, item_price, duration_minutes, is_required, is_active)
JOIN catalog_schema.service_packages p ON p.id = 4;

-- 5. Gói 5: Make up cô dâu chuyên nghiệp (Studio Linh Đan Agency ID 2)
INSERT INTO catalog_schema.package_items (package_id, item_type, item_name, step_order, item_price, duration_minutes, is_required, is_active)
SELECT p.id, v.item_type, v.item_name, v.step_order, v.item_price, v.duration_minutes, v.is_required, v.is_active
FROM (
    VALUES
        ('COMPONENT', 'Làm sạch da & Cấp ẩm chuyên sâu', 1, 0.00, 10, true, true),
        ('COMPONENT', 'Lót nền kiềm dầu & Đánh nền che khuyết điểm', 2, 0.00, 25, true, true),
        ('COMPONENT', 'Kẻ chân mày & Phối màu mắt chuẩn phong cách', 3, 0.00, 20, true, true),
        ('COMPONENT', 'Tạo khối gò má, sống mũi & Đánh son lòng môi', 4, 0.00, 15, true, true),
        ('COMPONENT', 'Tạo kiểu tóc đi kèm phù hợp trang phục', 5, 0.00, 20, true, true),
        ('ADD_ON', 'Dán mi giả sợi 3D cao cấp gân trong', 6, 70000.00, 10, false, true),
        ('ADD_ON', 'Đính đá / Ngọc trai nghệ thuật quanh mắt', 7, 100000.00, 15, false, true),
        ('ADD_ON', 'Uốn sấy tạo kiểu tóc dạ hội', 8, 150000.00, 20, false, true),
        ('ADD_ON', 'Đánh phấn nền nhũ body bắt sáng vùng cổ/vai', 9, 120000.00, 10, false, true)
) AS v(item_type, item_name, step_order, item_price, duration_minutes, is_required, is_active)
JOIN catalog_schema.service_packages p ON p.id = 5;
