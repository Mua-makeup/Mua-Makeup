# TÀI LIỆU ĐẶC TẢ USER STORIES & TIÊU CHÍ NGHIỆM THU
## MICROSERVICE: USER & AUTHENTICATION SERVICE (XÁC THỰC & PHÂN QUYỀN RBAC 4 BẢNG)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Microservice:** `User, Agency & MUA Profile Service` (Tự tắt: `User & Auth Service`).
* **Phạm vi Module:** Quản lý Tài khoản Đăng ký, Đăng nhập OTP/Password, Cấp phát JWT Access Token/Refresh Token và Phân quyền Chi tiết 4 Bảng (Granular RBAC Permission Model) cho cả 3 phân hệ (Khách hàng, Thợ tự do, Studio/Đại lý).
* **Mã Jira Issue liên quan:** `ISSUE-10.1` (API Auth 3 Nhóm), `ISSUE-10.2` (RBAC 4 Bảng Integration), `ISSUE-106` (RBAC Permission Model).
* **Đối tượng sử dụng (User Personas):**
  1. **Customer (Khách hàng đặt trang điểm)**
  2. **Freelance MUA (Thợ trang điểm tự do)**
  3. **Agency Owner / Studio Admin (Chủ Studio / Đại lý Make-up)**
  4. **Agency Staff (Lễ tân / Nhân viên điều phối Studio)**


---

## 📋 2. DANH SÁCH USER STORIES CHI TIẾT

### **US-AUTH-01: Đăng ký & Đăng nhập Khách hàng (Customer Authentication)**
> **As a** Khách hàng (Customer),  
> **I want to** đăng ký và đăng nhập tài khoản bằng Số điện thoại  
> **So that** tôi có thể xem danh sách thợ/studio, tìm kiếm gói dịch vụ và đặt lịch trang điểm tận nơi nhanh chóng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Đăng ký tài khoản Khách hàng mới thành công qua OTP**
  * **Given** Khách hàng nhập số điện thoại chưa tồn tại trong hệ thống (VD: `0981234567`).
        tài khoản được khởi tạo với vai trò `ROLE_CUSTOMER`.
* **Scenario 02: Đăng nhập Khách hàng trả về JWT Access Token**
  * **Given** Khách hàng đã có tài khoản active trong hệ thống.
  * **When** Đăng nhập thành công bằng Số điện thoại và Mật khẩu.
  * **Then** Hệ thống trả về `200 OK` chứa `accessToken` (thời hạn 2 giờ), `refreshToken` (thời hạn 30 ngày) và thông tin cơ bản (`full_name`, `phone_number`, `roles: ["ROLE_CUSTOMER"]`).

---

### **US-AUTH-02: Đăng ký & Khởi tạo Hồ sơ Thợ Make-up Tự do (Freelance MUA Onboarding)**
> **As a** Thợ Make-up Tự do (Freelance MUA),  
> **I want to** đăng ký tài khoản MUA, nhập thông tin Bio, số năm kinh nghiệm và tải lên chứng chỉ/portfolio sản phẩm,  
> **So that** hồ sơ của tôi được xác minh và sẵn sàng nhận các ca đặt lịch khẩn cấp hoặc đặt trước từ khách hàng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Đăng ký tài khoản Thợ tự do thành công**
  * **Given** Người dùng chọn loại tài khoản "Thợ Make-up Tự do (Freelancer)".
  * **When** Nhập đầy đủ Số điện thoại, Họ tên, Số năm kinh nghiệm, Bio tay nghề và tải ảnh Bằng cấp/Chứng chỉ.
  * **Then** Hệ thống tạo bản ghi `users` và tự động sinh bản ghi `mua_profiles` với mã Thợ chuẩn hóa `MUA-[YEAR]-[ID_SEQUENTIAL]` (VD: `MUA-2026-08912`).
  * **And** Tài khoản được gán vai trò `ROLE_FREELANCE_MUA` và `ROLE_CUSTOMER` (cho phép thợ tự đặt lịch làm khách khi cần).
* **Scenario 02: Tự động gán Danh sách Quyền hạn của Thợ Tự do**
  * **Then** Hệ thống gán các quyền `permission_code`: `booking:accept_instant`, `booking:view_my_jobs`, `portfolio:upload`, `calendar:block`, `wallet:view_balance`, `wallet:withdraw`.

---

### **US-AUTH-03: Đăng ký & Xác minh Studio / Đại lý Make-up (Agency Studio Registration)**
> **As a** Chủ Studio / Đại lý Make-up (Agency Owner),  
> **I want to** đăng ký tài khoản Đại lý với thông tin Tên Studio, Hotline, Địa điểm và Mã số thuế,  
> **So that** tôi có thể thành lập Studio trên sàn, mời thợ gia nhập và điều phối ca làm việc cho nhân viên.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Khởi tạo Studio thành công**
  * **Given** Chủ Studio đăng ký tài khoản Doanh nghiệp/Đại lý.
  * **When** Nhập Tên Studio (VD: "Makeup Studio Hương Ly"), Hotline, Địa chỉ Street, Quận/Huyện, Tỉnh/Thành phố.
  * **Then** Hệ thống khởi tạo tài khoản `users` gắn vai trò `ROLE_AGENCY_ADMIN` và tạo hồ sơ `agency_profiles` chứa Mã Đại lý tự động `AG-[PROVINCE_CODE]-[ID_SEQUENTIAL]` (VD: `AG-HN-00182`).
  * **And** Cấp đầy đủ quyền quản trị Studio: `agency:manage`, `agency:invite_staff`, `agency:set_commission`, `booking:dispatch`, `wallet:withdraw`.

---

### **US-AUTH-04: Đăng nhập & Phân quyền Nhân viên Studio (Agency Staff Authorization)**
> **As a** Lễ tân / Nhân viên điều phối Studio (Agency Staff),  
> **I want to** đăng nhập bằng mã mời của Studio và tài khoản cá nhân,  
> **So that** tôi có thể truy cập Web Portal để xếp ca và điều phối thợ nhưng **KHÔNG CÓ QUYỀN rút tiền ví hay đổi % hoa hồng của Studio**.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Giới hạn quyền hạn của Nhân viên Studio (Granular Access Control)**
  * **Given** Nhân viên Studio sở hữu vai trò `ROLE_AGENCY_STAFF` (được cấp các quyền `booking:view`, `booking:dispatch`).
  * **When** Nhân viên thực hiện gửi request rút tiền ví Studio (`POST /api/v1/wallets/withdraw`).
  * **Then** Hệ thống API Gateway / Spring Security từ chối request và trả về lỗi `403 Forbidden` với thông điệp *"Access Denied: Missing required permission 'wallet:withdraw'"*.

---

### **US-AUTH-05: Cấu hình Phân quyền RBAC 4 Bảng & Cấp JWT Claims (RBAC Engine & JWT Token)**
> **As a** Kiến trúc sư Bảo mật Hệ thống (System Security Engineer),  
> **I want** Auth Service xác thực người dùng dựa trên mô hình RBAC 4 Bảng (`users` $\rightarrow$ `user_roles` $\rightarrow$ `roles` $\rightarrow$ `role_permissions`) và nhúng danh sách Quyền hạn (`permission_code`) vào JWT Token,  
> **So that** tất cả các Microservices phía sau (API Gateway, Booking, Wallet...) có thể kiểm tra quyền hạn tức thì mà không cần truy vấn lại Cơ sở dữ liệu cho mỗi request.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Nhúng danh sách Permission Codes vào JWT Payload**
  * **When** Đăng nhập thành công bất kỳ tài khoản nào.
  * **Then** Mã JWT Access Token trả về phải chứa mảng `permissions` đầy đủ các quyền hạn chi tiết lấy từ bảng `role_permissions`.

---

## 💻 3. ĐẶC TẢ REST API ENDPOINTS

### 1. `POST /api/v1/auth/register` (Đăng ký Tài khoản)
* **Headers:** `Content-Type: application/json`
* **Request Body (Đăng ký Customer / MUA / Agency):**
```json
{
  "phone_number": "0981234567",
  "email": "huongly.makeup@gmail.com",
  "password": "SecurePassword123!",
  "full_name": "Hương Ly",
  "gender": "FEMALE",
  "account_type": "FREELANCER_MUA", // Values: CUSTOMER, FREELANCER_MUA, AGENCY_ADMIN
  "mua_details": {
    "bio": "Chuyên gia make-up cô dâu tone Thái & Douyin hơn 5 năm kinh nghiệm",
    "experience_years": 5,
    "certificates": ["https://cdn.platform.com/cert1.jpg"]
  },
  "agency_details": null
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Đăng ký tài khoản thành công!",
  "data": {
    "user_id": 1024,
    "phone_number": "0981234567",
    "full_name": "Hương Ly",
    "mua_code": "MUA-2026-01024",
    "roles": ["ROLE_FREELANCE_MUA", "ROLE_CUSTOMER"]
  }
}
```

---

### 2. `POST /api/v1/auth/login` (Đăng nhập Hệ thống)
* **Request Body:**
```json
{
  "phone_number": "0981234567",
  "password": "SecurePassword123!"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "def502008a9...",
    "token_type": "Bearer",
    "expires_in": 7200,
    "user_info": {
      "id": 1024,
      "full_name": "Hương Ly",
      "phone_number": "0981234567",
      "agency_id": null,
      "mua_id": 89,
      "roles": ["ROLE_FREELANCE_MUA", "ROLE_CUSTOMER"]
    }
  }
}
```

---

### 3. `GET /api/v1/auth/me` (Lấy Thông tin Profile & Permission Codes)
* **Headers:** `Authorization: Bearer <access_token>`
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "user_id": 1024,
    "full_name": "Hương Ly",
    "phone_number": "0981234567",
    "email": "huongly.makeup@gmail.com",
    "roles": ["ROLE_FREELANCE_MUA"],
    "permissions": [
      "booking:create",
      "booking:accept_instant",
      "booking:view_my_jobs",
      "portfolio:upload",
      "calendar:block",
      "wallet:view_balance",
      "wallet:withdraw"
    ]
  }
}
```

---

## 🔑 4. CẤU TRÚC DỮ LIỆU JWT TOKEN PAYLOAD CLAIMS

Chuẩn mã hóa JWT Payload cấp phát cho Client:

```json
{
  "sub": "0981234567",
  "user_id": 1024,
  "full_name": "Hương Ly",
  "agency_id": null,
  "mua_id": 89,
  "roles": [
    "ROLE_FREELANCE_MUA",
    "ROLE_CUSTOMER"
  ],
  "permissions": [
    "booking:create",
    "booking:accept_instant",
    "booking:view_my_jobs",
    "portfolio:upload",
    "calendar:block",
    "wallet:view_balance",
    "wallet:withdraw"
  ],
  "iat": 1757329500,
  "exp": 1757336700,
  "iss": "makeup-booking-auth-service"
}
```

---

## 💾 5. DDL SQL CƠ SỞ DỮ LIỆU PHÂN QUYỀN RBAC 4 BẢNG

Mô hình DDL SQL chuẩn hóa 3NF áp dụng khóa chính `BIGINT Identity`:

```sql
-- 1. BẢNG NGƯỜI DÙNG CHUNG (USERS)
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    gender VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG DANH MỤC VAI TRÒ (ROLES)
CREATE TABLE roles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- ROLE_CUSTOMER, ROLE_FREELANCE_MUA, ROLE_AGENCY_ADMIN, ROLE_AGENCY_STAFF, ROLE_SUPER_ADMIN
    description VARCHAR(255)
);

-- 3. BẢNG GÁN VAI TRÒ CHO NGƯỜI DÙNG (USER_ROLES)
CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. BẢNG DANH SÁCH QUYỀN HẠN CHI TIẾT THEO VAI TRÒ (ROLE_PERMISSIONS)
CREATE TABLE role_permissions (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL, -- booking:create, booking:dispatch, wallet:withdraw, agency:invite_staff...
    description VARCHAR(255),
    UNIQUE (role_id, permission_code)
);

-- INDEX TỐI ƯU TRUY VẤN XÁC THỰC QUYỀN FAST LOOKUP
CREATE INDEX idx_role_permissions_lookup ON role_permissions(role_id, permission_code);
```
