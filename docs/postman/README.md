# 📬 MUA Makeup Booking Platform - Postman Collection & Environment Guide

Thư mục này chứa bộ sưu tập Postman Collection và Environment đầy đủ, chuẩn hóa phục vụ kiểm thử thủ công và tự động cho toàn bộ hệ thống Back-end **core-api** (`Spring Boot 3.3.x`).

---

## 📁 Danh sách tệp tin

1. [**Mua_Makeup_Local.postman_environment.json**](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/postman/Mua_Makeup_Local.postman_environment.json):
   - Chứa các biến môi trường cho localhost: `baseUrl`, `accessToken`, `refreshToken`, `muaId`, `agencyId`, `staffId`, `invitationId`, `inviteCode`, `packageId`, `itemId`, `surchargeId`, `portfolioId`, `ruleId`, `reportId`, `shiftId`.
2. [**Mua_Makeup_Platform.postman_collection.json**](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/postman/Mua_Makeup_Platform.postman_collection.json):
   - Chứa toàn bộ 13 nhóm Endpoint nghiệp vụ (73 APIs) với đầy đủ Request Body JSON mẫu, Query Parameters, Headers và Postman Test Scripts tự động trích xuất token/ID.

---

## 🚀 Hướng dẫn Import vào Postman

1. Mở ứng dụng **Postman**.
2. Nhấn nút **Import** (góc trên bên trái).
3. Kéo thả cả 2 tệp:
   - `Mua_Makeup_Local.postman_environment.json`
   - `Mua_Makeup_Platform.postman_collection.json`
4. Ở góc trên bên phải của Postman, chọn Environment là: **`MUA Makeup - Localhost (8080)`**.

---

## 📋 Danh mục các Folder API (13 Phân hệ - 73 APIs)

| STT | Nhóm Thư mục | Số lượng API | Mô tả chính |
| :--- | :--- | :--- | :--- |
| **01** | **Authentication & Users** | 10 APIs | Đăng ký (Customer, MUA, Studio), Đăng nhập (Auto Token capture), Refresh Token, Đổi mật khẩu, Cập nhật hồ sơ người dùng, Cập nhật ngôn ngữ (i18n vi/en), Đăng xuất. |
| **02** | **Master Taxonomy** | 2 APIs | Danh mục gốc ngành làm đẹp (`master-categories`) & Bộ phong cách trang điểm chuẩn sàn (`makeup-styles`). |
| **03** | **Freelance MUA Profile & Styles** | 6 APIs | Xem/cập nhật hồ sơ thợ (Bio, kinh nghiệm, bán kính hoạt động), Đăng ký phong cách sở trường, Upload bằng cấp/chứng chỉ nghề nghiệp (`multipart/form-data`). |
| **04** | **MUA Portfolio & Showcase** | 8 APIs | Đăng tải tác phẩm kèm nén ảnh CDN (`multipart/form-data`), Sửa tác phẩm, Bật/tắt ghim tiêu biểu (`featured`), Ẩn/hiện tác phẩm (`visibility`), Xem thư viện cá nhân & công khai (có phân trang), Xóa mềm tác phẩm. |
| **05** | **Agency / Studio Profile & Management** | 4 APIs | Quản trị hồ sơ Studio (Tên thương hiệu, hotline, địa chỉ, logo), Xem hồ sơ công khai, Cấu hình % hoa hồng nội bộ mặc định của Studio (`/api/v1/agencies/*`). |
| **06** | **Agency Staff & Invitations** | 10 APIs | Sinh mã/link mời thợ (`inviteCode`), Quản lý danh sách lời mời, Hủy lời mời, Thợ nộp đơn gia nhập qua mã mời, Duyệt/Từ chối hồ sơ thợ (`review`), Danh sách nhân sự Studio (phân trang), Chi tiết thợ, Cập nhật trạng thái thợ (ACTIVE/SUSPENDED/LEFT), Điều chỉnh % hoa hồng riêng, Xóa thợ khỏi Studio. |
| **06.1** | **Agency Staff Styles & Service Packages** | 4 APIs | Phân bổ phong cách Makeup sở trường cho thợ (`styles`) và phân quyền thực hiện các gói dịch vụ (`packages`) kèm cấp bậc trình độ (`PRIMARY_MUA` / `ASSISTANT_MUA`). |
| **06.2** | **Agency Shifts & Working Schedules** | 4 APIs | Thiết lập ca trực cho nhân viên thợ (`shifts`), Xem ma trận lịch trực cả tuần của Studio (`shifts/matrix`), Lịch trực của thợ cụ thể, Xóa ca trực. |
| **06.3** | **Agency Overtime Rules & Reports** | 7 APIs | Thiết lập quy tắc phạt trễ ca / quá giờ (`overtime-rules`), Báo cáo sự cố phát sinh quá giờ (`overtime-reports`), Phê duyệt báo cáo sự cố (phạt theo luật / miễn phạt / tính phụ phí khách hàng `review`). |
| **07** | **Service Packages** | 7 APIs | Tạo gói dịch vụ Studio vs Thợ tự do, Cập nhật gói, Bật/tắt nhận khách (`availability`), Lọc gói công khai (theo MUA/Studio/Category), Chi tiết gói, Xóa gói. |
| **08** | **Package Items & Add-ons** | 4 APIs | Thêm bước quy trình (COMPONENT) và dịch vụ cộng thêm (ADD_ON), Cập nhật mục dịch vụ, Xem danh sách mục, Xóa mục. |
| **09** | **Surcharges** | 6 APIs | Thiết lập phụ phí (sáng sớm `EARLY_MORNING`, ngoài bán kính `OUT_OF_RADIUS`), Cập nhật phụ phí, Lấy danh sách phụ phí của tôi (`/my-surcharges`), Tra cứu phụ phí công khai, Tính toán phụ phí cho đơn hàng (`calculate`), Xóa cấu hình phụ phí. |
| **10** | **Admin Management** | 1 API | Quản trị viên Super Admin duyệt/từ chối chứng chỉ bằng cấp nghề của thợ trang điểm (`isVerified`, `notes`). |

---

## ⚡ Cơ chế Tự động hóa nổi bật trong Collection

1. **Auto Token Management**:
   - Khi gọi `01. Authentication & Users -> Login`, Postman Test Script sẽ tự động đọc `res.data.accessToken` và `res.data.refreshToken`, sau đó gán trực tiếp vào cả **Environment** và **Collection Variable**.
   - Mọi request cần xác thực (`Bearer {{accessToken}}`) sẽ tự động sử dụng token mới mà không cần copy/paste thủ công.
2. **Auto Capture Dynamic IDs**:
   - `Create Invitation`: Tự động lưu `res.data.inviteCode` vào biến `{{inviteCode}}` để có thể test ngay request `Accept Invitation`.
   - `Create Service Package`: Tự động lưu `packageId` vừa tạo để test tiếp các API `Update Package`, `Package Items` và `Portfolio`.
   - `Create Portfolio Showcase`: Tự động lưu `portfolioId` để test ngay các API sửa, bật ghim, ẩn hiện.
   - `Configure Surcharge`: Tự động lưu `surchargeId`.
3. **Multipart Form-data**:
   - Các API upload ảnh/bằng cấp (`Upload Certificate`, `Create Portfolio Showcase`) đã được cấu hình sẵn chế độ `multipart/form-data` với các key `image_file`, `file`, `additional_files`, `cert_name`, `title`... đúng chuẩn Controller tiếp nhận.
