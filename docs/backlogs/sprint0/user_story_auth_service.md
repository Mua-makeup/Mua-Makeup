# TÀI LIỆU ĐẶC TẢ USER STORIES & TIÊU CHÍ NGHIỆM THU
## MODULE: USER & AUTHENTICATION MODULE (MONOLITHIC CORE-API - PHÂN HỆ AUTH, AGENCY, MUA)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Module:** `User, Agency & MUA Profile Module` (Đóng gói trong `core-api`, Port: `8080`).
* **Cơ sở dữ liệu:** PostgreSQL 16 (`makeup_platform_db` - Schemas: `auth_schema`, `agency_schema`, `mua_schema`).
* **Phạm vi Module:** 
  * Quản lý Đăng ký tài khoản đa phân hệ (Khách hàng, Thợ tự do, Chủ Studio/Đại lý).
  * Đăng nhập an toàn bằng Số điện thoại/Email kết hợp Mật khẩu mã hóa BCrypt.
  * Cấp phát và quản lý vòng đời JWT (Access Token thời hạn 1 ngày / 86400s, Refresh Token tự sinh chứa `user_id` lưu trong `HttpOnly` Cookie thời hạn 30 ngày kèm cơ chế Rotation & Blacklist).
  * Thu hồi Session và Đăng xuất an toàn thông qua Redis Token Blacklist và xóa Cookie.
  * Động cơ Phân quyền Chi tiết RBAC 4 Bảng (`users` $\rightarrow$ `user_roles` $\rightarrow$ `roles` $\rightarrow$ `role_permissions`), nhúng danh sách mã quyền (`permission_code`) trực tiếp vào JWT Claims.
  * *(Lưu ý: Phân hệ xác thực OTP qua SMS/ZNS được lược bỏ trong giai đoạn hiện tại theo yêu cầu dự án, tập trung vào xác thực Số điện thoại / Email + Mật khẩu an toàn).*
* **Mã Jira Issue liên quan:**
  * `ISSUE-10.1`: Auth & Profile Module - API Đăng ký / Login & Phân hệ người dùng.
  * `ISSUE-10.2`: Auth & Profile Module - Tích hợp Phân quyền RBAC 4 Bảng (`users`, `roles`, `user_roles`, `role_permissions`).
  * `ISSUE-106`: Thiết kế & Triển khai Mô hình Phân quyền Granular RBAC Permissions.
* **Đối tượng sử dụng (User Personas):**
  1. **Customer (Khách hàng đặt trang điểm)**: Đăng ký nhanh, đăng nhập, quản lý thông tin cá nhân.
  2. **Freelance MUA (Thợ trang điểm tự do)**: Đăng ký tay nghề, thiết lập Bio/Portfolio, tự động cấp mã thợ chuẩn hóa `MUA-2026-XXXXX`.
  3. **Agency Owner / Studio Admin (Chủ Studio / Đại lý)**: Đăng ký thành lập Studio, cấp mã đại lý `AG-PROVINCE-XXXXX`, quản lý nhân sự và phân chia hoa hồng.
  4. **Agency Staff (Lễ tân / Nhân viên điều phối Studio)**: Đăng nhập thực hiện phân công ca làm, bị giới hạn các quyền quản trị tài chính.
  5. **Super Admin (Quản trị viên Hệ thống)**: Toàn quyền cấu hình vai trò, khóa tài khoản vi phạm.

---

## 📋 2. DANH SÁCH USER STORIES CHI TIẾT (BDD ACCEPTANCE CRITERIA)

### **US-AUTH-01: Đăng ký & Đăng nhập Khách hàng (Customer Authentication)**
> **As a** Khách hàng (Customer),  
> **I want to** đăng ký tài khoản bằng Số điện thoại/Email và Mật khẩu, sau đó đăng nhập vào ứng dụng,  
> **So that** tôi có thể tìm kiếm thợ/studio, xem gói dịch vụ và đặt lịch trang điểm tận nơi hoặc tại Studio.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Đăng ký tài khoản Khách hàng mới thành công**
  * **Given** Người dùng truy cập màn hình Đăng ký Khách hàng.
  * **When** Nhập Họ tên hợp lệ (VD: "Nguyễn Thu Hà"), Số điện thoại chưa tồn tại trong hệ thống (VD: `0912345678`), Email (VD: `thuha@gmail.com`), và Mật khẩu thỏa mãn độ mạnh (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt).
  * **Then** Hệ thống tạo bản ghi mới trong bảng `users` với mật khẩu được băm bằng BCrypt (cost factor 12).
  * **And** Hệ thống tự động gán vai trò `ROLE_CUSTOMER` trong bảng `user_roles`.
  * **And** Trả về mã phản hồi `201 Created` kèm thông tin tài khoản cơ bản (`id`, `full_name`, `phone_number`, `email`, `roles: ["ROLE_CUSTOMER"]`).

* **Scenario 02: Đăng ký thất bại do Số điện thoại hoặc Email đã tồn tại**
  * **Given** Khách hàng nhập Số điện thoại hoặc Email đã được đăng ký trước đó.
  * **When** Nhấn nút "Đăng ký".
  * **Then** Hệ thống từ chối tạo tài khoản và trả về `409 Conflict` kèm thông báo lỗi cụ thể: *"Số điện thoại hoặc Email này đã được đăng ký trên hệ thống"*.

* **Scenario 03: Đăng nhập Khách hàng thành công trả về JWT Token**
  * **Given** Khách hàng đã có tài khoản đang ở trạng thái kích hoạt (`is_active = true`).
  * **When** Gửi yêu cầu đăng nhập với Số điện thoại (hoặc Email) và Mật khẩu chính xác.
  * **Then** Hệ thống trả về `200 OK` chứa:
    * `access_token`: JWT có thời hạn 1 ngày (86,400 giây), chứa thông tin `user_id`, `phone_number`, mảng `roles` và mảng `permissions`.
    * `refresh_token`: Token tự sinh dạng JWT chứa `user_id` có thời hạn 30 ngày (lưu an toàn trong `HttpOnly` Cookie và Redis) để cấp lại access token.
    * Thông tin người dùng (`user_info`).

* **Scenario 04: Đăng nhập thất bại do sai mật khẩu hoặc tài khoản bị khóa**
  * **Given** Khách hàng nhập sai mật khẩu hoặc tài khoản đang bị khóa (`is_active = false`).
  * **When** Gửi yêu cầu đăng nhập.
  * **Then** Hệ thống trả về `401 Unauthorized` kèm thông điệp: *"Thông tin đăng nhập không chính xác hoặc tài khoản đã bị vô hiệu hóa"*.

---

### **US-AUTH-02: Đăng ký & Khởi tạo Hồ sơ Thợ Make-up Tự do (Freelance MUA Onboarding)**
> **As a** Thợ Make-up Tự do (Freelance MUA),  
> **I want to** đăng ký tài khoản MUA, cung cấp thông tin tiểu sử nghề nghiệp, số năm kinh nghiệm và bán kính phục vụ tối đa,  
> **So that** hồ sơ của tôi được tạo lập, cấp mã định danh chuyên nghiệp và sẵn sàng nhận các ca trang điểm trên sàn.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Đăng ký tài khoản Thợ tự do thành công và tự động sinh mã MUA Code**
  * **Given** Người dùng chọn luồng đăng ký "Thợ Trang Điểm Tự Do (Freelance MUA)".
  * **When** Nhập thông tin cá nhân (SĐT, Họ tên, Mật khẩu) cùng thông tin chuyên môn:
    * `bio`: Tiểu sử tay nghề (VD: "Chuyên viên trang điểm cô dâu tone Tây & Douyin 5 năm kinh nghiệm").
    * `experience_years`: 5.
    * `max_service_radius_km`: 20.0 (km).
  * **Then** Hệ thống tạo bản ghi `users`, đồng thời tự động tạo bản ghi trong bảng `mua_profiles`.
  * **And** Tự động sinh mã Thợ duy nhất theo quy tắc chuẩn hóa: `MUA-[YEAR]-[ID_SEQUENTIAL]` (VD: `MUA-2026-08912`).
  * **And** Gán duy nhất vai trò `ROLE_FREELANCE_MUA` cho tài khoản trong bảng `user_roles`.
  * **And** Trả về `201 Created` kèm `mua_code`.

* **Scenario 02: Tự động khởi tạo Danh sách Quyền hạn MUA (Freelancer Permissions)**
  * **Given** Tài khoản Thợ tự do vừa được tạo thành công.
  * **Then** Khi đăng nhập, Token của MUA sẽ chứa đầy đủ các quyền hạn:
    * `booking:accept_instant` (Quyền nhận ca gấp 30s)
    * `booking:view_my_jobs` (Xem danh sách lịch hẹn)
    * `portfolio:upload` (Đăng ảnh album mẫu)
    * `calendar:block` (Khóa lịch bận cá nhân)
    * `wallet:view_balance`, `wallet:withdraw` (Quản lý ví và rút tiền)
    * `location:broadcast` (Bật/tắt phát sóng tọa độ GPS)

---

### **US-AUTH-03: Đăng ký & Khởi tạo Studio / Đại lý Make-up (Agency Studio Registration)**
> **As a** Chủ Studio / Đại lý Make-up (Agency Owner),  
> **I want to** đăng ký tài khoản Đại lý với tên Studio, hotline, địa chỉ cơ sở và tỷ lệ hoa hồng chia cho thợ,  
> **So that** tôi có thể mở Studio trên sàn, được cấp mã định danh đại lý và quản lý đội ngũ thợ make-up trực thuộc.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Khởi tạo Studio thành công và tự động sinh mã Agency Code**
  * **Given** Chủ Studio điền form đăng ký Doanh nghiệp / Đại lý.
  * **When** Cung cấp:
    * Thông tin chủ sở hữu (SĐT, Email, Họ tên, Mật khẩu).
    * `agency_name`: "Hương Ly Beauty & Bridal Studio".
    * `hotline`: "0909112233".
    * `address_street`: "123 Phố Huế", `district`: "Hai Bà Trưng", `city`: "Hà Nội".
    * `commission_rate_internal`: 30.00 (% hoa hồng Studio giữ lại, thợ nhận 70%).
  * **Then** Hệ thống tạo bản ghi `users` gắn vai trò `ROLE_AGENCY_ADMIN`.
  * **And** Tạo bản ghi `agency_profiles` gắn với `owner_id`.
  * **And** Tự động sinh mã Đại lý chuẩn hóa: `AG-[PROVINCE_CODE]-[ID_SEQUENTIAL]` (VD: `AG-HN-00182` hoặc `AG-HCM-00509`).
  * **And** Cấp các quyền quản trị Studio: `agency:manage`, `agency:invite_staff`, `agency:set_commission`, `booking:dispatch`, `wallet:withdraw`.

---

### **US-AUTH-04: Đăng nhập & Kiểm soát Quyền hạn Nhân viên Studio (Agency Staff Authorization)**
> **As a** Lễ tân / Nhân viên Studio (Agency Staff),  
> **I want to** đăng nhập vào Web Portal của Studio bằng tài khoản nhân viên được cấp,  
> **So that** tôi có thể theo dõi ma trận lịch và điều phối thợ nhận ca nhưng **KHÔNG CÓ QUYỀN thực hiện các nghiệp vụ tài chính như rút tiền hay đổi % hoa hồng của Studio**.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Nhân viên Studio đăng nhập nhận đúng vai trò và quyền hạn**
  * **Given** Nhân viên Studio đã được chủ Studio tạo tài khoản với vai trò `ROLE_AGENCY_STAFF`.
  * **When** Đăng nhập thành công vào hệ thống.
  * **Then** Token JWT trả về chứa `roles: ["ROLE_AGENCY_STAFF"]` và danh sách quyền giới hạn:
    * `booking:view`, `booking:dispatch` (Điều phối thợ)
    * `agency:view_staff` (Xem danh sách thợ studio)
    * `agency_profile:view` (Xem thông tin studio)
  * **And** **KHÔNG CHỨA** các quyền tài chính: `wallet:withdraw`, `agency:set_commission`.

* **Scenario 02: Từ chối truy cập khi Nhân viên Studio cố gắng truy cập API nhạy cảm**
  * **Given** Nhân viên Studio sử dụng token có role `ROLE_AGENCY_STAFF`.
  * **When** Gửi request gọi API rút tiền của Studio (`POST /api/v1/wallets/withdraw`) hoặc sửa tỷ lệ hoa hồng (`PUT /api/v1/agencies/commission`).
  * **Then** Hệ thống Spring Security / API Gateway chặn request và trả về `403 Forbidden` với payload:
    ```json
    {
      "success": false,
      "error_code": "ERR_FORBIDDEN",
      "message": "Access Denied: Missing required permission 'wallet:withdraw'"
    }
    ```

---

### **US-AUTH-05: Động cơ Phân quyền RBAC 4 Bảng & Cấp JWT Claims (RBAC Engine & JWT Token)**
> **As a** Kỹ sư Kiến trúc Hệ thống (System Architect),  
> **I want** Auth Module / Service (core-api) xác thực người dùng dựa trên mô hình RBAC 4 Bảng (`users` $\rightarrow$ `user_roles` $\rightarrow$ `roles` $\rightarrow$ `role_permissions`) và nhúng danh sách `permission_code` vào JWT Token,  
> **So that** Spring Security Filter và các Modules nội bộ trong Monolith core-api (Booking, Wallet, Catalog...) có thể giải mã và kiểm tra quyền hạn tức thì mà không cần gọi truy vấn Database lặp lại trên từng request.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Trích xuất toàn bộ Permissions khi sinh JWT Token**
  * **Given** Người dùng đăng nhập thành công.
  * **When** Auth Module / Service (core-api) tổng hợp quyền hạn của user.
  * **Then** Thực hiện truy vấn JOIN qua 4 bảng để thu thập toàn bộ danh sách `permission_code` độc bản (distinct).
  * **And** Ký số mã JWT bằng thuật toán `HMAC-SHA256` với Secret Key an toàn đọc từ biến môi trường `${JWT_SECRET}`.
  * **And** Đảm bảo Payload JWT chứa:
    * `sub`: Số điện thoại đăng nhập
    * `user_id`: ID định danh người dùng
    * `agency_id`: ID Studio (nếu user thuộc Studio, ngược lại `null`)
    * `mua_id`: ID hồ sơ Thợ (nếu user là MUA, ngược lại `null`)
    * `roles`: Mảng tên các vai trò (VD: `["ROLE_FREELANCE_MUA", "ROLE_CUSTOMER"]`)
    * `permissions`: Mảng các mã quyền (VD: `["booking:accept_instant", "portfolio:upload", ...]`)

---

### **US-AUTH-06: Cơ chế Cấp lại Token (Refresh Token Rotation) & Đăng xuất An toàn (Token Lifecycle & Revocation)**
> **As a** Người dùng ứng dụng,  
> **I want** phiên đăng nhập của tôi được duy trì liên tục qua Refresh Token mà không phải nhập lại mật khẩu thường xuyên, và khi bấm Đăng xuất thì phiên làm việc sẽ chấm dứt hoàn toàn,  
> **So that** trải nghiệm sử dụng được mượt mà và bảo mật tài khoản được đảm bảo tuyệt đối nếu mất thiết bị.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Cấp lại Access Token thành công bằng Refresh Token Rotation**
  * **Given** Access Token của người dùng đã hết hạn (sau 2 giờ) nhưng Refresh Token vẫn còn hạn (trong 30 ngày).
  * **When** Client gửi `POST /api/v1/auth/refresh-token` với `refresh_token` hiện tại.
  * **Then** Hệ thống xác thực tính hợp lệ của Refresh Token.
  * **And** Hệ thống hủy bỏ (revoke) Refresh Token cũ, sinh ra một cặp `access_token` mới và `refresh_token` mới (Refresh Token Rotation).
  * **And** Trả về `200 OK` cho Client cập nhật bộ lưu trữ cục bộ.

* **Scenario 02: Từ chối Refresh Token đã bị sử dụng lại (Token Reuse Detection)**
  * **Given** Một Refresh Token cũ đã từng bị thay thế bởi rotation.
  * **When** Kẻ tấn công cố tình gửi lại Refresh Token cũ này.
  * **Then** Hệ thống phát hiện bất thường, lập tức thu hồi toàn bộ chuỗi session của tài khoản đó và trả về `401 Unauthorized`.

* **Scenario 03: Đăng xuất an toàn và đưa Token vào Redis Blacklist**
  * **Given** Người dùng đang đăng nhập với một Access Token hợp lệ.
  * **When** Nhấn nút "Đăng xuất" và Client gửi `POST /api/v1/auth/logout`.
  * **Then** Hệ thống lưu `access_token` vào Redis Blacklist (`SET token:blacklist:{token} 1 EX {remaining_seconds}`).
  * **And** Hủy Refresh Token tương ứng trong database.
  * **And** Mọi request tiếp theo sử dụng Access Token này gửi qua API Gateway sẽ bị từ chối `401 Unauthorized`.

---

### **US-AUTH-07: Đổi Mật khẩu & Bảo vệ Tài khoản chống Brute-force (Password Security & Lockout)**
> **As a** Người dùng ứng dụng,  
> **I want to** đổi mật khẩu định kỳ và được hệ thống bảo vệ trước các cuộc tấn công dò quét mật khẩu (Brute-force),  
> **So that** tài khoản của tôi không bị xâm nhập trái phép.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Đổi mật khẩu thành công**
  * **Given** Người dùng đã đăng nhập và truy cập màn hình Đổi Mật Khẩu.
  * **When** Nhập đúng Mật khẩu hiện tại và Mật khẩu mới hợp lệ (khác mật khẩu cũ).
  * **Then** Hệ thống cập nhật `password_hash` mới vào bảng `users`.
  * **And** Thu hồi toàn bộ các Refresh Token đang hoạt động, yêu cầu đăng nhập lại trên các thiết bị khác.

* **Scenario 02: Khóa tạm thời tài khoản khi đăng nhập sai quá 5 lần**
  * **Given** Kẻ gian cố gắng đăng nhập vào một tài khoản.
  * **When** Nhập sai mật khẩu liên tiếp 5 lần trong vòng 10 phút.
  * **Then** Hệ thống ghi nhận bộ đếm trên Redis (`login_attempts:{phone_number}`).
  * **And** Khóa tạm thời tính năng đăng nhập của tài khoản này trong 15 phút, trả về lỗi `429 Too Many Requests` kèm thông báo: *"Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút"*.

---

### **US-AUTH-08: Quản lý Thông tin Hồ sơ Cá nhân (User Profile Management)**
> **As a** Người dùng hệ thống (Khách / Thợ / Studio),  
> **I want to** xem và cập nhật thông tin cá nhân (Họ tên, Ảnh đại diện Avatar, Giới tính),  
> **So that** thông tin tài khoản của tôi luôn chính xác và đồng bộ trên toàn bộ nền tảng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Lấy thông tin tài khoản hiện tại qua API `/me`**
  * **Given** Người dùng gửi request kèm Header `Authorization: Bearer <access_token>`.
  * **When** Gọi `GET /api/v1/auth/me`.
  * **Then** Hệ thống trả về đầy đủ thông tin: `user_id`, `phone_number`, `email`, `full_name`, `avatar_url`, `gender`, `roles`, `permissions`, cùng thông tin liên kết (`agency_id`, `mua_id`).

* **Scenario 02: Cập nhật thông tin cá nhân thành công**
  * **When** Gửi `PUT /api/v1/users/profile` với `full_name`, `gender`.
  * **Then** Hệ thống cập nhật bảng `users`, trả về `200 OK` kèm dữ liệu đã được cập nhật.

* **Scenario 03: Tải lên ảnh đại diện Avatar lên Cloudinary (Dùng chung cho mọi Role)**
  * **Given** Người dùng thuộc bất kỳ vai trò nào (`ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`, `ROLE_AGENCY_ADMIN`, `ROLE_SUPER_ADMIN`) đã đăng nhập.
  * **When** Gửi `POST /api/v1/users/avatar` kèm file ảnh (`multipart/form-data: file`).
  * **Then** Hệ thống validate định dạng (JPEG, PNG, WEBP), nén và upload lên Cloudinary thư mục `avatars/{userId}`, cập nhật `avatar_url` trong `auth_schema.users` và trả về `UserInfoRes`.

---

## 💻 3. ĐẶC TẢ CHI TIẾT REST API ENDPOINTS

### 1. `POST /api/v1/auth/register` (Đăng ký tài khoản đa phân hệ)
* **Mô tả:** Đăng ký tài khoản mới cho Khách hàng, Thợ tự do hoặc Chủ Studio.
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "phone_number": "0981234567",
  "email": "huongly.makeup@gmail.com",
  "password": "SecurePassword123!",
  "full_name": "Nguyễn Hương Ly",
  "gender": "FEMALE",
  "account_type": "FREELANCER_MUA", // Enum: CUSTOMER | FREELANCER_MUA | AGENCY_ADMIN
  
  // Thông tin bổ sung nếu account_type = FREELANCER_MUA
  "mua_details": {
    "bio": "Chuyên viên trang điểm cô dâu tone Thái & Douyin hơn 5 năm kinh nghiệm",
    "experience_years": 5,
    "max_service_radius_km": 20.0
  },

  // Thông tin bổ sung nếu account_type = AGENCY_ADMIN
  "agency_details": {
    "agency_name": "Hương Ly Bridal & Beauty Studio",
    "hotline": "0981234567",
    "address_street": "123 Phố Huế",
    "district": "Hai Bà Trưng",
    "city": "Hà Nội",
    "commission_rate_internal": 30.00
  }
}
```
* **Validation Rules:**
  * `phone_number`: `@NotBlank`, regex số điện thoại Việt Nam `^(0|\\+84)(\\d{9})$`.
  * `password`: `@NotBlank`, tối thiểu 8 ký tự, ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt.
  * `full_name`: `@NotBlank`, độ dài từ 2 đến 100 ký tự.
  * `account_type`: `@NotNull`, thuộc danh sách `CUSTOMER`, `FREELANCER_MUA`, `AGENCY_ADMIN`.
* **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Đăng ký tài khoản thành công!",
  "data": {
    "user_id": 1024,
    "phone_number": "0981234567",
    "email": "huongly.makeup@gmail.com",
    "full_name": "Nguyễn Hương Ly",
    "account_type": "FREELANCER_MUA",
    "mua_code": "MUA-2026-01024",
    "agency_code": null,
    "roles": ["ROLE_FREELANCE_MUA"],
    "created_at": "2026-09-09T10:30:00Z"
  }
}
```
* **Lỗi có thể trả về:**
  * `400 Bad Request`: Payload sai định dạng validation.
  * `409 Conflict`: Số điện thoại hoặc Email đã tồn tại.

---

### 2. `POST /api/v1/auth/login` (Đăng nhập Số điện thoại/Email + Mật khẩu)
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "login_identifier": "0981234567", // Có thể là Số điện thoại hoặc Email
  "password": "SecurePassword123!"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công!",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwOTgxMjM0NTY3IiwidXNlcl9pZCI6MTAyNCwiZnVsbF9uYW1lIjoiTmd1eeG7h24gSMawxqFuZyBMeSIsImFnZW5jeV9pZCI6bnVsbCwibXVhX2lkIjo4OSwicm9sZXMiOlsicm9sZV9mcmVlbGFuY2VfbXVhIiwicm9sZV9jdXN0b21lciJdLCJwZXJtaXNzaW9ucyI6WyJib29raW5nOmFjY2VwdF9pbnN0YW50IiwicG9ydGZvbGlvOnVwbG9hZCJdfQ.sig...",
    "refresh_token": "7f8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
    "token_type": "Bearer",
    "expires_in": 7200, // 2 giờ
    "user_info": {
      "id": 1024,
      "full_name": "Nguyễn Hương Ly",
      "phone_number": "0981234567",
      "email": "huongly.makeup@gmail.com",
      "avatar_url": "https://res.cloudinary.com/makeup/image/upload/v1/avatar.jpg",
      "agency_id": null,
      "mua_id": 89,
      "roles": ["ROLE_FREELANCE_MUA"]
    }
  }
}
```
* **Lỗi có thể trả về:**
  * `401 Unauthorized`: Sai tài khoản hoặc mật khẩu.
  * `429 Too Many Requests`: Nhập sai quá 5 lần, bị tạm khóa 15 phút.

---

### 3. `POST /api/v1/auth/refresh-token` (Cấp lại Access Token mới)
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "refresh_token": "7f8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Cấp mới token thành công!",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "9a8b7c6d-5e4f-3a2b-1c0d-fe9a8b7c6d5e", // Token mới sinh sau Rotation
    "token_type": "Bearer",
    "expires_in": 7200
  }
}
```
* **Lỗi có thể trả về:**
  * `401 Unauthorized`: Refresh Token không hợp lệ, đã hết hạn, hoặc bị phát hiện sử dụng lại.

---

### 4. `POST /api/v1/auth/logout` (Đăng xuất an toàn & Thu hồi Session)
* **Headers:** 
  * `Content-Type: application/json`
  * `Authorization: Bearer <access_token>`
* **Request Body:**
```json
{
  "refresh_token": "9a8b7c6d-5e4f-3a2b-1c0d-fe9a8b7c6d5e"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công! Token đã được thu hồi an toàn."
}
```

---

### 5. `POST /api/v1/auth/change-password` (Đổi Mật Khẩu)
* **Headers:** `Authorization: Bearer <access_token>`
* **Request Body:**
```json
{
  "current_password": "SecurePassword123!",
  "new_password": "NewSecurePassword456!",
  "confirm_password": "NewSecurePassword456!"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công. Vui lòng sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo."
}
```
* **Lỗi có thể trả về:**
  * `400 Bad Request`: Mật khẩu mới trùng mật khẩu cũ hoặc không khớp xác nhận.
  * `401 Unauthorized`: Mật khẩu hiện tại không chính xác.

---

### 6. `GET /api/v1/auth/me` (Lấy thông tin tài khoản & danh sách quyền)
* **Headers:** `Authorization: Bearer <access_token>`
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "user_id": 1024,
    "full_name": "Nguyễn Hương Ly",
    "phone_number": "0981234567",
    "email": "huongly.makeup@gmail.com",
    "avatar_url": "https://res.cloudinary.com/makeup/image/upload/v1/avatar.jpg",
    "gender": "FEMALE",
    "is_verified": true,
    "agency_id": null,
    "mua_id": 89,
    "roles": [
      "ROLE_FREELANCE_MUA",
      "ROLE_CUSTOMER"
    ],
    "permissions": [
      "booking:create",
      "booking:view_my_jobs",
      "booking:accept_instant",
      "booking:update_status",
      "portfolio:upload",
      "portfolio:delete",
      "calendar:block",
      "calendar:view",
      "wallet:view_balance",
      "wallet:withdraw",
      "location:broadcast"
    ]
  }
}
```

---

### 7. `PUT /api/v1/users/profile` (Cập nhật thông tin cá nhân)
* **Headers:** `Authorization: Bearer <access_token>`
* **Request Body:**
```json
{
  "full_name": "Hương Ly Makeup Artist",
  "avatar_url": "https://res.cloudinary.com/makeup/image/upload/v2/new_avatar.jpg",
  "gender": "FEMALE"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Cập nhật hồ sơ thành công!",
  "data": {
    "user_id": 1024,
    "full_name": "Hương Ly Makeup Artist",
    "avatar_url": "https://res.cloudinary.com/makeup/image/upload/v2/new_avatar.jpg",
    "gender": "FEMALE",
    "updated_at": "2026-09-09T10:45:00Z"
  }
}
```

---

### 8. `POST /api/v1/users/avatar` (Tải lên ảnh đại diện Avatar lên Cloudinary - Dùng chung mọi Role)
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: multipart/form-data`
* **Form Data:**
  * `file`: File ảnh (JPEG, PNG, WEBP, tối đa 5MB)
* **Xử lý:** Backend validate magic bytes, nén ảnh sang chuẩn WebP, upload lên Cloudinary thư mục `avatars/{userId}`, cập nhật `avatar_url` trong `auth_schema.users`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải lên ảnh đại diện thành công.",
  "data": {
    "id": 1024,
    "fullName": "Hương Ly Makeup Artist",
    "phoneNumber": "0981234567",
    "email": "huongly.makeup@gmail.com",
    "avatarUrl": "https://res.cloudinary.com/makeup/image/upload/v1726912345/avatars/1024/avatar.webp",
    "gender": "FEMALE",
    "isVerified": true,
    "agencyId": null,
    "muaId": 89,
    "language": "vi",
    "roles": ["ROLE_FREELANCE_MUA"],
    "permissions": ["booking:create", "portfolio:upload"]
  }
}
```

---

## 🔑 4. CẤU TRÚC DỮ LIỆU JWT TOKEN PAYLOAD CLAIMS

Chuẩn định dạng mã hóa JWT Access Token cấp phát cho ứng dụng (Signature: `HMAC-SHA256`):

```json
{
  "sub": "0981234567",
  "user_id": 1024,
  "full_name": "Nguyễn Hương Ly",
  "agency_id": null,
  "mua_id": 89,
  "roles": [
    "ROLE_FREELANCE_MUA"
  ],
  "permissions": [
    "booking:create",
    "booking:view_my_jobs",
    "booking:accept_instant",
    "booking:update_status",
    "portfolio:upload",
    "portfolio:delete",
    "calendar:block",
    "calendar:view",
    "wallet:view_balance",
    "wallet:withdraw",
    "location:broadcast"
  ],
  "iat": 1757329500,
  "exp": 1757336700,
  "iss": "makeup-booking-auth-service"
}
```

---

## 🛡️ 5. BẢNG MA TRẬN PHÂN QUYỀN RBAC 4 BẢNG (PERMISSION MATRIX)

Bảng ma trận ánh xạ 5 Vai trò cốt lõi với danh sách Mã Quyền hạn (`permission_code`):

| Mã Quyền Hạn (`permission_code`) | Ý Nghĩa Chức Năng Nghiệp Vụ | `CUSTOMER` | `FREELANCE_MUA` | `AGENCY_ADMIN` | `AGENCY_STAFF` | `SUPER_ADMIN` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `booking:create` | Tạo đơn đặt lịch (Realtime hoặc Scheduled) | ✅ | ✅ | ❌ | ❌ | ✅ |
| `booking:view_my_jobs` | Xem danh sách đơn cá nhân / ca được phân công | ✅ | ✅ | ✅ | ✅ | ✅ |
| `booking:accept_instant` | Bấm nhận đơn khẩn cấp 30s (Redlock) | ❌ | ✅ | ❌ | ❌ | ❌ |
| `booking:dispatch` | Tiếp nhận và điều phối gán thợ Studio cho ca | ❌ | ❌ | ✅ | ✅ | ✅ |
| `booking:update_status` | Cập nhật tiến trình chặng (Đang đi, Đến nơi...) | ❌ | ✅ | ❌ | ❌ | ✅ |
| `location:broadcast` | Bật/tắt phát sóng tọa độ GPS Telemetry (5-10s) | ❌ | ✅ | ❌ | ❌ | ❌ |
| `portfolio:upload` | Tải ảnh sản phẩm hoàn thiện lên CDN | ❌ | ✅ | ✅ | ❌ | ✅ |
| `portfolio:delete` | Xóa ảnh mẫu trong album cá nhân / studio | ❌ | ✅ | ✅ | ❌ | ✅ |
| `calendar:block` | Khóa lịch bận cá nhân chống trùng lịch hẹn | ❌ | ✅ | ❌ | ❌ | ✅ |
| `calendar:view` | Xem ma trận lịch làm việc của bản thân / thợ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `agency:manage` | Sửa thông tin đại lý, hotline, địa chỉ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `agency:invite_staff` | Mời và duyệt thợ gia nhập Studio | ❌ | ❌ | ✅ | ❌ | ✅ |
| `agency:set_commission` | Cấu hình % hoa hồng nội bộ Studio chia thợ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `agency:view_staff` | Xem danh sách thợ và trạng thái rảnh/bận | ❌ | ❌ | ✅ | ✅ | ✅ |
| `wallet:view_balance` | Xem số dư ví và sao kê biến động tài chính | ✅ | ✅ | ✅ | ❌ | ✅ |
| `wallet:withdraw` | Gửi yêu cầu rút tiền từ Ví về Ngân hàng | ✅ | ✅ | ✅ | ❌ | ✅ |
| `user:manage_all` | Quản trị viên khóa/mở tài khoản toàn sàn | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 💾 6. DDL SQL CƠ SỞ DỮ LIỆU & SEED DATA (MIGRATION SCRIPT)

### 6.1. Script DDL 4 Bảng RBAC (PostgreSQL 16)
```sql
-- =============================================================================
-- DATABASE: makeup_platform_db (SCHEMA: auth_schema)
-- MÔ HÌNH PHÂN QUYỀN RBAC 4 BẢNG (ROLE-BASED ACCESS CONTROL)
-- =============================================================================

-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG (USERS)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    gender VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. BẢNG DANH MỤC VAI TRÒ (ROLES)
CREATE TABLE IF NOT EXISTS roles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- ROLE_CUSTOMER, ROLE_FREELANCE_MUA, ROLE_AGENCY_ADMIN, ROLE_AGENCY_STAFF, ROLE_SUPER_ADMIN
    description VARCHAR(255)
);

-- 3. BẢNG GÁN VAI TRÒ CHO NGƯỜI DÙNG (USER_ROLES)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- 4. BẢNG DANH SÁCH QUYỀN HẠN CHI TIẾT THEO VAI TRÒ (ROLE_PERMISSIONS)
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    UNIQUE (role_id, permission_code)
);

-- 5. BẢNG QUẢN LÝ REFRESH TOKEN (REFRESH_TOKENS)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- INDEX TỐI ƯU HÓA TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_permissions(role_id, permission_code);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_lookup ON refresh_tokens(token_hash, is_revoked);
```

### 6.2. Script Dữ Liệu Mẫu (Seed Data Roles & Permissions)
```sql
-- 1. SEED ROLES
INSERT INTO roles (name, description) VALUES
('ROLE_CUSTOMER', 'Khách hàng sử dụng dịch vụ trang điểm'),
('ROLE_FREELANCE_MUA', 'Thợ trang điểm hoạt động tự do'),
('ROLE_AGENCY_ADMIN', 'Chủ hoặc Quản trị viên Studio / Đại lý'),
('ROLE_AGENCY_STAFF', 'Lễ tân / Nhân viên điều phối thuộc Studio'),
('ROLE_SUPER_ADMIN', 'Quản trị viên tối cao của nền tảng')
ON CONFLICT (name) DO NOTHING;

-- 2. SEED PERMISSIONS CHO ROLE_CUSTOMER
INSERT INTO role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM roles r
CROSS JOIN (VALUES
    ('booking:create', 'Đặt lịch trang điểm mới'),
    ('booking:view_my_jobs', 'Xem lịch hẹn của mình'),
    ('wallet:view_balance', 'Xem số dư ví khách hàng'),
    ('wallet:withdraw', 'Rút tiền hoàn về tài khoản')
) AS p(code, descr)
WHERE r.name = 'ROLE_CUSTOMER'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- 3. SEED PERMISSIONS CHO ROLE_FREELANCE_MUA
INSERT INTO role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM roles r
CROSS JOIN (VALUES
    ('booking:create', 'Đặt lịch trang điểm'),
    ('booking:view_my_jobs', 'Xem danh sách ca làm việc cá nhân'),
    ('booking:accept_instant', 'Chấp nhận đơn khẩn cấp realtime 30s'),
    ('booking:update_status', 'Cập nhật tiến trình ca trang điểm'),
    ('location:broadcast', 'Phát sóng tọa độ GPS di chuyển'),
    ('portfolio:upload', 'Upload album ảnh tác phẩm trước sau'),
    ('portfolio:delete', 'Xóa ảnh trong album cá nhân'),
    ('calendar:block', 'Khóa khung giờ bận cá nhân'),
    ('calendar:view', 'Xem lịch làm việc cá nhân'),
    ('wallet:view_balance', 'Xem số dư ví thợ'),
    ('wallet:withdraw', 'Yêu cầu rút tiền về tài khoản ngân hàng')
) AS p(code, descr)
WHERE r.name = 'ROLE_FREELANCE_MUA'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- 4. SEED PERMISSIONS CHO ROLE_AGENCY_ADMIN
INSERT INTO role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM roles r
CROSS JOIN (VALUES
    ('booking:view_my_jobs', 'Xem toàn bộ đơn đặt lịch của Studio'),
    ('booking:dispatch', 'Điều phối và gán thợ cho đơn Studio'),
    ('agency:manage', 'Quản lý thông tin hồ sơ Studio'),
    ('agency:invite_staff', 'Mời và duyệt thợ gia nhập Studio'),
    ('agency:set_commission', 'Thiết lập % hoa hồng nội bộ Studio'),
    ('agency:view_staff', 'Xem danh sách nhân sự Studio'),
    ('portfolio:upload', 'Đăng ảnh album đại diện Studio'),
    ('portfolio:delete', 'Xóa ảnh album Studio'),
    ('calendar:view', 'Xem ma trận lịch của toàn bộ thợ Studio'),
    ('wallet:view_balance', 'Xem số dư ví doanh nghiệp Studio'),
    ('wallet:withdraw', 'Yêu cầu rút doanh thu Studio về tài khoản công ty')
) AS p(code, descr)
WHERE r.name = 'ROLE_AGENCY_ADMIN'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- 5. SEED PERMISSIONS CHO ROLE_AGENCY_STAFF
INSERT INTO role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM roles r
CROSS JOIN (VALUES
    ('booking:view_my_jobs', 'Xem đơn đặt lịch của Studio'),
    ('booking:dispatch', 'Điều phối và gán thợ Studio cho ca làm'),
    ('agency:view_staff', 'Xem danh sách thợ và trạng thái thợ'),
    ('calendar:view', 'Xem ma trận lịch làm việc của thợ Studio')
) AS p(code, descr)
WHERE r.name = 'ROLE_AGENCY_STAFF'
ON CONFLICT (role_id, permission_code) DO NOTHING;
```
