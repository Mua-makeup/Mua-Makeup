# Rà soát hồi quy trước buổi bảo vệ

Ngày rà soát: 02/11/2026. Baseline: `c9225eb502a4a84f6ddbc664360485fcc39e844d` (mã trước các thay đổi trong chat).

## Kết luận

Lượt dọn lỗi trước có thay đổi hành vi ngoài đơn khẩn cấp: reset state trong lúc render, vòng đời animation/PanResponder, thứ tự effect, tải hồ sơ studio và điều kiện hiển thị hoàn cọc dùng chung. Chưa chứng minh những refactor này gây lỗi thực tế, nhưng không cần thiết cho việc sửa đơn khẩn cấp. Đã hoàn nguyên chúng để giảm phạm vi thay đổi trước buổi bảo vệ.

46 file trong nhóm source từng bị sửa nay giống baseline; 11 file chỉ đổi kiểu TypeScript và tạo ra JavaScript giống baseline. Các ngoại lệ lint thêm ở lượt dọn lỗi cũng đã được bỏ. Không tuyên bố lint toàn dự án sạch sau khi hoàn nguyên.

## Nghiệp vụ được giữ nguyên

- Tạo đơn thường/studio, chọn ngày giờ, sổ địa chỉ, form đánh giá, modal kéo đóng, popup, đếm ngược nhận đơn thường và thông báo trở về cách hoạt động cũ.
- Luồng nộp cọc, thu tiền, hoàn tiền, phí nền tảng và hoa hồng backend không bị sửa. Backend chỉ bổ sung cờ hoàn cọc vào response đọc trạng thái và lưu báo giá trong service đơn khẩn cấp.
- Hiển thị hoàn cọc cho đơn thường/studio giữ nguyên điều kiện cũ. Điều kiện dựa trên bằng chứng thanh toán mới chỉ áp dụng đơn `REALTIME_INSTANT`; response danh sách cũ nhận biết qua mã `BK-FAST-` khi không có bookingType.
- Không thay đổi mã xử lý múi giờ. Chỉ hiệu chỉnh một giả định của kiểm thử cũ và thêm kiểm thử cho timestamp không kèm offset theo cách mã hiện tại xử lý.

## Khác biệt nhỏ còn giữ ngoài đơn khẩn cấp

| Phần | Hành vi còn khác | Phạm vi |
|---|---|---|
| Thanh toán | Không gọi `.match()` trên AppState rỗng | Ngăn crash khi trạng thái native chưa có; không đổi giao dịch |
| Khiếu nại | Không gửi yêu cầu leo thang khi thiếu bookingId | Không đổi luồng có ID hợp lệ |
| Báo cáo tăng ca | Đọc `userInfo` thay vì thuộc tính `user` không tồn tại | Cho phép đăng ký realtime theo đúng tài khoản; không đổi cách tính tăng ca |
| Ảnh đánh giá | Dùng `resizeMode` đúng với ảnh React Native | Ảnh lightbox dùng contain thay cho prop bị dùng sai |
| Giao diện | Dùng StyleSheet API hiện hành, bỏ props StatusBar SDK không khai báo, mặc định theme sáng khi chưa xác định | Cần kiểm tra trực tiếp thanh trạng thái trên thiết bị nếu demo native |
| Dữ liệu/kiểu | Ref cuộn/ô nhập/WebView, ID gói studio dạng số, kiểm tra danh sách ảnh rỗng | Không thay đổi giá, điều hướng hay nghiệp vụ thanh toán |
| Nhánh hiển thị tranh chấp | Bỏ hai so sánh COMPLETED/PAID_OUT trong nhánh đã cố định DISPUTED | Hai điều kiện cũ luôn false, không đổi kết quả |
| Ví và đóng modal chứng chỉ | Bỏ tham số hàm ngày giờ không được dùng, đổi cú pháp callback đóng modal | Giữ nguyên kết quả và điều kiện đóng |

Hàm lọc tag ở trang đánh giá bị bỏ là hàm không có chỗ gọi và tham chiếu biến không tồn tại; các bộ lọc đang sử dụng vẫn giữ nguyên.

## Kiểm tra đã thực hiện

- TypeScript toàn app: đạt, 0 lỗi.
- `npm run build` của app: đạt, xuất web vào dist.
- `node --test code/app/scripts/*.test.cjs`: 27/27 đạt.
- So sánh cây render BookingHistoryCard trước/sau với React/RN giả lập, 360 tổ hợp: 15 trạng thái × 3 giá trị cờ hoàn cọc × 4 lý do hủy × 2 loại đối tác. Các đơn thường/studio giống baseline. Đây là kiểm tra component, không phải E2E trên thiết bị.
- So sánh nguyên văn 16 file nghiệp vụ trọng yếu với baseline: đạt; bao gồm ScheduledBookingServiceImpl, BookingDepositServiceImpl, màn thực hiện ca, màn ghép đơn, chọn lịch, popup, modal và utils ngày giờ.
- Kiểm tra diff không có lỗi khoảng trắng: đạt.

## Giới hạn

Chưa chạy E2E với tài khoản thật, chưa thực hiện giao dịch tiền, camera/GPS hoặc kiểm thử native trên điện thoại. Chưa triển khai và không sửa dữ liệu database. Những đơn cũ đã lưu sai giá chưa được cập nhật.

Bản sao đầy đủ trước khi thu gọn thay đổi: `C:/Users/Trung/AppData/Local/Temp/mua-before-defense-audit-20261102-205721/changes.patch`.
