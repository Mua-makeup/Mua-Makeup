
INSERT INTO interaction_schema.ai_knowledge_documents (category, title, content, keywords)
VALUES
(
    'REVIEWS_AND_RATINGS',
    'Chính sách Đánh giá, Chấm điểm Sao và Nhận xét Dịch vụ (Reviews & Ratings)',
    '1. Điều kiện gửi đánh giá: Khách hàng chỉ có thể đánh giá sau khi ca trang điểm chuyển sang trạng thái COMPLETED (Đã hoàn tất) hoặc PAID_OUT (Đã thanh toán đủ 100%).
2. Thang điểm và nội dung: Đánh giá từ 1 đến 5 sao (★), kèm nhận xét cảm nhận chi tiết và có thể tải lên ảnh chụp thực tế sản phẩm make-up từ thiết bị.
3. Xem ảnh đánh giá: Giao diện hỗ trợ Modal xem ảnh phóng to full màn hình, hỗ trợ cử chỉ vuốt kéo xuống hoặc chạm ra ngoài để đóng mượt mà.
4. Trách nhiệm thợ chính và thợ phụ: Thợ chính (Primary MUA) chịu trách nhiệm về chất lượng chung của ca làm. Trợ lý/Thợ phụ (Assistant MUA) được bảo vệ điểm số khi gặp đánh giá thấp (<= 3 sao không làm tụt điểm thợ phụ) nhưng vẫn được ghi nhận +1 ca hoàn thành để tích lũy kinh nghiệm.
5. Phản hồi đánh giá: Studio và Thợ có quyền viết câu trả lời phản hồi công khai lịch sự đối với các đánh giá của khách hàng.
6. Ý nghĩa điểm sao: Điểm sao tích lũy tạo nên Điểm sao trung bình (rating_avg) và Điểm chuẩn Bayes (Bayesian Average Rating), trực tiếp quyết định vị trí của Thợ trên Bảng xếp hạng và quyền nhận ca khẩn cấp 30 phút.',
    'danh gia, review, cham sao, 5 sao, nhan xet, anh thuc te, chat luong, phan hoi danh gia, rating, tho phu, tro ly, rating avg'
),
(
    'LEADERBOARD_AND_RANKING',
    'Hệ thống Bảng Xếp Hạng Thợ, Studio & Gamification Huy Hiệu (Leaderboard & BXH)',
    '1. Bảng xếp hạng Thợ toàn sàn (Explore RankScore): Hệ thống xếp hạng tự động thợ theo công thức đa tiêu chí khách quan:
- Trọng số Ca Hoàn Thành (45%): Thưởng điểm cho kinh nghiệm thực chiến và số lượng ca làm thành công.
- Trọng số Điểm Sao Chuẩn Bayes (25%): Điểm sao chuẩn hóa theo thuật toán Bayes, bảo vệ thợ không bị tụt hạng oan chỉ vì 1 đánh giá cá biệt.
- Trọng số Trực Tuyến / Sẵn Sàng (30%): Ưu tiên thợ đang bật Online sẵn sàng nhận khách.
- Hệ số Tỷ Lệ Nhận Đơn (Acceptance Rate Factor): Thợ có tỷ lệ nhận ca cao sẽ được nhân hệ số thưởng thứ hạng.
2. Hệ thống Huy hiệu Thợ (Badge Tiers):
- Hạng Vàng (GOLD_TOP_PRO): Dành cho thợ xuất sắc hoàn thành từ 50 ca trở lên, điểm sao chuẩn Bayes >= 4.70★ và tỷ lệ nhận đơn >= 85%. Thợ được ưu tiên hiển thị đầu tiên trên tìm kiếm và nhận đơn khẩn cấp.
- Hạng Bạc (SILVER): Hoàn thành từ 20 ca trở lên, điểm sao chuẩn Bayes >= 4.50★.
- Hạng Tiêu Chuẩn (STANDARD): Thợ mới gia nhập sàn đang trong quá trình tích lũy ca làm và đánh giá.
3. Bảng xếp hạng Nội bộ Studio (Staff Leaderboard):
Studio xếp hạng nhân viên theo chu kỳ Ngày, Tuần, Tháng, Quý dựa trên: Doanh thu tạo ra, Tổng số ca hoàn thành, Điểm đánh giá trung bình và Số ca đạt 5 sao. Hệ thống trao các danh hiệu: Hạng Nhất Vàng, Hạng Nhì Bạc, Hạng Ba Đồng, Ngôi Sao Sáng (Super Star), Thợ Đáng Tin Cậy (Reliable).',
    'bang xep hang, bxh, leaderboard, rank score, thu hang, top tho, huy hieu, gold top pro, silver, standard, bayes rating, ty le nhan don, nhan vien xuat sac, vinh danh'
),
(
    'STUDIO_STAFF_AND_JOIN',
    'Quy trình Gia nhập Studio, Quét Mã QR Mời & Quản trị Thợ Studio',
    '1. Phương thức gia nhập Studio: Thợ tự do (Freelance MUA) hoặc người dùng có thể nộp đơn xin gia nhập Studio theo 2 cách trên app (mục Gia Nhập Studio - /join):
- Cách 1: Quét mã QR tuyển dụng của Studio (bằng camera trực tiếp hoặc tải ảnh QR từ thư viện máy).
- Cách 2: Nhập trực tiếp mã mời bằng chữ do Studio cung cấp (ví dụ: INV-AGY-GLAMOUR-...).
2. Phê duyệt & Cập nhật vai trò Realtime:
- Quản lý Studio xem xét hồ sơ, năng lực, chứng chỉ và bấm Phê Duyệt (APPROVE) kèm thỏa thuận Tỷ lệ hoa hồng (% Commission).
- Khi được duyệt, hệ thống tự động cập nhật vai trò của thợ sang ROLE_AGENCY_STAFF theo thời gian thực qua WebSocket STOMP. Thợ KHÔNG CẦN đăng nhập lại hay tải lại app, toàn bộ giao diện tự động chuyển sang Bàn làm việc Thợ Studio.
3. Bàn làm việc Thợ Studio (Workstation):
- Thẻ danh tính hiển thị huy hiệu "Thợ Studio" kèm tên Studio trực thuộc.
- Lịch làm việc ca trực (/staff/schedule) giúp thợ theo dõi ca làm việc do Studio phân bổ.
- Quản lý xin nghỉ phép (/staff/leave-requests) và Báo cáo tăng ca (/staff/overtime).',
    'gia nhap studio, join studio, agency staff, tho studio, quet ma qr, ma moi studio, phe duyet tho, hoa hong studio, doi vai tro realtime, ban lam viec thợ'
),
(
    'TWO_PHASE_PAYMENT_ESCROW',
    'Quy trình Thanh toán 2 Đợt (30% Ký quỹ Escrow & 70% Hoàn tất ca) và Giải ngân Tự động',
    '1. Đợt 1 - Đặt cọc 30% khi xác nhận lịch:
- Nhằm bảo đảm quyền lợi cho cả khách và thợ, khách hàng thanh toán 30% giá trị dịch vụ ngay khi xác nhận đặt lịch hẹn.
- Số tiền 30% này KHÔNG chuyển ngay cho thợ mà được giữ an toàn tại Quỹ Ký Quỹ Đảm Bảo (Escrow Account) của nền tảng.
- Đối với đơn do Studio nhận làm, Studio là đơn vị chịu trách nhiệm ký quỹ giữ cọc, nhân viên thợ làm ca không bị trừ tiền cọc cá nhân.
2. Đợt 2 - Thanh toán 70% còn lại sau khi hoàn tất make-up:
- Khi thợ hoàn thành công việc trang điểm cho khách, khách hàng bấm nút Thanh toán 70% còn lại trên app qua Ví điện tử hoặc quét mã QR MoMo / VNPay.
- Sau khi thanh toán đủ 100%, đơn chuyển trạng thái sang PAID_OUT.
3. Giải ngân Tự động qua Sổ cái kép (Double-Entry Ledger):
- Hệ thống giải phóng tiền cọc từ quỹ Escrow và thanh toán doanh thu ca làm theo đúng tỷ lệ thỏa thuận: giải ngân vào Ví Studio và cộng hoa hồng cho Thợ Studio / Freelance MUA một cách minh bạch, an toàn tuyệt đối.',
    'thanh toan 2 dot, dat coc 30%, thanh toan 70%, ky quy escrow, giai ngan tu dong, so cai kep, tien coc ai giu, thanh toan momo vnpay, vi ca nhan'
),
(
    'STAFF_DUTY_SHIFTS_AND_LEAVE',
    'Quy định Ca trực, Lịch làm việc, Xin nghỉ phép và Báo cáo Tăng ca cho Thợ Studio',
    '1. Lịch làm việc ca trực (Staff Shifts):
- Thợ Studio làm việc theo các ca trực được quản lý Studio thiết lập (Ca Sáng, Ca Chiều, Ca Tối, hoặc Ca Cả Ngày).
- Thợ theo dõi lịch trực hàng tuần, hàng tháng tại mục Lịch Làm Việc (/staff/schedule).
2. Cơ chế Điều phối đơn hàng từ Studio (Agency Dispatch):
- Khi khách đặt lịch với Studio, Studio sẽ điều phối thợ phù hợp về phong cách và lịch rảnh. Thợ nhận thông báo phân công qua WebSocket và xem chi tiết ca hẹn trên Bàn làm việc.
3. Đơn xin nghỉ phép (Leave Requests):
- Thợ có thể nộp đơn xin nghỉ ca / nghỉ phép trực tiếp trên ứng dụng kèm lý do. Studio xem xét và duyệt đơn nghỉ phép để hệ thống không tự động gán đơn vào khung giờ đó.
4. Báo cáo tăng ca (Overtime Reports):
- Khi ca làm việc thực tế kéo dài quá thời gian quy định do yêu cầu thêm từ khách, thợ gửi báo cáo tăng ca để Studio xem xét phê duyệt tiền phụ cấp tăng ca theo quy chế nội bộ.',
    'ca truc, lich lam viec, xin nghi phep, bao cao tang ca, dieu phoi studio, agency dispatch, overtime, leave request, lich truc studio'
),
(
    'DYNAMIC_PRICING_INVOICE_SYNC',
    'Cơ chế Bảng giá Động (Dynamic Pricing), Phụ phí Minh bạch & Đồng bộ Hóa đơn',
    '1. Minh bạch Bảng giá Xem trước:
Trước khi bấm xác nhận đặt lịch, khách hàng luôn được xem Bảng kê hóa đơn chi tiết (Preview Invoice) khớp 100% với số tiền thực tế phải thanh toán, không bao giờ phát sinh phụ phí ẩn.
2. Các thành phần trong tổng giá:
- Giá gói dịch vụ gốc: Giá niêm yết của thợ hoặc Studio cho từng phong cách trang điểm.
- Phụ phí di chuyển (Distance Fee): Miễn phí hoàn toàn dưới 5km; từ 5km-15km tính 15.000đ/km; từ 15km-30km tính 20.000đ/km (tính tự động qua Goong Maps GPS).
- Phụ phí khung giờ cao điểm / sáng sớm rước dâu (05:00 - 07:00 cuối tuần +20%; 17:30 - 19:30 tối tiệc +15%).
- Ưu đãi Giờ Vàng buổi trưa (13:00 - 15:00): Tự động giảm 10% trên giá gốc dịch vụ.
- Phụ phí ngày lễ Tết (Tết Nguyên Đán, Giỗ Tổ, 30/4 - 1/5, Quốc Khánh...).
- Dịch vụ chọn thêm (Add-ons): Dán mi 3D, đính đá nghệ thuật, uốn tóc, nhũ body, make-up mẹ cô dâu.',
    'bang gia dong, dynamic pricing, hoa don xem truoc, phu phi di chuyen, mien phi 5km, gio vang giam 10%, gio cao diem, ruoc dau sang som, le tet, add on, dong bo hoa don'
);
