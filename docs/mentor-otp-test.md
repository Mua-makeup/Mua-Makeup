# OTP đăng nhập cho mentor

Chế độ test chỉ áp dụng OTP đăng nhập SUPER_ADMIN / AGENCY_ADMIN. Vẫn phải đăng nhập đúng tài khoản và mật khẩu, tạo phiên OTP; mã hết hạn sau 5 phút và bị xóa sau khi sử dụng. Gửi lại OTP vẫn là 123456; không gửi email trong chế độ test.

## Bật

Đặt `AUTH_OTP_TEST_MODE=true` trong môi trường backend. File `.env` gốc trên máy này đã được bật cho buổi test; cấu hình mặc định và `.env.example` vẫn là false.

- Docker Compose production đọc `.env` gốc: build/recreate service backend để áp dụng mã nguồn và cấu hình mới.
- Chạy backend bằng IDE hoặc Gradle: đặt biến môi trường `AUTH_OTP_TEST_MODE=true` trong cấu hình chạy, rồi khởi động lại backend. File `.env` không tự được Spring Boot nạp.

Đăng nhập lại từ đầu, nhập mã **123456** ở bước OTP.

## Khôi phục

Đặt `AUTH_OTP_TEST_MODE=false` (hoặc xóa biến khỏi môi trường chạy), rồi restart/recreate backend. OTP trở lại mã ngẫu nhiên gửi email. Phiên OTP test cũ không được chấp nhận khi đã tắt chế độ test; đăng nhập lại để lấy OTP mới.

Không cần đổi frontend hoặc sửa lại mã Java để bật/tắt.
