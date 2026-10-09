=====================================================================

INSERT INTO interaction_schema.ai_knowledge_documents (category, title, content, keywords)
VALUES
(
    'PRICING_AND_SURCHARGES',
    'Chính sách Bảng giá và Các loại Phụ phí (Surcharges) Chi tiết',
    'Hệ thống Mua-Makeup áp dụng bảng giá minh bạch gồm giá gói cơ bản và các khoản phụ phí phát sinh (nếu có): 
1. Phụ phí sáng sớm (Early Morning Surcharge): Áp dụng cho các ca hẹn bắt đầu trước 06:00 sáng (thường từ 50.000đ - 150.000đ/ca) để hỗ trợ thợ chuẩn bị và di chuyển sớm.
2. Phụ phí đêm muộn (Late Night Surcharge): Áp dụng cho các ca kết thúc sau 21:00 đêm.
3. Phụ phí di chuyển xa (Distance Fee): Tính tự động qua định vị bản đồ Goong Maps khi địa chỉ khách cách thợ trên 10km (tính theo km phát sinh).
4. Phụ phí ngày Lễ, Tết (Surge Pricing): Áp dụng hệ số tăng giá từ 1.2x đến 1.5x vào các dịp cao điểm như Tết Nguyên Đán, Giáng sinh, ngày 8/3, 20/10.
5. Phụ phí làm thêm giờ (Overtime Fee): Tính theo giờ nếu khách hàng yêu cầu thợ ở lại dặm phấn, thay đổi kiểu tóc hoặc theo chân chụp ảnh ngoài giờ thỏa thuận.
6. Dịch vụ đính kèm (Add-ons): Làm tóc cô dâu/dự tiệc, dán móng giả nghệ thuật, gắn hoa cài/phụ kiện cô dâu, trang điểm thêm người thân (mẹ cô dâu, phù dâu).',
    'bang gia, phu phi, sang som, dem muon, ngay le, tet, phu phi di chuyen, lam them gio, overtime, surcharge, addon, lam toc, dam phan'
),
(
    'BOOKING_LIFECYCLE_STATES',
    'Chi tiết 11 Trạng thái Vòng đời Đơn đặt lịch (Booking State Machine)',
    'Mỗi đơn hẹn trên Mua-Makeup trải qua các trạng thái chuẩn hóa:
1. PENDING_DEPOSIT: Đơn vừa tạo, chờ khách thanh toán tiền cọc trong 15-30 phút. Quá hạn đơn tự động hủy (CANCELLED_EXPIRED).
2. REQUESTED: Đã cọc thành công, đang chờ Thợ tự do xác nhận nhận ca.
3. PENDING_AGENCY_DISPATCH: Đơn đặt Studio/Đại lý, đang chờ chủ Studio phân công thợ nhân viên.
4. AGENCY_ASSIGNED: Studio đã phân công thợ nhân viên cụ thể cho ca hẹn.
5. ACCEPTED: Thợ đã chính thức nhận ca làm việc.
6. ON_THE_WAY: Thợ đang di chuyển đến địa chỉ của khách (Hệ thống mở Live GPS Tracking trên bản đồ để khách theo dõi realtime).
7. ARRIVED: Thợ đã có mặt tại địa điểm hẹn.
8. IN_PROGRESS: Thợ đang tiến hành các bước trang điểm cho khách.
9. COMPLETED: Ca trang điểm hoàn thành thành công.
10. PAID_OUT: Hệ thống đã quyết toán tiền công từ quỹ Escrow vào ví của Thợ/Studio.
11. DISPUTED: Đơn có khiếu nại từ khách hàng trong vòng 24h, tiền cọc và thanh toán bị đóng băng để Admin xử lý.',
    'trang thai don, pending deposit, requested, accepted, on the way, arrived, in progress, completed, paid out, disputed, theo doi gps, vong doi don hang'
),
(
    'MAKEUP_PROCESS_STEPS',
    'Quy trình Kỹ thuật Trang điểm Tiêu chuẩn trong Gói Dịch vụ',
    'Các chuyên viên trang điểm trên Mua-Makeup tuân thủ quy trình làm đẹp chuyên nghiệp 8 bước:
Bước 1: Làm sạch da, cân bằng pH và xịt khoáng làm dịu.
Bước 2: Cấp ẩm chuyên sâu, thoa kem lót kiềm dầu hoặc bắt sáng tùy loại da.
Bước 3: Đánh lớp nền mỏng nhẹ, tệp màu da, độ che phủ cao và bền màu.
Bước 4: Che khuyết điểm quầng thâm, mụn, tàn nhang một cách tự nhiên.
Bước 5: Định hình lông mày phẩy sợi và phối màu phấn mắt theo tone đã chọn.
Bước 6: Kẻ eyeliner sắc nét, bấm cong mi, gắn mi giả gân trong tự nhiên.
Bước 7: Tạo khối thon gọn gương mặt, đánh má hồng tươi tắn và tô son ombre/bóng.
Bước 8: Xịt khóa nền (Setting spray) bảo vệ lớp make-up bền đẹp suốt 8-12 tiếng.',
    'quy trinh trang diem, cac buoc make-up, lam sach da, kem lot, kem nen, phan mat, long may, mi gia, tao khoi, son moi, xit khoa nen'
),
(
    'PAYMENT_AND_WITHDRAWAL',
    'Hướng dẫn Thanh toán Đơn hàng và Rút tiền về Ngân hàng',
    'Hệ thống hỗ trợ các phương thức thanh toán an toàn và tiện lợi:
1. Thanh toán Cọc: Khách có thể quét mã VNPay-QR, thanh toán qua Ví MoMo hoặc trừ trực tiếp từ Ví Mua-Makeup.
2. Thanh toán Số dư còn lại: Sau khi hoàn thành ca, khách có thể thanh toán phần tiền còn lại qua Ví app, Chuyển khoản QR hoặc Tiền mặt trực tiếp cho thợ (sử dụng tính năng Xác nhận tiền mặt - Dual Cash Confirmation trên app).
3. Quỹ giữ tiền Escrow: Tiền cọc được giữ an toàn tuyệt đối trên hệ thống, thợ không thể tự ý rút trước khi ca hoàn tất.
4. Rút tiền về Ngân hàng (Withdrawal): Cả Khách hàng và Thợ có thể liên kết tài khoản ngân hàng (Vietcombank, Techcombank, BIDV, MBBank, VietinBank...) tại mục Quản lý Ví và gửi yêu cầu rút tiền. Tiền sẽ về tài khoản ngân hàng trong vòng 24 giờ làm việc.',
    'thanh toan, vnpay, momo, tien mat, xac nhan tien mat, rut tien ve ngan hang, lien ket ngan hang, so du vi, escrow'
),
(
    'CUSTOMER_ADDRESS_AND_MAPS',
    'Sổ Địa chỉ Thân quen và Định vị Bản đồ Tích hợp Goong Maps',
    'Để thuận tiện cho việc đặt lịch nhiều lần, Mua-Makeup cung cấp tính năng Sổ Địa chỉ Thân quen:
- Khách hàng có thể lưu các địa chỉ thường xuyên trang điểm: Nhà riêng, Văn phòng làm việc, Khách sạn tiệc cưới, Nhà bố mẹ...
- Cho phép đặt một địa chỉ làm "Địa chỉ mặc định" để tự động điền khi tạo đơn mới.
- Tích hợp công nghệ bản đồ thông minh Goong Maps: Tự động gợi ý địa điểm theo từ khóa, chuyển đổi tọa độ GPS chuẩn xác và tính cự ly di chuyển thực tế của thợ.',
    'so dia chi, dia chi mac dinh, goong maps, dinh vi toa do, goi y dia diem, nha rieng, van phong, khach san'
),
(
    'MUA_CALENDAR_AND_SHOWCASE',
    'Quản lý Lịch làm việc và Portfolio Tác phẩm của Thợ (MUA)',
    'Dành cho Thợ trang điểm và Khách hàng muốn tìm hiểu năng lực của thợ:
1. MUA Calendar: Thợ có thể chủ động cài đặt khung giờ làm việc theo từng ngày, khóa các khung giờ bận cá nhân để tránh bị khách đặt trùng lịch.
2. Portfolio Showcase: Khách hàng có thể xem bộ sưu tập hình ảnh tác phẩm thực tế do chính thợ thực hiện. Mỗi tác phẩm đều có hình ảnh cận cảnh, gắn nhãn Tone trang điểm, Gói dịch vụ tương ứng và phản hồi của khách hàng cũ.
3. Huy hiệu Uy tín & Đánh giá: Thợ có tay nghề cao, tỉ lệ đúng giờ trên 98% và điểm đánh giá từ 4.8 sao trở lên sẽ được gắn huy hiệu "Top MUA Được Yêu Thích".',
    'lich lam viec, portfolio, bo suu tap anh, tac pham thuc te, top mua, danh gia sao, khoa gio ban, mo slot'
),
(
    'DISPUTE_RESOLUTION_STEPS',
    'Quy trình Phân xử Khiếu nại và Mức bồi thường Chi tiết',
    'Khi phát sinh sự cố không hài lòng về ca trang điểm, quy trình xử lý diễn ra như sau:
1. Gửi Khiếu nại (Dispute): Trong vòng 24 giờ sau khi thợ bấm hoàn thành ca, khách hàng nhấn nút "Khiếu nại" trong chi tiết đơn, chọn lý do (Đến muộn quá 30p, lớp trang điểm không đúng cam kết, mỹ phẩm không đảm bảo, thái độ không lịch sự) và tải lên hình ảnh chụp thực tế.
2. Đóng băng tiền thanh toán: Hệ thống tự động tạm dừng giải ngân tiền cọc và tiền công của ca hẹn.
3. Ban Quản trị đối chất: Đội ngũ Admin liên hệ cả 2 bên trong vòng 12-24 giờ làm việc để xác minh sự việc.
4. Quyết định phân xử: 
   - Nếu lỗi hoàn toàn do Thợ/Studio: Khách hàng được HOÀN 100% tiền cọc + bồi thường, thợ bị trừ điểm uy tín.
   - Nếu có sai sót nhỏ từ hai phía: Thỏa thuận hoàn 30% - 50% tiền cọc cho khách.
   - Nếu khiếu nại không có căn cứ: Hệ thống giải ngân bình thường cho thợ.',
    'phan xu khieu nai, dispute, muc boi thuong, hoan tien khi khieu nai, dong bang tien, admin giai quyet, bang chung hinh anh'
);
