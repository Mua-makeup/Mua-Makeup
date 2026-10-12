
CREATE TABLE IF NOT EXISTS interaction_schema.ai_knowledge_documents (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    keywords VARCHAR(500),
    embedding TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON interaction_schema.ai_knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_active ON interaction_schema.ai_knowledge_documents(is_active);

-- 2. BẢNG QUẢN LÝ PHIÊN HỘI THOẠI AI CHAT
CREATE TABLE IF NOT EXISTS interaction_schema.ai_chat_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_code VARCHAR(64) UNIQUE NOT NULL,
    user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_session_user ON interaction_schema.ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_session_code ON interaction_schema.ai_chat_sessions(session_code);

-- 3. BẢNG NHẬT KÝ TIN NHẮN TRONG PHIÊN CHAT
CREATE TABLE IF NOT EXISTS interaction_schema.ai_chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES interaction_schema.ai_chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'USER' hoặc 'ASSISTANT'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON interaction_schema.ai_chat_messages(session_id);

-- 4. SEED DỮ LIỆU TRI THỨC CHUẨN VỀ DỰ ÁN MUA-MAKEUP
INSERT INTO interaction_schema.ai_knowledge_documents (category, title, content, keywords)
VALUES
(
    'OVERVIEW',
    'Tổng quan Nền tảng Mua-Makeup',
    'Mua-Makeup là nền tảng công nghệ kết nối khách hàng có nhu cầu trang điểm (make-up) với các Chuyên viên trang điểm tự do (Freelance MUA) và các Studio/Đại lý (Agency) uy tín. Nền tảng hỗ trợ 2 hình thức đặt lịch: Đặt lịch hẹn trước (Scheduled Booking) và Đặt lịch khẩn cấp 30 giây (Instant Emergency Booking). Hệ thống tích hợp ví cọc Escrow an toàn, theo dõi GPS thợ di chuyển realtime và đánh giá minh bạch.',
    'mua-makeup, nen tang, gioi thieu, tong quan, freelance mua, agency, studio, dat lich trang diem'
),
(
    'BOOKING_FLOW',
    'Hướng dẫn Đặt lịch Hẹn trước (Scheduled Booking)',
    'Khách hàng có thể đặt lịch trước từ 1 ngày đến nhiều tuần theo các bước: 1. Vào trang Khám phá (Explore) hoặc Danh sách Thợ/Studio để chọn chuyên viên hoặc gói dịch vụ ưng ý. 2. Xem trang cá nhân, Portfolio các tác phẩm thực tế, đánh giá và bảng giá. 3. Chọn ngày và khung giờ (Slot) còn trống trên lịch của Thợ. 4. Điền địa chỉ làm việc (tại nhà khách hoặc tại Studio) và các yêu cầu phụ (Addon, số lượng người). 5. Đặt cọc tối thiểu (30-50%) qua Ví Mua-Makeup, VNPay hoặc MoMo để giữ lịch. Sau khi cọc thành công, thợ sẽ xác nhận ca hẹn.',
    'dat lich truoc, scheduled booking, chon gio, dat slot, chon tho, xem portfolio, dia chi lam viec'
),
(
    'BOOKING_FLOW',
    'Hướng dẫn Đặt ca Khẩn cấp 30 giây (Instant Emergency Booking)',
    'Khi khách hàng có nhu cầu trang điểm gấp trong vòng 30 - 60 phút: 1. Khách hàng bật định vị GPS và chọn tính năng "Đặt ca khẩn cấp" trên ứng dụng. 2. Chọn phong cách make-up mong muốn và nhập địa chỉ hiện tại. 3. Hệ thống quét các Thợ rảnh (Online) gần nhất trong bán kính phục vụ qua Redis GEO và phát tín hiệu Broadcast kèm đồng hồ đếm ngược 30-45 giây. 4. Thợ bấm nhận ca đầu tiên sẽ được hệ thống ghép nối (được bảo vệ bằng Redlock chống tranh chấp). 5. Khách hàng theo dõi vị trí GPS di chuyển trực tiếp của thợ trên bản đồ và thợ đến tận nơi làm đẹp.',
    'dat lich khan cap, ca gap, emergency booking, 30 giay, theo doi gps, tho gan nhat, thoi gian gap'
),
(
    'DEPOSIT_WALLET',
    'Chính sách Tiền cọc Escrow và Thanh toán',
    'Nhằm bảo vệ quyền lợi của cả khách hàng và thợ trang điểm, Mua-Makeup áp dụng cơ chế Giữ cọc Escrow: Khi khách đặt lịch, tiền cọc (thường từ 30% đến 50% giá trị gói) sẽ được tạm giữ trong quỹ Escrow an toàn của hệ thống, chưa chuyển ngay cho thợ. Khách hàng có thể nạp tiền vào Ví cá nhân hoặc thanh toán trực tiếp qua Cổng VNPay, MoMo. Sau khi thợ hoàn thành ca trang điểm và khách hàng xác nhận hài lòng, hệ thống mới giải ngân tiền công vào ví của Thợ hoặc Đại lý.',
    'tien coc, escrow, giu coc, thanh toan, nap tien, vnpay, momo, vi mua-makeup, an toan, giai ngan'
),
(
    'CANCELLATION_REFUND',
    'Quy định Hủy lịch hẹn và Hoàn tiền cọc',
    'Chính sách hủy lịch trên Mua-Makeup được quy định rõ ràng: 1. Nếu khách hàng hủy lịch trước thời điểm hẹn từ 24 giờ trở lên: Khách được HOÀN LẠI 100% tiền cọc vào Ví tài khoản. 2. Nếu khách hàng hủy trong vòng 24 giờ trước giờ hẹn: Tiền cọc sẽ không được hoàn lại mà được dùng để bồi thường chi phí chuẩn bị và thời gian chờ của Thợ/Studio. 3. Nếu Thợ/Studio tự ý hủy lịch hẹn: Khách hàng được HOÀN 100% tiền cọc ngay lập tức, đồng thời Thợ sẽ bị hệ thống xử phạt và bồi thường điểm uy tín.',
    'huy lich, hoan tien, chinh sach huy, mat coc, hoan coc, tho huy, khach huy, thoi gian huy'
),
(
    'DISPUTE_POLICY',
    'Chính sách Khiếu nại và Giải quyết Tranh chấp',
    'Nếu khách hàng không hài lòng về chất lượng dịch vụ hoặc thợ đến muộn, thái độ không phù hợp: Khách hàng có quyền bấm "Khiếu nại" (Dispute) trên ứng dụng trong vòng 24 giờ kể từ khi ca hẹn kết thúc. Khách tải lên hình ảnh bằng chứng và mô tả sự việc. Khi có khiếu nại, tiền thanh toán sẽ bị đóng băng tạm thời. Đội ngũ Super Admin của Mua-Makeup sẽ trực tiếp xác minh, đối chiếu hai bên và ra quyết định hoàn tiền toàn phần/bán phần cho khách hoặc giải ngân cho thợ.',
    'khieu nai, tranh chap, dispute, khong hai long, chat luong kem, admin giai quyet, hoan tien khi khieu nai'
),
(
    'MAKEUP_STYLES',
    'Các Tone và Phong cách Make-up phổ biến trên Nền tảng',
    'Mua-Makeup cung cấp đa dạng các phong cách trang điểm chuyên nghiệp: 1. Tone Cô dâu Á Đông: Lộng lẫy, giữ nền lâu trôi suốt ngày cưới, tôn nét thanh tú. 2. Tone Hàn Quốc (Glow/Dewy): Lớp nền mỏng nhẹ, căng bóng tự nhiên, môi mọng trẻ trung, phù hợp chụp ảnh hoặc tiệc nhẹ. 3. Tone Tây (Glamour/Smokey): Mắt khói sắc sảo, khối rõ nét, thần thái quyến rũ, phù hợp dạ hội và tiệc đêm. 4. Tone Thái Lan: Lông mày phẩy sợi sắc nét, má hồng cam tây quyến rũ. 5. Make-up Kỷ yếu / Cá nhân: Nhẹ nhàng, tươi tắn, bền màu dưới ánh sáng tự nhiên.',
    'tone make-up, phong cach trang diem, co dau, han quoc, tone tay, thai lan, ky yeu, tiec, glow, tu nhien'
),
(
    'ROLE_POLICIES',
    'Quy định và Quyền lợi của Thợ (Freelance MUA) và Studio/Agency',
    'Đối với Thợ tự do (Freelance MUA): Được tự do chủ động lịch làm việc, thiết lập bảng giá, gói dịch vụ và các tác phẩm Portfolio để thu hút khách; nhận tiền công nhanh chóng qua ví. Đối với Studio / Đại lý (Agency): Quản lý đội ngũ thợ nhân viên (Agency Staff), điều phối ca trang điểm tập trung (Agency Dispatch), quản lý ca làm việc và chia sẻ doanh thu minh bạch.',
    'tho trang diem, freelance mua, studio, agency, quan ly nhan vien, bang gia, dieu phoi ca'
);
