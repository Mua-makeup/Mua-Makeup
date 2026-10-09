-- =====================================================================
-- Migration: V20261009134000__Seed_Deep_Project_Taxonomy_And_Pricing_Knowledge.sql
-- Description: Bổ sung toàn bộ dữ liệu chi tiết về Hệ thống Taxonomy, Tone Make-up,
--              Bảng giá Bậc thang khoảng cách, Quy tắc Giờ Vàng/Cao điểm, Add-on,
--              Vệ sinh mỹ phẩm và Xác nhận tiền mặt kép.
-- =====================================================================

INSERT INTO interaction_schema.ai_knowledge_documents (category, title, content, keywords)
VALUES
(
    'TAXONOMY_CATEGORIES',
    'Danh mục Dịch vụ Gốc Toàn sàn (Master Service Categories)',
    'Nền tảng Mua-Makeup phân loại dịch vụ trang điểm thành 5 nhóm danh mục chính:
1. Trang điểm Cô Dâu (Mã MAKE_CO_DAU): Trang điểm tiệc cưới, lễ ăn hỏi, lễ đón dâu với kỹ thuật bền nền cao cấp 24 giờ, chống trôi lem mồ hôi và nước mắt.
2. Trang điểm Tiệc & Sự kiện (Mã MAKE_TIEC): Trang điểm dạ hội, gala dinner, tiệc sinh nhật, prom tôn vinh đường nét sang trọng và nổi bật dưới ánh đèn sân khấu.
3. Trang điểm Kỷ Yếu / Học Sinh (Mã MAKE_KY_YEU): Phong cách trong trẻo, tự nhiên, nền mỏng nhẹ nhưng giữ bền suốt ngày dài chụp ảnh ngoài trời.
4. Trang điểm Concept / Chụp ảnh Studio (Mã MAKE_CHUP_ANH): Trang điểm nghệ thuật, lookbook thời trang, cosplay, quảng cáo thương hiệu chuẩn độ tương phản ánh sáng studio.
5. Trang điểm Đi làm / Hàng ngày (Mã MAKE_HANG_NGAY): Trang điểm thanh lịch, nhẹ nhàng công sở, gặp gỡ đối tác kinh doanh.',
    'danh muc, master category, co dau, make tiec, ky yeu, concept, chup anh studio, cong so, hang ngay, phan loai dich vu'
),
(
    'TAXONOMY_STYLES',
    'Chi tiết 6 Tone Make-up Chuẩn Toàn sàn Mua-Makeup',
    'Nền tảng chuẩn hóa 6 phong cách trang điểm thịnh hành nhất hiện nay:
1. Tone Hàn Douyin (TONE_DOUYIN): Mắt to tròn long lanh, bọng mắt cười dễ thương, nhũ bắt sáng hạt mịn vùng đầu mắt và son lòng môi bóng căng mọng.
2. Tone Thái Sang Trọng (TONE_THAI): Lông mày phẩy sợi sắc nét tỉ mỉ, mắt phối nâu đồng, má cam nâu tây, mi cong vút tôn đường nét gương mặt quyến rũ.
3. Tone Tây Sắc Sảo (TONE_TAY): Tạo khối góc cạnh rõ rệt, mắt khói quyến rũ cut-crease, đường eyeliner sắc lẹm và son môi nude tràn viền cá tính phong cách Âu Mỹ.
4. Tone Hồng Baby Ngọt Ngào (TONE_HONG_BABY): Phấn má ửng hồng tươi trẻ, son môi hồng sữa nữ tính, mắt nhũ đào trong veo tạo nét ngây thơ.
5. Tone Cam Đào Trẻ Trung (TONE_CAM_DAO): Gam màu cam pastel ấm áp, trẻ trung, rạng rỡ, cực kỳ phù hợp cho tiệc ngoài trời, dã ngoại và chụp ảnh kỷ yếu.
6. Tone Cổ Điển / Retro (TONE_CO_DIEN): Môi đỏ nhung đậm quyền lực, eyeliner mắt mèo cổ điển, làn da mịn lì sang trọng gợi nhớ phong cách thập niên 80-90s.',
    'tone make-up, tone douyin, tone thai, tone tay, hong baby, cam dao, co dien retro, mat khoi, moi nude, phay soi long may'
),
(
    'DISTANCE_FEE_POLICY',
    'Chính sách Miễn phí và Bậc thang Phí Di chuyển (Distance Fee Tiers)',
    'Hệ thống Mua-Makeup tính phí di chuyển của thợ hoàn toàn tự động qua định vị Goong Maps theo 3 bậc thang minh bạch:
- Dưới 5km (0.00km - 5.00km): MIỄN PHÍ 100% PHÍ DI CHUYỂN (0 VNĐ).
- Từ 5km đến 15km: Phụ phí 15.000 VNĐ / mỗi km phát sinh ngoài 5km đầu.
- Từ 15km đến 30km: Phụ phí 20.000 VNĐ / mỗi km phát sinh.
- Trên 30km: Khách hàng và Thợ có thể thỏa thuận trực tiếp qua tính năng Chat trong ứng dụng.
Phí di chuyển được cộng tự động vào tổng hóa đơn khi khách nhập địa chỉ hẹn làm đẹp.',
    'phi di chuyen, mien phi duoi 5km, bac thang khoang cach, distance fee, goong maps, gia moi km, tinh tien xe'
),
(
    'SURGE_AND_HAPPY_HOUR',
    'Chính sách Ưu đãi Giờ Vàng và Phụ phí Khung giờ Cao điểm',
    'Hệ thống tự động điều chỉnh hệ số giá linh hoạt theo thời điểm đặt lịch:
1. ƯU ĐÃI GIỜ VÀNG BUỔI TRƯA (Happy Hour): Khung giờ từ 13:00 đến 15:00 tất cả các ngày trong tuần - Hệ số 0.90x (GIẢM NGAY 10% trên giá gốc dịch vụ).
2. Phụ phí Sáng Sớm Rước Dâu Cuối Tuần: Thứ Bảy và Chủ Nhật từ 05:00 đến 07:00 sáng - Hệ số 1.20x (+20% hỗ trợ thợ dậy sớm chuẩn bị).
3. Phụ phí Cuối Tuần Cao Điểm: Thứ Bảy và Chủ Nhật từ 08:00 đến 12:00 trưa - Hệ số 1.10x (+10% khung giờ nhiều đám cưới/sự kiện).
4. Phụ phí Tiệc Tối Khẩn Cấp: Thứ Sáu, Thứ Bảy, Chủ Nhật từ 17:30 đến 19:30 tối - Hệ số 1.15x (+15% giờ cao điểm tiệc tối).',
    'gio vang, happy hour, giam 10%, gio cao diem, ruoc dau sang som, cuoi tuan, tiec toi, he so gia, surge pricing'
),
(
    'ADDONS_AND_PRICING',
    'Danh mục Dịch vụ Mua Thêm (Add-ons) và Bảng giá Niêm yết',
    'Khách hàng có thể chọn thêm các dịch vụ đính kèm khi đặt gói trang điểm:
1. Dán mi giả sợi 3D cao cấp gân trong: 70.000 VNĐ (+10 phút thao tác).
2. Đính đá / Ngọc trai nghệ thuật lấp lánh quanh mắt: 100.000 VNĐ (+15 phút).
3. Uốn sấy tạo kiểu tóc dạ hội cầu kỳ: 150.000 VNĐ (+20 phút).
4. Đánh phấn nền nhũ body bắt sáng vùng xương quai xanh và vai: 120.000 VNĐ (+10 phút).
5. Trang điểm mẹ cô dâu / người nhà đi kèm: 450.000 VNĐ (+45 phút / người).',
    'dich vu mua them, add on, dan mi 3d, dinh da mat, uon toc da hoi, nhu body, trang diem me co dau, phu phi'
),
(
    'COSMETIC_HYGIENE_SAFETY',
    'Tiêu chuẩn Vệ sinh Mỹ phẩm và An toàn Da của Chuyên viên',
    'Mua-Makeup kiểm soát nghiêm ngặt chất lượng mỹ phẩm và quy chuẩn vệ sinh:
1. 100% Mỹ phẩm Chính hãng: Thợ cam kết sử dụng mỹ phẩm từ các thương hiệu uy tín có nguồn gốc rõ ràng (MAC, Dior, NARS, Shu Uemura, Laura Mercier, Clio, 3CE, v.v.). Nghiêm cấm mỹ phẩm trôi nổi, kém chất lượng.
2. Vệ sinh Dụng cụ Khử khuẩn: Toàn bộ cọ và mút trang điểm được làm sạch và sát khuẩn trước mỗi ca hẹn.
3. Đầu chuốt mi dùng 1 lần (Disposable wand) và Bảng pha màu son Inox riêng biệt: Đảm bảo vệ sinh tối đa, không lây nhiễm chéo.
4. Lưu ý Da nhạy cảm: Khách hàng có thể ghi chú tiền sử dị ứng mỹ phẩm hoặc yêu cầu dùng mỹ phẩm thuần chay (Vegan) ngay tại bước đặt lịch.',
    've sinh my pham, an toan da, my pham chinh hang, mac dior nars, co trang diem, khu trung, da nhay cam, di ung'
),
(
    'DUAL_CASH_CONFIRMATION',
    'Quy trình Thanh toán Tiền mặt Kép (Dual Cash Confirmation)',
    'Khi khách hàng chọn thanh toán phần tiền còn lại bằng Tiền mặt trực tiếp cho Thợ:
1. Sau khi hoàn thành xong ca trang điểm, Thợ bấm nút "Yêu cầu xác nhận tiền mặt" trên app của thợ và nhập số tiền thực nhận.
2. Màn hình ứng dụng của Khách hàng ngay lập tức hiển thị pop-up thông báo xác nhận: "Thợ thông báo đã nhận số tiền [X] VNĐ bằng tiền mặt từ bạn. Vui lòng xác nhận".
3. Khách hàng kiểm tra đúng số tiền và bấm "Xác nhận đã thanh toán".
4. Sau khi cả 2 bên cùng xác nhận, ca hẹn mới chính thức hoàn tất (COMPLETED). Cơ chế này bảo vệ khách không bị báo nợ oan và bảo vệ thợ nhận đủ tiền công.',
    'thanh toan tien mat, xac nhan kep, dual cash confirmation, tra tien mat cho tho, popup xac nhan, an toan thanh toan'
);
