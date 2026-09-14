# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐIỀU PHỐI ĐƠN STUDIO (DISPATCHING ENGINE), MA TRẬN GÁN THỢ & ĐỔI THỢ DỰ PHÒNG
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schema: `agency_schema` & `booking_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Agency Dispatching Engine, Staff Assignment Matrix & Emergency Reassignment`
* **Mã Jira Issues phụ trách (Sprint 3):**
  * `ISSUE-19.1`: **User Story** - Agency Dispatching Engine - Tiếp nhận đơn đặt chỉ định Studio (`PENDING_AGENCY_DISPATCH`).
  * `ISSUE-19.2`: **Task** - UI Ma trận Lịch rảnh & Gán Thợ chính / Thợ phụ cho ca trên Web Studio (`agency_staff_services` & `agency_staff_styles`).
  * `ISSUE-19.3`: **Task** - Tính năng Đổi Thợ dự phòng khi Thợ chính báo bận đột xuất trên Web Studio Portal.
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Động cơ Ma trận Lọc Năng lực & Lịch rảnh (3-Way Dispatching Matrix):** Đối chiếu đồng thời 3 điều kiện tiên quyết trước khi cho phép gán ca:
    1. Thợ trực thuộc có chứng chỉ năng lực Gói Dịch vụ của Studio (`agency_schema.agency_staff_services.is_qualified = true`).
    2. Thợ có kỹ năng phong cách make-up (Tone) khách yêu cầu (`agency_schema.agency_staff_styles.is_qualified = true`).
    3. Thợ không bị trùng lịch làm việc hoặc ca bận cá nhân trong `booking_schema.mua_calendars`.
  * **Cơ chế Điều phối Đa Nhân sự (Multi-Staff Assignment):** Hỗ trợ gán linh hoạt **1 Thợ chính (`PRIMARY_MUA`)** phụ trách trang điểm mặt và **1–2 Thợ phụ (`ASSISTANT_MUA`)** phụ trách làm tóc, dán mi, cài hoa cưới.
  * **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`booking_schema.bookings`, `booking_schema.booking_staff_assignments`, `agency_schema.agency_staff`, `agency_schema.agency_staff_services`, `agency_schema.agency_staff_styles`, `booking_schema.mua_calendars`).
* **Đối tượng Sử dụng (User Personas):**
  1. **Agency Owner / Studio Admin (`ROLE_AGENCY_ADMIN`) & Receptionist (`ROLE_AGENCY_STAFF`):**
     * Tiếp nhận đơn hàng do khách đặt trực tiếp cho Studio trên Web Studio Portal.
     * Sử dụng Ma trận Lịch rảnh trực quan để phân công thợ chính / thợ phụ phù hợp nhất với phong cách khách yêu cầu.
     * Xử lý tình huống khẩn cấp khi thợ chính báo bận đột xuất: Chọn thợ dự phòng thay thế chỉ với 1 cú click chuột mà không làm gián đoạn lịch hẹn của khách.
  2. **Studio Staff MUA (Thợ trang điểm trực thuộc Studio):**
     * Nhận thông báo ca làm được Studio phân công trên Mobile App.
     * Được quyền bấm xác nhận nhận ca hoặc báo bận đột xuất (kèm lý do chính đáng) trước giờ hẹn $\ge 4\text{ tiếng}$.
  3. **Customer (Khách hàng đặt ca của Studio):**
     * Được phục vụ bởi đội ngũ chuyên nghiệp có sự bảo chứng uy tín từ Studio.
     * Được thông báo rõ ràng thông tin Thợ chính và Thợ phụ phụ trách ca làm; được tự động cập nhật thông tin nếu Studio đổi thợ dự phòng.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Mã nguồn phân hệ Agency Dispatching được tổ chức tại `code/backend/core-api/src/main/java/com/makeup/platform/`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # ok, created, error
│   │   └── ApiResponse.java                   # Envelope: {success, code, message, data, timestamp}
│   ├── constants/
│   │   ├── DispatchConstants.java             # EMERGENCY_REASSIGN_BUFFER_HOURS (4h), MAX_ASSISTANTS_PER_BOOKING (2)
│   │   └── ErrorCodes.java                    # ERR_STAFF_NOT_QUALIFIED, ERR_EMERGENCY_REASSIGNMENT_FAILED
│   └── exception/
│       ├── StaffQualificationException.java   # Lỗi gán thợ không đủ điều kiện chuyên môn
│       └── DispatchException.java             # Lỗi nghiệp vụ điều phối studio
│
├── controller/
│   └── agency/
│       ├── AgencyDispatchController.java      # /api/v1/agency/dispatch/pending-bookings, /reject
│       ├── AgencyStaffMatrixController.java   # /api/v1/agency/dispatch/bookings/{id}/staff-matrix
│       ├── AgencyAssignmentController.java    # /api/v1/agency/dispatch/bookings/{id}/assign
│       └── AgencyEmergencyController.java     # /api/v1/agency/dispatch/bookings/{id}/reassign & /report-busy
│
├── dto/
│   ├── request/agency/
│   │   ├── AssignStaffToBookingReq.java       # primaryStaffId, assistantStaffIds, dispatchNotes
│   │   ├── ReassignStaffReq.java              # oldStaffId, newStaffId, reassignmentReason
│   │   ├── RejectDispatchBookingReq.java      # rejectionReason, rejectionNote
│   │   └── ReportEmergencyBusyReq.java        # emergencyReason, proofDocumentUrl
│   └── response/agency/
│       ├── AgencyPendingBookingRes.java       # bookingId, customerName, package, styles, totalAmount, commission
│       ├── StaffAvailabilityMatrixRes.java    # Danh sách thợ studio kèm chỉ số: rảnh/bận, qualifiedPackage, qualifiedStyle
│       ├── DispatchAssignmentRes.java         # bookingId, primaryMua, assistants, status
│       └── EmergencyReassignmentRes.java      # bookingId, previousStaff, newStaff, customerNotified
│
├── entity/
│   ├── agency/
│   │   ├── AgencyStaffEntity.java             # table: agency_schema.agency_staff
│   │   ├── AgencyStaffServiceEntity.java      # table: agency_schema.agency_staff_services
│   │   └── AgencyStaffStyleEntity.java        # table: agency_schema.agency_staff_styles
│   └── booking/
│       ├── BookingEntity.java                 # table: booking_schema.bookings
│       └── BookingStaffAssignmentEntity.java  # table: booking_schema.booking_staff_assignments
│
├── repository/
│   ├── agency/
│   │   ├── AgencyStaffRepository.java
│   │   ├── AgencyStaffServiceRepository.java  # checkStaffQualifiedForPackage
│   │   └── AgencyStaffStyleRepository.java    # checkStaffQualifiedForStyle
│   └── booking/
│       ├── BookingRepository.java             # findPendingDispatchBookingsByAgencyId
│       └── BookingStaffAssignmentRepository.java # findByBookingId, deleteByBookingIdAndStaffId
│
├── event/
│   ├── BookingStaffAssignedEvent.java         # Bắn thông báo mời thợ nhận ca
│   ├── EmergencyReassignmentRequestedEvent.java # Báo chuông đỏ trên Web Studio khi thợ báo bận
│   └── BookingStaffReassignedEvent.java       # Thông báo cập nhật thợ mới cho khách hàng
│
└── service/
    └── agency/
        ├── AgencyDispatchService.java         # Quản lý tiếp nhận / từ chối đơn hàng gửi tới Studio
        ├── StaffAssignmentMatrixService.java  # Tính toán ma trận thợ đủ năng lực & gán thợ chính/phụ
        └── EmergencyReassignmentService.java  # Quy trình đổi thợ dự phòng khi có sự cố khẩn cấp
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-DISP-01: Tiếp Nhận & Phê Duyệt Đơn Đặt Chỉ Định Studio (`ISSUE-19.1`)**
> **As a** Chủ Studio / Đại lý (`ROLE_AGENCY_ADMIN`) hoặc Lễ tân điều phối (`ROLE_AGENCY_STAFF`),  
> **I want to** xem danh sách các đơn hàng do khách đặt chỉ định cho Studio của tôi và bấm tiếp nhận điều phối hoặc từ chối,  
> **So that** Studio chủ động quản lý công suất phục vụ và doanh thu của cơ sở.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Studio tiếp nhận đơn đặt chỉ định thành công (Happy Path)**
  * **Given** Khách hàng đặt đơn hẹn trước chỉ định Studio Áo Cưới Dạ Yến (`agency_id = 12`).
  * **And** Đơn hàng `booking_id = 720` đang ở trạng thái `PENDING_AGENCY_DISPATCH`.
  * **When** Lễ tân Studio đăng nhập vào Web Studio Portal và xem danh sách đơn chờ điều phối tại `GET /api/v1/agency/dispatch/pending-bookings`.
  * **Then** Hệ thống trả về thông tin bóc tách chi tiết:
    - Khách hàng: Nguyễn Thanh Trúc - SĐT: `0908***123`
    - Gói dịch vụ: Make-up Cô dâu Hoàng Gia ($3,500,000\text{ đ}$)
    - Phong cách yêu cầu: Tone Thái Sang Trọng (`style_id = 2`)
    - Thời gian hẹn: 06:00 sáng ngày 15/11/2026 tại Khách sạn Rex, Q.1.
    - Doanh thu Studio dự kiến: $2,800,000\text{ đ}$ (sau khi trừ $20\%$ hoa hồng sàn).
  * **And** Studio bấm nút **[Bắt đầu Điều phối Thợ]** $\rightarrow$ Chuyển sang màn hình Ma trận Gán Thợ.

* **Scenario 02: Studio từ chối đơn do toàn bộ thợ kín lịch (Reject Booking)**
  * **Given** Vào ngày 15/11/2026 Studio đã nhận tối đa 10 ca cưới, không còn nhân sự trống.
  * **When** Studio Admin gửi request `POST /api/v1/agency/dispatch/bookings/720/reject`:
    ```json
    {
      "rejection_reason": "STUDIO_FULLY_BOOKED",
      "rejection_note": "Toàn bộ chuyên viên trang điểm của Studio đã kín lịch trong ngày cưới cao điểm 15/11. Rất mong quý khách thông cảm!"
    }
    ```
  * **Then** Backend cập nhật trạng thái đơn sang `CANCELLED`.
  * **And** Kích hoạt `WalletEscrowService.refundDeposit(720)`: Tự động hoàn lại $100\%$ tiền cọc ($1,050,000\text{ đ}$) vào ví khách hàng ngay lập tức.
  * **And** Gửi thông báo kèm lời xin lỗi và lý do từ chối đến tài khoản của Khách hàng.

* **Scenario 03: Chặn Studio khác can thiệp vào đơn chỉ định (IDOR Prevention)**
  * **Given** Đơn `booking_id = 720` được đặt cho Studio A (`agency_id = 12`).
  * **When** Studio B (`agency_id = 99`) cố tình gửi request tiếp nhận hoặc từ chối đơn 720.
  * **Then** Backend phát hiện `booking.agency_id != current_user.agency_id`.
  * **And** Ném ngoại lệ `AccessDeniedException` với mã lỗi `ERR_BOOKING_NOT_ASSIGNED_TO_AGENCY`, trả về HTTP `403 FORBIDDEN`.

---

### **US-DISP-02: Ma Trận Lịch Rảnh & Gán Thợ Chính / Thợ Phụ Theo Năng Lực (`ISSUE-19.2`)**
> **As a** Quản trị viên Điều phối Studio,  
> **I want** hệ thống hiển thị bảng ma trận đối soát năng lực và lịch rảnh của toàn bộ thợ trực thuộc,  
> **So that** tôi chỉ gán các thợ có đủ kỹ năng gói và phong cách make-up mà khách đã chọn, đảm bảo chất lượng dịch vụ cao nhất.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Ma trận tự động phân loại thợ Đủ điều kiện vs Không đủ điều kiện**
  * **Given** Đơn hàng 720 yêu cầu Gói Make-up Cô dâu (`package_id = 15`) và Phong cách Tone Thái (`style_id = 2`).
  * **When** Studio mở API `GET /api/v1/agency/dispatch/bookings/720/staff-matrix`.
  * **Then** Backend phân tích danh sách thợ thuộc Studio:
    * **Thợ 1 (Mai Anh):** Đã qua đào tạo Gói 15 (`is_qualified = true`), Có chứng chỉ Tone Thái (`true`), Không trùng lịch trong `mua_calendars` $\implies$ **Đủ điều kiện làm Thợ chính (RECOMMENDED)**.
    * **Thợ 2 (Lan Phương):** Đã qua đào tạo Gói 15 (`true`), Chưa thi chứng chỉ Tone Thái (`false`) $\implies$ **Chỉ đủ điều kiện làm Thợ phụ (ASSISTANT ONLY)**.
    * **Thợ 3 (Hồng Nhung):** Bị trùng lịch ca khác từ 05:30 - 08:00 cùng ngày $\implies$ **Bị khóa (BUSY - DISABLED)**.
  * **And** Ma trận hiển thị rõ ràng trực quan bằng các nhãn màu (Xanh lá / Vàng / Xám).

* **Scenario 02: Gán 1 Thợ chính và 1 Thợ phụ thành công (Happy Path)**
  * **When** Studio Admin chọn:
    - Thợ chính: `staff_id = 101` (Mai Anh - `PRIMARY_MUA`)
    - Thợ phụ: `staff_id = 105` (Lan Phương - `ASSISTANT_MUA`)
  * **And** Gửi request `POST /api/v1/agency/dispatch/bookings/720/assign`:
    ```json
    {
      "primary_staff_id": 101,
      "assistant_staff_ids": [105],
      "dispatch_notes": "Yêu cầu thợ có mặt đúng 05:45 tại sảnh lễ tân Sheraton"
    }
    ```
  * **Then** Backend lưu 2 bản ghi vào `booking_schema.booking_staff_assignments`.
  * **And** Tự động tạo 2 bản ghi khóa lịch bận trong `booking_schema.mua_calendars` cho cả Mai Anh và Lan Phương.
  * **And** Chuyển trạng thái đơn hàng sang `AGENCY_ASSIGNED`.
  * **And** Bắn thông báo In-App Toast & Push Notification đến máy của 2 thợ để yêu cầu xác nhận.

* **Scenario 03: Chặn gán thợ không đủ năng lực phong cách make-up của khách**
  * **When** Studio cố tình chọn Thợ 2 (Lan Phương) làm Thợ chính cho đơn yêu cầu Tone Thái (trong khi Lan Phương chưa đạt chứng chỉ này).
  * **Then** Backend chặn lại và ném `StaffQualificationException` với mã lỗi `ERR_STAFF_NOT_QUALIFIED_FOR_STYLE`.
  * **And** Trả về HTTP `400 BAD_REQUEST`: `"Nhân viên Lan Phương chưa đạt chứng chỉ Phong cách Tone Thái. Không thể phân công làm Thợ chính cho đơn này!"`.

---

### **US-DISP-03: Tính Năng Đổi Thợ Dự Phòng Khi Thợ Chính Báo Bận Đột Xuất (`ISSUE-19.3`)**
> **As a** Chủ Studio / Quản trị viên Điều phối,  
> **I want** khi thợ được gán báo bận đột xuất (ốm sốt, sự cố gia đình), hệ thống rung chuông cảnh báo và hỗ trợ đổi thợ dự phòng ngay lập tức,  
> **So that** ca làm của khách luôn được đảm bảo thực hiện đúng hẹn, bảo vệ uy tín thương hiệu của Studio.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Thợ chính báo bận đột xuất hợp lệ trước ca làm $\ge 4$ tiếng**
  * **Given** Thợ chính Mai Anh (`staff_id = 101`) bị sốt xuất huyết trước giờ hẹn 8 tiếng.
  * **When** Mai Anh mở App và bấm "Báo bận khẩn cấp" qua API `POST /api/v1/freelancer/bookings/720/report-emergency-busy`:
    ```json
    {
      "emergency_reason": "SỐT_XUẤT_HUYẾT",
      "proof_document_url": "https://cdn.makeup.vn/proofs/medical_report_101.webp"
    }
    ```
  * **Then** Hệ thống giải phóng slot lịch bận của Mai Anh trong `mua_calendars`.
  * **And** Chuyển trạng thái đơn hàng về lại `PENDING_AGENCY_DISPATCH` kèm cờ `needs_emergency_reassignment = true`.
  * **And** Bắn WebSocket Alert phát chuông báo động đỏ trên Web Studio Portal của Chủ Studio.
  * **And** Khách hàng chưa bị thông báo hủy đơn, hệ thống hiển thị trạng thái: `"Studio đang chuẩn bị chuyên viên thay thế tốt nhất cho bạn"`.

* **Scenario 02: Studio thực hiện Đổi Thợ Dự Phòng thành công (Emergency Reassignment)**
  * **Given** Web Studio Portal nhận được cảnh báo đỏ cho đơn 720.
  * **When** Studio Admin bấm nút **[Đổi Thợ Dự Phòng]** và chọn Thợ dự phòng Ngọc Hân (`staff_id = 108` - có cùng chứng chỉ Gói 15 & Tone Thái, đang rảnh).
  * **And** Gửi request `POST /api/v1/agency/dispatch/bookings/720/reassign`:
    ```json
    {
      "old_staff_id": 101,
      "new_staff_id": 108,
      "reassignment_reason": "Thay thế chuyên viên Mai Anh do sốt nhập viện"
    }
    ```
  * **Then** Backend cập nhật `assigned_mua_id = 108` và ghi đè bản ghi trong `booking_staff_assignments`.
  * **And** Khóa lịch bận mới cho Ngọc Hân trong `mua_calendars`.
  * **And** Ghi log biến động vào `booking_history`: `"Đổi thợ chính từ Mai Anh sang Ngọc Hân"`.
  * **And** Gửi thông báo cập nhật hồ sơ chuyên viên mới (kèm ảnh, rating 4.96★) cho Khách hàng.
  * **And** Ca hẹn tiếp tục được giữ nguyên ngày giờ mà không bị hủy bỏ.

* **Scenario 03: Chặn thợ tự ý báo bận sát giờ ($< 2$ tiếng) mà không có xác nhận của Studio**
  * **When** Thợ báo bận khi chỉ còn 45 phút nữa là đến giờ hẹn khách.
  * **Then** Hệ thống chặn lại không cho thợ tự hủy trên App và ném lỗi `ERR_EMERGENCY_REPORT_TOO_LATE`.
  * **And** Yêu cầu thợ liên hệ trực tiếp hotline khẩn cấp của Studio để xử lý thủ công.

---

### **US-DISP-UI-01: Trải Nghiệm Ma Trận Điều Phối Trên Web Studio Portal (UI/UX Flow)**
> **As a** Lễ tân / Quản lý Studio sử dụng máy tính hoặc máy tính bảng,  
> **I want** giao diện Ma trận Lịch rảnh kéo thả hoặc nhấp chọn trực quan,  
> **So that** việc điều phối 20–50 thợ diễn ra trơn tru, không nhầm lẫn ca.

#### **Tiêu chí Nghiệm thu UI/UX:**
* **AC-01 (Bảng Ma trận Thợ - Grid Matrix View):**
  * Cột bên trái: Danh sách thợ Studio (Avatar, Tên, Cấp bậc: Senior MUA / Junior MUA).
  * Các cột thời gian: Từ 05:00 sáng đến 21:00 tối (chia theo từng block 30 phút).
  * Khung giờ có đơn chỉ định chớp sáng màu Vàng viền đứt đoạn: `[Cần Điều Phối: 06:00 - 08:30]`.
* **AC-02 (Bộ lọc Thông minh - Smart Filter):**
  * Tự động lọc sáng chỉ những thợ có biểu tượng tích xanh: `✔ Đủ Kỹ Năng Gói`, `✔ Đủ Tone Makeup`.
  * Các thợ đang bận hiển thị khối màu xám mờ kèm mã đơn hàng đang làm dở.
* **AC-03 (Nút Gán Nhanh & Modal Xác Nhận):**
  * Nhấp chọn Thợ A $\rightarrow$ Dropdown chọn vai trò: `[Thợ chính]` hoặc `[Thợ phụ]`.
  * Bấm nút `[Xác Nhận & Phát Ca]` $\rightarrow$ Hiển thị Modal tóm tắt phân chia hoa hồng nội bộ ước tính trước khi bấm gửi.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI BACK-END

Tất cả các lỗi nghiệp vụ được xử lý chuẩn hóa qua `GlobalExceptionHandler.java`:

```json
{
  "success": false,
  "code": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Thông điệp mô tả lỗi chi tiết cho Studio Portal",
  "errors": [],
  "timestamp": "2026-09-14T09:40:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Phân hệ Agency Dispatching

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_STAFF_NOT_QUALIFIED_FOR_PACKAGE` | Thợ được chọn chưa được cấp quyền thực hiện Gói Dịch vụ của Studio. | Chặn gán, yêu cầu chọn thợ có kỹ năng phù hợp trong `agency_staff_services`. |
| **`400 BAD_REQUEST`** | `ERR_STAFF_NOT_QUALIFIED_FOR_STYLE` | Thợ được chọn chưa có chứng chỉ Phong cách Make-up (Tone) theo yêu cầu đơn hàng. | Chặn phân công thợ chính, chỉ cho phép làm thợ phụ nếu cần. |
| **`400 BAD_REQUEST`** | `ERR_EMERGENCY_REPORT_TOO_LATE` | Thợ báo bận đột xuất khi thời gian còn lại trước ca làm $< 2\text{ tiếng}$. | Chặn tự hủy, yêu cầu thợ gọi hotline Studio can thiệp. |
| **`400 BAD_REQUEST`** | `ERR_DUPLICATE_STAFF_ASSIGNMENT` | Chọn cùng một thợ cho cả vai trò Thợ chính và Thợ phụ trong cùng 1 đơn. | Bean Validation chặn trùng lặp ID thợ. |
| **`403 FORBIDDEN`** | `ERR_BOOKING_NOT_ASSIGNED_TO_AGENCY` | Studio A cố tình truy cập hoặc điều phối đơn hàng thuộc về Studio B (Lỗ hổng IDOR). | Đối chiếu `current_user.agency_id == booking.agency_id`. |
| **`403 FORBIDDEN`** | `ERR_STAFF_NOT_IN_AGENCY` | Studio cố tình gán thợ tự do bên ngoài hoặc thợ thuộc Studio khác. | Đối chiếu `staff.agency_id == current_agency_id`. |
| **`409 CONFLICT`** | `ERR_STAFF_CALENDAR_BUSY` | Thợ được chọn đã có ca làm khác hoặc lịch bận cá nhân trùng giờ hẹn. | Kiểm tra `mua_calendars`, yêu cầu chọn thợ còn slot rảnh. |

---

### 4.2. Mã nguồn Validation DTO Mẫu (Bean Validation)

#### DTO Gán Thợ Cho Ca Làm: `AssignStaffToBookingReq.java`
```java
package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignStaffToBookingReq {

    @NotNull(message = "{dispatch.primary_staff_id.required}")
    private Long primaryStaffId; // ID Thợ chính bắt buộc phải có

    @Size(max = 2, message = "{dispatch.assistants.max_two}")
    private List<Long> assistantStaffIds; // Danh sách ID thợ phụ (tối đa 2 thợ phụ)

    @Size(max = 500, message = "{dispatch.notes.too_long}")
    private String dispatchNotes; // Dặn dò của Studio cho thợ khi đi làm
}
```

#### DTO Đổi Thợ Dự Phòng: `ReassignStaffReq.java`
```java
package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReassignStaffReq {

    @NotNull(message = "ID thợ cũ không được để trống")
    private Long oldStaffId;

    @NotNull(message = "ID thợ mới thay thế không được để trống")
    private Long newStaffId;

    @NotBlank(message = "Vui lòng nhập lý do đổi thợ dự phòng")
    @Size(max = 255, message = "Lý do đổi thợ tối đa 255 ký tự")
    private String reassignmentReason;
}
```

---

## 💻 5. ĐẶC TẢ REST API CONTRACTS

---

### 5.1. `GET /api/v1/agency/dispatch/pending-bookings` (Danh Sách Đơn Chờ Điều Phối)
* **Quyền truy cập:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_AGENCY_STAFF`.
* **Headers:** `Authorization: Bearer <JWT>`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "PENDING_DISPATCH_LIST_RETRIEVED",
  "message": "Lấy danh sách đơn chờ điều phối thành công",
  "data": [
    {
      "booking_id": 720,
      "booking_code": "BK-261115-REX",
      "status": "PENDING_AGENCY_DISPATCH",
      "booking_date": "2026-11-15",
      "start_time": "06:00:00",
      "estimated_duration_minutes": 120,
      "customer_info": {
        "full_name": "Nguyễn Thanh Trúc",
        "phone_number": "0908123456"
      },
      "destination_address": "Khách sạn Rex, Q.1, TP.HCM",
      "package_id": 15,
      "package_name": "Gói Make-up Cô dâu Hoàng Gia 2026",
      "requested_styles": [
        { "style_id": 2, "style_name": "Tone Thái Sang Trọng" }
      ],
      "financial_summary": {
        "total_amount": 3500000.00,
        "agency_expected_earnings": 2800000.00,
        "deposit_locked": 1050000.00
      },
      "needs_emergency_reassignment": false,
      "created_at": "2026-09-14T09:20:00Z"
    }
  ],
  "timestamp": "2026-09-14T09:40:00Z"
}
```

---

### 5.2. `GET /api/v1/agency/dispatch/bookings/{bookingId}/staff-matrix` (Ma Trận Năng Lực & Lịch Rảnh)
* **Mục đích:** Web Studio load dữ liệu để hiển thị bảng ma trận chọn thợ.
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "STAFF_MATRIX_RETRIEVED",
  "message": "Phân tích ma trận năng lực thợ thành công",
  "data": {
    "booking_id": 720,
    "required_package_id": 15,
    "required_style_id": 2,
    "schedule_window": "2026-11-15 06:00 - 08:30 (kèm 30m buffer)",
    "staff_matrix": [
      {
        "staff_id": 101,
        "full_name": "Trần Mai Anh",
        "avatar_url": "https://cdn.makeup.vn/avatars/maianh.webp",
        "title": "Senior Makeup Artist",
        "rating": 4.95,
        "is_qualified_package": true,
        "is_qualified_style": true,
        "is_calendar_free": true,
        "eligibility": "ELIGIBLE_PRIMARY", // Đủ điều kiện làm thợ chính
        "recommendation_badge": "TOP_MATCH"
      },
      {
        "staff_id": 105,
        "full_name": "Đặng Lan Phương",
        "avatar_url": "https://cdn.makeup.vn/avatars/lanphuong.webp",
        "title": "Junior Hairstylist",
        "rating": 4.82,
        "is_qualified_package": true,
        "is_qualified_style": false,
        "is_calendar_free": true,
        "eligibility": "ELIGIBLE_ASSISTANT_ONLY", // Chỉ được làm thợ phụ
        "recommendation_badge": null
      },
      {
        "staff_id": 109,
        "full_name": "Vũ Hồng Nhung",
        "avatar_url": "https://cdn.makeup.vn/avatars/hnhung.webp",
        "title": "Senior Makeup Artist",
        "rating": 4.90,
        "is_qualified_package": true,
        "is_qualified_style": true,
        "is_calendar_free": false,
        "eligibility": "BUSY", // Bị trùng ca
        "busy_reason": "Đã có ca làm: BK-261115-A1 (05:30 - 08:00)"
      }
    ]
  },
  "timestamp": "2026-09-14T09:40:01Z"
}
```

---

### 5.3. `POST /api/v1/agency/dispatch/bookings/{bookingId}/assign` (Gán Thợ Chính & Thợ Phụ)
* **Quyền truy cập:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_AGENCY_STAFF`.
* **Request Body:**
```json
{
  "primary_staff_id": 101,
  "assistant_staff_ids": [105],
  "dispatch_notes": "Yêu cầu thợ có mặt đúng 05:45 tại sảnh lễ tân Rex Hotel"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "STAFF_DISPATCHED_SUCCESSFULLY",
  "message": "Phân công thợ cho ca làm thành công! Đã gửi thông báo đến nhân sự.",
  "data": {
    "booking_id": 720,
    "status": "AGENCY_ASSIGNED",
    "primary_staff": {
      "staff_id": 101,
      "full_name": "Trần Mai Anh",
      "role": "PRIMARY_MUA"
    },
    "assistants": [
      {
        "staff_id": 105,
        "full_name": "Đặng Lan Phương",
        "role": "ASSISTANT_MUA"
      }
    ],
    "dispatched_at": "2026-09-14T09:40:02Z"
  },
  "timestamp": "2026-09-14T09:40:02Z"
}
```

---

### 5.4. `POST /api/v1/agency/dispatch/bookings/{bookingId}/reassign` (Đổi Thợ Dự Phòng Khẩn Cấp)
* **Mục đích:** Studio thay thế thợ khi có nhân sự báo bận đột xuất.
* **Request Body:**
```json
{
  "old_staff_id": 101,
  "new_staff_id": 108,
  "reassignment_reason": "Chuyên viên Mai Anh nhập viện sốt xuất huyết"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "STAFF_REASSIGNED_SUCCESSFULLY",
  "message": "Đổi chuyên viên dự phòng thành công! Đã cập nhật lịch và thông báo tới khách hàng.",
  "data": {
    "booking_id": 720,
    "previous_staff_name": "Trần Mai Anh",
    "new_assigned_staff": {
      "staff_id": 108,
      "full_name": "Nguyễn Ngọc Hân (Senior MUA)",
      "phone_number": "0988***456",
      "rating": 4.96
    },
    "customer_notified": true,
    "reassigned_at": "2026-09-14T09:40:03Z"
  },
  "timestamp": "2026-09-14T09:40:03Z"
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16)

```sql
-- 1. BẢNG PHÂN CÔNG NHÂN SỰ ĐIỀU PHỐI CHO ĐƠN HÀNG (MULTI-STAFF ASSIGNMENTS - ISSUE-19.2)
CREATE TABLE IF NOT EXISTS booking_schema.booking_staff_assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    assignment_role VARCHAR(30) NOT NULL CHECK (assignment_role IN ('PRIMARY_MUA', 'ASSISTANT_MUA')),
    dispatch_notes TEXT,
    is_confirmed_by_staff BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (booking_id, staff_id)
);

-- 2. BỔ SUNG CÁC TRƯỜNG PHỤC VỤ ĐIỀU PHỐI KHẨN CẤP TRÊN BẢNG BOOKINGS (ISSUE-19.3)
ALTER TABLE booking_schema.bookings 
    ADD COLUMN IF NOT EXISTS needs_emergency_reassignment BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS emergency_reason VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emergency_reported_at TIMESTAMP WITH TIME ZONE;

-- 3. CHỈ MỤC TỐI ƯU TRUY VẤN ĐIỀU PHỐI STUDIO
CREATE INDEX IF NOT EXISTS idx_booking_staff_assign 
    ON booking_schema.booking_staff_assignments(booking_id, staff_id, assignment_role);

CREATE INDEX IF NOT EXISTS idx_agency_pending_dispatch 
    ON booking_schema.bookings(agency_id, status) 
    WHERE status IN ('PENDING_AGENCY_DISPATCH', 'AGENCY_ASSIGNED');
```

---

## ⚡ 7. THUẬT TOÁN MA TRẬN ĐIỀU PHỐI & CƠ CHẾ ĐỔI THỢ KHẨN CẤP

```text
       [ Đơn Hàng Chỉ Định: Package ID = 15, Style ID = 2, Slot = 06:00-08:30 ]
                                         │
                                         ▼
                 [ Tập hợp toàn bộ Thợ thuộc Studio (Staff Pool) ]
                                         │
               ┌─────────────────────────┼─────────────────────────┐
               ▼                         ▼                         ▼
      (Kỹ năng Gói 15)           (Tone Make-up 2)             (Lịch Rảnh)
    agency_staff_services       agency_staff_styles          mua_calendars
   is_qualified = true ?       is_qualified = true ?     NOT overlap(06:00-08:30)
               │                         │                         │
               └─────────────────────────┼─────────────────────────┘
                                         │
                                         ▼
                          [ Phân Hạng Điều Kiện Nghiệp Vụ ]
            ├── Đủ cả 3 điều kiện  ──> ELIGIBLE_PRIMARY (Đủ chuẩn Thợ chính)
            ├── Thiếu Tone Make-up ──> ELIGIBLE_ASSISTANT_ONLY (Chỉ làm Thợ phụ)
            └── Trùng ca bận       ──> BUSY (Bị vô hiệu hóa)
```

### Quy Trình Xử Lý Đổi Thợ Dự Phòng Khẩn Cấp (`Emergency Reassignment Flow`):
1. **Thợ báo bận:** Hệ thống kiểm tra $T_{\text{start}} - \text{now} \ge 4\text{ giờ}$ $\rightarrow$ Hợp lệ $\rightarrow$ Xóa khóa lịch `mua_calendars` của thợ cũ.
2. **Cảnh báo Studio:** Bắn tin nhắn STOMP khẩn cấp tới Web Studio Portal: `{"type": "EMERGENCY_REASSIGNMENT_ALERT", "booking_id": 720}` $\rightarrow$ Bật popup chuông đỏ nhấp nháy.
3. **Thao tác 1-Click Reassign:** Studio chọn thợ dự phòng có cùng kỹ năng $\rightarrow$ Cập nhật bảng `booking_staff_assignments` và khóa lịch thợ mới trong cùng 1 Transaction `@Transactional`.
4. **Đồng bộ Khách hàng:** Gửi thông báo đến App Khách hàng với thông tin chuyên viên mới, đảm bảo trải nghiệm dịch vụ liền mạch không tì vết.

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Hiệu Năng Tính Toán Ma Trận Điều Phối (Matrix Computation Latency):**
   - API `GET /api/v1/agency/dispatch/bookings/{id}/staff-matrix` phải hoàn thành truy vấn đối chiếu 3 chiều cho Studio có quy mô lên đến 100 thợ trong thời gian **$< 30\text{ms}$**.
2. **Tính Nguyên Tử Giao Dịch Khi Đổi Thợ (Reassignment Atomicity):**
   - Thao tác đổi thợ dự phòng (xóa lịch thợ cũ, cập nhật `booking_staff_assignments`, khóa lịch thợ mới, ghi log `booking_history`) bắt buộc phải thực thi trong một **Database Transaction duy nhất (`@Transactional`)**. Nếu có bất kỳ bước nào thất bại, toàn bộ trạng thái cũ sẽ được rollback nguyên vẹn.
3. **Bảo Mật Phân Quyền Đa Đại Lý (Strict Multi-Tenancy Isolation):**
   - 100% các API điều phối bắt buộc phải đối chiếu `current_user.agency_id == booking.agency_id`. Tuyệt đối không để xảy ra rò rỉ danh sách nhân viên hoặc đơn hàng giữa các Studio đối thủ trên cùng một nền tảng.
