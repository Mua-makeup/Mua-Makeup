# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: MÁY TRẠNG THÁI ĐƠN HÀNG (STATE MACHINE), AUDIT LOG & REDLOCK
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schema: `booking_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Booking State Machine & Concurrency Control Engine`
* **Mã Jira Issues phụ trách (Sprint 3):**
  * `ISSUE-16.1`: **User Story** - Booking Engine - Máy trạng thái Đơn hàng (Booking State Machine tuần tự, nghiêm ngặt).
  * `ISSUE-16.2`: **Task** - Nhật ký Audit Log lịch sử biến động trạng thái đơn (`booking_schema.booking_history`).
  * `ISSUE-16.3`: **Task** - Tích hợp Redlock (Redis Distributed Lock qua Redisson) chống tranh chấp đơn hàng khẩn cấp (Race Condition Protection).
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Bộ máy Quản lý Trạng thái:** Mô hình Máy trạng thái hữu hạn (Finite State Machine - FSM) kết hợp Spring In-Memory EventBus (`ApplicationEventPublisher`) để tự động phát sự kiện chuyển trạng thái cho các phân hệ khác (Telemetry, WebSocket, Wallet, Notification).
  * **Kiểm soát Tranh chấp Phân tán (Distributed Locking):** Redis 7.x kết hợp thư viện **Redisson (`RLock`)** theo thuật toán **Redlock**, đảm bảo tính duy nhất (Single Winner) khi hàng chục thợ cùng bấm "Nhận đơn" đồng thời.
  * **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`makeup_platform_db`, schema: `booking_schema`, bảng `bookings` và `booking_history`).
* **Đối tượng Sử dụng (User Personas):**
  1. **Customer (Khách hàng đặt lịch):**
     * Theo dõi tiến trình đơn hàng minh bạch qua từng mốc trạng thái chuẩn (`REQUESTED` $\rightarrow$ `ACCEPTED` $\rightarrow$ `ON_THE_WAY` $\rightarrow$ `ARRIVED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`).
     * Được quyền hủy đơn theo quy định chính sách hoàn cọc.
  2. **Freelance MUA & Studio Staff MUA (Thợ trang điểm):**
     * Tranh chấp nhận cuốc khẩn cấp (Instant Booking) một cách công bằng, không bị lỗi nhận trùng đơn (Double Booking / Race Condition).
     * Thao tác cập nhật trạng thái làm việc tại từng chặng: Bắt đầu đi $\rightarrow$ Đã đến nơi $\rightarrow$ Bắt đầu làm $\rightarrow$ Chụp ảnh hoàn thành.
  3. **Agency Owner / Studio Dispatcher (Chủ Studio & Quản trị điều phối):**
     * Tiếp nhận đơn hẹn trước được khách đặt chỉ định cho Studio (`PENDING_AGENCY_DISPATCH`), gán thợ phù hợp (`AGENCY_ASSIGNED`) hoặc từ chối chuyển đơn.
  4. **CSKH & Kiểm toán Sàn (Audit & Dispute Resolution):**
     * Tra cứu toàn bộ lịch sử biến động trạng thái của đơn hàng trong bảng `booking_history` (Ai đổi, đổi lúc nào, từ trạng thái nào sang trạng thái nào, lý do gì) để đối soát tranh chấp hoàn tiền.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Mã nguồn phân hệ Booking State Machine & Concurrency được tổ chức tại `code/backend/core-api/src/main/java/com/makeup/platform/`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # ok, created, error
│   │   ├── ApiResponse.java                   # Envelope: {success, code, message, data, timestamp}
│   │   ├── PageResponse.java                  # Envelope phân trang chuẩn
│   │   ├── BaseService.java
│   │   └── BaseServiceImpl.java
│   ├── constants/
│   │   ├── BookingConstants.java              # REDLOCK_KEY_PREFIX, LOCK_WAIT_TIME_MS, LOCK_LEASE_TIME_MS
│   │   └── ErrorCodes.java                    # ERR_INVALID_STATE_TRANSITION, ERR_BOOKING_ALREADY_TAKEN
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Lỗi nghiệp vụ có mã lỗi ErrorCodes
│   │   ├── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (404)
│   │   ├── AccessDeniedException.java         # Lỗi vi phạm phân quyền/IDOR (403)
│   │   ├── InvalidStateTransitionException.java # Ngoại lệ cố tình nhảy cóc trạng thái (400)
│   │   └── BookingConcurrencyException.java     # Ngoại lệ tranh chấp khóa Redlock (409)
│   ├── i18n/
│   │   ├── CustomLocaleResolver.java          # Đa ngôn ngữ Accept-Language
│   │   └── JsonMessageSource.java             # Nạp file i18n JSON
│   └── utils/
│       └── SecurityContextUtils.java          # Trích xuất userId, role từ SecurityContext
│
├── config/
│   └── RedissonConfig.java                    # Khởi tạo RedissonClient kết nối Redis Cluster
│
├── controller/
│   └── booking/
│       ├── BookingStateController.java        # POST /api/v1/bookings/{id}/transition
│       ├── BookingAcceptanceController.java   # POST /api/v1/freelancer/bookings/{id}/accept (Redlock)
│       └── BookingHistoryController.java      # GET /api/v1/bookings/{id}/history
│
├── dto/
│   ├── request/booking/
│   │   ├── TransitionBookingStateReq.java     # @NotNull targetStatus, reason, completionPhotoUrl
│   │   ├── AcceptInstantBookingReq.java       # estimatedArrivalMinutes, notes
│   │   └── CancelBookingReq.java              # cancellationReason, cancellationRole
│   └── response/booking/
│       ├── BookingStateTransitionRes.java     # bookingId, fromStatus, toStatus, timestamp
│       ├── BookingAcceptanceRes.java          # bookingId, isAssigned, message, escrowDepositLocked
│       └── BookingHistoryLogRes.java          # id, fromStatus, toStatus, changedBy, note, timestamp
│
├── entity/
│   └── booking/
│       ├── BookingEntity.java                 # table: booking_schema.bookings (@Version optimistic locking)
│       └── BookingHistoryEntity.java          # table: booking_schema.booking_history
│
├── mapper/
│   └── booking/
│       ├── BookingMapper.java                 # Manual Mapper @Component: BookingEntity <-> DTOs (Builder Pattern)
│       └── BookingHistoryMapper.java          # Manual Mapper @Component: BookingHistoryEntity <-> DTOs
│
├── repository/
│   └── booking/
│       ├── BookingRepository.java             # findByIdWithLock, findByBookingCode
│       └── BookingHistoryRepository.java      # findByBookingIdOrderByCreatedAtAsc
│
├── event/
│   ├── BookingStateChangedEvent.java          # Event phát tán khi trạng thái đơn đổi thành công
│   └── InstantBookingAcceptedEvent.java       # Event kích hoạt phong tỏa tiền Escrow & thông báo
│
└── service/
    └── booking/
        ├── BookingStateMachineService.java    # Xử lý ma trận chuyển trạng thái hợp lệ & logic nghiệp vụ
        ├── BookingAuditService.java           # Ghi nhật ký Audit Log vào booking_history (@Transactional)
        ├── DistributedLockService.java        # Bao đóng logic Redlock (RLock acquire, release an toàn)
        └── impl/
            ├── BookingStateMachineServiceImpl.java
            ├── BookingAuditServiceImpl.java
            └── DistributedLockServiceImpl.java
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-BKG-01: Máy Trạng Thái Đơn Hàng Nghiêm Ngặt (Booking State Machine) (`ISSUE-16.1`)**
> **As a** Hệ thống Quản trị Đơn hàng (Booking Engine),  
> **I want** kiểm soát tuyệt đối luồng chuyển dịch trạng thái của đơn hàng theo ma trận nghiệp vụ chặt chẽ,  
> **So that** không một người dùng hay tác nhân nào có thể nhảy cóc trạng thái (ví dụ: chưa nhận đơn mà bấm đã đến nơi, hoặc chưa làm mà bấm hoàn thành).

#### **Ma trận Chuyển đổi Trạng thái Hợp lệ (Valid State Transitions):**

| Trạng thái Hiện tại (`from_status`) | Trạng thái Tiếp theo Hợp lệ (`to_status`) | Tác nhân Kích hoạt (Actor) | Điều kiện Tiên quyết / Hành động Kèm theo |
| :--- | :--- | :--- | :--- |
| `REQUESTED` | `ACCEPTED` | Thợ tự do (`ROLE_FREELANCE_MUA`) | Bấm nhận đơn (Luồng Instant qua Redlock). Phát sinh Escrow cọc. |
| `REQUESTED` | `PENDING_AGENCY_DISPATCH` | Hệ thống (System) | Đơn đặt chỉ định Studio. Chuyển vào hàng đợi Studio tiếp nhận. |
| `REQUESTED` | `CANCELLED` | Khách hàng / Hệ thống | Khách hủy trước khi có thợ nhận (Hoàn cọc 100%). Hoặc hết 45s không ai nhận. |
| `PENDING_AGENCY_DISPATCH` | `AGENCY_ASSIGNED` | Chủ Studio (`ROLE_AGENCY_ADMIN`) | Studio chọn thợ chính / thợ phụ phụ trách ca làm. |
| `PENDING_AGENCY_DISPATCH` | `CANCELLED` | Chủ Studio | Studio từ chối đơn do quá tải (Hoàn cọc 100% cho khách). |
| `AGENCY_ASSIGNED` | `ACCEPTED` | Thợ Studio (`ROLE_AGENCY_STAFF`) | Thợ xác nhận đồng ý ca được Studio gán. |
| `AGENCY_ASSIGNED` | `PENDING_AGENCY_DISPATCH` | Thợ Studio | Thợ báo bận đột xuất $\rightarrow$ Chuyển về Studio gán thợ dự phòng. |
| `ACCEPTED` | `ON_THE_WAY` | Thợ phụ trách ca | Thợ bấm "Bắt đầu đi" $\rightarrow$ Kích hoạt Background GPS Telemetry Stream (5-10s). |
| `ACCEPTED` | `CANCELLED` | Khách hàng / Thợ | Áp dụng chính sách phạt cọc tùy thời gian hủy trước giờ hẹn. |
| `ON_THE_WAY` | `ARRIVED` | Thợ phụ trách ca | Thợ bấm "Đã đến nơi" tại nhà khách. |
| `ARRIVED` | `IN_PROGRESS` | Thợ phụ trách ca | Thợ bấm "Bắt đầu trang điểm" $\rightarrow$ Đồng hồ tính giờ làm việc bắt đầu. |
| `IN_PROGRESS` | `COMPLETED` | Thợ phụ trách ca | Thợ chụp ảnh hoàn thiện (`completion_photo_url`) $\rightarrow$ Kích hoạt tiến trình giải ngân Escrow. |
| `COMPLETED` | `PAID_OUT` | Hệ thống (Escrow Service) | Sau 24h không có khiếu nại $\rightarrow$ Giải ngân tiền ví thợ và cắt % sàn. |
| `COMPLETED` | `DISPUTED` | Khách hàng (`ROLE_CUSTOMER`) | Khách khiếu nại trong vòng 24h $\rightarrow$ Đóng băng tiền cọc chờ CSKH xử lý. |

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Chuyển trạng thái hợp lệ tuần tự (Happy Path)**
  * **Given** Đơn hàng `booking_id = 501` đang ở trạng thái `ACCEPTED`.
  * **When** Thợ phụ trách ca gửi request `POST /api/v1/bookings/501/transition` với `target_status = "ON_THE_WAY"`.
  * **Then** State Machine kiểm tra `ACCEPTED -> ON_THE_WAY` là bước chuyển hợp lệ.
  * **And** Cập nhật `status = 'ON_THE_WAY'` trong bảng `bookings`.
  * **And** Tự động gọi `BookingAuditService` ghi nhận 1 bản ghi vào `booking_history`.
  * **And** Bắn Spring Event `BookingStateChangedEvent` để phân hệ Telemetry mở kênh GPS Stream.
  * **And** Trả về HTTP `200 OK` cho thợ.

* **Scenario 02: Chặn nhảy cóc trạng thái bất hợp lệ (Invalid State Leap)**
  * **Given** Đơn hàng `booking_id = 501` đang ở trạng thái `ACCEPTED`.
  * **When** Thợ cố tình gửi `target_status = "COMPLETED"` (bỏ qua `ON_THE_WAY`, `ARRIVED`, `IN_PROGRESS`).
  * **Then** State Machine phát hiện bước chuyển bất hợp lệ.
  * **And** Ném ngoại lệ `InvalidStateTransitionException` với mã lỗi `ERR_INVALID_STATE_TRANSITION`.
  * **And** Trả về HTTP `400 BAD_REQUEST`, giữ nguyên trạng thái cũ trong DB.

* **Scenario 03: Chặn người không có thẩm quyền can thiệp vào đơn hàng (IDOR & Role Guard)**
  * **Given** Đơn hàng `booking_id = 501` được gán cho Thợ A (`mua_id = 89`).
  * **When** Thợ B (`mua_id = 99`) cố tình gọi API chuyển trạng thái đơn hàng 501.
  * **Then** Hệ thống đối chiếu `current_user.mua_id != booking.assigned_mua_id`.
  * **And** Ném ngoại lệ `AccessDeniedException` với mã `ERR_UNAUTHORIZED_TRANSITION`, HTTP `403 FORBIDDEN`.

* **Scenario 04: Bắt buộc đính kèm ảnh hoàn thiện khi chuyển sang `COMPLETED`**
  * **Given** Đơn hàng đang ở trạng thái `IN_PROGRESS`.
  * **When** Thợ gửi yêu cầu chuyển sang `COMPLETED` nhưng cả trường `completion_photo_url` trong body lẫn ảnh đã upload trên đơn hàng đều rỗng `null`.
  * **Then** Tầng Service kiểm tra điều kiện nghiệm thu thất bại.
  * **And** Trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_COMPLETION_PHOTO_REQUIRED`.
  * **Note:** Thợ có thể truyền `completion_photo_url` qua JSON body HOẶC đã tải ảnh lên trước đó qua API `POST /api/v1/bookings/{id}/completion-photo`.

* **Scenario 05: Tải ảnh hoàn thành dịch vụ trực tiếp lên Cloudinary (Cloud Media Storage)**
  * **Given** Đơn hàng đang ở trạng thái `IN_PROGRESS` hoặc `ARRIVED`.
  * **When** Thợ phụ trách ca gọi `POST /api/v1/bookings/501/completion-photo` dạng `multipart/form-data` kèm file ảnh hoàn thiện.
  * **Then** Hệ thống xác thực định dạng file (JPG, PNG, WEBP), kiểm tra magic bytes và dung lượng tối đa $\le 10\text{MB}$.
  * **And** Gọi `MediaStorageService` nén ảnh chuẩn WebP và upload lên CDN Cloudinary theo thư mục `bookings/501/completion`.
  * **And** Tự động lưu đường dẫn `secure_url` vào trường `completion_photo_url` của bảng `bookings`.
  * **And** Trả về HTTP `200 OK` với `BookingCompletionPhotoRes` chứa đầy đủ link ảnh HD, thumbnail và publicId.

* **Scenario 06: Tự động giải phóng trạng thái Bận của Thợ khi hoàn thành hoặc hủy đơn (Auto-Release Availability)**
  * **Given** Thợ đang phụ trách đơn hàng và có cờ `is_busy = true` (`availability_status = 'BUSY'`).
  * **When** Đơn hàng chuyển sang trạng thái kết thúc: `COMPLETED` hoặc `CANCELLED`.
  * **Then** State Machine tự động giải phóng cờ bận: `mua.is_busy = false`.
  * **And** Nếu thợ vẫn đang bật Online (`is_online == true`), cập nhật `availability_status = 'AVAILABLE'` để thợ sẵn sàng đón nhận các đơn khẩn cấp mới.
  * **And** Nếu thợ đã tắt Online, cập nhật `availability_status = 'OFFLINE'`.

---

### **US-BKG-02: Nhật Ký Audit Log Biến Động Đơn Hàng (`booking_history`) (`ISSUE-16.2`)**
> **As a** Đội ngũ Kiểm toán & Chăm sóc Khách hàng (CSKH & Audit Team),  
> **I want** mọi biến động trạng thái đơn hàng đều được lưu vết chi tiết và không thể xóa sửa trong bảng `booking_history`,  
> **So that** chúng tôi có bằng chứng xác thực 100% để phân xử tranh chấp khiếu nại giữa Khách hàng và Thợ.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Tự động lưu nhật ký Audit Log trong cùng Transaction (Atomic Audit Trail)**
  * **Given** Đơn hàng đổi từ `ARRIVED` sang `IN_PROGRESS`.
  * **When** Thao tác cập nhật bảng `bookings` thành công.
  * **Then** Trong cùng transaction `@Transactional`, hệ thống tự động chèn 1 dòng vào `booking_schema.booking_history`:
    * `booking_id`: 501
    * `from_status`: `ARRIVED`
    * `to_status`: `IN_PROGRESS`
    * `changed_by_user_id`: ID của Thợ đang thực hiện
    * `note`: `"Thợ bắt đầu công đoạn make-up cô dâu"`
    * `created_at`: Thời gian hiện tại.
  * **And** Nếu việc ghi log thất bại, toàn bộ transaction sẽ rollback để đảm bảo tính toàn vẹn dữ liệu.

* **Scenario 02: CSKH truy xuất toàn bộ lịch sử tiến trình đơn hàng**
  * **Given** Đơn hàng có khiếu nại tranh chấp sau khi hoàn thành.
  * **When** CSKH gọi `GET /api/v1/bookings/501/history`.
  * **Then** Backend trả về danh sách lịch sử sắp xếp tăng dần theo thời gian (`created_at ASC`), thể hiện rõ từng mốc thời gian: Giờ đặt, Giờ nhận, Giờ bắt đầu đi, Giờ đến nơi, Giờ làm xong.

---

### **US-BKG-03: Kiểm Soát Tranh Chấp Đơn Hàng Khẩn Cấp Bằng Redlock (`ISSUE-16.3`)**
> **As a** Hệ thống Điều phối Đơn khẩn cấp (Realtime Dispatcher),  
> **I want** sử dụng Redis Distributed Lock (Redlock) khi nhiều thợ bấm nhận đơn cùng một phần nghìn giây,  
> **So that** chỉ duy nhất một thợ đầu tiên giành được đơn hàng, tuyệt đối không bao giờ xảy ra tình trạng hai thợ cùng nhận một đơn (Double Booking / Race Condition).

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Thợ đầu tiên bấm nhận đơn thành công qua Redlock (Happy Path)**
  * **Given** Đơn hàng khẩn cấp `booking_id = 777` đang ở trạng thái `REQUESTED`.
  * **And** Thợ A (`mua_id = 89`) đang ở trạng thái Trực tuyến (`is_online = true`) và Rảnh (`is_busy = false`).
  * **When** Thợ A bấm nút "Nhận Đơn" $\rightarrow$ Gửi request `POST /api/v1/freelancer/bookings/777/accept`.
  * **Then** Backend khởi tạo Redlock: `RLock lock = redissonClient.getLock("lock:booking:accept:777")`.
  * **And** Thợ A giành được lock thành công trong thời gian chờ `waitTime = 2000ms`.
  * **And** Backend kiểm tra trong DB thấy `booking.status == 'REQUESTED'`.
  * **And** Chuyển trạng thái sang `ACCEPTED`, gán `assigned_mua_id = 89`.
  * **And** Khóa thợ A sang trạng thái bận: `mua.is_busy = true` (`availability_status = 'BUSY'`) để không nhận thêm đơn khẩn cấp khác.
  * **And** Tự động giải phóng lock an toàn trong khối `finally`.
  * **And** Bắn thông báo xác nhận thành công cho Thợ A.

* **Scenario 02: Thợ đến sau bị từ chối nhận đơn do Thợ đầu tiên đã khóa (Race Condition Prevention)**
  * **Given** Thợ A và Thợ B cùng nhận được popup đơn khẩn cấp `booking_id = 777`.
  * **When** Thợ A bấm nhận trước Thợ B 10 mili-giây.
  * **Then** Thợ A giữ lock và cập nhật đơn sang `ACCEPTED`.
  * **And** Khi Thợ B acquire được lock, backend kiểm tra thấy `booking.status != 'REQUESTED'` (đã là `ACCEPTED`).
  * **And** Hệ thống ném ngoại lệ `BookingConcurrencyException` với mã lỗi `ERR_BOOKING_ALREADY_TAKEN`.
  * **And** Trả về HTTP `409 CONFLICT` cho Thợ B với thông báo thân thiện: `"Rất tiếc! Đơn hàng này vừa được thợ khác tiếp nhận"`.
  * **And** Không có bất kỳ lỗi xung đột dữ liệu hay giao dịch trùng lặp nào xảy ra.

* **Scenario 03: Chống Deadlock khi xảy ra sự cố mạng (Lock Lease Timeout)**
  * **Given** Thợ A acquire được lock nhưng server đột ngột gặp sự cố tắt tiến trình trước khi kịp nhả lock.
  * **When** Hết thời gian thuê khóa tự động `leaseTime = 5000ms` (5 giây).
  * **Then** Redis tự động giải phóng lock `lock:booking:accept:777` nhờ cơ chế TTL.
  * **And** Ngăn chặn hoàn toàn tình trạng Deadlock đóng băng vĩnh viễn đơn hàng.

* **Scenario 04: Chặn Thợ đang OFFLINE hoặc đang BẬN ca khác cố tình nhận đơn**
  * **Given** Thợ đang ở trạng thái `is_online = false` (OFFLINE) hoặc `is_busy = true` (BUSY).
  * **When** Thợ gửi request `POST /api/v1/freelancer/bookings/777/accept`.
  * **Then** Nếu thợ đang OFFLINE $\rightarrow$ Ném ngoại lệ `CustomBusinessException` với mã `ERR_MUA_MUST_BE_ONLINE`, HTTP `400 BAD_REQUEST`.
  * **And** Nếu thợ đang BUSY $\rightarrow$ Ném ngoại lệ `CustomBusinessException` với mã `ERR_MUA_ALREADY_BUSY`, HTTP `409 CONFLICT`.
  * **And** Chặn đứng thao tác, giữ nguyên trạng thái đơn hàng.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI BACK-END

Tất cả các lỗi nghiệp vụ và lỗi xung đột khóa phân tán đều được xử lý qua `GlobalExceptionHandler.java` kế thừa chuẩn `ApiResponse<T>`:

```json
{
  "success": false,
  "errorCode": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Thông điệp lỗi đã được bản địa hóa qua messages_vi.json / messages_en.json",
  "timestamp": "2026-09-14T09:00:00"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Phân hệ Booking State Machine & Redlock

| HTTP Status | Mã Lỗi (`errorCode`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_INVALID_STATE_TRANSITION` | Cố tình chuyển đổi trạng thái không nằm trong ma trận chuyển đổi hợp lệ (ví dụ `REQUESTED` $\rightarrow$ `COMPLETED`). | Chặn đứng thao tác, giữ nguyên trạng thái cũ của đơn hàng. |
| **`400 BAD_REQUEST`** | `ERR_COMPLETION_PHOTO_REQUIRED` | Thợ chuyển đơn sang `COMPLETED` nhưng không đính kèm URL ảnh sản phẩm hoàn thiện. | Yêu cầu upload ảnh chứng minh hoàn thành dịch vụ. |
| **`400 BAD_REQUEST`** | `ERR_CANCELLATION_REASON_REQUIRED` | Hủy đơn hàng nhưng không cung cấp lý do hủy cụ thể. | Bean Validation bắt buộc trường `reason`. |
| **`403 FORBIDDEN`** | `ERR_UNAUTHORIZED_TRANSITION` | Thợ A cố tình đổi trạng thái đơn hàng của Thợ B hoặc Khách hàng khác. | Kiểm tra quyền sở hữu IDOR: `current_user == booking.assigned_mua_id`. |
| **`404 NOT_FOUND`** | `ERR_BOOKING_NOT_FOUND` | `booking_id` truyền lên không tồn tại trong hệ thống. | Ném `CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found", HttpStatus.NOT_FOUND)`. |
| **`409 CONFLICT`** | `ERR_BOOKING_ALREADY_TAKEN` | Thợ bấm nhận đơn nhưng đơn đã được thợ khác giành trước qua Redlock. | Trả về HTTP 409, yêu cầu App đóng popup đếm ngược. |
| **`409 CONFLICT`** | `ERR_LOCK_ACQUISITION_TIMEOUT` | Hệ thống quá tải khiến việc xin khóa phân tán Redis vượt quá thời gian chờ (2s). | Báo bận hệ thống, yêu cầu thử lại sau giây lát. |
| **`400 BAD_REQUEST`** | `ERR_MUA_MUST_BE_ONLINE` | Thợ đang ở trạng thái OFFLINE cố tình bấm nhận đơn hàng. | Yêu cầu thợ bật trực tuyến (Online) và cho phép định vị GPS trước khi nhận đơn. |
| **`409 CONFLICT`** | `ERR_MUA_ALREADY_BUSY` | Thợ đang trong ca phục vụ khác (`is_busy = true`) bấm nhận thêm đơn khẩn cấp. | Chặn nhận trùng đơn, yêu cầu hoàn thành đơn hiện tại. |
| **`409 CONFLICT`** | `ERR_OPTIMISTIC_LOCK_CONFLICT` | Xung đột phiên bản `@Version` khi 2 tác nhân cập nhật cùng lúc bản ghi `bookings`. | Tự động retry tối đa 3 lần trước khi báo lỗi. |

---

### 4.2. Mã nguồn Validation DTO Mẫu (Bean Validation chuẩn i18n)

#### DTO Chuyển đổi Trạng thái: `TransitionBookingStateReq.java`
```java
package com.makeup.platform.dto.request.booking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransitionBookingStateReq {

    @NotBlank(message = "{validation.booking_target_status_required}")
    @Pattern(
        regexp = "^(ACCEPTED|PENDING_AGENCY_DISPATCH|AGENCY_ASSIGNED|ON_THE_WAY|ARRIVED|IN_PROGRESS|COMPLETED|CANCELLED|DISPUTED)$",
        message = "{validation.booking_target_status_invalid}"
    )
    private String targetStatus;

    @Size(max = 500, message = "{validation.booking_reason_max}")
    private String reason; // Lý do chuyển đổi trạng thái (VD: lý do hủy, ghi chú)

    private String completionPhotoUrl; // Bắt buộc khi targetStatus = COMPLETED
}
```

---

## 💻 5. ĐẶC TẢ REST API CONTRACTS

---

### 5.1. `POST /api/v1/bookings/{bookingId}/transition` (Kích hoạt Chuyển đổi Trạng thái Đơn hàng)
* **Mục đích:** Khách hàng, Thợ hoặc Studio cập nhật tiến trình của đơn hàng theo từng mốc.
* **Quyền truy cập:** Các bên liên quan đến đơn hàng (`ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`, `ROLE_AGENCY_ADMIN`).
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "target_status": "ON_THE_WAY",
  "reason": "Thợ bắt đầu xuất phát di chuyển đến nhà khách",
  "completion_photo_url": null
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Cập nhật trạng thái đơn hàng thành công!",
  "data": {
    "bookingId": 501,
    "bookingCode": "BK-260914-X8K9L",
    "previousStatus": "ACCEPTED",
    "currentStatus": "ON_THE_WAY",
    "updatedByUserId": 89,
    "transitionedAt": "2026-09-14T09:05:00Z"
  },
  "timestamp": "2026-09-14T09:05:00"
}
```

---

### 5.2. `POST /api/v1/freelancer/bookings/{bookingId}/accept` (Thợ Tranh Chấp Nhận Ca Khẩn Cấp - Redlock)
* **Mục đích:** Thợ bấm nút "Chấp Nhận" trên popup đếm ngược 30s để giành ca làm.
* **Quyền truy cập:** `ROLE_FREELANCE_MUA` hoặc `ROLE_AGENCY_STAFF`.
* **Headers:** `Authorization: Bearer <JWT>`
* **Response `200 OK` (Thành công - Giành được đơn):**
```json
{
  "success": true,
  "message": "Chúc mừng! Bạn đã nhận thành công ca trang điểm khẩn cấp!",
  "data": {
    "bookingId": 777,
    "bookingCode": "BK-260914-FAST1",
    "status": "ACCEPTED",
    "assignedMuaId": 89,
    "destinationAddress": "Căn hộ 12.04 Tòa Landmark 81, Q.Bình Thạnh, TP.HCM",
    "serviceTotalAmount": 1850000.00,
    "escrowDepositLocked": 555000.00,
    "customerInfo": {
      "fullName": "Nguyễn Hoàng Mai",
      "phoneNumber": "0912***789"
    },
    "acceptedAt": "2026-09-14T09:06:12Z"
  },
  "timestamp": "2026-09-14T09:06:12"
}
```
* **Response `409 CONFLICT` (Thất bại - Đã có thợ khác nhận trước):**
```json
{
  "success": false,
  "errorCode": "ERR_BOOKING_ALREADY_TAKEN",
  "message": "Rất tiếc! Đơn hàng này vừa được một thợ khác tiếp nhận",
  "timestamp": "2026-09-14T09:06:12"
}
```
* **Response `400 BAD_REQUEST` (Thất bại - Thợ đang OFFLINE):**
```json
{
  "success": false,
  "errorCode": "ERR_MUA_MUST_BE_ONLINE",
  "message": "Thợ cần bật trạng thái trực tuyến (Online) để tiếp nhận đơn hàng.",
  "timestamp": "2026-09-14T09:06:12"
}
```
* **Response `409 CONFLICT` (Thất bại - Thợ đang bận ca khác):**
```json
{
  "success": false,
  "errorCode": "ERR_MUA_ALREADY_BUSY",
  "message": "Bạn đang trong ca phục vụ khác, không thể nhận thêm đơn này.",
  "timestamp": "2026-09-14T09:06:12"
}
```

---

### 5.3. `POST /api/v1/bookings/{bookingId}/completion-photo` (Tải Ảnh Hoàn Thành Dịch Vụ Lên Cloudinary)
* **Mục đích:** Thợ chụp và tải ảnh sản phẩm hoàn thiện trực tiếp lên CDN Cloudinary, tự động nén WebP và gắn URL vào đơn hàng.
* **Quyền truy cập:** Thợ phụ trách ca (`ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`) hoặc `ROLE_SUPER_ADMIN`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: multipart/form-data`
* **Form-Data Params:**
  * `file`: File ảnh thực tế (JPG, PNG, WEBP, tối đa 10MB).
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải ảnh hoàn thành dịch vụ lên Cloudinary thành công.",
  "data": {
    "bookingId": 501,
    "bookingCode": "BK-260914-X8K9L",
    "completionPhotoUrl": "https://res.cloudinary.com/.../bookings/501/completion/finish_look.webp",
    "thumbnailUrl": "https://res.cloudinary.com/.../c_fill,h_400,w_400/.../finish_look.webp",
    "publicId": "bookings/501/completion/finish_look",
    "uploadedAt": "2026-09-14T11:00:00"
  },
  "timestamp": "2026-09-14T11:00:00"
}
```

---

### 5.4. `GET /api/v1/bookings/{bookingId}/history` (Truy vấn Lịch sử Audit Log Đơn Hàng)
* **Mục đích:** Khách hàng, Thợ, Studio hoặc CSKH xem toàn bộ dòng thời gian tiến trình đơn.
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Lấy lịch sử trạng thái đơn hàng thành công",
  "data": {
    "bookingId": 501,
    "bookingCode": "BK-260914-X8K9L",
    "currentStatus": "COMPLETED",
    "historyLogs": [
      {
        "id": 1,
        "fromStatus": null,
        "toStatus": "REQUESTED",
        "changedBy": "Khách hàng (Nguyễn Thu Trang)",
        "note": "Khởi tạo đơn hàng trang điểm tiệc cưới",
        "createdAt": "2026-09-14T08:30:00Z"
      },
      {
        "id": 2,
        "fromStatus": "REQUESTED",
        "toStatus": "ACCEPTED",
        "changedBy": "Thợ trang điểm (Lê Bảo Ngọc)",
        "note": "Thợ chấp nhận ca hẹn",
        "createdAt": "2026-09-14T08:31:15Z"
      },
      {
        "id": 3,
        "fromStatus": "ACCEPTED",
        "toStatus": "ON_THE_WAY",
        "changedBy": "Thợ trang điểm (Lê Bảo Ngọc)",
        "note": "Bắt đầu di chuyển bằng xe máy",
        "createdAt": "2026-09-14T09:00:00Z"
      },
      {
        "id": 4,
        "fromStatus": "ON_THE_WAY",
        "toStatus": "ARRIVED",
        "changedBy": "Thợ trang điểm (Lê Bảo Ngọc)",
        "note": "Đã có mặt tại sảnh chung cư",
        "createdAt": "2026-09-14T09:22:00Z"
      },
      {
        "id": 5,
        "fromStatus": "ARRIVED",
        "toStatus": "IN_PROGRESS",
        "changedBy": "Thợ trang điểm (Lê Bảo Ngọc)",
        "note": "Bắt đầu dưỡng da và dán mi",
        "createdAt": "2026-09-14T09:30:00Z"
      },
      {
        "id": 6,
        "fromStatus": "IN_PROGRESS",
        "toStatus": "COMPLETED",
        "changedBy": "Thợ trang điểm (Lê Bảo Ngọc)",
        "note": "Hoàn thiện phong cách makeup Douyin",
        "createdAt": "2026-09-14T11:00:00Z"
      }
    ]
  },
  "timestamp": "2026-09-14T11:00:01"
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16 & THIẾT KẾ REDLOCK)

### 6.1. DDL PostgreSQL 16 (`booking_schema`)
* **Quy tắc đặt tên file migration Flyway**: `code/backend/core-api/src/main/resources/db/migration/V<YYYYMMDDHHmmss>__Create_Booking_And_History_Tables.sql` (Tuân thủ chuẩn Timestamp, tuyệt đối không dùng `V<N>`).

```sql
-- 1. BẢNG ĐƠN HÀNG CHÍNH (BOOKINGS)
CREATE TABLE IF NOT EXISTS booking_schema.bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_code VARCHAR(30) UNIQUE NOT NULL, -- BK-260914-A9X2K
    customer_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE SET NULL,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE SET NULL,
    
    booking_type VARCHAR(30) NOT NULL CHECK (booking_type IN ('REALTIME_INSTANT', 'SCHEDULED')),
    booking_partner VARCHAR(30) NOT NULL CHECK (booking_partner IN ('FREELANCER_DIRECT', 'AGENCY_DISPATCH')),
    status VARCHAR(30) DEFAULT 'REQUESTED' NOT NULL CHECK (
        status IN ('REQUESTED', 'PENDING_AGENCY_DISPATCH', 'AGENCY_ASSIGNED', 
                   'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 
                   'COMPLETED', 'PAID_OUT', 'CANCELLED', 'DISPUTED')
    ),
    
    destination_address TEXT NOT NULL,
    destination_latitude DECIMAL(10, 8) NOT NULL,
    destination_longitude DECIMAL(11, 8) NOT NULL,
    
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    
    service_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    distance_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    surcharge_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    
    completion_photo_url TEXT,
    version BIGINT DEFAULT 0 NOT NULL, -- Optimistic Locking (@Version)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. BẢNG NHẬT KÝ LỊCH SỬ BIẾN ĐỘNG TRẠNG THÁI ĐƠN HÀNG (ISSUE-16.2)
CREATE TABLE IF NOT EXISTS booking_schema.booking_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by_user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON booking_schema.bookings(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_mua ON booking_schema.bookings(mua_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_agency ON booking_schema.bookings(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_history_order ON booking_schema.booking_history(booking_id, created_at ASC);
```

---

### 6.2. Thiết kế Khóa Phân tán Redlock (Redisson Configuration)
* **Thư viện bắt buộc trong `build.gradle`**:
  ```groovy
  implementation 'org.redisson:redisson-spring-boot-starter:3.34.1'
  ```

```text
Khóa phân tán (Distributed Lock Key): lock:booking:accept:{booking_id}
Ví dụ: lock:booking:accept:777
Thời gian tối đa chờ giành khóa (Wait Time): 2,000 ms (2 giây)
Thời gian tự động giải phóng khóa (Lease Time / TTL): 5,000 ms (5 giây)
```

#### 🛡️ Nguyên tắc Vàng: Giải quyết Lỗ hổng "Transaction Commit vs Lock Release"
> [!IMPORTANT]
> **Quy tắc Bắt buộc**: Phải giải phóng khóa `lock.unlock()` **SAU KHI** Transaction cơ sở dữ liệu đã `COMMIT` 100% xuống PostgreSQL. Nếu giải phóng lock trong khối `finally` trước khi transaction commit, thợ khác sẽ giành lock và đọc phải dữ liệu cũ chưa commit (Race Condition Double-Booking).

#### Mã nguồn Mẫu Xử lý Redlock An toàn (Wrap TransactionTemplate):
```java
@Service
@RequiredArgsConstructor
public class DistributedLockServiceImpl implements DistributedLockService {

    private final RedissonClient redissonClient;
    private final TransactionTemplate transactionTemplate;
    private final BookingRepository bookingRepository;
    private final BookingAuditService bookingAuditService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public BookingAcceptanceRes acceptBookingWithLock(Long bookingId, Long muaId) {
        String lockKey = "lock:booking:accept:" + bookingId;
        RLock lock = redissonClient.getLock(lockKey);

        boolean isLocked = false;
        try {
            // Cố gắng lấy khóa phân tán trong 2 giây, tự hủy khóa sau 5 giây nếu sự cố
            isLocked = lock.tryLock(2000, 5000, TimeUnit.MILLISECONDS);
            if (!isLocked) {
                throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT,
                        "booking.lock_timeout", HttpStatus.CONFLICT);
            }

            // Thực thi CSDL và commit TRONG VÒNG KHÓA (Commit xong mới nhả lock ở finally)
            return transactionTemplate.execute(status -> {
                // 1. Kiểm tra trạng thái hiện tại trong Database
                BookingEntity booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                            "booking.not_found", HttpStatus.NOT_FOUND));

                if (!"REQUESTED".equals(booking.getStatus())) {
                    throw new CustomBusinessException(ErrorCodes.ERR_BOOKING_ALREADY_TAKEN,
                            "booking.already_taken", HttpStatus.CONFLICT);
                }

                // 2. Chuyển trạng thái sang ACCEPTED
                booking.setStatus("ACCEPTED");
                booking.setMuaId(muaId);
                BookingEntity saved = bookingRepository.save(booking);

                // 3. Ghi log Audit trong cùng Transaction
                bookingAuditService.logTransition(bookingId, "REQUESTED", "ACCEPTED", muaId, "Thợ nhận đơn qua Redlock");

                // 4. Bắn Event sang Ví Escrow & WebSocket
                eventPublisher.publishEvent(new InstantBookingAcceptedEvent(this, bookingId, muaId));

                return BookingAcceptanceRes.builder()
                    .bookingId(saved.getId())
                    .bookingCode(saved.getBookingCode())
                    .status("ACCEPTED")
                    .assignedMuaId(muaId)
                    .build();
            });

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CustomBusinessException(ErrorCodes.ERR_INTERNAL, "booking.concurrency_interrupted", HttpStatus.INTERNAL_SERVER_ERROR);
        } finally {
            // Chỉ giải phóng khóa khi transactionTemplate đã commit CSDL thành công
            if (isLocked && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

---

## ⚡ 7. SƠ ĐỒ CHUYỂN TRẠNG THÁI MÁY ĐƠN HÀNG (STATE MACHINE FLOW)

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Khách bấm Đặt đơn

    state "Luồng 1: Đặt Khẩn Cấp (Instant)" as InstantFlow {
        REQUESTED --> ACCEPTED: Thợ nhận ca (Redlock 30s)
    }

    state "Luồng 2: Chỉ Định Studio (Dispatch)" as AgencyFlow {
        REQUESTED --> PENDING_AGENCY_DISPATCH: Đơn gửi Studio
        PENDING_AGENCY_DISPATCH --> AGENCY_ASSIGNED: Studio gán Thợ
        AGENCY_ASSIGNED --> ACCEPTED: Thợ xác nhận nhận ca
        AGENCY_ASSIGNED --> PENDING_AGENCY_DISPATCH: Thợ từ chối -> Đổi thợ khác
    }

    state "Quá Trình Thực Hiện Dịch Vụ" as ServiceFlow {
        ACCEPTED --> ON_THE_WAY: Thợ bắt đầu đi (Stream GPS)
        ON_THE_WAY --> ARRIVED: Thợ đã đến nơi
        ARRIVED --> IN_PROGRESS: Thợ bắt đầu make-up
        IN_PROGRESS --> COMPLETED: Chụp ảnh & Hoàn thành
    }

    state "Thanh Toán & Hậu Mãi" as SettleFlow {
        COMPLETED --> PAID_OUT: Sau 24h giải ngân Escrow
        COMPLETED --> DISPUTED: Khách khiếu nại (Đóng băng)
        DISPUTED --> PAID_OUT: CSKH xử lý xong
    }

    REQUESTED --> CANCELLED: Khách hủy / Hết thời gian tìm
    PENDING_AGENCY_DISPATCH --> CANCELLED: Studio từ chối đơn
    ACCEPTED --> CANCELLED: Hủy đơn có phạt cọc
    CANCELLED --> [*]
    PAID_OUT --> [*]
```

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Hiệu năng Khóa Phân tán (Distributed Locking Latency):**
   - Thời gian xác lập khóa Redlock qua Redisson phải hoàn thành trong **$< 5\text{ms}$**.
   - Đảm bảo xử lý chính xác tuyệt đối ngay cả khi có $500$ requests cùng tranh chấp nhận 1 đơn hàng trong vòng $100\text{ms}$.
2. **Tính Toàn vẹn Giao dịch (Transactional Consistency):**
   - Mọi thao tác chuyển trạng thái đơn hàng và ghi log vào `booking_history` bắt buộc phải nằm trong cùng một **Database Transaction (`@Transactional`)**. Không bao giờ có trường hợp đổi status đơn thành công mà không có bản ghi lịch sử tương ứng.
3. **Bảo vệ Đa tầng chống Race Condition (Defense in Depth):**
   - Kết hợp cả 2 cơ chế: **Pessimistic Distributed Lock (Redlock ở tầng Redis)** và **Optimistic Locking (`@Version` ở tầng PostgreSQL JPA Entity)** để bảo vệ hệ thống 100% trước mọi nguy cơ xung đột dữ liệu phân tán.
