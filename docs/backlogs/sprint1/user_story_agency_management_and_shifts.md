# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ BACK-END CHI TIẾT
## PHÂN HỆ: QUẢN LÝ STUDIO / ĐẠI LÝ MAKE-UP & ĐIỀU PHỐI NHÂN SỰ (AGENCY MANAGEMENT & STAFF DISPATCHING)
### (Spring Boot Layered Monolith `core-api` - Schema: `agency_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Agency Operations & Staff Dispatching Module`
* **Mô hình Kiến trúc:** **Spring Boot 3.3.x Layered Architecture Monolith** (Đóng gói trong khối `core-api`, chạy port `8080`, giao tiếp nội bộ qua Spring Service Layer & In-Memory Redis).
* **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`makeup_platform_db`, schema: `agency_schema`).
* **Mã Jira Issues phụ trách (Sprint 1):**
  * `ISSUE-12.1`: Quản lý Studio / Đại lý (`agency_profiles`), Hotline, địa chỉ cơ sở & Cơ chế tạo Mã giới thiệu / Sinh Mã QR mời thợ (`agency_invitations`).
  * `ISSUE-12.2`: Quản lý Danh sách Nhân viên Studio (`agency_staff`) & Duyệt thợ quét mã gia nhập Studio.
  * `ISSUE-12.3`: Cấu hình & Đàm phán % Hoa hồng nội bộ giữa Studio và Thợ trang điểm (`agreed_commission_rate` vs `commission_rate_internal`).
  * `ISSUE-12.4`: Quản lý Năng lực thợ Studio theo Tone Make-up chuẩn sàn (`agency_staff_styles`).
  * `ISSUE-12.5`: Bảng ma trận Xếp ca làm việc cố định theo tuần của Thợ Studio (`agency_staff_shifts`) & Theo dõi trạng thái ca làm.
* **Phạm vi Nghiệp vụ Cốt lõi:**
  1. **Hồ sơ Studio & Cơ sở vật chất**: Cập nhật thông tin phòng trang điểm, hotline, địa chỉ, ảnh đại diện, tỷ lệ hoa hồng mặc định của Studio.
  2. **Luồng Mời Thợ & Tuyển dụng (Staff Onboarding)**: Sinh mã mời động, link mời kèm mã QR Base64 (ZXing) có thời hạn 72 giờ lưu Redis. Thợ quét QR để nộp đơn xin gia nhập.
  3. **Phê duyệt Thợ & Thiết lập Hoa hồng Cá nhân hóa**: Studio Admin duyệt đơn, thỏa thuận tỷ lệ chia hoa hồng riêng (`agreed_commission_rate`: ví dụ Studio giữ 30%, Thợ nhận 70%).
  4. **Năng lực Phong cách Make-up (Style Matrix)**: Gán các Phong cách trang điểm chuẩn sàn (`agency_staff_styles`) mà thợ có khả năng thực hiện, phục vụ hiển thị thế mạnh của thợ và điều phối theo gu của khách.
  5. **Xếp ca Tuần & Điều phối Thợ (Weekly Shift Scheduling)**: Thiết lập lịch làm việc cố định 7 ngày trong tuần (Thứ 2 $\rightarrow$ Chủ Nhật, Ca Sáng/Chiều/Tối), quản lý trạng thái Online/Sẵn sàng/Nghỉ phép, ngăn chặn phân ca trùng giờ.
* **Đối tượng Sử dụng (User Personas):**
  1. **Agency Owner / Studio Admin (`ROLE_AGENCY_ADMIN`)**: Chủ Studio toàn quyền quản trị hồ sơ, mời thợ, duyệt thợ, cấu hình hoa hồng, phân công ca làm và xem báo cáo năng suất.
  2. **Agency Staff / Receptionist (`ROLE_AGENCY_STAFF`)**: Lễ tân/Quản lý điều phối được ủy quyền xếp ca làm việc, kiểm tra lịch trực của thợ, không có quyền can thiệp vào % hoa hồng tài chính.
  3. **Studio MUA / Freelance MUA (`ROLE_FREELANCE_MUA`)**: Thợ trang điểm quét mã QR gia nhập Studio, theo dõi lịch ca được phân công, xem danh sách phong cách trang điểm phụ trách và xem mức hoa hồng được hưởng.
  4. **Super Admin (`ROLE_SUPER_ADMIN`)**: Quản trị viên sàn kiểm duyệt tính hợp pháp của Studio, giải quyết tranh chấp hợp đồng lao động/hoa hồng giữa Studio và Thợ.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Toàn bộ mã nguồn tại `code/backend/core-api/` được tổ chức theo chuẩn **Layered Monolith** thống nhất của dự án (Controller $\rightarrow$ Service/ServiceImpl $\rightarrow$ Repository $\rightarrow$ Entity $\rightarrow$ DTO):

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # Helper response chuẩn: ok, created, noContent
│   │   └── ApiResponse.java                   # Envelope chuẩn: {success, code, message, data, timestamp}
│   ├── constants/
│   │   ├── ErrorCodes.java                    # Bộ hằng số mã lỗi chuẩn: ERR_AGENCY_*, ERR_STAFF_*
│   │   └── SecurityConstants.java             # Header prefix, Role constants
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Lỗi nghiệp vụ kèm ErrorCodes và HttpStatus
│   │   ├── ResourceNotFoundException.java     # Lỗi 404 không tìm thấy bản ghi
│   │   └── AccessDeniedException.java         # Lỗi 403 vi phạm quyền truy cập/IDOR
│   └── utils/
│       ├── QrCodeUtils.java                   # Tiện ích sinh ảnh QR Base64 bằng ZXing (<15ms)
│       └── SecurityContextUtils.java          # Trích xuất userId, agencyId từ JWT Principal
│
├── config/
│   └── RedisConfig.java                       # Cấu hình RedisTemplate lưu trữ Invitation Tokens
│
├── controller/
│   └── agency/
│       ├── AgencyProfileController.java       # /api/v1/agencies/profile (Hồ sơ Studio, Hotline, Địa chỉ)
│       ├── AgencyInvitationController.java    # /api/v1/agencies/invitations (Sinh QR, Link mời thợ)
│       ├── AgencyStaffController.java         # /api/v1/agencies/staff (Duyệt thợ, hoa hồng, trạng thái)
│       ├── AgencyStaffStyleController.java    # /api/v1/agencies/staff/{staffId}/styles (Gán tone make-up cho thợ)
│       └── AgencyShiftController.java         # /api/v1/agencies/shifts (Ma trận xếp ca tuần)
│
├── dto/
│   ├── request/agency/
│   │   ├── UpdateAgencyProfileReq.java        # Cập nhật thông tin Studio, % hoa hồng nội bộ mặc định
│   │   ├── CreateInvitationReq.java           # SĐT thợ, hoa hồng thỏa thuận đề xuất, ghi chú
│   │   ├── AcceptInvitationReq.java           # Mã mời/token nhận từ QR để nộp đơn gia nhập
│   │   ├── ReviewStaffApplicationReq.java     # APPROVE / REJECT thợ gia nhập
│   │   ├── UpdateStaffCommissionReq.java      # Cập nhật % hoa hồng riêng cho thợ
│   │   ├── AssignStaffStylesReq.java          # Danh sách styleIds phân công
│   │   └── ConfigureShiftReq.java             # staffId, dayOfWeek (1-7), shiftType, startTime, endTime
│   └── response/agency/
│       ├── AgencyProfileRes.java              # Chi tiết hồ sơ Studio, rating, số lượng thợ
│       ├── InvitationDetailRes.java           # Mã mời, QR Base64, Link mời, ngày hết hạn
│       ├── AgencyStaffSummaryRes.java         # Danh sách thợ, SĐT, % hoa hồng, trạng thái hoạt động
│       ├── AgencyStaffDetailRes.java          # Chi tiết thợ kèm danh sách Phong cách phụ trách
│       ├── ShiftDetailRes.java                # Chi tiết 1 ca làm việc
│       └── WeeklyShiftMatrixRes.java          # Ma trận ca trực 7 ngày trong tuần của toàn bộ Studio
│
├── entity/
│   └── agency/
│       ├── AgencyProfileEntity.java           # table: agency_schema.agency_profiles
│       ├── AgencyInvitationEntity.java        # table: agency_schema.agency_invitations
│       ├── AgencyStaffEntity.java             # table: agency_schema.agency_staff
│       ├── AgencyStaffStyleEntity.java        # table: agency_schema.agency_staff_styles (Composite PK)
│       └── AgencyStaffShiftEntity.java        # table: agency_schema.agency_staff_shifts (Ca làm việc)
│
├── repository/
│   └── agency/
│       ├── AgencyProfileRepository.java       # findByOwnerId, findByAgencyCode
│       ├── AgencyInvitationRepository.java    # findByInvitationCode, findByAgencyIdAndStatus
│       ├── AgencyStaffRepository.java         # findByAgencyId, findByMuaId, findByAgencyIdAndMuaId
│       ├── AgencyStaffStyleRepository.java    # findByStaffId, deleteByStaffId
│       └── AgencyStaffShiftRepository.java    # findByAgencyIdAndDayOfWeek, checkOverlappingShifts
│
└── service/
    └── agency/
        ├── AgencyProfileService.java          # Xem & cập nhật thông tin Studio
        ├── AgencyInvitationService.java       # Sinh QR, kiểm tra token mời, chấp nhận lời mời
        ├── AgencyStaffService.java            # Quản trị nhân sự, duyệt đơn, điều chỉnh hoa hồng
        ├── AgencyStaffStyleService.java        # Gán style make-up chuẩn sàn cho thợ
        ├── AgencyShiftService.java            # Lập lịch ca tuần, kiểm tra xung đột lịch
        └── impl/
            ├── AgencyProfileServiceImpl.java
            ├── AgencyInvitationServiceImpl.java
            ├── AgencyStaffServiceImpl.java
            ├── AgencyStaffStyleServiceImpl.java
            └── AgencyShiftServiceImpl.java
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD

---

### **US-AGC-01: Quản lý Hồ sơ & Chính sách Hoa hồng Mặc định của Studio (`ISSUE-12.1`)**
> **As an** Chủ Studio / Đại lý Make-up (`ROLE_AGENCY_ADMIN`),  
> **I want to** xem và cập nhật thông tin Studio (Tên thương hiệu, hotline, địa chỉ, logo và % hoa hồng nội bộ mặc định),  
> **So that** khách hàng nhận diện được thương hiệu uy tín và hệ thống có tỷ lệ cơ sở để tính toán doanh thu thợ trực thuộc.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Cập nhật thông tin Studio thành công (Happy Path)**
  * **Given** Chủ Studio đã đăng nhập với vai trò `ROLE_AGENCY_ADMIN` (`owner_id = 10`, `agency_id = 1`).
  * **When** Gửi request `PUT /api/v1/agencies/profile`:
    ```json
    {
      "agencyName": "Glamour Bridal Luxury Studio",
      "hotline": "02838383838",
      "addressStreet": "Số 88 Đồng Khởi, Phường Bến Nghé",
      "district": "Quận 1",
      "city": "Hồ Chí Minh",
      "commissionRateInternal": 25.00
    }
    ```
  * **Then** Backend kiểm tra `0.00 <= commissionRateInternal <= 100.00`.
  * **And** Cập nhật dữ liệu bảng `agency_schema.agency_profiles`.
  * **And** Trả về HTTP `200 OK` kèm thông tin hồ sơ Studio mới nhất.

* **Scenario 02: Thất bại do vi phạm tỷ lệ hoa hồng âm hoặc vượt 100%**
  * **When** Người dùng gửi `commissionRateInternal = -5.00` hoặc `110.00`.
  * **Then** Tầng Bean Validation ném ngoại lệ `MethodArgumentNotValidException`.
  * **And** `GlobalExceptionHandler` trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_INVALID_COMMISSION_RATE`.

* **Scenario 03: Chặn người dùng không có quyền truy cập sửa Studio (IDOR Prevention)**
  * **Given** Người dùng A là thợ tự do `ROLE_FREELANCE_MUA` hoặc Khách hàng `ROLE_CUSTOMER`.
  * **When** Cố tình gửi request `PUT /api/v1/agencies/profile`.
  * **Then** Spring Security chặn ở tầng Filter hoặc Service đối chiếu `owner_id != currentUser.id`.
  * **And** Ném `AccessDeniedException`, trả về HTTP `403 FORBIDDEN`.

---

### **US-AGC-02: Tạo Mã Mời & Sinh Mã QR Mời Thợ Gia nhập Studio (`ISSUE-12.1`)**
> **As an** Chủ Studio (`ROLE_AGENCY_ADMIN`),  
> **I want to** sinh mã mời kèm ảnh QR code động có thời hạn 72 giờ,  
> **So that** tôi gửi cho thợ make-up quét mã đăng ký gia nhập Studio một cách tiện lợi, bảo mật và nhanh chóng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Chủ Studio tạo mã mời và sinh ảnh QR thành công (Happy Path)**
  * **Given** Chủ Studio sở hữu `agency_id = 1`.
  * **When** Gửi request `POST /api/v1/agencies/invitations`:
    ```json
    {
      "proposedCommissionRate": 30.00,
      "note": "Lời mời gia nhập Team Makeup Cô Dâu Mùa Cưới 2026",
      "expireHours": 72
    }
    ```
  * **Then** Backend tạo mã mời ngẫu nhiên chuẩn bảo mật dạng: `INV-AG1-9X8K2M`.
  * **And** Tạo bản ghi trong `agency_schema.agency_invitations` với trạng thái `PENDING`.
  * **And** Đẩy token vào Redis với key `agency:invitation:INV-AG1-9X8K2M` kèm TTL 72 giờ (`259200s`).
  * **And** Dùng thư viện ZXing sinh ảnh QR Base64 chứa Deep Link: `https://app.makeup.vn/join?code=INV-AG1-9X8K2M`.
  * **And** Trả về HTTP `201 CREATED` kèm chuỗi `qrCodeBase64`, `invitationCode` và `expiresAt`.

* **Scenario 02: Thợ Make-up quét mã QR và nộp đơn gia nhập Studio**
  * **Given** Thợ make-up `mua_id = 25` đã đăng nhập trên Mobile App.
  * **When** Gửi request `POST /api/v1/agencies/invitations/accept`:
    ```json
    {
      "invitationCode": "INV-AG1-9X8K2M"
    }
    ```
  * **Then** Backend kiểm tra mã mời trong Redis/DB: hợp lệ và chưa hết hạn.
  * **And** Kiểm tra thợ này chưa từng là nhân viên đang hoạt động của Studio (`agency_staff`).
  * **And** Tạo bản ghi mới trong `agency_schema.agency_staff` với trạng thái `is_active = false` (chờ chủ Studio duyệt chính thức).
  * **And** Trả về HTTP `200 OK` kèm thông báo: *"Đã gửi đơn xin gia nhập Studio thành công, vui lòng chờ Studio phê duyệt!"*.

* **Scenario 03: Thợ quét mã mời đã hết hạn (Expired Token)**
  * **When** Thợ quét mã mời đã quá thời hạn 72 giờ hoặc mã không tồn tại.
  * **Then** Backend không tìm thấy mã trong Redis / DB đánh dấu `EXPIRED`.
  * **And** Ném `CustomBusinessException` với mã lỗi `ERR_INVITATION_EXPIRED`, trả về HTTP `400 BAD_REQUEST`.

---

### **US-AGC-03: Phê duyệt Nhân sự & Đàm phán Tỷ lệ Hoa hồng Riêng (`ISSUE-12.2`, `ISSUE-12.3`)**
> **As an** Chủ Studio (`ROLE_AGENCY_ADMIN`),  
> **I want to** duyệt đơn xin gia nhập của thợ, kích hoạt tài khoản và điều chỉnh % hoa hồng riêng cho thợ tay nghề cao,  
> **So that** thiết lập hợp đồng lao động nội bộ rõ ràng và công bằng cho đôi bên.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Chủ Studio duyệt thợ và kích hoạt trạng thái làm việc (Happy Path)**
  * **Given** Thợ `mua_id = 25` đang ở danh sách chờ duyệt của Studio (`staff_id = 101`, `is_active = false`).
  * **When** Chủ Studio gọi `PATCH /api/v1/agencies/staff/101/review`:
    ```json
    {
      "decision": "APPROVE",
      "agreedCommissionRate": 35.00
    }
    ```
  * **Then** Hệ thống cập nhật bản ghi `agency_staff`: `is_active = true`, `agreed_commission_rate = 35.00`.
  * **And** Gán bổ sung Role `ROLE_AGENCY_STAFF` cho người dùng thợ nếu chưa có.
  * **And** Trả về HTTP `200 OK` với thông báo *"Duyệt thợ gia nhập Studio thành công"*.

* **Scenario 02: Chủ Studio từ chối đơn gia nhập của thợ**
  * **When** Chủ Studio gửi request với `decision = "REJECT"`.
  * **Then** Bản ghi `agency_staff` tạm thời bị xóa hoặc cập nhật `is_active = false`.
  * **And** Trả về HTTP `200 OK`.

* **Scenario 03: Điều chỉnh % hoa hồng riêng cho thợ (`ISSUE-12.3`)**
  * **When** Chủ Studio gửi `PATCH /api/v1/agencies/staff/101/commission`:
    ```json
    {
      "agreedCommissionRate": 40.00
    }
    ```
  * **Then** Hệ thống cập nhật `agreed_commission_rate = 40.00`.
  * **And** Kể từ thời điểm này, mọi đơn hàng Studio giao cho thợ 101 sẽ tính hoa hồng Studio giữ 40%, thợ hưởng 60%.

---

### **US-AGC-04: Quản lý Năng lực Thợ Studio theo Phong cách Make-up (`ISSUE-12.4`)**
> **As an** Chủ Studio (`ROLE_AGENCY_ADMIN`),  
> **I want to** gán danh sách các Phong cách make-up chuẩn sàn mà thợ đủ năng lực đảm nhiệm,  
> **So that** Studio nắm rõ thế mạnh phong cách của từng thợ để hiển thị cho khách hàng lựa chọn đúng gu make-up.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Gán danh sách Phong cách make-up cho thợ thành công (Happy Path)**
  * **Given** Thợ `staff_id = 101` thuộc Studio `agency_id = 1`.
  * **When** Chủ Studio gửi request `PUT /api/v1/agencies/staff/101/styles`:
    ```json
    {
      "styleIds": [1, 2, 4]
    }
    ```
  * **Then** Backend xóa các mapping cũ và lưu các bản ghi mới vào:
    - Bảng `agency_schema.agency_staff_styles` (cho các style 1, 2, 4).
  * **And** Trả về HTTP `200 OK` kèm danh sách chi tiết các phong cách vừa cập nhật.

* **Scenario 02: Báo lỗi khi danh sách styleIds chứa mã phong cách không tồn tại**
  * **Given** Phong cách `style_id = 999` không tồn tại trong hệ thống.
  * **When** Chủ Studio gửi gán `styleIds = [1, 999]`.
  * **Then** Backend phát hiện style 999 không tồn tại trong bảng `catalog_schema.makeup_styles`.
  * **And** Ném `ResourceNotFoundException` với mã lỗi `ERR_STYLE_NOT_FOUND`, HTTP `404 NOT_FOUND`.

---

### **US-AGC-05: Lập Lịch Ca làm việc Cố định & Theo dõi Ma trận Tuần (`ISSUE-12.5`)**
> **As an** Chủ Studio hoặc Quản lý Studio (`ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`),  
> **I want to** xếp ca làm việc cố định theo tuần cho thợ và xem bảng ma trận lịch trực tổng thể của Studio,  
> **So that** Studio luôn chủ động nhân sự trực chiến, tránh nhận trùng lịch và quản lý ca làm minh bạch.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Xếp ca làm việc cố định cho thợ thành công (Happy Path)**
  * **Given** Thợ `staff_id = 101` đang hoạt động.
  * **When** Gửi request `POST /api/v1/agencies/shifts`:
    ```json
    {
      "staffId": 101,
      "dayOfWeek": 2, // Thứ Ba (1: Chủ Nhật, 2: Thứ Hai, ..., 7: Thứ Bảy)
      "shiftName": "Ca Sáng Make-up Tiệc",
      "startTime": "07:00:00",
      "endTime": "12:00:00",
      "isRecurring": true
    }
    ```
  * **Then** Backend kiểm tra không có xung đột giờ với ca làm khác của cùng thợ trong ngày Thứ Ba.
  * **And** Lưu bản ghi vào bảng `agency_schema.agency_staff_shifts`.
  * **And** Trả về HTTP `201 CREATED`.

* **Scenario 02: Chặn xếp ca trùng giờ cho cùng một thợ (Shift Overlap Prevention)**
  * **Given** Thợ 101 đã có ca trực từ `08:00:00` đến `13:00:00` vào Thứ Ba.
  * **When** Người điều phối cố tình tạo ca mới từ `11:00:00` đến `15:00:00` cho thợ 101 vào cùng ngày.
  * **Then** Backend kiểm tra điều kiện `(startA < endB) AND (endA > startB)`.
  * **And** Ném ngoại lệ `CustomBusinessException` với mã lỗi `ERR_SHIFT_OVERLAPPING`, trả về HTTP `409 CONFLICT`.

* **Scenario 03: Xem Ma trận Lịch Ca Toàn Studio theo tuần (Weekly Shift Matrix)**
  * **When** Gọi API `GET /api/v1/agencies/shifts/matrix`.
  * **Then** Trả về HTTP `200 OK` chứa danh sách 7 ngày trong tuần, mỗi ngày nhóm danh sách thợ trực và các khung giờ ca làm việc.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI

Tất cả các lỗi nghiệp vụ và lỗi xác thực đều tuân thủ định dạng Envelope chuẩn `ApiResponse` do `GlobalExceptionHandler` trả về:

```json
{
  "success": false,
  "code": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Thông điệp lỗi chi tiết thân thiện",
  "data": null,
  "timestamp": "2026-09-11T14:50:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Phân hệ Agency Management

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_VALIDATION_FAILED` | Vi phạm Bean Validation (`agencyName` rỗng, `hotline` sai định dạng). | Trả về chi tiết lỗi từng trường vi phạm. |
| **`400 BAD_REQUEST`** | `ERR_INVALID_COMMISSION_RATE` | % hoa hồng nhỏ hơn `0.00%` hoặc lớn hơn `100.00%`. | Yêu cầu nhập tỷ lệ phần trăm hợp lệ từ 0 đến 100. |
| **`400 BAD_REQUEST`** | `ERR_INVITATION_EXPIRED` | Mã mời đã hết hạn 72h trong Redis hoặc đã bị hủy trước đó. | Thông báo mã mời hết hạn và yêu cầu Studio sinh mã mới. |
| **`404 NOT_FOUND`** | `ERR_STYLE_NOT_FOUND` | Phong cách make-up truyền vào không tồn tại trong danh mục hệ thống. | Kiểm tra tồn tại trong bảng `catalog_schema.makeup_styles`. |
| **`401 UNAUTHORIZED`** | `ERR_TOKEN_INVALID` | Token JWT thiếu hoặc hết hạn khi gọi các API quản lý Studio. | Spring Security chặn ở tầng Filter. |
| **`403 FORBIDDEN`** | `ERR_AGENCY_ACCESS_DENIED` | Tài khoản không có quyền `ROLE_AGENCY_ADMIN` hoặc cố tình sửa Studio khác (IDOR). | Kiểm tra `agency.owner_id == currentUser.id`. |
| **`404 NOT_FOUND`** | `ERR_AGENCY_NOT_FOUND` | Không tìm thấy hồ sơ Studio gắn với User ID hiện tại. | Ném `ResourceNotFoundException("Studio không tồn tại")`. |
| **`404 NOT_FOUND`** | `ERR_STAFF_NOT_FOUND` | Không tìm thấy nhân sự thợ (`staff_id`) trong danh sách Studio. | Ném `ResourceNotFoundException("Nhân viên không tồn tại trong Studio")`. |
| **`404 NOT_FOUND`** | `ERR_INVITATION_NOT_FOUND` | Mã mời / QR Code không tồn tại trên hệ thống. | Báo lỗi mã mời không hợp lệ. |
| **`409 CONFLICT`** | `ERR_STAFF_ALREADY_MEMBER` | Thợ này đã là thành viên đang hoạt động của Studio. | Chặn gửi đơn trùng lặp, báo lỗi thợ đã là nhân viên. |
| **`409 CONFLICT`** | `ERR_SHIFT_OVERLAPPING` | Ca làm việc mới bị trùng giờ với ca làm đã có của thợ trong ngày. | Chặn lưu DB và trả về thông tin ca bị xung đột. |

---

### 4.2. Mã nguồn DTO Bean Validation Mẫu

```java
package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAgencyProfileReq {

    @NotBlank(message = "Tên Studio không được để trống")
    @Size(max = 150, message = "Tên Studio không được vượt quá 150 ký tự")
    private String agencyName;

    @NotBlank(message = "Hotline liên hệ không được để trống")
    @Pattern(regexp = "^(0|\\+84)(\\d{9,10})$", message = "Số hotline không đúng định dạng Việt Nam")
    private String hotline;

    @NotBlank(message = "Địa chỉ đường phố không được để trống")
    private String addressStreet;

    @NotBlank(message = "Quận/Huyện không được để trống")
    private String district;

    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    private String city;

    @NotNull(message = "Tỷ lệ hoa hồng nội bộ mặc định không được để trống")
    @DecimalMin(value = "0.00", message = "Tỷ lệ hoa hồng không được nhỏ hơn 0%")
    @DecimalMax(value = "100.00", message = "Tỷ lệ hoa hồng không được vượt quá 100%")
    private BigDecimal commissionRateInternal;
}
```

---

## 💻 5. ĐẶC TẢ REST API ENDPOINTS

---

### 5.1. `GET /api/v1/agencies/profile/my` (Xem Hồ sơ Studio Của Tôi)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_AGENCY_STAFF`.
* **Headers:** `Authorization: Bearer <JWT>`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Lấy thông tin Studio thành công",
  "data": {
    "id": 1,
    "agencyCode": "AG-SG-00105",
    "agencyName": "Glamour Bridal Luxury Studio",
    "hotline": "02838383838",
    "addressStreet": "Số 88 Đồng Khởi, Phường Bến Nghé",
    "district": "Quận 1",
    "city": "Hồ Chí Minh",
    "commissionRateInternal": 25.00,
    "isVerified": true,
    "ratingAvg": 4.95,
    "totalStaffCount": 8,
    "createdAt": "2026-09-01T08:00:00Z"
  },
  "timestamp": "2026-09-11T14:55:00Z"
}
```

---

### 5.2. `PUT /api/v1/agencies/profile` (Cập nhật Thông tin Studio)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` (Chỉ chủ Studio).
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "agencyName": "Glamour Bridal Luxury Studio",
  "hotline": "02838383838",
  "addressStreet": "Số 88 Đồng Khởi, Phường Bến Nghé",
  "district": "Quận 1",
  "city": "Hồ Chí Minh",
  "commissionRateInternal": 25.00
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Cập nhật hồ sơ Studio thành công!",
  "data": {
    "id": 1,
    "agencyName": "Glamour Bridal Luxury Studio",
    "commissionRateInternal": 25.00,
    "updatedAt": "2026-09-11T14:56:00Z"
  },
  "timestamp": "2026-09-11T14:56:00Z"
}
```

---

### 5.3. `POST /api/v1/agencies/invitations` (Sinh Mã & Ảnh QR Mời Thợ)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "proposedCommissionRate": 30.00,
  "note": "Mời thợ tham gia đội ngũ Make-up Mùa Cưới 2026",
  "expireHours": 72
}
```
* **Response `201 CREATED`:**
```json
{
  "success": true,
  "code": "201",
  "message": "Tạo mã mời và sinh mã QR thành công!",
  "data": {
    "invitationCode": "INV-AG1-9X8K2M",
    "qrCodeBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICA...",
    "inviteUrl": "https://app.makeup.vn/join?code=INV-AG1-9X8K2M",
    "proposedCommissionRate": 30.00,
    "expiresAt": "2026-09-14T14:57:00Z"
  },
  "timestamp": "2026-09-11T14:57:00Z"
}
```

---

### 5.4. `POST /api/v1/agencies/invitations/accept` (Thợ Quét QR Nộp Đơn Gia Nhập)
* **Quyền hạn:** `ROLE_FREELANCE_MUA`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "invitationCode": "INV-AG1-9X8K2M"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Đã gửi đơn xin gia nhập Studio thành công! Vui lòng chờ Studio xét duyệt.",
  "data": {
    "agencyName": "Glamour Bridal Luxury Studio",
    "status": "PENDING_APPROVAL"
  },
  "timestamp": "2026-09-11T14:58:00Z"
}
```

---

### 5.5. `GET /api/v1/agencies/staff` (Danh sách Nhân sự Thợ của Studio)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_AGENCY_STAFF`.
* **Query Params:** `status=ACTIVE` (hoặc `PENDING`), `page=0`, `size=10`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Lấy danh sách nhân viên thành công",
  "data": [
    {
      "staffId": 101,
      "muaId": 25,
      "fullName": "Trần Thanh Tâm",
      "phoneNumber": "0987654321",
      "avatarUrl": "https://cdn.makeup.vn/avatars/tam.jpg",
      "agreedCommissionRate": 30.00,
      "isActive": true,
      "joinedAt": "2026-09-02T10:00:00Z",
      "skillsCount": 3
    }
  ],
  "timestamp": "2026-09-11T14:59:00Z"
}
```

---

### 5.6. `PATCH /api/v1/agencies/staff/{staffId}/review` (Duyệt Đơn Gia Nhập Thợ)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Request Body:**
```json
{
  "decision": "APPROVE", // APPROVE hoặc REJECT
  "agreedCommissionRate": 30.00
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Phê duyệt nhân sự thợ thành công!",
  "data": {
    "staffId": 101,
    "isActive": true,
    "agreedCommissionRate": 30.00
  },
  "timestamp": "2026-09-11T15:00:00Z"
}
```

---

### 5.7. `PUT /api/v1/agencies/staff/{staffId}/styles` (Gán Phong Cách Make-up Cho Thợ)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Request Body:**
```json
{
  "styleIds": [1, 2, 4]
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Cập nhật phong cách make-up cho thợ thành công!",
  "data": {
    "staffId": 101,
    "assignedStyles": [
      { "id": 1, "styleName": "Tone Hàn Douyin" },
      { "id": 2, "styleName": "Tone Thái Sang Trọng" },
      { "id": 4, "styleName": "Tone Tây Sắc Sảo" }
    ]
  },
  "timestamp": "2026-09-11T15:01:00Z"
}
```

---

### 5.8. `POST /api/v1/agencies/shifts` (Xếp Ca Làm Việc Cố Định)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_AGENCY_STAFF`.
* **Request Body:**
```json
{
  "staffId": 101,
  "dayOfWeek": 2,
  "shiftName": "Ca Sáng Make-up Tiệc",
  "startTime": "07:00:00",
  "endTime": "12:00:00",
  "isRecurring": true
}
```
* **Response `201 CREATED`:**
```json
{
  "success": true,
  "code": "201",
  "message": "Xếp ca làm việc thành công!",
  "data": {
    "id": 55,
    "staffId": 101,
    "dayOfWeek": 2,
    "shiftName": "Ca Sáng Make-up Tiệc",
    "startTime": "07:00:00",
    "endTime": "12:00:00",
    "isRecurring": true
  },
  "timestamp": "2026-09-11T15:02:00Z"
}
```

---

### 5.9. `GET /api/v1/agencies/shifts/matrix` (Lấy Ma Trận Ca Làm Việc Tuần)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_AGENCY_STAFF`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Lấy ma trận ca làm việc tuần thành công",
  "data": {
    "agencyId": 1,
    "days": [
      {
        "dayOfWeek": 2,
        "dayName": "Thứ Hai",
        "shifts": [
          {
            "shiftId": 55,
            "staffId": 101,
            "staffName": "Trần Thanh Tâm",
            "shiftName": "Ca Sáng Make-up Tiệc",
            "startTime": "07:00:00",
            "endTime": "12:00:00"
          }
        ]
      }
    ]
  },
  "timestamp": "2026-09-11T15:03:00Z"
}
```

---

## 🗄️ 6. THIẾT KẾ CƠ SỞ DỮ LIỆU & DDL MIGRATION SQL

File migration Flyway: `src/main/resources/db/migration/V4__Init_Agency_Operations_And_Shifts.sql`

```sql
-- =============================================================================
-- V4__Init_Agency_Operations_And_Shifts.sql
-- Hoàn thiện Schema agency_schema: Lời mời, Nhân sự, Phân quyền kỹ năng & Ca làm việc
-- =============================================================================

-- 1. BẢNG QUẢN LÝ LỜI MỜI GIA NHẬP STUDIO (INVITATIONS & QR CODES)
CREATE TABLE IF NOT EXISTS agency_schema.agency_invitations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    invitation_code VARCHAR(50) UNIQUE NOT NULL,
    proposed_commission_rate DECIMAL(5, 2) DEFAULT 30.00 NOT NULL CHECK (proposed_commission_rate >= 0.00 AND proposed_commission_rate <= 100.00),
    note TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    accepted_by_mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. BẢNG NHÂN SỰ STUDIO (AGENCY STAFF)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    agreed_commission_rate DECIMAL(5, 2) NOT NULL CHECK (agreed_commission_rate >= 0.00 AND agreed_commission_rate <= 100.00),
    is_active BOOLEAN DEFAULT FALSE NOT NULL, -- False: Chờ duyệt | True: Đang hoạt động
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (agency_id, mua_id)
);

-- 3. BẢNG GÁN PHONG CÁCH MAKE-UP CHO THỢ STUDIO (AGENCY STAFF STYLES)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_styles (
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    style_id INT NOT NULL REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (staff_id, style_id)
);

-- 4. BẢNG XẾP CA LÀM VIỆC CỐ ĐỊNH THEO TUẦN (AGENCY STAFF SHIFTS)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_shifts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_shift_time CHECK (end_time > start_time)
);

-- 6. CHỈ MỤC (INDEXES) TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_invitations_code ON agency_schema.agency_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_agency ON agency_schema.agency_invitations(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_staff_agency ON agency_schema.agency_staff(agency_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_staff_mua ON agency_schema.agency_staff(mua_id);
CREATE INDEX IF NOT EXISTS idx_shifts_agency_day ON agency_schema.agency_staff_shifts(agency_id, day_of_week, is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON agency_schema.agency_staff_shifts(staff_id, day_of_week);

-- 7. CẤP QUYỀN RBAC CHO ROLE_AGENCY_ADMIN & ROLE_AGENCY_STAFF
INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('agency:manage_profile', 'Cập nhật thông tin và chính sách hoa hồng Studio'),
    ('agency:invite_staff', 'Tạo mã mời và sinh mã QR tuyển dụng thợ'),
    ('agency:review_staff', 'Phê duyệt hoặc từ chối thợ gia nhập Studio'),
    ('agency:set_commission', 'Thiết lập tỷ lệ hoa hồng riêng cho thợ'),
    ('agency:assign_skills', 'Gán gói dịch vụ và phong cách trang điểm cho thợ'),
    ('agency:manage_shifts', 'Xếp ca làm việc và điều phối nhân sự theo tuần')
) AS p(code, descr)
WHERE r.name = 'ROLE_AGENCY_ADMIN'
ON CONFLICT (role_id, permission_code) DO NOTHING;

INSERT INTO auth_schema.role_permissions (role_id, permission_code, description)
SELECT r.id, p.code, p.descr FROM auth_schema.roles r
CROSS JOIN (VALUES
    ('agency:view_staff', 'Xem danh sách nhân viên Studio'),
    ('agency:manage_shifts', 'Xếp ca làm việc và điều phối nhân sự theo tuần')
) AS p(code, descr)
WHERE r.name = 'ROLE_AGENCY_STAFF'
ON CONFLICT (role_id, permission_code) DO NOTHING;
```

---

## 🎨 7. ĐẶC TẢ FRONTEND (REACT 18 + VITE + TAILWIND + ZOD)

### 7.1. Cấu trúc Thư mục Frontend (`code/frontend/src/`)
```text
code/frontend/src/
├── api/
│   └── agencyApi.js                       # Axios client gọi toàn bộ API /api/v1/agencies/*
├── schemas/
│   └── agencySchema.js                    # Zod schemas validate form Studio & Ca làm việc
├── store/
│   └── useAgencyStore.js                  # Zustand store quản lý State Studio, Staff, Shift Matrix
└── pages/
    └── agency/
        ├── AgencyProfilePage.jsx          # Cập nhật thông tin Studio & % hoa hồng
        ├── AgencyStaffListPage.jsx        # Danh sách thợ, Modal QR mời thợ & Duyệt đơn
        ├── StaffStyleAssignModal.jsx      # Modal tích chọn Tone Style make-up phụ trách
        └── WeeklyShiftMatrixPage.jsx      # Bảng ma trận xếp ca tuần kéo-thả trực quan
```

### 7.2. Zod Schema Validation Mẫu (`src/schemas/agencySchema.js`)
```javascript
import { z } from 'zod';

export const updateAgencyProfileSchema = z.object({
  agencyName: z.string().min(3, 'Tên Studio phải có ít nhất 3 ký tự').max(150),
  hotline: z.string().regex(/^(0|\+84)(\d{9,10})$/, 'Số hotline không đúng định dạng Việt Nam'),
  addressStreet: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
  district: z.string().min(2, 'Vui lòng chọn Quận/Huyện'),
  city: z.string().min(2, 'Vui lòng chọn Tỉnh/Thành phố'),
  commissionRateInternal: z.coerce
    .number()
    .min(0, 'Hoa hồng tối thiểu là 0%')
    .max(100, 'Hoa hồng tối đa là 100%'),
});

export const configureShiftSchema = z.object({
  staffId: z.number({ required_error: 'Vui lòng chọn nhân viên' }),
  dayOfWeek: z.number().min(1).max(7),
  shiftName: z.string().min(2, 'Tên ca làm việc không được để trống'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Giờ bắt đầu không đúng định dạng HH:mm:ss'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Giờ kết thúc không đúng định dạng HH:mm:ss'),
  isRecurring: z.boolean().default(true),
}).refine((data) => data.endTime > data.startTime, {
  message: 'Giờ kết thúc ca phải sau giờ bắt đầu',
  path: ['endTime'],
});
```

### 7.3. Trải nghiệm Người dùng (Luxury Beauty & Glamour UX/UI)
* **Modal Mã QR Mời Thợ (Invitation QR Lightbox)**:
  - Hiển thị QR Code rõ nét chuẩn kích thước 300x300, có nút **"Sao chép Link"** và **"Tải ảnh QR"** về máy để gửi qua Zalo/Facebook.
  - Hiển thị đồng hồ đếm ngược thời gian hết hạn (`72:00:00` $\rightarrow$ `00:00:00`).
* **Bảng Ma Trận Lịch Ca Tuần (Weekly Shift Matrix Grid)**:
  - Thiết kế bảng dạng lưới 7 cột tương ứng 7 ngày trong tuần, các hàng là các khung giờ sáng/chiều/tối.
  - Thẻ ca làm hiển thị Avatar thợ, tên thợ, tag kỹ năng tone make-up thế mạnh.
  - Cảnh báo trực quan màu đỏ lập tức nếu phát hiện điều phối 2 ca làm trùng giờ cho 1 thợ.
