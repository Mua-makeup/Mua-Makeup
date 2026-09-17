# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ BACK-END CHI TIẾT
## PHÂN HỆ: QUẢN LÝ STUDIO / ĐẠI LÝ MAKE-UP & ĐIỀU PHỐI NHÂN SỰ (AGENCY MANAGEMENT & STAFF DISPATCHING)
### (Spring Boot Layered Monolith `core-api` - Schema: `agency_schema`, In-Memory: Redis, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Agency Operations & Staff Dispatching Module`
* **Mô hình Kiến trúc:** **Spring Boot 3.3.x Layered Architecture Monolith** (Đóng gói trong khối `core-api`, chạy port `8080`, lưu trữ bền vững trên PostgreSQL 16 và lưu trữ tạm thời In-Memory qua Redis).
* **Cơ sở Dữ liệu & Bộ nhớ Đệm:**
  * **PostgreSQL 16** (`makeup_platform_db`, schema: `agency_schema`): Lưu trữ hồ sơ Studio (`agency_profiles`), nhân sự trực thuộc (`agency_staff`), năng lực phong cách (`agency_staff_styles`), ma trận ca tuần (`agency_staff_shifts`).
  * **Redis (In-Memory Key-Value with TTL)**: Lưu trữ các mã mời / token tuyển dụng động có thời hạn (`agency:invitation:{inviteCode}`) kèm TTL (mặc định 72 giờ = `259200s`), tự động hủy khi hết hạn mà không cần lưu rác vào database.
* **Mã Jira Issues phụ trách (Sprint 1):**
  * `ISSUE-12.1`: Quản lý Hồ sơ Studio / Đại lý (`agency_profiles`), Hotline, địa chỉ cơ sở & Cơ chế tạo Mã giới thiệu / Sinh Mã QR mời thợ lưu Redis.
  * `ISSUE-12.2`: Quản lý Danh sách Nhân viên Studio (`agency_staff`), Trạng thái hoạt động (`status`: PENDING, ACTIVE, SUSPENDED, LEFT) & Duyệt thợ quét mã gia nhập Studio.
  * `ISSUE-12.3`: Cấu hình & Đàm phán % Hoa hồng nội bộ giữa Studio và Thợ trang điểm (`agreed_commission_rate` cá nhân hóa vs `commission_rate_internal` mặc định của Studio).
  * `ISSUE-12.4`: Quản lý Năng lực thợ Studio theo Tone Make-up chuẩn sàn (`agency_staff_styles`).
  * `ISSUE-12.5`: Bảng ma trận Xếp ca làm việc cố định theo tuần của Thợ Studio (`agency_staff_shifts`) & Theo dõi trạng thái ca làm.
* **Phạm vi Nghiệp vụ Cốt lõi:**
  1. **Hồ sơ Studio & Cơ sở vật chất**: Cập nhật thông tin phòng trang điểm, hotline, địa chỉ, logo và tỷ lệ hoa hồng mặc định của Studio (`commission_rate_internal`).
  2. **Luồng Mời Thợ Tuyển dụng qua Redis (Staff Onboarding)**: Chủ Studio sinh mã mời động dạng `INV-{AGENCY_CODE}-{RANDOM}`, link mời kèm mã QR Base64. Mã mời được lưu vào Redis với TTL 72 giờ. Khi thợ quét mã nộp đơn, hệ thống kiểm tra Redis, tạo liên kết nhân sự và xóa mã mời khỏi Redis.
  3. **Phê duyệt Thợ & Phân cấp Hoa hồng Linh hoạt**: Studio Admin duyệt đơn, thỏa thuận tỷ lệ chia hoa hồng riêng (`agreed_commission_rate`: ví dụ Studio giữ 30%, Thợ nhận 70%). Nếu không cấu hình hoa hồng riêng, hệ thống tự động fallback về tỷ lệ mặc định của Studio. Thợ gia nhập KHÔNG bị cấp nhầm quyền Lễ tân/Điều phối (`ROLE_AGENCY_STAFF`).
  4. **Năng lực Phong cách Make-up (Style Matrix)**: Gán các Phong cách trang điểm chuẩn sàn (`agency_staff_styles`) mà thợ có khả năng thực hiện, phục vụ hiển thị thế mạnh của thợ và điều phối theo gu của khách.
  5. **Xếp ca Tuần & Điều phối Thợ (Weekly Shift Scheduling)**: Thiết lập lịch làm việc cố định 7 ngày trong tuần (Thứ 2 $\rightarrow$ Chủ Nhật, Ca Sáng/Chiều/Tối), quản lý trạng thái Online/Sẵn sàng/Nghỉ phép, ngăn chặn phân ca trùng giờ.
* **Đối tượng Sử dụng (User Personas):**
  1. **Agency Owner / Studio Admin (`ROLE_AGENCY_ADMIN`)**: Chủ Studio toàn quyền quản trị hồ sơ, mời thợ, duyệt thợ, cấu hình hoa hồng, phân công ca làm và xem báo cáo năng suất.
  2. **Agency Staff / Receptionist (`ROLE_AGENCY_STAFF`)**: Lễ tân/Quản lý điều phối được ủy quyền xếp ca làm việc, kiểm tra lịch trực của thợ, không có quyền can thiệp vào % hoa hồng tài chính.
  3. **Studio MUA / Freelance MUA (`ROLE_FREELANCE_MUA`)**: Thợ trang điểm quét mã QR gia nhập Studio, theo dõi lịch ca được phân công, xem danh sách phong cách trang điểm phụ trách và xem mức hoa hồng được hưởng.
  4. **Super Admin (`ROLE_SUPER_ADMIN`)**: Quản trị viên sàn kiểm duyệt tính hợp pháp của Studio, giải quyết tranh chấp hợp đồng lao động/hoa hồng giữa Studio và Thợ.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Toàn bộ mã nguồn tại `code/backend/core-api/` được tổ chức theo chuẩn **Layered Monolith** thống nhất của dự án (Controller $\rightarrow$ Service/ServiceImpl $\rightarrow$ Repository/Redis $\rightarrow$ Entity $\rightarrow$ DTO):

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # Helper response chuẩn: ok, created, noContent
│   │   ├── ApiResponse.java                   # Envelope chuẩn: {success, code, message, data, timestamp}
│   │   ├── PageResponse.java                  # Envelope phân trang chuẩn
│   │   ├── BaseService.java
│   │   └── BaseServiceImpl.java
│   ├── constants/
│   │   ├── ErrorCodes.java                    # ERR_VALIDATION, ERR_AGENCY_*, ERR_STAFF_*, ERR_INVITATION_*
│   │   └── SecurityConstants.java             # Header prefix, Role constants
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Lỗi nghiệp vụ kèm ErrorCodes và HttpStatus
│   │   ├── ResourceNotFoundException.java     # Lỗi 404 không tìm thấy bản ghi
│   │   └── AccessDeniedException.java         # Lỗi 403 vi phạm quyền truy cập/IDOR
│   ├── i18n/
│   │   ├── CustomLocaleResolver.java          # Đa ngôn ngữ Accept-Language
│   │   └── JsonMessageSource.java             # Nạp file i18n JSON
│   └── utils/
│       ├── QrCodeUtils.java                   # Tiện ích sinh ảnh QR Base64 từ Deep Link mời
│       └── SecurityContextUtils.java          # Trích xuất userId từ JWT Principal
│
├── config/
│   └── RedisConfig.java                       # Cấu hình RedisTemplate lưu trữ Invitation Tokens
│
├── controller/
│   └── agency/
│       ├── AgencyProfileController.java       # /api/v1/agencies/profile, /commission
│       ├── AgencyStaffController.java         # /api/v1/agencies/invitations, /staff, /staff/{id}/commission
│       ├── AgencyStaffStyleController.java    # /api/v1/agencies/staff/{staffId}/styles
│       └── AgencyShiftController.java         # /api/v1/agencies/shifts, /shifts/matrix
│
├── dto/
│   ├── request/agency/
│   │   ├── UpdateAgencyProfileReq.java        # Cập nhật thông tin cơ sở Studio (Tên, hotline, địa chỉ, logo)
│   │   ├── UpdateCommissionReq.java           # Cập nhật % hoa hồng nội bộ mặc định Studio
│   │   ├── CreateInvitationReq.java           # expireHours (hoặc expiresInDays), ghi chú, hoa hồng đề xuất
│   │   ├── AcceptInvitationReq.java           # Mã mời (inviteCode) nhận từ QR để xin gia nhập
│   │   ├── UpdateStaffStatusReq.java          # Cập nhật trạng thái thợ (ACTIVE, SUSPENDED, LEFT)
│   │   ├── UpdateStaffCommissionReq.java      # Cập nhật % hoa hồng riêng cho thợ (agreedCommissionRate)
│   │   ├── AssignStaffStylesReq.java          # Danh sách styleIds phân công
│   │   └── ConfigureShiftReq.java             # staffId, dayOfWeek (1-7), shiftType, startTime, endTime
│   └── response/agency/
│       ├── AgencyProfileRes.java              # Chi tiết hồ sơ Studio, rating, số lượng thợ, hoa hồng mặc định
│       ├── AgencyInvitationRes.java           # Mã mời, QR Base64, Link mời, ngày hết hạn
│       ├── AgencyStaffRes.java                # Danh sách thợ, SĐT, % hoa hồng riêng, trạng thái hoạt động
│       ├── AgencyStaffDetailRes.java          # Chi tiết thợ kèm danh sách Phong cách phụ trách
│       ├── ShiftDetailRes.java                # Chi tiết 1 ca làm việc
│       └── WeeklyShiftMatrixRes.java          # Ma trận ca trực 7 ngày trong tuần của toàn bộ Studio
│
├── entity/
│   └── agency/
│       ├── AgencyProfileEntity.java           # table: agency_schema.agency_profiles
│       ├── AgencyStaffEntity.java             # table: agency_schema.agency_staff
│       ├── AgencyStaffStyleEntity.java        # table: agency_schema.agency_staff_styles
│       └── AgencyStaffShiftEntity.java        # table: agency_schema.agency_staff_shifts
│
├── mapper/
│   └── agency/
│       ├── AgencyProfileMapper.java           # MapStruct: AgencyProfileEntity <-> DTOs
│       ├── AgencyInvitationMapper.java        # MapStruct: AgencyInvitationEntity <-> DTOs
│       ├── AgencyStaffMapper.java             # MapStruct: AgencyStaffEntity <-> DTOs
│       └── AgencyShiftMapper.java             # MapStruct: AgencyStaffShiftEntity <-> DTOs
│
├── repository/
│   ├── AgencyProfileRepository.java           # findByOwnerId, findByAgencyCode
│   ├── AgencyStaffRepository.java             # findByAgencyId, findByMuaId, findByAgencyIdAndMuaId
│   ├── AgencyStaffStyleRepository.java        # findByStaffId, deleteByStaffId
│   └── AgencyStaffShiftRepository.java        # findByAgencyIdAndDayOfWeek, checkOverlappingShifts
│
└── service/
    └── agency/
        ├── AgencyProfileService.java          # Xem & cập nhật thông tin Studio, hoa hồng mặc định
        ├── AgencyStaffService.java            # Quản lý nhân sự, mã mời Redis, trạng thái thợ, hoa hồng riêng
        ├── AgencyStaffStyleService.java        # Gán style make-up chuẩn sàn cho thợ
        ├── AgencyShiftService.java            # Lập lịch ca tuần, kiểm tra xung đột lịch
        └── impl/
            ├── AgencyProfileServiceImpl.java
            ├── AgencyStaffServiceImpl.java
            ├── AgencyStaffStyleServiceImpl.java
            └── AgencyShiftServiceImpl.java
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD

---

### **US-AGC-01: Quản lý Hồ sơ & Chính sách Hoa hồng Mặc định của Studio (`ISSUE-12.1`)**
> **As an** Chủ Studio / Đại lý Make-up (`ROLE_AGENCY_ADMIN`),  
> **I want to** xem và cập nhật thông tin Studio (Tên thương hiệu, hotline, địa chỉ, logo) và thiết lập % hoa hồng nội bộ mặc định,  
> **So that** khách hàng nhận diện thương hiệu uy tín và hệ thống có tỷ lệ cơ sở tính toán doanh thu thợ trực thuộc khi chưa thỏa thuận hoa hồng riêng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Cập nhật thông tin cơ sở Studio thành công (Happy Path)**
  * **Given** Chủ Studio đã đăng nhập với vai trò `ROLE_AGENCY_ADMIN` (`owner_id = 10`, `agency_id = 1`).
  * **When** Gửi request `PUT /api/v1/agencies/profile`:
    ```json
    {
      "agencyName": "Glamour Bridal Luxury Studio",
      "hotline": "02838383838",
      "addressStreet": "Số 88 Đồng Khởi, Phường Bến Nghé",
      "district": "Quận 1",
      "city": "Hồ Chí Minh",
      "logoUrl": "https://cdn.makeup.vn/logos/glamour.png"
    }
    ```
  * **Then** Cập nhật dữ liệu bảng `agency_schema.agency_profiles`.
  * **And** Trả về HTTP `200 OK` kèm thông tin hồ sơ Studio mới nhất.

* **Scenario 02: Cập nhật tỷ lệ hoa hồng nội bộ mặc định thành công**
  * **When** Chủ Studio gửi request `PUT /api/v1/agencies/commission`:
    ```json
    {
      "commissionRateInternal": 25.00
    }
    ```
  * **Then** Backend kiểm tra `0.00 <= commissionRateInternal <= 100.00`.
  * **And** Cập nhật trường `commission_rate_internal = 25.00` trong `agency_schema.agency_profiles`.
  * **And** Trả về HTTP `200 OK`.

* **Scenario 03: Thất bại do vi phạm tỷ lệ hoa hồng âm hoặc vượt 100%**
  * **When** Người dùng gửi `commissionRateInternal = -5.00` hoặc `110.00`.
  * **Then** Tầng Bean Validation chặn với `MethodArgumentNotValidException`.
  * **And** `GlobalExceptionHandler` trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_VALIDATION`.

* **Scenario 04: Chặn người dùng không có quyền truy cập sửa Studio (IDOR Prevention)**
  * **Given** Người dùng A là thợ tự do `ROLE_FREELANCE_MUA` hoặc Khách hàng `ROLE_CUSTOMER`.
  * **When** Cố tình gửi request `PUT /api/v1/agencies/profile`.
  * **Then** Spring Security chặn ở tầng `@PreAuthorize("hasRole('AGENCY_ADMIN')")`.
  * **And** Trả về HTTP `403 FORBIDDEN`.

---

### **US-AGC-02: Tạo Mã Mời & Sinh Mã QR Mời Thợ Gia Nhập Lưu Trực Tiếp Vào Redis (`ISSUE-12.1`, `ISSUE-12.2`)**
> **As an** Chủ Studio (`ROLE_AGENCY_ADMIN`),  
> **I want to** sinh mã mời kèm ảnh QR code động có thời hạn (ví dụ 72 giờ) được lưu trữ hoàn toàn trong Redis,  
> **So that** thợ make-up quét mã đăng ký gia nhập Studio tiện lợi, bảo mật, tự động hết hạn mà không gây rác dữ liệu database.

#### **Cơ chế Lưu trữ Redis:**
* **Key Redis:** `agency:invitation:{inviteCode}` (Ví dụ: `agency:invitation:INV-AG00105-9X8K2M`)
* **Index Set Studio:** `agency:{agencyId}:invitations` (Lưu danh sách các `inviteCode` đang mở để tra cứu nhanh)
* **Value (JSON Payload):**
  ```json
  {
    "inviteCode": "INV-AG00105-9X8K2M",
    "agencyId": 1,
    "agencyName": "Glamour Bridal Luxury Studio",
    "invitedByUserId": 10,
    "note": "Mời thợ tham gia đội ngũ Mùa Cưới 2026",
    "proposedCommissionRate": 30.00,
    "createdAt": "2026-09-11T14:57:00Z",
    "expiresAt": "2026-09-14T14:57:00Z"
  }
  ```
* **TTL Redis:** `259200` giây (72 giờ) hoặc theo giá trị truyền vào.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Chủ Studio tạo mã mời lưu Redis và sinh ảnh QR thành công (Happy Path)**
  * **Given** Chủ Studio sở hữu `agency_id = 1`, `agency_code = "AG00105"`.
  * **When** Gửi request `POST /api/v1/agencies/invitations`:
    ```json
    {
      "expireHours": 72,
      "note": "Mời thợ tham gia đội ngũ Mùa Cưới 2026",
      "proposedCommissionRate": 30.00
    }
    ```
  * **Then** Backend tạo mã mời chuẩn bảo mật: `INV-AG00105-9X8K2M`.
  * **And** Lưu đối tượng mời vào Redis với key `agency:invitation:INV-AG00105-9X8K2M` kèm TTL 72 giờ (`259200s`).
  * **And** Thêm mã vào Redis Set `agency:1:invitations`.
  * **And** Tạo Deep Link `https://app.makeup.vn/join?code=INV-AG00105-9X8K2M` và sinh ảnh QR Base64.
  * **And** Trả về HTTP `201 CREATED` kèm `inviteCode`, `qrCodeBase64`, `inviteUrl`, `expiresAt`.

* **Scenario 02: Thợ Make-up quét mã QR nộp đơn xin gia nhập Studio (PENDING Approval)**
  * **Given** Thợ make-up `mua_id = 25` (tài khoản `ROLE_FREELANCE_MUA`) đã đăng nhập.
  * **When** Gửi request `POST /api/v1/agencies/invitations/accept`:
    ```json
    {
      "inviteCode": "INV-AG00105-9X8K2M"
    }
    ```
  * **Then** Backend đọc thông tin mã từ Redis `agency:invitation:INV-AG00105-9X8K2M`.
  * **And** Kiểm tra thợ này chưa là nhân viên đang hoạt động hoặc đang chờ duyệt của Studio.
  * **And** Tạo bản ghi mới trong bảng `agency_schema.agency_staff`:
    - `agency_id = 1`, `mua_id = 25`
    - `agreed_commission_rate = 30.00` (theo `proposedCommissionRate` trong mã mời làm mức đề xuất)
    - `is_active = false`, `status = 'PENDING'`
    - `note = "Chờ duyệt - Nộp đơn xin gia nhập qua mã mời"`
    - `joined_at = NOW()`
  * **And** Xóa mã mời khỏi Redis để mã không thể sử dụng lại lần 2.
  * **And** Trả về HTTP `200 OK` với trạng thái `PENDING`, chờ Chủ Studio xét duyệt.

* **Scenario 03: Thợ quét mã mời đã hết hạn hoặc không tồn tại**
  * **When** Thợ gửi mã đã hết hạn trong Redis hoặc mã sai định dạng.
  * **Then** Backend không tìm thấy key trong Redis.
  * **And** Ném `ResourceNotFoundException` với mã lỗi `ERR_INVITATION_NOT_FOUND` hoặc `ERR_INVITATION_EXPIRED`, trả về HTTP `400 BAD_REQUEST`.

* **Scenario 04: Chủ Studio chủ động hủy mã mời trước thời hạn**
  * **When** Chủ Studio gọi `DELETE /api/v1/agencies/invitations/INV-AG00105-9X8K2M`.
  * **Then** Backend xóa key khỏi Redis và xóa khỏi Set của Studio.
  * **And** Trả về HTTP `200 OK`.

---

### **US-AGC-03: Phê duyệt Nhân sự & Đàm phán Tỷ lệ Hoa hồng Riêng (`ISSUE-12.2`, `ISSUE-12.3`)**
> **As an** Chủ Studio (`ROLE_AGENCY_ADMIN`),  
> **I want to** xem danh sách đơn xin gia nhập đang chờ duyệt, phê duyệt (APPROVE) hoặc từ chối (REJECT) thợ và điều chỉnh tỷ lệ hoa hồng riêng,  
> **So that** Studio chủ động tuyển chọn thợ phù hợp và thiết lập mức thù lao minh bạch.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Chủ Studio phê duyệt đơn xin gia nhập của thợ (APPROVE)**
  * **Given** Thợ `staff_id = 101` đang ở trạng thái `status = 'PENDING'`, `is_active = false`.
  * **When** Chủ Studio gửi request `PUT /api/v1/agencies/staff/101/review`:
    ```json
    {
      "decision": "APPROVE",
      "agreedCommissionRate": 35.00,
      "note": "Hồ sơ tay nghề đạt chuẩn, duyệt tham gia đội ngũ"
    }
    ```
  * **Then** Backend cập nhật `agency_staff`: `status = 'ACTIVE'`, `is_active = true`, `agreed_commission_rate = 35.00`.
  * **And** Trả về HTTP `200 OK`. Thợ chính thức được xếp vào danh sách trực chiến của Studio.

* **Scenario 02: Chủ Studio từ chối đơn xin gia nhập của thợ (REJECT)**
  * **When** Chủ Studio gửi request `PUT /api/v1/agencies/staff/101/review`:
    ```json
    {
      "decision": "REJECT",
      "note": "Chưa phù hợp với định hướng phong cách hiện tại của Studio"
    }
    ```
  * **Then** Backend cập nhật `agency_staff`: `status = 'REJECTED'`, `is_active = false`.
  * **And** Trả về HTTP `200 OK`.

* **Scenario 03: Đàm phán & Cập nhật % Hoa hồng riêng cho thợ (`ISSUE-12.3`) (Happy Path)**
  * **Given** Thợ `staff_id = 101` đang hoạt động trong Studio (`status = 'ACTIVE'`).
  * **When** Chủ Studio gửi request `PUT /api/v1/agencies/staff/101/commission`:
    ```json
    {
      "agreedCommissionRate": 35.00
    }
    ```
  * **Then** Backend kiểm tra `0.00 <= agreedCommissionRate <= 100.00`.
  * **And** Cập nhật `agreed_commission_rate = 35.00` trong bảng `agency_schema.agency_staff`.
  * **And** Kể từ thời điểm này, mọi đơn đặt lịch giao cho thợ 101 sẽ tính Studio giữ 35%, thợ nhận 65%.
  * **And** Trả về HTTP `200 OK`.

* **Scenario 04: Cập nhật trạng thái làm việc của thợ (Tạm ngưng / Thôi việc)**
  * **When** Chủ Studio gửi request `PUT /api/v1/agencies/staff/101/status`:
    ```json
    {
      "status": "SUSPENDED",
      "note": "Tạm ngưng nhận lịch 2 tuần do việc gia đình"
    }
    ```
  * **Then** Backend cập nhật `agency_staff`: `status = 'SUSPENDED'`, `is_active = false`.
  * **And** Trả về HTTP `200 OK`.

* **Scenario 05: Xóa thợ khỏi Studio (Staff Offboarding)**
  * **When** Chủ Studio gửi `DELETE /api/v1/agencies/staff/101`.
  * **Then** Bản ghi `agency_staff` được cập nhật `status = 'LEFT'`, `is_active = false`.
  * **And** Thợ không còn xuất hiện trong danh sách trực chiến của Studio.

* **Scenario 04: Bảo mật Phân quyền (Không cấp nhầm Role Quản trị cho Thợ)**
  * **Then** Thợ trang điểm sau khi gia nhập Studio **vẫn giữ vai trò `ROLE_FREELANCE_MUA`**.
  * **And** Hệ thống **KHÔNG** gán `ROLE_AGENCY_STAFF` cho thợ, ngăn chặn thợ can thiệp vào quyền xếp lịch và quản lý thợ khác.

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
  * **Then** Backend xóa các mapping cũ và lưu các bản ghi mới vào bảng `agency_schema.agency_staff_styles`.
  * **And** Trả về HTTP `200 OK` kèm danh sách chi tiết các phong cách vừa cập nhật.

---

### **US-AGC-05: Lập Lịch Ca làm việc Cố định & Theo dõi Ma trận Tuần (`ISSUE-12.5`)**
> **As an** Chủ Studio hoặc Quản lý Studio (`ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`),  
> **I want to** xếp ca làm việc cố định theo tuần cho thợ và xem bảng ma trận lịch trực tổng thể của Studio,  
> **So that** Studio luôn chủ động nhân sự trực chiến, tránh nhận trùng lịch và quản lý ca làm minh bạch.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Xếp ca làm việc cố định cho thợ thành công (Happy Path)**
  * **Given** Thợ `staff_id = 101` đang hoạt động (`status = 'ACTIVE'`).
  * **When** Gửi request `POST /api/v1/agencies/shifts`:
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
  * **Then** Backend kiểm tra không có xung đột giờ với ca làm khác của cùng thợ trong ngày Thứ Hai (`(startA < endB) AND (endA > startB)`).
  * **And** Lưu bản ghi vào bảng `agency_schema.agency_staff_shifts`.
  * **And** Trả về HTTP `201 CREATED`.

* **Scenario 02: Xem Ma trận Lịch Ca Toàn Studio theo tuần (Weekly Shift Matrix)**
  * **When** Gọi API `GET /api/v1/agencies/shifts/matrix`.
  * **Then** Trả về HTTP `200 OK` nhóm theo 7 ngày trong tuần, mỗi ngày có danh sách thợ trực và khung giờ ca làm.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI

Tất cả các lỗi nghiệp vụ và lỗi xác thực đều tuân thủ định dạng Envelope chuẩn `ApiResponse` do `GlobalExceptionHandler` trả về:

```json
{
  "success": false,
  "code": "ERR_AGENCY_NOT_FOUND",
  "message": "Không tìm thấy thông tin Studio gắn với tài khoản hiện tại",
  "data": null,
  "timestamp": "2026-09-14T15:20:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Chuẩn Hóa Phân hệ Agency Management

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_VALIDATION` | Vi phạm Bean Validation (`agencyName` trống, hotline sai, hoa hồng ngoài khoảng 0–100). | Trả về chi tiết lỗi từng trường vi phạm. |
| **`400 BAD_REQUEST`** | `ERR_INVITATION_EXPIRED` | Mã mời đã hết thời hạn TTL trong Redis. | Thông báo mã mời đã hết hạn, yêu cầu Studio tạo mã mới. |
| **`400 BAD_REQUEST`** | `ERR_INVITATION_ALREADY_USED` | Mã mời đã được thợ khác sử dụng hoặc đã bị hủy. | Chặn đăng ký, báo mã mời không còn hiệu lực. |
| **`400 BAD_REQUEST`** | `ERR_STAFF_ALREADY_EXISTS` | Thợ này đã là nhân sự đang hoạt động của Studio. | Chặn gửi yêu cầu trùng lặp, báo thợ đã là thành viên. |
| **`401 UNAUTHORIZED`** | `ERR_TOKEN_INVALID` | Token JWT thiếu hoặc hết hạn khi gọi API. | Spring Security chặn ở tầng Filter. |
| **`403 FORBIDDEN`** | `ERR_AGENCY_ACCESS_DENIED` | Không có quyền `ROLE_AGENCY_ADMIN` hoặc sửa thông tin Studio khác (IDOR). | Kiểm tra `agency.owner_id == currentUser.id`. |
| **`404 NOT_FOUND`** | `ERR_AGENCY_NOT_FOUND` | Không tìm thấy hồ sơ Studio gắn với User ID hiện tại. | Ném `ResourceNotFoundException`. |
| **`404 NOT_FOUND`** | `ERR_STAFF_NOT_FOUND` | Không tìm thấy nhân sự thợ (`staffId`) trong Studio. | Ném `ResourceNotFoundException`. |
| **`404 NOT_FOUND`** | `ERR_INVITATION_NOT_FOUND` | Mã mời không tồn tại trong Redis. | Báo mã mời không hợp lệ hoặc đã hết hạn. |
| **`404 NOT_FOUND`** | `ERR_STYLE_NOT_FOUND` | Phong cách make-up truyền vào không tồn tại trong danh mục sàn. | Kiểm tra tồn tại trong bảng `catalog_schema.makeup_styles`. |
| **`409 CONFLICT`** | `ERR_SHIFT_OVERLAPPING` | Ca làm việc mới bị trùng giờ với ca làm đã có của thợ trong ngày. | Chặn lưu DB và trả về thông tin ca bị xung đột. |

---

## 💻 5. ĐẶC TẢ REST API ENDPOINTS

---

### 5.1. `GET /api/v1/agencies/profile` (Xem Hồ sơ Studio Của Tôi)
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
    "agencyCode": "AG00105",
    "agencyName": "Glamour Bridal Luxury Studio",
    "logoUrl": "https://cdn.makeup.vn/logos/glamour.png",
    "hotline": "02838383838",
    "addressStreet": "Số 88 Đồng Khởi, Phường Bến Nghé",
    "district": "Quận 1",
    "city": "Hồ Chí Minh",
    "commissionRateInternal": 25.00,
    "isVerified": true,
    "ratingAvg": 4.95,
    "createdAt": "2026-09-01T08:00:00Z"
  },
  "timestamp": "2026-09-14T15:20:00Z"
}
```

---

### 5.2. `PUT /api/v1/agencies/profile` (Cập nhật Thông tin Cơ sở Studio)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "agencyName": "Glamour Bridal Luxury Studio",
  "hotline": "02838383838",
  "addressStreet": "Số 88 Đồng Khởi, Phường Bến Nghé",
  "district": "Quận 1",
  "city": "Hồ Chí Minh",
  "logoUrl": "https://cdn.makeup.vn/logos/glamour.png"
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
    "hotline": "02838383838",
    "addressStreet": "Số 88 Đồng Khởi, Phường Bến Nghé",
    "district": "Quận 1",
    "city": "Hồ Chí Minh",
    "logoUrl": "https://cdn.makeup.vn/logos/glamour.png"
  },
  "timestamp": "2026-09-14T15:21:00Z"
}
```

---

### 5.3. `PUT /api/v1/agencies/commission` (Cập nhật Hoa hồng Mặc định của Studio)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Request Body:**
```json
{
  "commissionRateInternal": 25.00
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Cập nhật hoa hồng nội bộ mặc định thành công",
  "data": {
    "id": 1,
    "commissionRateInternal": 25.00
  },
  "timestamp": "2026-09-14T15:22:00Z"
}
```

---

### 5.4. `POST /api/v1/agencies/invitations` (Sinh Mã & Ảnh QR Mời Thợ Lưu Redis - `ISSUE-12.1`)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "expireHours": 72,
  "note": "Mời thợ tham gia đội ngũ Make-up Mùa Cưới 2026",
  "proposedCommissionRate": 30.00
}
```
* **Response `201 CREATED`:**
```json
{
  "success": true,
  "code": "201",
  "message": "Tạo mã mời và sinh mã QR thành công!",
  "data": {
    "inviteCode": "INV-AG00105-9X8K2M",
    "agencyId": 1,
    "agencyName": "Glamour Bridal Luxury Studio",
    "proposedCommissionRate": 30.00,
    "note": "Mời thợ tham gia đội ngũ Make-up Mùa Cưới 2026",
    "inviteUrl": "https://app.makeup.vn/join?code=INV-AG00105-9X8K2M",
    "qrCodeBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICA...",
    "expiresAt": "2026-09-17T15:23:00Z"
  },
  "timestamp": "2026-09-14T15:23:00Z"
}
```

---

### 5.5. `GET /api/v1/agencies/invitations` (Xem Danh sách Mã Mời Đang Mở Trong Redis)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Lấy danh sách mã mời thành công",
  "data": [
    {
      "inviteCode": "INV-AG00105-9X8K2M",
      "proposedCommissionRate": 30.00,
      "note": "Mời thợ tham gia đội ngũ Make-up Mùa Cưới 2026",
      "inviteUrl": "https://app.makeup.vn/join?code=INV-AG00105-9X8K2M",
      "expiresAt": "2026-09-17T15:23:00Z"
    }
  ],
  "timestamp": "2026-09-14T15:24:00Z"
}
```

---

### 5.6. `DELETE /api/v1/agencies/invitations/{inviteCode}` (Hủy Mã Mời Khỏi Redis)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Hủy mã mời thành công",
  "data": null,
  "timestamp": "2026-09-14T15:25:00Z"
}
```

---

### 5.7. `POST /api/v1/agencies/invitations/accept` (Thợ Quét QR / Nhập Mã Nộp Đơn Gia Nhập Studio)
* **Quyền hạn:** `ROLE_FREELANCE_MUA`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "inviteCode": "INV-AG00105-9X8K2M"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Nộp đơn xin gia nhập Studio thành công! Vui lòng chờ Studio xét duyệt.",
  "data": {
    "staffId": 101,
    "agencyId": 1,
    "agencyName": "Glamour Bridal Luxury Studio",
    "muaId": 25,
    "fullName": "Trần Thanh Tâm",
    "agreedCommissionRate": 30.00,
    "isActive": false,
    "status": "PENDING",
    "joinedAt": "2026-09-14T15:26:00Z"
  },
  "timestamp": "2026-09-14T15:26:00Z"
}
```

---

### 5.8. `GET /api/v1/agencies/staff` (Danh sách Nhân sự Thợ của Studio - `ISSUE-12.2`)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_AGENCY_STAFF`.
* **Query Params:** `status=PENDING` (hoặc `ACTIVE`, `SUSPENDED`), `page=0`, `size=10`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Lấy danh sách nhân viên thành công",
  "data": {
    "content": [
      {
        "id": 101,
        "agencyId": 1,
        "muaId": 25,
        "fullName": "Trần Thanh Tâm",
        "phone": "0987654321",
        "avatarUrl": "https://cdn.makeup.vn/avatars/tam.jpg",
        "agreedCommissionRate": 30.00,
        "isActive": false,
        "status": "PENDING",
        "joinedAt": "2026-09-14T15:26:00Z"
      }
    ],
    "totalElements": 1,
    "totalPages": 1,
    "pageNumber": 0,
    "pageSize": 10
  },
  "timestamp": "2026-09-14T15:27:00Z"
}
```

---

### 5.9. `GET /api/v1/agencies/staff/{staffId}` (Xem Chi tiết Nhân sự Thợ)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_AGENCY_STAFF`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Lấy chi tiết nhân viên thành công",
  "data": {
    "id": 101,
    "agencyId": 1,
    "muaId": 25,
    "fullName": "Trần Thanh Tâm",
    "phone": "0987654321",
    "avatarUrl": "https://cdn.makeup.vn/avatars/tam.jpg",
    "agreedCommissionRate": 30.00,
    "isActive": false,
    "status": "PENDING",
    "note": "Chờ duyệt - Nộp đơn qua mã mời INV-AG00105-9X8K2M",
    "joinedAt": "2026-09-14T15:26:00Z"
  },
  "timestamp": "2026-09-14T15:28:00Z"
}
```

---

### 5.10. `PUT /api/v1/agencies/staff/{staffId}/review` (Phê Duyệt hoặc Từ Chối Đơn Gia Nhập - `ISSUE-12.2`)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "decision": "APPROVE",
  "agreedCommissionRate": 35.00,
  "note": "Tay nghề tốt, duyệt gia nhập đội ngũ"
}
```
*(Trường hợp từ chối: `"decision": "REJECT"`, `"note": "Lý do từ chối"`)*
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Phê duyệt nhân sự thành công!",
  "data": {
    "id": 101,
    "status": "ACTIVE",
    "isActive": true,
    "agreedCommissionRate": 35.00,
    "note": "Tay nghề tốt, duyệt gia nhập đội ngũ"
  },
  "timestamp": "2026-09-14T15:28:30Z"
}
```

---

### 5.11. `PUT /api/v1/agencies/staff/{staffId}/status` (Cập nhật Trạng thái Thợ: ACTIVE / SUSPENDED / LEFT)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Request Body:**
```json
{
  "status": "SUSPENDED",
  "note": "Tạm nghỉ 2 tuần do việc gia đình"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Cập nhật trạng thái nhân viên thành công",
  "data": {
    "id": 101,
    "status": "SUSPENDED",
    "isActive": false,
    "note": "Tạm nghỉ 2 tuần do việc gia đình"
  },
  "timestamp": "2026-09-14T15:29:00Z"
}
```

---

### 5.12. `PUT /api/v1/agencies/staff/{staffId}/commission` (Cấu hình % Hoa hồng Riêng cho Thợ - `ISSUE-12.3`)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "agreedCommissionRate": 35.00
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Cập nhật hoa hồng riêng cho thợ thành công",
  "data": {
    "id": 101,
    "muaId": 25,
    "agreedCommissionRate": 35.00,
    "status": "ACTIVE"
  },
  "timestamp": "2026-09-14T15:30:00Z"
}
```

---

### 5.13. `DELETE /api/v1/agencies/staff/{staffId}` (Xóa / Cho Thợ Rời Studio)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN`.
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "200",
  "message": "Xóa nhân viên khỏi Studio thành công",
  "data": null,
  "timestamp": "2026-09-14T15:31:00Z"
}
```

---

### 5.14. `PUT /api/v1/agencies/staff/{staffId}/styles` (Gán Phong Cách Make-up Cho Thợ - `ISSUE-12.4`)
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
  "timestamp": "2026-09-14T15:32:00Z"
}
```

---

### 5.15. `POST /api/v1/agencies/shifts` (Xếp Ca Làm Việc Cố Định - `ISSUE-12.5`)
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
  "timestamp": "2026-09-14T15:33:00Z"
}
```

---

### 5.16. `GET /api/v1/agencies/shifts/matrix` (Lấy Ma Trận Ca Làm Việc Tuần - `ISSUE-12.5`)
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
  "timestamp": "2026-09-14T15:34:00Z"
}
```

---

## 🗄️ 6. THIẾT KẾ CƠ SỞ DỮ LIỆU & DDL MIGRATION SQL

> [!NOTE]
> **Cơ chế lưu trữ mã mời:** Mã mời tham gia Studio (`agency:invitation:{inviteCode}`) được quản lý hoàn toàn trên **Redis In-Memory** với thời gian sống TTL (mặc định 72h). Vì vậy, hệ thống **không cần tạo bảng `agency_invitations` trong PostgreSQL**, giúp loại bỏ hoàn toàn dữ liệu rác hết hạn và tăng tốc độ xử lý nộp đơn gia nhập.

File migration Flyway: `src/main/resources/db/migration/V7__Agency_Staff_Management.sql`

```sql
-- =============================================================================
-- V7__Agency_Staff_Management.sql
-- Quản lý Nhân sự Studio (agency_staff) & Tự động cập nhật thời gian
-- =============================================================================

-- 1. BẢNG NHÂN VIÊN STUDIO (agency_staff)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    agreed_commission_rate DECIMAL(5, 2) CHECK (agreed_commission_rate >= 0.00 AND agreed_commission_rate <= 100.00), -- Cho phép NULL nếu áp dụng hoa hồng mặc định Studio
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT')),
    note TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (agency_id, mua_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_staff_agency ON agency_schema.agency_staff(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_staff_mua ON agency_schema.agency_staff(mua_id);

-- 2. TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at CHO agency_staff
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agency_staff_updated_at
    BEFORE UPDATE ON agency_schema.agency_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

File migration Flyway cho Sprint tiếp theo (12.4 & 12.5): `src/main/resources/db/migration/V8__Agency_Staff_Styles_And_Shifts.sql`

```sql
-- =============================================================================
-- V8__Agency_Staff_Styles_And_Shifts.sql
-- Quản lý Phong cách kỹ năng của Thợ & Ca làm việc cố định theo tuần
-- =============================================================================

-- 1. BẢNG GÁN PHONG CÁCH MAKE-UP CHO THỢ STUDIO (agency_staff_styles)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_styles (
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    style_id INT NOT NULL REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (staff_id, style_id)
);

-- 2. BẢNG XẾP CA LÀM VIỆC CỐ ĐỊNH THEO TUẦN (agency_staff_shifts)
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

CREATE INDEX IF NOT EXISTS idx_shifts_agency_day ON agency_schema.agency_staff_shifts(agency_id, day_of_week, is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON agency_schema.agency_staff_shifts(staff_id, day_of_week);
```

---

## 🎨 7. ĐẶC TẢ FRONTEND (REACT 18 + VITE + TAILWIND + ZOD)

### 7.1. Cấu trúc Thư mục Frontend (`code/frontend/src/`)
```text
code/frontend/src/
├── api/
│   └── agencyApi.js                       # Axios client gọi API /api/v1/agencies/*
├── schemas/
│   └── agencySchema.js                    # Zod schemas validate form Studio & Ca làm việc
├── store/
│   └── useAgencyStore.js                  # Zustand store quản lý State Studio, Staff, Shift Matrix
└── pages/
    └── agency/
        ├── AgencyProfilePage.jsx          # Cập nhật thông tin Studio & % hoa hồng mặc định
        ├── AgencyStaffListPage.jsx        # Danh sách thợ, Modal QR mời thợ (Redis) & Đổi hoa hồng
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
  logoUrl: z.string().url('Logo URL không hợp lệ').optional().or(z.literal('')),
});

export const updateCommissionSchema = z.object({
  commissionRateInternal: z.coerce
    .number()
    .min(0, 'Hoa hồng tối thiểu là 0%')
    .max(100, 'Hoa hồng tối đa là 100%'),
});

export const updateStaffCommissionSchema = z.object({
  agreedCommissionRate: z.coerce
    .number()
    .min(0, 'Hoa hồng tối thiểu là 0%')
    .max(100, 'Hoa hồng tối đa là 100%'),
});
```

### 7.3. Trải nghiệm Người dùng (Luxury Beauty & Glamour UX/UI)
* **Modal Mã QR Mời Thợ (Invitation QR Lightbox)**:
  - Sinh mã mời lưu vào Redis với TTL 72h. Hiển thị QR Code Base64 rõ nét kích thước 300x300, nút **"Sao chép Link"** và **"Tải ảnh QR"**.
  - Hiển thị đồng hồ đếm ngược thời gian hết hạn (`72:00:00` $\rightarrow$ `00:00:00`).
* **Quản lý Hoa hồng Cá nhân hóa (Staff Commission Slider / Input)**:
  - Trên hàng danh sách thợ, có nút bấm nhanh để chỉnh % hoa hồng thỏa thuận (`agreedCommissionRate`).
  - Nếu thợ chưa thiết lập tỷ lệ riêng, hiển thị nhãn badge *"Theo Studio (25%)"*.
