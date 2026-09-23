# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐẶT LỊCH HẸN TRƯỚC (SCHEDULED BOOKING), LỊCH BẬN CÁ NHÂN & CRON NHẮC LỊCH
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schemas: `mua_schema`, `booking_schema`, `catalog_schema`, `wallet_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Scheduled Booking Flow, MUA Calendar Engine & Reminder Cron Scheduler`
* **Mã Jira Issues phụ trách (Sprint 3):**
  * `ISSUE-18.1`: **User Story** - Luồng 2: Đặt Lịch Hẹn Trước cho tương lai (Scheduled Booking Flow) - Khách hàng chọn Thợ/Studio, chọn ngày giờ hẹn, giữ chỗ 15 phút (`PENDING_DEPOSIT`), tính cọc 30% và hoàn tất giữ chỗ.
  * `ISSUE-18.2`: **Task** - Lịch bận cá nhân Thợ (`mua_schema.mua_calendars`) - Khóa ca làm trùng giờ theo chuẩn `TIMESTAMPTZ` (chống lỗi ca vắt qua ngày - Midnight Crossing), kiểm tra khoảng đệm di chuyển an toàn (Buffer Time $30\text{--}45\text{ phút}$).
  * `ISSUE-18.3`: **Task** - Scheduler Cron Job tự động quét nhắc lịch 24h & 2h theo batching không nghẽn luồng và Cron giải phóng slot giữ chỗ quá hạn 15 phút (`BookingDepositExpirationScheduler`).
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Động cơ Quản lý Thời gian & Lịch bận (MUA Calendar Engine - Midnight Crossing Resilient):**
    - Sử dụng chuẩn thời gian tuyệt đối `start_at TIMESTAMPTZ` và `end_at TIMESTAMPTZ` trong `mua_schema.mua_calendars`.
    - Thuật toán kiểm tra giao thoa khoảng thời gian: $\text{start\_at} < \text{windowEndTimestamp} \land \text{end\_at} > \text{windowStartTimestamp}$. Triệt tiêu hoàn toàn lỗi ca sáng sớm hoặc ca đêm muộn vắt qua ngày ($D-1$ hoặc $D+1$).
    - Lưu trữ **đúng thời gian dịch vụ thực tế** trong CSDL và áp dụng khoảng đệm di chuyển chuẩn ($B = 30\text{--}45\text{ phút}$) trong truy vấn kiểm tra, tránh lỗi cộng trùng khoảng đệm (Double Buffering).
    - **Phòng thủ Đa tầng (Defense-in-Depth - Hard Overlap vs Buffer Window):**
      - *Lớp CSDL (Hard Overlap Guard):* Tích hợp **PostgreSQL Exclusion Constraint (`EXCLUDE USING gist`)** với kiểu `tstzrange` trên `(start_at, end_at)` làm chốt chặn thép vật lý chống 100% trùng giờ dịch vụ thực tế.
      - *Lớp Application (Buffer Window Guard):* Tầng Application chịu trách nhiệm tính toán khoảng đệm di chuyển linh hoạt ($\pm 30\text{m}$) qua query `existsOverlappingSlot`. (Hệ thống hỗ trợ tùy chọn cột sinh `transit_window` nếu áp dụng đệm cố định ở cấp CSDL).
  * **Kiểm soát Xung đột Phân tán & Tranh chấp Đồng thời (Granular Concurrency & Locking):**
    - Luồng **`FREELANCER_DIRECT`**: Khóa phân tán Redisson trên Redis: `lock:mua:calendar:{muaId}:{bookingDate}`.
    - Luồng **`AGENCY_DISPATCH`**: Khóa phân tán phạm vi khung giờ chi tiết: `lock:agency:capacity:{agencyId}:{bookingDate}:{slotStartTime}` để tránh nghẽn cổ chai (sequential execution) cho toàn bộ Studio trong ngày.
  * **Cơ chế Tạm Giữ Chỗ & Tự Động Giải Phóng Slot (Hold & Expire Flow - Deadlock & Race-Free):**
    - Khi tạo đơn: Đơn mang trạng thái `PENDING_DEPOSIT`, trường `deposit_expired_at = now + 15 phút`. Slot lịch được tạm khóa với `is_locked = true, reason = 'HELD_...'`.
    - Sau khi thanh toán cọc thành công: Trạng thái đơn chuyển thành `ACCEPTED`, slot lịch chuyển thành `CONFIRMED`.
    - **Chống Race-Condition Phút 14:59 (Atomic State Transition & Optimistic Locking):**
      - Quá trình hủy đơn hết hạn sử dụng câu lệnh cập nhật có điều kiện trạng thái nguyên tử:
        `UPDATE booking_schema.bookings SET status = 'CANCELLED_EXPIRED', updated_at = NOW() WHERE id = :id AND status = 'PENDING_DEPOSIT'`.
      - Chỉ khi số dòng cập nhật $= 1$, worker mới tiến hành nhả slot trong `mua_schema.mua_calendars`. Nếu khách vừa thanh toán cọc chuyển sang `ACCEPTED` ở giây thứ 14:59, câu lệnh trả về 0 dòng, worker lập tức bỏ qua và bảo vệ trọn vẹn quyền lợi của khách.
    - **Deadlock-Free Batching:** Quá trình quét hủy đơn hết hạn không bọc `@Transactional` ở method cha mà xử lý độc lập từng đơn với `Propagation.REQUIRES_NEW`, tránh khóa bảng kéo dài và loại bỏ hoàn toàn nguy cơ deadlock.
  * **Tự động hóa Tác vụ Nền (Zero-Offset Pagination Batching & After-Commit Events):**
    - **Khắc phục lỗi trôi Offset (Zero-Offset Pagination):** Vì mỗi lần xử lý cập nhật cờ `reminder_24h_sent = true`, bản ghi bị loại khỏi kết quả lọc, nên worker **luôn truy vấn ở trang đầu tiên `PageRequest.of(0, BATCH_SIZE)`** trong vòng lặp `do-while`, đảm bảo quét sạch 100% đơn không bỏ sót bản ghi nào.
    - Tăng Redis Idempotency TTL lên **$48\text{ giờ}$** (cho nhắc 24h) và **$24\text{ giờ}$** (cho nhắc 2h).
    - **Tách biệt Event Transaction:** Sử dụng `@Async("taskExecutor")` kết hợp `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` để chỉ gửi WebSocket/Push notification khi dữ liệu DB đã commit thành công. Lỗi kết nối mạng ở tầng notification tuyệt đối không làm rollback transaction của scheduler.
  * **Phân định Phân kỳ Phát triển (Phasing Strategy - Sprint 3 vs Sprint 5):**
    - **Giai đoạn Sprint 3 (Hiện tại):** 
      - Hoàn thiện 100% logic đặt lịch hẹn, tạm giữ slot 15 phút (`PENDING_DEPOSIT`), tính cọc 30%, xác nhận cọc (`ACCEPTED`), giải phóng slot khi hết hạn 15 phút hoặc khi khách hủy đơn.
      - Bắn sự kiện `ScheduledBookingCreatedEvent` qua Spring EventBus sẵn sàng cho module Ví.
    - **Giai đoạn Sprint 5 (Tương lai - Wallet & Escrow Module):**
      - Kích hoạt Event Listener trừ tiền ví hoặc tích hợp cổng thanh toán trực tuyến để tự động chuyển `PENDING_DEPOSIT` $\rightarrow$ `ACCEPTED`.
  * **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`makeup_platform_db`) tuân thủ nghiêm ngặt 8 Schemas:
    - `mua_schema.mua_calendars`: Lưu `start_at TIMESTAMPTZ`, `end_at TIMESTAMPTZ`, `is_locked`, `booking_id`, Exclusion Constraint GiST.
    - `booking_schema.bookings` & `booking_schema.booking_history`: Lưu `deposit_expired_at`, `version` (@Version), audit log biến động trạng thái.
    - `catalog_schema.service_packages` & `catalog_schema.surcharges`: Gói dịch vụ và bảng phụ phí giờ làm sớm / ngày Lễ Tết.
    - `wallet_schema.wallets` & `wallet_schema.ledger_entries`: Dự phòng cho phân hệ ví và quỹ cọc Escrow (kích hoạt ở Sprint 5).
* **Đối tượng Sử dụng (User Personas):**
  1. **Customer (Khách hàng đặt lịch hẹn sự kiện tương lai):**
     * Có kế hoạch trước cho ngày cưới hỏi, tiệc sinh nhật, dạ hội, kỷ yếu (đặt trước từ 1 ngày đến 90 ngày).
     * Xem bảng lịch rảnh trực quan của Thợ/Studio yêu thích, chọn khung giờ phù hợp và đặt cọc 30% để khóa lịch chắc chắn.
     * Nhận thông báo nhắc lịch tự động trước 24 giờ và trước 2 giờ kèm hướng dẫn chuẩn bị da mặt trước khi thợ đến.
  2. **Freelance MUA (Thợ trang điểm tự do - `ROLE_FREELANCE_MUA`):**
     * Xem toàn bộ lịch làm việc tuần/tháng trên giao diện Calendar trực quan.
     * Chủ động khóa các khung giờ bận việc cá nhân (nghỉ phép, việc gia đình, bồi dưỡng tay nghề) qua `POST /api/v1/freelancer/calendar/block` để hệ thống không cho khách đặt vào giờ đó.
     * Được hệ thống đảm bảo luôn có đủ thời gian đệm ($30\text{--}45\text{ phút}$) để di chuyển giữa các ca làm liên tiếp.
  3. **Studio Staff MUA (Thợ trang điểm trực thuộc Studio - `ROLE_AGENCY_STAFF`):**
     * Ca làm việc và lịch trực do Chủ Studio quản lý tập trung theo ca (`agency_staff_shifts`).
     * Không tự ý nhận cuốc tự do của sàn; khi khách đặt lịch gói của Studio (`AGENCY_DISPATCH`), Chủ Studio sẽ kiểm tra trạng thái Online, kỹ năng chuyên môn và phân công ca (`AGENCY_ASSIGNED` qua `ISSUE-19`).
     * Thợ Studio nhận thông báo điều phối trên app và bấm xác nhận ca.
  4. **Agency Owner / Studio Admin (Chủ Studio - `ROLE_AGENCY_ADMIN`):**
     * Tiếp nhận đơn hẹn trước chỉ định Studio (`PENDING_AGENCY_DISPATCH`).
     * Sử dụng Ma trận Điều phối (`ISSUE-19`) để lọc các thợ Studio đang **Online / trong ca trực**, kiểm tra không vướng lịch trong `mua_schema.mua_calendars` để gán thợ chính/thợ phụ.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Toàn bộ mã nguồn Luồng Đặt lịch Hẹn trước & Quản lý Lịch bận được tổ chức chuẩn hóa tại `code/backend/core-api/src/main/java/com/makeup/platform/`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at (@MappedSuperclass)
│   │   ├── BaseController.java                # Helper methods: ok(), created(), error()
│   │   ├── ApiResponse.java                   # Standard JSON envelope: {success, code, message, data, timestamp}
│   │   ├── PageResponse.java                  # Envelope phân trang chuẩn
│   │   ├── BaseService.java                   # Generic CRUD interface
│   │   └── BaseServiceImpl.java               # Generic CRUD implementation
│   ├── constants/
│   │   ├── CalendarConstants.java             # DEFAULT_WORK_DAY_START (06:00), DEFAULT_WORK_DAY_END (22:00), DEFAULT_BUFFER_MINUTES (30m), HOLD_DEPOSIT_MINUTES (15m), MAX_FUTURE_BOOKING_DAYS (90d)
│   │   └── ErrorCodes.java                    # ERR_SLOT_ALREADY_BOOKED, ERR_BUFFER_TIME_VIOLATION, ERR_DEPOSIT_PAYMENT_TIMEOUT, ERR_INVALID_TIME_RANGE...
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung toàn hệ thống
│   │   ├── CustomBusinessException.java       # Ngoại lệ nghiệp vụ ném kèm ErrorCodes và message key i18n
│   │   ├── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (HTTP 404)
│   │   └── AccessDeniedException.java         # Lỗi vi phạm phân quyền/IDOR (HTTP 403)
│   ├── validation/                            # CUSTOM BEAN VALIDATORS
│   │   ├── ValidTimeRange.java                # Annotation @ValidTimeRange kiểm tra endTime > startTime ở mức class DTO
│   │   ├── TimeRangeValidator.java            # Validator thực thi kiểm tra tính hợp lệ của khoảng thời gian
│   │   ├── ValidBookingTime.java              # Annotation @ValidBookingTime chặn chọn giờ ngoài khung 05:00 - 22:00
│   │   └── BookingTimeValidator.java          # Validator kiểm tra giờ đặt lịch hợp lệ
│   ├── i18n/
│   │   ├── CustomLocaleResolver.java          # Xác định ngôn ngữ từ Accept-Language / User Profile
│   │   └── JsonMessageSource.java             # Nạp file i18n JSON đa ngôn ngữ
│   └── utils/
│       ├── DateTimeIntervalUtils.java         # Thuật toán kiểm tra giao thoa 2 khoảng thời gian [start, end]
│       ├── HolidayCalendarUtils.java          # Nhận diện phụ phí Lễ/Tết cho các ngày đặt trong tương lai
│       └── SecurityContextUtils.java          # Trích xuất userId, role từ SecurityContext an toàn
│
├── config/
│   ├── RedissonConfig.java                    # Cấu hình RedissonClient phục vụ Distributed Lock chống race-condition
│   ├── SchedulingConfig.java                  # Cấu hình ThreadPoolTaskScheduler đa luồng phục vụ Cron Job
│   └── AsyncConfig.java                       # Cấu hình TaskExecutor đa luồng cho @Async và Transactional Event Listener
│
├── controller/                                # TẦNG CONTROLLER MỎNG (Thin Controller - phân theo Actor)
│   ├── customer/
│   │   └── CustomerScheduledBookingController.java # POST /api/v1/customer/bookings/scheduled, POST /api/v1/customer/bookings/{id}/deposit
│   ├── mua/
│   │   └── MUACalendarQueryController.java         # GET /api/v1/mua/{muaId}/available-slots (hỗ trợ step_minutes)
│   └── freelancer/
│       └── FreelancerCalendarController.java       # POST, GET, DELETE /api/v1/freelancer/calendar/block
│
├── dto/
│   ├── request/
│   │   ├── booking/
│   │   │   └── CreateScheduledBookingReq.java # packageId, bookingPartner, agencyId, muaId, bookingDate, startTime... (@ValidBookingTime)
│   │   └── mua/
│   │       ├── BlockCalendarSlotReq.java      # bookingDate, startTime, endTime, reason (@ValidTimeRange)
│   │       └── GetAvailableSlotsReq.java      # muaId, bookingDate, packageEstimatedDurationMinutes, stepMinutes
│   └── response/
│       ├── booking/
│       │   └── ScheduledBookingCreatedRes.java # bookingId, bookingCode, depositAmount, depositExpiredAt, scheduleSummary
│       └── mua/
│           ├── AvailableTimeSlotRes.java      # slotStartTime, slotEndTime, isAvailable, isBufferBlocked, unavailableReason
│           ├── MUACalendarSlotRes.java        # calendarId, bookingDate, startAt, endAt, reason
│           └── MUACalendarMonthRes.java       # Tổng hợp trạng thái rảnh/bận các ngày trong tháng
│
├── entity/
│   ├── booking/
│   │   └── BookingEntity.java                 # Map với table: booking_schema.bookings (@Version, depositExpiredAt)
│   └── mua/
│       └── MUACalendarEntity.java             # Map với table: mua_schema.mua_calendars (startAt, endAt TIMESTAMPTZ, isLocked)
│
├── mapper/                                    # TẦNG CHUYỂN ĐỔI DỮ LIỆU (MANUAL MAPPER @Component - Builder Pattern)
│   ├── booking/
│   │   └── ScheduledBookingMapper.java        # Manual Mapper: BookingEntity <-> DTOs (KHÔNG DÙNG MAPSTRUCT)
│   └── mua/
│       └── MUACalendarMapper.java             # Manual Mapper: MUACalendarEntity <-> DTOs (KHÔNG DÙNG MAPSTRUCT)
│
├── repository/
│   ├── booking/
│   │   └── BookingRepository.java             # findPending24hRemindersBatch, findPending2hRemindersBatch, cancelExpiredBookingIfPendingDeposit
│   └── mua/
│       └── MUACalendarRepository.java         # existsOverlappingSlot (TIMESTAMPTZ), deleteByBookingId
│
├── event/
│   ├── ScheduledBookingCreatedEvent.java      # Event bắn ra khi đơn hẹn trước tạo thành công (giữ cọc Escrow)
│   ├── BookingReminderEvent.java              # Event bắn ra khi cron quét đến mốc nhắc lịch 24h hoặc 2h
│   ├── BookingCancelledEvent.java             # Event bắn ra khi đơn bị hủy để tự động nhả slot calendar
│   └── BookingDepositExpiredEvent.java        # Event bắn ra khi đơn hết hạn thanh toán cọc 15 phút
│
├── listener/
│   ├── BookingReminderEventListener.java      # @Async + @TransactionalEventListener(AFTER_COMMIT) gửi thông báo nhắc lịch an toàn
│   └── BookingDepositExpiredListener.java     # @Async gửi WebSocket/Push thông báo cho khách hàng khi bị hủy đơn
│
└── service/                                   # TẦNG NGHIỆP VỤ LÕI (CHỨA 100% BUSINESS LOGIC)
    ├── booking/
    │   ├── ScheduledBookingService.java       # Interface tạo đơn hẹn trước, tính cọc, kiểm tra slot, xác nhận cọc
    │   ├── BookingReminderScheduler.java      # Cron Job quét nhắc lịch 24h/2h (Zero-Offset pagination, TTL 48h/24h)
    │   ├── BookingDepositExpirationScheduler.java # Cron Job quét hủy đơn quá hạn cọc 15 phút (Deadlock-free, Atomic Update)
    │   └── impl/
    │       └── ScheduledBookingServiceImpl.java # Thực thi nghiệp vụ đặt hẹn trước, xác nhận cọc, hủy đơn
    ├── mua/
    │   ├── MUACalendarService.java            # Interface kiểm tra lịch bận, sinh available-slots, khóa/mở slot
    │   └── impl/
    │       └── MUACalendarServiceImpl.java    # Thực thi thuật toán giao thoa TIMESTAMPTZ, buffer time, sinh slot động
    └── agency/
        ├── AgencyStaffCapacityService.java    # Interface kiểm tra năng lực nhân sự thợ Studio khả dụng
        └── impl/
            └── AgencyStaffCapacityServiceImpl.java # Code kiểm tra thợ Studio rảnh trước khi nhận AGENCY_DISPATCH
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-SCHED-01: Khách Hàng Đặt Lịch Hẹn Trước Cho Tương Lai (`ISSUE-18.1`)**
> **As a** Khách hàng có nhu cầu trang điểm cho sự kiện tương lai (tiệc cưới, sự kiện, kỷ yếu),  
> **I want to** chọn Thợ hoặc Studio yêu thích, kiểm tra các khung giờ còn trống trong ngày và đặt cọc 30% giữ chỗ,  
> **So that** tôi an tâm có chuyên gia make-up phục vụ đúng ngày giờ mong muốn mà không lo bị hết chỗ hoặc bị hủy đột xuất.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Đặt lịch hẹn trước trực tiếp với Thợ tự do thành công (Happy Path - FREELANCER_DIRECT)**
  * **Given** Khách hàng chọn Thợ tự do `mua_id = 89`, Gói dịch vụ Cô dâu Luxury (thời lượng ước tính: $90\text{ phút}$).
  * **And** Khách hàng xem lịch ngày `2026-10-20` thấy khung giờ bắt đầu lúc `08:30:00` sáng còn trống (chưa có lịch bận trong `mua_schema.mua_calendars`).
  * **When** Khách hàng gửi request `POST /api/v1/customer/bookings/scheduled`:
    ```json
    {
      "package_id": 45,
      "add_on_item_ids": [112],
      "booking_partner": "FREELANCER_DIRECT",
      "agency_id": null,
      "mua_id": 89,
      "booking_date": "2026-10-20",
      "start_time": "08:30:00",
      "destination_address": "Khách sạn Sheraton, 88 Đồng Khởi, Bến Nghé, Quận 1, TP.HCM",
      "destination_latitude": 10.77450000,
      "destination_longitude": 106.70320000,
      "voucher_code": null
    }
    ```
  * **Then** Hệ thống thực thi trong một Database Transaction duy nhất (`@Transactional`):
    1. **Kiểm tra ngày hẹn & khung giờ hợp lệ:** Ngày hẹn nằm trong $[D_{\text{now}} + 1, D_{\text{now}} + 90]$ và giờ hẹn nằm trong khung hoạt động của sàn/thợ ($05:00\text{--}22:00$).
    2. **Khóa phân tán Redisson (Concurrency Control):** Xác lập khóa phân tán Redis `lock:mua:calendar:89:2026-10-20` (chờ tối đa $3\text{s}$, tự giải phóng sau $5\text{s}$). Nếu slot đang được xử lý đồng thời bởi khách khác, ném `ERR_SLOT_BEING_RESERVED`.
    3. **Kiểm tra tính khả dụng của Slot theo mốc TIMESTAMPTZ (Chống ca vắt qua ngày & Double Buffering):**
       Khung giờ dịch vụ yêu cầu: `start_at = 2026-10-20T08:30:00+07:00`, `end_at = 2026-10-20T10:00:00+07:00` ($90\text{ phút}$).
       Hệ thống áp dụng khoảng đệm di chuyển $B = 30\text{ phút}$ để xác định cửa sổ kiểm tra tuyệt đối:
       $$\text{windowStart} = \text{start\_at} - 30\text{m} = \text{2026-10-20T08:00:00+07:00}$$
       $$\text{windowEnd} = \text{end\_at} + 30\text{m} = \text{2026-10-20T10:30:00+07:00}$$
       Truy vấn xác nhận không tồn tại bản ghi nào trong `mua_schema.mua_calendars` thỏa mãn $(c.\text{start\_at} < \text{windowEnd} \land c.\text{end\_at} > \text{windowStart})$. Xử lý hoàn hảo mọi trường hợp ca rạng sáng hoặc ca đêm muộn vắt qua ngày $D-1$ hoặc $D+1$.
    4. **Tính toán tài chính minh bạch:**
       - Giá gói niêm yết: $2,500,000\text{ VNĐ}$.
       - Dịch vụ đi kèm (Add-on 112): $80,000\text{ VNĐ}$.
       - Phí di chuyển (theo khoảng cách GPS): $45,000\text{ VNĐ}$.
       - Phụ phí (giờ sớm / ngày Lễ): $0\text{ VNĐ}$ (sau 5h sáng và không phải ngày Lễ).
       - Tổng hóa đơn: $2,625,000\text{ VNĐ}$.
       - Tiền cọc giữ trước ($30\%$): $787,500\text{ VNĐ}$. Số tiền còn lại trả sau: $1,837,500\text{ VNĐ}$.
    5. **Khởi tạo bản ghi Đơn hàng với Cơ chế Tạm Giữ Chỗ (Hold & Expire Flow):**
       - Chèn bản ghi vào `booking_schema.bookings` với `status = 'PENDING_DEPOSIT'`, `deposit_amount = 787500.00`, `deposit_expired_at = CURRENT_TIMESTAMP + INTERVAL '15 minutes'`.
       - Chèn bản ghi Audit Log vào `booking_schema.booking_history` (`from_status = null`, `to_status = 'PENDING_DEPOSIT'`, `note = 'Khách khởi tạo đơn hẹn trước, tạm giữ chỗ 15 phút để thanh toán cọc'`).
    6. **Tạm khóa lịch thợ trong CSDL (Lưu chuẩn TIMESTAMPTZ & PostgreSQL GiST Defense):**
       - Chèn bản ghi vào `mua_schema.mua_calendars` với `start_at = 2026-10-20T08:30:00+07:00`, `end_at = 2026-10-20T10:00:00+07:00`, `is_locked = true`, `reason = 'HELD_BK2610200830'`.
       - Chốt chặn **PostgreSQL Exclusion Constraint (`EXCLUDE USING gist`)** tự động bảo vệ ở mức Database, chặn đứng overbooking ngay cả khi lock Redis bị giải phóng sớm do sự cố mạng.
    7. **Giải phóng khóa Redisson trong khối `finally`.**
  * **And** Trả về HTTP `201 Created` kèm `deposit_expired_at` để Frontend kích hoạt đồng hồ đếm ngược 15 phút.
  * **And** Khi khách hoàn tất thanh toán cọc $30\%$ trong $15\text{ phút}$:
    - Trạng thái đơn chuyển sang `ACCEPTED`.
    - Lý do lịch thợ cập nhật thành `'BOOKING_BK2610200830'`.
    - Bắn sự kiện `ScheduledBookingCreatedEvent` qua Spring EventBus để gửi thông báo xác nhận lịch hẹn.

* **Scenario 02: Đặt lịch hẹn trước chỉ định Studio (AGENCY_DISPATCH Flow với Scope Lock & Capacity Guard)**
  * **Given** Khách hàng chọn Studio `agency_id = 12` cho gói chụp kỷ yếu nhóm vào ngày `2026-11-15` khung giờ `09:00 - 11:00`.
  * **When** Khách hàng gửi request đặt lịch với `booking_partner = 'AGENCY_DISPATCH'`, `agency_id = 12`, `mua_id = null`.
  * **Then** Hệ thống áp dụng **Khóa phân tán theo phạm vi khung giờ (Slot-Level Distributed Lock)**:
    `lock:agency:capacity:12:2026-11-15:09:00:00` (thay vì khóa cả ngày của Studio gây nghẽn cổ chai).
  * **And** Tầng nghiệp vụ gọi `AgencyStaffCapacityService.hasAvailableStaffForAgency(agencyId, date, startTime, endTime)`:
    - Nếu tất cả thợ thuộc Agency đã kín lịch hoặc đã được gán đơn trong khung giờ này $\rightarrow$ Từ chối và ném `CustomBusinessException(ErrorCodes.ERR_AGENCY_MAX_CAPACITY_REACHED, "agency.max_capacity_reached")`.
    - Nếu còn ít nhất 1 thợ rảnh $\rightarrow$ Hệ thống cho phép khởi tạo đơn hàng:
      - `booking_type = 'SCHEDULED'`
      - `booking_partner = 'AGENCY_DISPATCH'`
      - `status = 'PENDING_AGENCY_DISPATCH'` (chưa gán thợ cụ thể).
  * **And** Đơn hàng lập tức xuất hiện trong Hàng đợi Tiếp nhận của Web Studio Portal (`ISSUE-19.1`) để Chủ Studio duyệt và gán thợ chính/thợ phụ (`ISSUE-19.2`).
  * **And** Trả về HTTP `201 Created`.

* **Scenario 03: Tự động tính phụ phí Ngày Lễ/Tết và Giờ làm sớm cho lịch hẹn tương lai**
  * **Given** Khách hàng đặt lịch hẹn trang điểm vào lúc `04:30:00` sáng ngày `2027-01-01` (Tết Dương Lịch).
  * **When** Khách hàng gửi request đặt lịch hẹn trước.
  * **Then** Tầng nghiệp vụ gọi `HolidayCalendarUtils` và `DynamicPricingService`:
    - Áp dụng phụ phí làm sớm (`EARLY_MORNING` trước 5h sáng): $+150,000\text{ VNĐ}$.
    - Áp dụng phụ phí ngày Lễ Quốc gia (`HOLIDAY` Tết Dương Lịch): $+200,000\text{ VNĐ}$.
  * **And** Tổng phụ phí $350,000\text{ VNĐ}$ được cộng minh bạch vào hóa đơn tạm tính và tiền cọc ($30\%$) được tính toán chính xác trên tổng số tiền cuối cùng.

* **Scenario 04: Chặn đặt lịch trong quá khứ, ngoài giờ hoạt động hoặc vượt quá 90 ngày tới**
  * **When** Khách gửi `booking_date` là ngày hôm nay, ngày trong quá khứ, vượt quá 90 ngày hoặc `start_time` rơi vào ban đêm (23:00 - 04:00) không có thợ trực.
  * **Then** Tầng Bean Validation (`@Future`, `@ValidBookingTime`) hoặc Service phát hiện vi phạm.
  * **And** Ném `CustomBusinessException(ErrorCodes.ERR_BOOKING_DATE_TOO_FAR)` hoặc `ERR_BOOKING_TIME_OUT_OF_SERVICE`.
  * **And** Trả về HTTP `400 BAD_REQUEST`.

* **Scenario 05: [Sprint 5 Extension] Kiểm tra số dư ví khi tích hợp phân hệ Ví & Escrow**
  * **Given** Phân hệ Ví & Escrow (`wallet_schema`) đã được kích hoạt ở Sprint 5.
  * **When** Khách hàng xác nhận thanh toán cọc nhưng số dư khả dụng trong ví không đủ 30%.
  * **Then** Hệ thống ném `CustomBusinessException(ErrorCodes.ERR_WALLET_INSUFFICIENT_BALANCE, "wallet.insufficient_balance_for_deposit")`.
  * **And** Trả về HTTP `400 BAD_REQUEST` kèm thông báo hướng dẫn nạp tiền.

* **Scenario 06: Tự động hủy đơn và giải phóng slot khi quá hạn 15 phút không cọc (Hold & Expire Flow - Race & Deadlock Free)**
  * **Given** Đơn hàng `booking_id = 605` đang ở trạng thái `PENDING_DEPOSIT` và `deposit_expired_at < CURRENT_TIMESTAMP` (đã quá 15 phút chưa thanh toán cọc).
  * **When** Worker `BookingDepositExpirationScheduler` quét định kỳ mỗi 1 phút.
  * **Then** Worker thực thi độc lập cho từng đơn theo Transaction riêng (`Propagation.REQUIRES_NEW`):
    1. Kích hoạt câu lệnh cập nhật có điều kiện trạng thái nguyên tử (Atomic Conditional UPDATE):
       ```sql
       UPDATE booking_schema.bookings 
       SET status = 'CANCELLED_EXPIRED', updated_at = NOW() 
       WHERE id = 605 AND status = 'PENDING_DEPOSIT';
       ```
    2. **Nếu số dòng cập nhật $= 1$ (Hủy đơn thành công):**
       - Ghi Audit Log vào `booking_schema.booking_history` (`from_status = 'PENDING_DEPOSIT'`, `to_status = 'CANCELLED_EXPIRED'`, `note = 'Đơn bị hủy do quá hạn 15 phút không thanh toán tiền cọc'`).
       - Gọi `muaCalendarService.releaseSlotByBookingId(605)` để xóa bản ghi khóa slot tương ứng trong `mua_schema.mua_calendars`.
       - Bắn sự kiện `BookingDepositExpiredEvent` để gửi thông báo cho khách hàng qua WebSocket/App.
       - Khung giờ của thợ ngay lập tức mở rảnh trở lại trên hệ thống cho khách hàng khác vào đặt.
    3. **Nếu số dòng cập nhật $= 0$ (Xử lý Race-Condition phút 14:59):**
       - Tình huống khách hàng vừa thanh toán cọc thành công ở giây 14:59 (`status` đã chuyển sang `ACCEPTED` qua luồng `confirmDepositPayment`).
       - Worker phát hiện `rowsUpdated == 0`, **lập tức bỏ qua đơn hàng**, không nhả slot và không đảo ngược trạng thái đơn. Bảo vệ tuyệt đối quyền lợi đã cọc của khách hàng.
  * **And** Lỗi xử lý ở 1 đơn hàng (nếu có) được try-catch riêng biệt, hoàn toàn không làm gián đoạn hoặc rollback các đơn hàng khác trong danh sách quét.

---

### **US-SCHED-02: Lịch Bận Cá Nhân Thợ & Cơ Chế Khóa Trùng Ca (`ISSUE-18.2`)**
> **As a** Thợ Trang điểm (Freelancer hoặc Studio Staff) hoặc Hệ thống Đặt lịch,  
> **I want** hệ thống tự động khóa lịch khi có khách đặt và cho phép tôi chủ động đăng ký các khung giờ bận việc cá nhân,  
> **So that** không bao giờ xảy ra tình trạng 2 khách đặt trùng giờ và tôi không bị làm phiền vào các ngày nghỉ phép của mình.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Chặn đặt lịch khi bị trùng giờ với ca làm đã có từ trước (Overlap Prevention)**
  * **Given** Thợ `mua_id = 89` đã có ca làm từ `09:00:00` đến `11:00:00` ngày `2026-10-20` trong `mua_schema.mua_calendars`.
  * **When** Khách hàng B gửi request đặt ca lúc `10:00:00` đến `11:30:00` cùng ngày với thợ đó.
  * **Then** Hệ thống kích hoạt thuật toán kiểm tra giao thoa:
    $$\max(09:00, 10:00) < \min(11:00, 11:30) \implies 10:00 < 11:00 \quad (\text{Giao thoa khung giờ!})$$
  * **And** Từ chối thao tác, ném `CustomBusinessException(ErrorCodes.ERR_SLOT_ALREADY_BOOKED, "booking.slot_already_booked")`.
  * **And** Trả về HTTP `409 CONFLICT` với thông điệp: `"Thợ trang điểm đã có ca làm việc khác trong khung giờ này. Vui lòng chọn khung giờ khác!"`.

* **Scenario 02: Chặn đặt lịch do vi phạm khoảng đệm di chuyển (Buffer Time Violation)**
  * **Given** Thợ kết thúc ca làm trước lúc `10:00:00` tại Quận 7. Khoảng đệm di chuyển quy định tối thiểu là $30\text{ phút}$.
  * **When** Khách hàng đặt ca mới bắt đầu lúc `10:15:00` (chỉ cách 15 phút, thợ không thể kịp di chuyển đến địa điểm mới).
  * **Then** Backend phát hiện vi phạm khoảng đệm: $10:15:00 < (10:00:00 + 30\text{ phút})$.
  * **And** Ném `CustomBusinessException(ErrorCodes.ERR_BUFFER_TIME_VIOLATION, "booking.buffer_time_violation")`.
  * **And** Trả về HTTP `409 CONFLICT`.

* **Scenario 03: Thợ tự chủ động khóa lịch bận cá nhân theo mốc TIMESTAMPTZ (Block Personal Busy Slot)**
  * **Given** Thợ có kế hoạch nghỉ phép hoặc việc gia đình cả ngày `2026-12-25` (Lễ Giáng Sinh).
  * **When** Thợ gọi API `POST /api/v1/freelancer/calendar/block`:
    ```json
    {
      "booking_date": "2026-12-25",
      "start_time": "00:00:00",
      "end_time": "23:59:59",
      "reason": "Nghỉ phép cá nhân dịp Lễ Giáng Sinh cùng gia đình"
    }
    ```
  * **Then** Hệ thống kiểm tra hợp lệ bằng Custom Validator `@ValidTimeRange` (`endTime > startTime`) ngay tại tầng Controller.
  * **And** Chuyển đổi sang `start_at = 2026-12-25T00:00:00+07:00` và `end_at = 2026-12-25T23:59:59+07:00`.
  * **And** Kiểm tra không giao thoa với bất kỳ ca khách đã đặt nào và chèn bản ghi vào `mua_schema.mua_calendars` với `mua_id = <current_mua_id>`, `booking_id = null`, `is_locked = true`.
  * **And** Trên giao diện của khách hàng, toàn bộ ngày `2026-12-25` của thợ này lập tức chuyển sang trạng thái Disabled, không ai có thể đặt hẹn.
  * **And** Trả về HTTP `201 Created` kèm thông điệp i18n `calendar.slot_blocked_success`.

* **Scenario 04: Thợ mở lại slot bận cá nhân đã khóa trước đó**
  * **When** Thợ gọi `DELETE /api/v1/freelancer/calendar/block/{calendarId}`.
  * **Then** Hệ thống kiểm tra quyền sở hữu bản ghi (IDOR Protection) và kiểm tra đây là slot do thợ tự khóa (`booking_id IS NULL`).
  * **And** Nếu bản ghi gắn với đơn hàng của khách (`booking_id IS NOT NULL`), hệ thống từ chối và ném lỗi `ERR_CANNOT_UNBLOCK_BOOKED_SLOT`.
  * **And** Nếu hợp lệ, xóa bản ghi khỏi `mua_schema.mua_calendars`, khung giờ mở lại trạng thái rảnh đón khách.
  * **And** Trả về HTTP `200 OK` kèm thông điệp i18n `calendar.slot_unblocked_success`.

* **Scenario 05: Tự động giải phóng slot lịch khi đơn hẹn trước bị hủy (Booking Cancellation Flow)**
  * **Given** Đơn hàng hẹn trước `booking_id = 605` đã được duyệt trước đó và đã có bản ghi khóa lịch trong `mua_schema.mua_calendars`.
  * **When** Khách hàng hoặc Thợ thực hiện hủy đơn hợp lệ (chuyển trạng thái đơn thành `CANCELLED`), hệ thống bắn sự kiện `BookingCancelledEvent(bookingId = 605)`.
  * **Then** `ReleaseSlotOnBookingCancelledListener` lắng nghe sự kiện và gọi `MUACalendarService.releaseSlotByBookingId(605)`:
    - Tìm và xóa bản ghi tương ứng trong `mua_schema.mua_calendars` theo `booking_id = 605` (sử dụng chỉ mục `idx_mua_calendars_booking_id`).
  * **And** Khung giờ của Thợ lập tức mở rảnh trở lại trên hệ thống, cho phép khách hàng khác tra cứu và đặt lịch.

---

### **US-SCHED-03: Scheduler Cron Job Tự Động Nhắc Lịch Ca Hẹn Trước 24h & 2h (`ISSUE-18.3`)**
> **As a** Khách hàng và Thợ trang điểm có ca hẹn sắp tới,  
> **I want** hệ thống tự động gửi thông báo nhắc nhở trước 24 giờ và trước 2 giờ trước khi ca làm bắt đầu theo cơ chế batching phân trang không nghẽn luồng và không trôi dữ liệu,  
> **So that** thợ chuẩn bị đầy đủ cốp đồ nghề lên đường đúng giờ và khách hàng chuẩn bị sẵn sàng không gian làm đẹp.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Tự động gửi thông báo nhắc lịch trước 24 giờ (Zero-Offset Pagination Batching & After-Commit Event)**
  * **Given** Đơn hàng `booking_id = 605` có lịch hẹn lúc `09:00:00` sáng ngày mai (`2026-10-20`).
  * **And** Trạng thái đơn là `ACCEPTED` và cờ `reminder_24h_sent = false`.
  * **When** Cron Job `@Scheduled(cron = "0 */15 * * * *")` quét định kỳ.
  * **Then** Worker thực thi vòng lặp phân trang `do-while` **luôn truy vấn ở trang đầu tiên `PageRequest.of(0, 100)`** cho đến khi tập kết quả rỗng:
    - *Lý do chuẩn hóa Zero-Offset:* Khi mỗi đơn hàng được cập nhật `reminder_24h_sent = true`, nó sẽ lập tức rơi khỏi điều kiện lọc `reminder_24h_sent = FALSE`. Việc luôn query tại trang `0` đảm bảo các bản ghi tiếp theo tự động trôi về đầu danh sách, triệt tiêu hoàn toàn lỗi trôi Offset (bỏ sót 50% số đơn hàng nếu tăng số trang).
  * **And** Mỗi bản ghi được bảo vệ bằng Redis Idempotency Key `lock:reminder:24h:605` với **TTL 48 giờ** (`SET NX EX Duration.ofHours(48)`), đảm bảo không bao giờ bị quét phát trùng.
  * **And** Cập nhật cờ `reminder_24h_sent = true` trên bảng `booking_schema.bookings` theo từng Transaction độc lập (`REQUIRES_NEW`).
  * **And** Bắn Event `BookingReminderEvent(bookingId = 605, type = REMINDER_24H)`.
  * **And** Tầng Listener sử dụng `@Async("taskExecutor")` kết hợp `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` để chỉ gửi WebSocket/Push notification sau khi DB đã commit thành công. Lỗi gửi tin nhắn qua mạng tuyệt đối không làm rollback transaction của DB.

* **Scenario 02: Tự động gửi thông báo nhắc lịch khẩn cấp trước 2 giờ (Reminder 2h Flow & TTL 24h)**
  * **Given** Đơn hàng `booking_id = 605` có lịch làm lúc `09:00:00`, thời điểm hiện tại là `07:00:00` sáng cùng ngày.
  * **And** Cờ `reminder_2h_sent = false`.
  * **When** Cron Job quét lúc 07:00 theo cơ chế Zero-Offset pagination batching (`PageRequest.of(0, 100)`).
  * **Then** Worker kích hoạt thông báo nhắc 2 giờ cho thợ và khách:
    - **Thợ trang điểm:** `"🚗 Chuẩn bị xuất phát: Ca hẹn của bạn sẽ bắt đầu sau 2 tiếng nữa (09:00). Nhớ bấm 'Bắt đầu đi' khi xuất phát để khách theo dõi lộ trình nhé!"`.
    - **Khách hàng:** `"✨ Thợ trang điểm Lê Bảo Ngọc đang chuẩn bị đồ nghề và sẽ có mặt tại điểm hẹn trước 09:00 sáng nay."`.
  * **And** Cập nhật cờ `reminder_2h_sent = true` và thiết lập Redis key `lock:reminder:2h:605` với **TTL 24 giờ** (`Duration.ofHours(24)`).
  * **And** Đẩy thông báo qua Transactional Event Listener xử lý bất đồng bộ sau khi commit thành công.

* **Scenario 03: Chống gửi trùng lặp thông báo trong môi trường phân tán (Redis Idempotency Guard 48h/24h)**
  * **Given** Môi trường cụm triển khai nhiều máy chủ (Cluster Node A và Node B cùng chạy song song).
  * **When** Worker trên Node A bắt đầu quét và xử lý đơn 605.
  * **Then** Worker thiết lập Redis Key `lock:reminder:24h:605` với TTL 48 giờ bằng lệnh `SET NX EX`.
  * **And** Node B quét thấy key đã tồn tại $\rightarrow$ Bỏ qua không gửi lại.
  * **And** Người dùng tuyệt đối không bao giờ nhận 2 thông báo nhắc nhở giống hệt nhau.

---

### **US-SCHED-UI-01: Trải Nghiệm Khách Hàng Chọn Ngày Giờ & Đặt Lịch Hẹn Trước (UI/UX Flow)**
> **As a** Khách hàng trên ứng dụng Web/Mobile,  
> **I want to** thao tác trên giao diện chọn ngày giờ trực quan, sang trọng và mượt mà,  
> **So that** tôi thấy ngay khung giờ nào thợ còn rảnh để lựa chọn nhanh chóng và an tâm hoàn tất đặt hẹn.

#### **Tiêu chí Nghiệm thu UI/UX (Luxury Beauty Design System):**
* **AC-01 (Màn hình Lịch Tháng - Date Picker Component):**
  * Tông màu chủ đạo **Luxury Beauty / Glamour Aesthetic** (Nền trắng kem `#FFFDF9`, điểm nhấn Rose Gold `#E0A96D`, viền vàng tinh tế).
  * Các ngày quá khứ bị làm mờ (Disabled). Những ngày thợ đã kín lịch hiển thị dấu chấm đỏ hoặc nhãn "Kín lịch". Những ngày còn slot trống hiển thị dấu chấm xanh ngọc bích.
* **AC-02 (Danh sách Khung giờ Trong Ngày - Time Slots Picker):**
  * Khi khách hàng nhấp vào 1 ngày $\rightarrow$ Mở rộng danh sách các Slot giờ (mỗi slot tương ứng với thời lượng gói dịch vụ $+ 30\text{ phút}$ đệm di chuyển):
    - `[07:00 - 08:30]` $\rightarrow$ Nút bấm sáng màu, viền Rose Gold: "Còn trống".
    - `[09:00 - 10:30]` $\rightarrow$ Nút xám mờ (Disabled) kèm nhãn: "Đã có khách đặt".
    - `[14:00 - 15:30]` $\rightarrow$ Nút bấm sáng màu: "Còn trống".
  * Khi chọn 1 slot rảnh $\rightarrow$ Tự động kích hoạt hiệu ứng cuộn mượt xuống Bảng Tổng kết Chi phí & Đặt cọc.
* **AC-03 (Bảng Tổng kết Chi phí & Đặt cọc):**
  * Hiển thị minh bạch: Giá gốc gói, phí di chuyển ước tính, phụ phí làm sớm/Lễ Tết (nếu có), tổng số tiền, số tiền cọc 30% cần thanh toán, số tiền 70% thanh toán sau khi hoàn thành.
  * Nút "Xác nhận & Đặt hẹn" hiển thị trạng thái Loading khi gửi request.

---

### **US-SCHED-UI-02: Giao Diện Thợ Trang Điểm Quản Lý Lịch Làm Việc & Khóa Lịch Bận**
> **As a** Thợ Trang điểm (Freelancer hoặc Staff Studio),  
> **I want** xem lịch làm việc tổng quan theo tuần/tháng và dễ dàng khóa các khung giờ bận cá nhân trên điện thoại/máy tính,  
> **So that** tôi chủ động sắp xếp thời gian biểu cá nhân và không bị khách đặt vào ngày nghỉ.

#### **Tiêu chí Nghiệm thu UI/UX:**
* **AC-01 (MUA Calendar Dashboard):**
  * Hiển thị dạng Timeline hoặc Lưới Tuần (Week View).
  * Các ca làm từ đơn hàng của khách hiển thị màu tím pastel hoặc xanh lam kèm thông tin khách và địa chỉ.
  * Các slot do thợ tự khóa hiển thị màu xám sọc kèm lý do bận cá nhân.
* **AC-02 (Modal Khóa Lịch Bận Nhanh):**
  * Nút bấm "Khóa lịch bận" nổi bật.
  * Form gồm: Chọn ngày, Giờ bắt đầu, Giờ kết thúc, Lý do bận (có gợi ý nhanh: "Việc gia đình", "Nghỉ phép cá nhân", "Ốm đau / Khám bệnh").
  * Xác thực form tức thời bằng Zod schema phía client trước khi gửi API.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI BACK-END

Tất cả các lỗi nghiệp vụ được xử lý chuẩn hóa qua `GlobalExceptionHandler.java` kế thừa cấu trúc JSON phong bì chuẩn:

```json
{
  "success": false,
  "code": "ERR_SLOT_ALREADY_BOOKED",
  "message": "Thợ trang điểm đã có ca làm việc khác trong khung giờ này. Vui lòng chọn khung giờ khác!",
  "errors": [],
  "timestamp": "2026-09-16T17:00:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Phân hệ Scheduled Booking & Calendar

| HTTP Status | Mã Lỗi (`code`) | Message Key i18n | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_PAST_DATE_NOT_ALLOWED` | `booking.date_must_be_future` | Khách chọn ngày hoặc giờ hẹn trong quá khứ so với thời điểm hiện tại. | Bean Validation chặn lại ngay tại tầng Controller DTO. |
| **`400 BAD_REQUEST`** | `ERR_BOOKING_DATE_TOO_FAR` | `booking.date_too_far` | Đặt lịch hẹn quá xa (vượt quá giới hạn tối đa 90 ngày của sàn). | Ném `CustomBusinessException`, yêu cầu chọn trong 90 ngày tới. |
| **`400 BAD_REQUEST`** | `ERR_BOOKING_TIME_OUT_OF_SERVICE` | `booking.time_out_of_service` | Giờ hẹn rơi vào ban đêm ngoài khung hoạt động ($23:00\text{--}05:00$). | Chặn bởi `@ValidBookingTime`. |
| **`400 BAD_REQUEST`** | `ERR_INVALID_TIME_RANGE` | `calendar.invalid_time_range` | Giờ kết thúc nhỏ hơn hoặc bằng giờ bắt đầu (`endTime <= startTime`). | Chặn bởi Custom Class Validator `@ValidTimeRange`. |
| **`400 BAD_REQUEST`** | `ERR_DEPOSIT_PAYMENT_TIMEOUT` | `booking.deposit_payment_timeout` | Quá thời hạn $15\text{ phút}$ giữ chỗ nhưng khách chưa cọc. | Ném lỗi, hủy đơn và giải phóng slot lịch. |
| **`400 BAD_REQUEST`** | `ERR_CANNOT_UNBLOCK_BOOKED_SLOT` | `calendar.cannot_unblock_booked_slot` | Thợ cố tình xóa bản ghi lịch bận gắn liền với một đơn hàng đã có khách đặt (`booking_id IS NOT NULL`). | Chặn thao tác xóa, yêu cầu xử lý qua quy trình hủy đơn chuẩn. |
| **`400 BAD_REQUEST`** | `ERR_WALLET_INSUFFICIENT_BALANCE` | `wallet.insufficient_balance_for_deposit` | [Sprint 5] Số dư ví không đủ thanh toán cọc 30%. | Ném ngoại lệ yêu cầu nạp thêm tiền vào ví. |
| **`404 NOT_FOUND`** | `ERR_MUA_NOT_FOUND` | `mua.not_found` | `mua_id` của Thợ không tồn tại trong hệ thống. | Ném `ResourceNotFoundException("mua.not_found")`. |
| **`409 CONFLICT`** | `ERR_SLOT_ALREADY_BOOKED` | `booking.slot_already_booked` | Khung giờ chọn bị trùng khớp hoặc giao thoa với ca làm đã có trong `mua_schema.mua_calendars`. | Báo bận, yêu cầu khách chọn khung giờ khác. |
| **`409 CONFLICT`** | `ERR_BUFFER_TIME_VIOLATION` | `booking.buffer_time_violation` | Khung giờ chọn quá sát với ca làm liền trước/liền sau ($< 30\text{ phút}$ đệm di chuyển). | Báo lỗi không đủ thời gian di chuyển giữa 2 ca. |
| **`409 CONFLICT`** | `ERR_SLOT_BEING_RESERVED` | `booking.slot_being_reserved` | Khung giờ đang có khách khác thao tác đặt đồng thời (Redisson Lock tranh chấp). | Yêu cầu thử lại sau ít giây. |
| **`409 CONFLICT`** | `ERR_AGENCY_MAX_CAPACITY_REACHED` | `agency.max_capacity_reached` | Toàn bộ thợ thuộc Studio đều đã kín ca làm việc trong khung giờ yêu cầu. | Từ chối đặt hẹn, gợi ý khách chọn giờ khác. |
| **`409 CONFLICT`** | `ERR_CALENDAR_ALREADY_BLOCKED` | `calendar.already_blocked` | Thợ tự khóa lịch bận nhưng khoảng thời gian đó đã được khóa từ trước. | Chặn tạo bản ghi trùng lặp trong DB. |

---

### 4.2. Bảng Đồng Bộ Khóa Đa Ngôn Ngữ (System-Wide i18n JSON Keys)

Tuân thủ nghiêm ngặt **Quy chuẩn 5 (System-Wide Internationalization - i18n)**, mọi thông báo phải được khai báo đồng thời tại cả 2 file:

| Message Key | Tiếng Việt (`messages_vi.json`) | Tiếng Anh (`messages_en.json`) |
| :--- | :--- | :--- |
| `booking.schedule_create_success` | `"Đặt lịch hẹn thành công! Thợ đã được giữ chỗ cho bạn trong 15 phút."` | `"Scheduled booking created successfully! Provider reserved for you for 15 minutes."` |
| `booking.deposit_payment_timeout` | `"Đã hết thời hạn 15 phút thanh toán cọc. Đơn hàng đã bị hủy và slot lịch đã được giải phóng!"` | `"The 15-minute deposit payment window has expired. Booking cancelled and slot released!"` |
| `booking.slot_already_booked` | `"Thợ trang điểm đã có ca làm việc khác trong khung giờ này. Vui lòng chọn khung giờ khác!"` | `"The beauty artist is already booked for this time slot. Please choose another slot!"` |
| `booking.buffer_time_violation` | `"Không đủ thời gian di chuyển giữa 2 ca làm (tối thiểu 30 phút). Vui lòng chọn khung giờ khác!"` | `"Insufficient transit buffer between bookings (minimum 30 minutes required). Please select another slot!"` |
| `booking.slot_being_reserved` | `"Khung giờ này đang có khách khác tiến hành đặt giữ chỗ. Vui lòng thử lại sau ít giây!"` | `"This slot is currently being reserved by another customer. Please try again in a few moments!"` |
| `agency.max_capacity_reached` | `"Studio đã kín lịch toàn bộ thợ trong khung giờ này. Vui lòng chọn khung giờ khác!"` | `"The studio has reached full artist capacity for this time slot. Please choose another slot!"` |
| `calendar.invalid_time_range` | `"Giờ kết thúc ca bận phải sau giờ bắt đầu!"` | `"End time must be strictly after start time!"` |
| `booking.time_out_of_service` | `"Khung giờ hẹn nằm ngoài thời gian làm việc cho phép (05:00 - 22:00)!"` | `"Requested booking time is outside of operational hours (05:00 - 22:00)!"` |
| `booking.date_must_be_future` | `"Ngày hẹn phải nằm trong tương lai (từ ngày mai trở đi)."` | `"Booking date must be in the future (starting tomorrow)."` |
| `booking.date_too_far` | `"Ngày hẹn không được vượt quá 90 ngày kể từ hôm nay."` | `"Booking date cannot exceed 90 days from today."` |
| `calendar.slot_blocked_success` | `"Đã khóa lịch bận cá nhân thành công!"` | `"Personal busy slot blocked successfully!"` |
| `calendar.slot_unblocked_success` | `"Đã mở lại khung giờ làm việc thành công!"` | `"Time slot unblocked and opened successfully!"` |
| `calendar.slot_released_success` | `"Đã giải phóng khung giờ làm việc do hủy đơn thành công!"` | `"Time slot released successfully due to booking cancellation!"` |
| `calendar.cannot_unblock_booked_slot` | `"Không thể mở khóa khung giờ đã được khách hàng đặt trước. Vui lòng xử lý qua luồng hủy đơn!"` | `"Cannot unblock a slot tied to an active customer booking. Please use the booking cancellation flow!"` |
| `calendar.slots_retrieved_success` | `"Lấy danh sách khung giờ rảnh thành công."` | `"Available time slots retrieved successfully."` |

---

### 4.3. Mã Nguồn Validation DTO Mẫu (Bean Validation Tuân Thủ i18n & Custom Class Validators)

#### DTO Đặt Lịch Hẹn Trước: `CreateScheduledBookingReq.java`
```java
package com.makeup.platform.dto.request.booking;

import com.makeup.platform.common.validation.ValidBookingTime;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateScheduledBookingReq {

    @NotNull(message = "{booking.package_id.required}")
    private Long packageId;

    private List<Long> addOnItemIds;

    @NotBlank(message = "{booking.partner.required}")
    @Pattern(regexp = "^(FREELANCER_DIRECT|AGENCY_DISPATCH)$", message = "{booking.partner.invalid}")
    private String bookingPartner;

    private Long agencyId;

    private Long muaId;

    @NotNull(message = "{booking.date.required}")
    @Future(message = "{booking.date.must_be_future}")
    private LocalDate bookingDate;

    @NotNull(message = "{booking.start_time.required}")
    @ValidBookingTime(message = "{booking.time_out_of_service}")
    private LocalTime startTime;

    @NotBlank(message = "{booking.destination_address.required}")
    @Size(max = 255, message = "{booking.destination_address.max_length}")
    private String destinationAddress;

    @NotNull(message = "{booking.latitude.required}")
    @DecimalMin(value = "8.0", message = "{booking.latitude.out_of_range}")
    @DecimalMax(value = "24.0", message = "{booking.latitude.out_of_range}")
    private BigDecimal destinationLatitude;

    @NotNull(message = "{booking.longitude.required}")
    @DecimalMin(value = "102.0", message = "{booking.longitude.out_of_range}")
    @DecimalMax(value = "110.0", message = "{booking.longitude.out_of_range}")
    private BigDecimal destinationLongitude;

    private String voucherCode;
}
```

#### DTO Thợ Khóa Lịch Bận Cá Nhân: `BlockCalendarSlotReq.java` (Có `@ValidTimeRange`)
```java
package com.makeup.platform.dto.request.mua;

import com.makeup.platform.common.validation.ValidTimeRange;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ValidTimeRange(message = "{calendar.invalid_time_range}") // Class-level custom validator
public class BlockCalendarSlotReq {

    @NotNull(message = "{calendar.booking_date.required}")
    @FutureOrPresent(message = "{calendar.booking_date.must_be_future_or_present}")
    private LocalDate bookingDate;

    @NotNull(message = "{calendar.start_time.required}")
    private LocalTime startTime;

    @NotNull(message = "{calendar.end_time.required}")
    private LocalTime endTime;

    @NotBlank(message = "{calendar.reason.required}")
    @Size(max = 255, message = "{calendar.reason.max_length}")
    private String reason;
}
```

---

## 💻 5. ĐẶC TẢ REST API CONTRACTS & SERVICE INTERFACES

---

### 5.1. `POST /api/v1/customer/bookings/scheduled` (Tạo Đơn Hẹn Trước Cho Tương Lai)
* **Quyền truy cập:** `ROLE_CUSTOMER`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "package_id": 45,
  "add_on_item_ids": [112],
  "booking_partner": "FREELANCER_DIRECT",
  "agency_id": null,
  "mua_id": 89,
  "booking_date": "2026-10-20",
  "start_time": "08:30:00",
  "destination_address": "Khách sạn Sheraton, 88 Đồng Khởi, Bến Nghé, Quận 1, TP.HCM",
  "destination_latitude": 10.77450000,
  "destination_longitude": 106.70320000,
  "voucher_code": null
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "code": "SCHEDULED_BOOKING_CREATED",
  "message": "Đặt lịch hẹn thành công! Thợ đã được giữ chỗ cho bạn trong 15 phút.",
  "data": {
    "booking_id": 605,
    "booking_code": "BK-261020-SHERATON",
    "status": "PENDING_DEPOSIT",
    "deposit_expired_at": "2026-09-16T17:15:00Z",
    "booking_type": "SCHEDULED",
    "booking_partner": "FREELANCER_DIRECT",
    "booking_date": "2026-10-20",
    "start_time": "08:30:00",
    "estimated_end_time": "10:00:00",
    "package_name": "Gói Trang Điểm Cô Dâu Luxury 2026",
    "assigned_mua": {
      "mua_id": 89,
      "full_name": "Lê Bảo Ngọc (Pro MUA)",
      "phone_number": "0987123456",
      "avatar_url": "https://res.cloudinary.com/makeup/image/upload/v1/avatars/mua89.jpg"
    },
    "financial_summary": {
      "service_subtotal": 2580000.00,
      "distance_fee": 45000.00,
      "surcharge_fee": 0.00,
      "discount_amount": 0.00,
      "total_amount": 2625000.00,
      "deposit_amount": 787500.00,
      "remaining_amount": 1837500.00
    },
    "reminders": {
      "reminder_24h_at": "2026-10-19T08:30:00Z",
      "reminder_2h_at": "2026-10-20T06:30:00Z"
    }
  },
  "timestamp": "2026-09-16T17:00:00Z"
}
```

---

### 5.2. `GET /api/v1/mua/{muaId}/available-slots` (Tra Cứu Slot Trống Sinh Động Theo Step)
* **Quyền truy cập:** `permitAll` (Công khai cho mọi người dùng).
* **Query Parameters:** `date=2026-10-20`, `duration_minutes=90`, `step_minutes=30` (mặc định bước nhảy $30\text{ phút}$).
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "AVAILABLE_SLOTS_RETRIEVED",
  "message": "Lấy danh sách khung giờ rảnh thành công.",
  "data": {
    "mua_id": 89,
    "booking_date": "2026-10-20",
    "step_minutes": 30,
    "buffer_time_minutes": 30,
    "slots": [
      {
        "slot_start": "06:30:00",
        "slot_end": "08:00:00",
        "is_available": true,
        "is_buffer_blocked": false,
        "is_early_morning": false
      },
      {
        "slot_start": "08:00:00",
        "slot_end": "09:30:00",
        "is_available": false,
        "is_buffer_blocked": true,
        "unavailable_reason": "Vướng khoảng đệm di chuyển 30 phút của ca hẹn kế tiếp"
      },
      {
        "slot_start": "08:30:00",
        "slot_end": "10:00:00",
        "is_available": false,
        "is_buffer_blocked": false,
        "unavailable_reason": "Đã có khách đặt ca hẹn"
      },
      {
        "slot_start": "10:30:00",
        "slot_end": "12:00:00",
        "is_available": true,
        "is_buffer_blocked": false,
        "is_early_morning": false
      }
    ]
  },
  "timestamp": "2026-09-16T17:00:01Z"
}
```

---

### 5.3. `POST /api/v1/freelancer/calendar/block` (Thợ Tự Khóa Lịch Bận Cá Nhân)
* **Quyền truy cập:** `ROLE_FREELANCE_MUA` hoặc `ROLE_AGENCY_STAFF`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "booking_date": "2026-12-25",
  "start_time": "00:00:00",
  "end_time": "23:59:59",
  "reason": "Nghỉ phép cá nhân dịp Lễ Giáng Sinh cùng gia đình"
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "code": "CALENDAR_SLOT_BLOCKED",
  "message": "Đã khóa lịch bận cá nhân thành công!",
  "data": {
    "calendar_id": 142,
    "mua_id": 89,
    "booking_date": "2026-12-25",
    "start_at": "2026-12-25T00:00:00+07:00",
    "end_at": "2026-12-25T23:59:59+07:00",
    "reason": "Nghỉ phép cá nhân dịp Lễ Giáng Sinh cùng gia đình"
  },
  "timestamp": "2026-09-16T17:00:02Z"
}
```

---

### 5.4. `DELETE /api/v1/freelancer/calendar/block/{calendarId}` (Mở Khóa Slot Bận Cá Nhân)
* **Quyền truy cập:** `ROLE_FREELANCE_MUA` hoặc `ROLE_AGENCY_STAFF`.
* **Headers:** `Authorization: Bearer <JWT>`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "CALENDAR_SLOT_UNBLOCKED",
  "message": "Đã mở lại khung giờ làm việc thành công!",
  "data": null,
  "timestamp": "2026-09-16T17:00:03Z"
}
```

---

### 5.5. Hợp Đồng Service Interfaces (`service/` Package)

#### `ScheduledBookingService.java`:
```java
package com.makeup.platform.service.booking;

import com.makeup.platform.dto.request.booking.CreateScheduledBookingReq;
import com.makeup.platform.dto.response.booking.ScheduledBookingCreatedRes;

public interface ScheduledBookingService {

    /**
     * Tạo đơn đặt lịch hẹn trước cho tương lai (tạm giữ slot 15 phút với status PENDING_DEPOSIT)
     */
    ScheduledBookingCreatedRes createScheduledBooking(Long customerId, CreateScheduledBookingReq req);

    /**
     * Xác nhận thanh toán cọc thành công -> chuyển đơn sang ACCEPTED và chốt slot lịch
     */
    void confirmDepositPayment(Long bookingId);

    /**
     * Quét và hủy các đơn quá hạn 15 phút chưa cọc, giải phóng slot cho khách khác
     */
    void expireUnpaidScheduledBookings();
}
```

#### `MUACalendarService.java`:
```java
package com.makeup.platform.service.mua;

import com.makeup.platform.dto.request.mua.BlockCalendarSlotReq;
import com.makeup.platform.dto.response.mua.AvailableTimeSlotRes;
import com.makeup.platform.dto.response.mua.MUACalendarMonthRes;
import com.makeup.platform.dto.response.mua.MUACalendarSlotRes;

import java.time.LocalDate;
import java.time.ZonedDateTime;

public interface MUACalendarService {

    /**
     * Tra cứu các slot rảnh trong ngày của thợ với thuật toán sinh động theo stepMinutes (Public API)
     */
    AvailableTimeSlotRes getAvailableSlots(Long muaId, LocalDate date, Integer durationMinutes, Integer stepMinutes);

    /**
     * Thợ chủ động khóa slot bận cá nhân
     */
    MUACalendarSlotRes blockPersonalSlot(Long muaId, BlockCalendarSlotReq req);

    /**
     * Mở lại slot bận cá nhân đã khóa
     */
    void unblockPersonalSlot(Long muaId, Long calendarId);

    /**
     * Kiểm tra giao thoa khoảng thời gian TIMESTAMPTZ có tính buffer time di chuyển (chống ca vắt ngày)
     */
    boolean isSlotAvailableWithBuffer(Long muaId, ZonedDateTime startAt, ZonedDateTime endAt, int bufferMinutes);

    /**
     * Tự động khóa lịch khi có đơn hàng được tạo thành công (Lưu chuẩn TIMESTAMPTZ)
     */
    void lockSlotForBooking(Long muaId, Long bookingId, ZonedDateTime startAt, ZonedDateTime endAt, String reason);

    /**
     * Tự động giải phóng slot lịch khi đơn hàng bị hủy hoặc quá hạn cọc 15 phút
     */
    void releaseSlotByBookingId(Long bookingId);
}
```

#### `AgencyStaffCapacityService.java`:
```java
package com.makeup.platform.service.agency;

import java.time.LocalDate;
import java.time.LocalTime;

public interface AgencyStaffCapacityService {

    /**
     * Kiểm tra Studio có còn ít nhất 1 thợ rảnh trong ca trực vào khung giờ yêu cầu hay không
     */
    boolean hasAvailableStaffForAgency(Long agencyId, LocalDate date, LocalTime startTime, LocalTime endTime);
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16 & FLYWAY STANDARD)

Tuân thủ nghiêm ngặt **Quy chuẩn 2.9 (Database Migration với Flyway - Timestamp Versioning)**, script migration mới được đặt tên theo quy tắc:
`code/backend/core-api/src/main/resources/db/migration/V20260916170000__Create_Mua_Calendars_And_Booking_Reminders.sql`

```sql
-- ==============================================================================
-- Migration: V20260916170000__Create_Mua_Calendars_And_Booking_Reminders.sql
-- Description: Khởi tạo bảng mua_calendars (TIMESTAMPTZ & GiST Constraint) và bổ sung cờ cron, hết hạn cọc
-- ==============================================================================

-- 0. KÍCH HOẠT EXTENSION BTREE_GIST ĐỂ HỖ TRỢ EXCLUSION CONSTRAINT TRÊN NHIỀU CỘT
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. BẢNG QUẢN LÝ LỊCH BẬN CÁ NHÂN & KHUNG GIỜ ĐÃ ĐẶT CỦA THỢ (MUA_SCHEMA - ISSUE-18.2)
CREATE TABLE IF NOT EXISTS mua_schema.mua_calendars (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL, -- Phục vụ truy vấn phân vùng ngày nhanh
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_locked BOOLEAN DEFAULT TRUE NOT NULL,
    reason VARCHAR(255) NOT NULL, -- 'BOOKING_BK2610200830', 'HELD_BK2610200830', 'PERSONAL_LEAVE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_time_range CHECK (end_at > start_at),
    -- [CHỐT CHẶN VẬT LÝ DATABASE DEFENSE-IN-DEPTH]:
    -- Ràng buộc này chống 100% Hard Overlap (trùng giờ dịch vụ thực tế) ở cấp CSDL.
    -- Lưu ý kiến trúc: Kiểm tra vi phạm khoảng đệm di chuyển 30m (Buffer Time Violation) 
    -- được tầng Application đảm nhiệm qua query mở rộng existsOverlappingSlot.
    CONSTRAINT exclude_mua_overlapping_slots 
        EXCLUDE USING gist (
            mua_id WITH =,
            tstzrange(start_at, end_at) WITH &&
        )
    -- [TÙY CHỌN NÂNG CAO - NẾU CẦN DB BẢO VỆ CẢ BUFFER TIME CỐ ĐỊNH 30 PHÚT]:
    -- transit_window tstzrange GENERATED ALWAYS AS (
    --     tstzrange(start_at - interval '30 min', end_at + interval '30 min')
    -- ) STORED,
    -- CONSTRAINT exclude_mua_transit_window_overlap EXCLUDE USING gist (mua_id WITH =, transit_window WITH &&)
);

-- 2. BỔ SUNG CỘT HẾT HẠN CỌC, CỜ CRON VÀ OPTIMISTIC LOCK TRÊN BẢNG BOOKINGS (ISSUE-18.1 & 18.3)
ALTER TABLE booking_schema.bookings 
    ADD COLUMN IF NOT EXISTS deposit_expired_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0 NOT NULL; -- Hỗ trợ Optimistic Locking (@Version) chống race-condition 14:59

-- 3. CHỈ MỤC TỐI ƯU TRUY VẤN GIAO THOA THỜI GIAN, GIẢI PHÓNG SLOT VÀ CRON TÁC VỤ
CREATE INDEX IF NOT EXISTS idx_mua_calendars_range 
    ON mua_schema.mua_calendars USING gist (mua_id, tstzrange(start_at, end_at));

CREATE INDEX IF NOT EXISTS idx_mua_calendars_date 
    ON mua_schema.mua_calendars(mua_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_mua_calendars_booking_id 
    ON mua_schema.mua_calendars(booking_id);

CREATE INDEX IF NOT EXISTS idx_bookings_deposit_expired 
    ON booking_schema.bookings(status, deposit_expired_at) 
    WHERE status = 'PENDING_DEPOSIT';

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_cron 
    ON booking_schema.bookings(status, booking_type, booking_date, start_time) 
    WHERE status = 'ACCEPTED' AND booking_type = 'SCHEDULED';

-- 4. BÌNH LUẬN GIẢI THÍCH SCHEMA
COMMENT ON TABLE mua_schema.mua_calendars IS 'Bảng quản lý lịch bận và khung giờ khóa của thợ make-up (Chuẩn TIMESTAMPTZ chống ca vắt ngày)';
COMMENT ON COLUMN booking_schema.bookings.deposit_expired_at IS 'Thời điểm hết hạn 15 phút giữ chỗ để thanh toán cọc';
COMMENT ON COLUMN booking_schema.bookings.reminder_24h_sent IS 'Cờ đánh dấu đã gửi thông báo nhắc lịch trước 24 giờ';
COMMENT ON COLUMN booking_schema.bookings.reminder_2h_sent IS 'Cờ đánh dấu đã gửi thông báo nhắc lịch trước 2 giờ';
```

---

## ⚡ 7. THUẬT TOÁN KIỂM TRA GIAO THOA THỜI GIAN, BUFFER TIME & CRON ENGINE

### 7.1. Thuật toán Kiểm tra Giao thoa Thời gian & Khoảng đệm Chuẩn (Tránh Double Buffering)

#### 1. Bản chất Toán học của Giao thoa Khoảng Thời gian (Interval Overlap with TIMESTAMPTZ)
Hai khoảng thời gian $[S_1, E_1]$ và $[S_2, E_2]$ giao nhau khi và chỉ khi:
$$\max(S_1, S_2) < \min(E_1, E_2) \iff (S_1 < E_2) \land (E_1 > S_2)$$

Trong PostgreSQL với kiểu dữ liệu `tstzrange`, phép kiểm tra giao thoa được biểu diễn bằng toán tử `&&`:
$$\text{tstzrange}(S_1, E_1) \;\&\&\; \text{tstzrange}(S_2, E_2)$$

#### 2. Xử Lý Triệt Để Vấn Đề Ca Vắt Qua Ngày (Midnight Crossing Resilient)
* **Vấn đề trước tối ưu:** Khi lưu rời rạc `booking_date DATE` và `start_time TIME`, ca làm sáng sớm lúc `00:15:00` khi lùi khoảng đệm di chuyển $30\text{ phút}$ sẽ trôi về ngày hôm trước (`23:45:00` ngày $D-1$). Các truy vấn giới hạn trong `booking_date = :date` sẽ bỏ sót hoàn toàn các ca đêm muộn kết thúc rạng sáng hoặc ca vắt qua nửa đêm.
* **Giải pháp chuẩn hóa:** Lưu chuẩn `start_at TIMESTAMPTZ` và `end_at TIMESTAMPTZ`. Cửa sổ kiểm tra có đệm di chuyển $B = 30\text{ phút}$:
  $$\text{windowStart} = \text{start\_at} - 30\text{m}, \quad \text{windowEnd} = \text{end\_at} + 30\text{m}$$
  Phép so sánh Timestamp tuyệt đối loại bỏ $100\%$ rủi ro lệch ngày hoặc lệch múi giờ.
* **Nguyên tắc tránh Double Buffering:** Bản ghi CSDL chỉ lưu đúng thời gian thực tế dịch vụ ($[S_i, E_i]$), khoảng đệm chỉ được áp dụng khi kiểm tra cửa sổ giao thoa.

#### 3. Thuật Toán Sinh Khung Giờ Trống Động (Dynamic Step Generation Engine)
Thay vì chia lưới cố định (Fixed Grid), API `GET /api/v1/mua/{muaId}/available-slots` áp dụng thuật toán trượt cửa sổ thời gian linh hoạt:
* **Khung giờ hoạt động:** Từ `DEFAULT_WORK_DAY_START` ($06:00$) đến `DEFAULT_WORK_DAY_END` ($22:00$).
* **Bước nhảy trượt (Step Interval):** Mặc định $30\text{ phút}$ (hoặc nhận qua `step_minutes` từ Client: $06:00, 06:30, 07:00, ...$).
* **Tại mỗi mốc thời gian bắt đầu $T$:**
  - Khung dịch vụ đề xuất: $[T, T + \text{duration}]$.
  - Cửa sổ kiểm tra an toàn: $[T - B, T + \text{duration} + B]$.
  - Nếu khoảng $[T, T + \text{duration}]$ trùng trực tiếp với ca làm của thợ $\rightarrow$ `is_available = false`, `is_buffer_blocked = false`, `unavailable_reason = "Đã có khách đặt ca hẹn"`.
  - Nếu khung $[T, T + \text{duration}]$ rảnh nhưng bị chạm vào khoảng đệm di chuyển $[T-B, T)$ hoặc $(T+\text{duration}, T+\text{duration}+B]$ của ca liền kề $\rightarrow$ `is_available = false`, `is_buffer_blocked = true`, `unavailable_reason = "Vướng khoảng đệm di chuyển 30 phút của thợ"`.
  - Nếu hoàn toàn không giao thoa $\rightarrow$ `is_available = true`, `is_buffer_blocked = false`.

#### Native Query trong `MUACalendarRepository.java`:
```java
package com.makeup.platform.repository.mua;

import com.makeup.platform.entity.mua.MUACalendarEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface MUACalendarRepository extends JpaRepository<MUACalendarEntity, Long> {

    /**
     * Kiểm tra xung đột ca làm việc bằng toán tử tstzrange && của PostgreSQL
     * (windowStart = startAt - buffer, windowEnd = endAt + buffer)
     */
    @Query(value = """
        SELECT COUNT(*) > 0 FROM mua_schema.mua_calendars c
        WHERE c.mua_id = :muaId
          AND c.is_locked = TRUE
          AND tstzrange(c.start_at, c.end_at) && tstzrange(:windowStart, :windowEnd)
    """, nativeQuery = true)
    boolean existsOverlappingSlot(
        @Param("muaId") Long muaId,
        @Param("windowStart") OffsetDateTime windowStart,
        @Param("windowEnd") OffsetDateTime windowEnd
    );

    @Query("SELECT c FROM MUACalendarEntity c WHERE c.mua.id = :muaId AND c.isLocked = true ORDER BY c.startAt ASC")
    List<MUACalendarEntity> findActiveSlotsByMuaId(@Param("muaId") Long muaId);

    /**
     * Giải phóng slot khóa khi đơn hàng bị hủy hoặc hết hạn thanh toán cọc
     */
    @Modifying
    @Query("DELETE FROM MUACalendarEntity c WHERE c.booking.id = :bookingId")
    void deleteByBookingId(@Param("bookingId") Long bookingId);
}
```

---

### 7.2. Logic Cron Job Nhắc Lịch Tự Động (Pagination Batching, TTL 48h & Async Events)

#### Truy vấn phân trang trong `BookingRepository.java`:
```java
package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<BookingEntity, Long> {

    Optional<BookingEntity> findByBookingCode(String bookingCode);

    /**
     * Quét phân trang các đơn cần nhắc trước 24h: Chưa gửi, thời điểm bắt đầu <= (now + 24h) và còn trong tương lai.
     */
    @Query(value = """
        SELECT * FROM booking_schema.bookings b
        WHERE b.status = 'ACCEPTED'
          AND b.booking_type = 'SCHEDULED'
          AND b.reminder_24h_sent = FALSE
          AND (b.booking_date + b.start_time) <= :maxReminderTime
          AND (b.booking_date + b.start_time) > CURRENT_TIMESTAMP
        ORDER BY (b.booking_date + b.start_time) ASC
    """, nativeQuery = true)
    List<BookingEntity> findPending24hRemindersBatch(@Param("maxReminderTime") LocalDateTime maxReminderTime, Pageable pageable);

    /**
     * Quét phân trang các đơn cần nhắc trước 2h: Chưa gửi, thời điểm bắt đầu <= (now + 2h) và còn trong tương lai.
     */
    @Query(value = """
        SELECT * FROM booking_schema.bookings b
        WHERE b.status = 'ACCEPTED'
          AND b.booking_type = 'SCHEDULED'
          AND b.reminder_2h_sent = FALSE
          AND (b.booking_date + b.start_time) <= :maxReminderTime
          AND (b.booking_date + b.start_time) > CURRENT_TIMESTAMP
        ORDER BY (b.booking_date + b.start_time) ASC
    """, nativeQuery = true)
    List<BookingEntity> findPending2hRemindersBatch(@Param("maxReminderTime") LocalDateTime maxReminderTime, Pageable pageable);

    /**
     * Quét các đơn giữ chỗ PENDING_DEPOSIT đã quá hạn 15 phút chưa cọc
     */
    @Query("""
        SELECT b FROM BookingEntity b
        WHERE b.status = 'PENDING_DEPOSIT'
          AND b.depositExpiredAt < CURRENT_TIMESTAMP
    """)
    List<BookingEntity> findExpiredPendingDepositBookings();

    /**
     * Cập nhật trạng thái hủy đơn hết hạn cọc có điều kiện nguyên tử (Atomic Conditional Update).
     * Triệt tiêu hoàn toàn race-condition khi khách hàng thanh toán cọc ở giây 14:59.
     * Trả về số dòng cập nhật: 1 nếu hủy thành công, 0 nếu khách đã thanh toán chuyển sang ACCEPTED trước đó.
     */
    @Modifying
    @Query("""
        UPDATE BookingEntity b
        SET b.status = 'CANCELLED_EXPIRED', b.updatedAt = CURRENT_TIMESTAMP
        WHERE b.id = :bookingId AND b.status = 'PENDING_DEPOSIT'
    """)
    int cancelExpiredBookingIfPendingDeposit(@Param("bookingId") Long bookingId);
}
```

#### Scheduler Thực thi trong `BookingReminderScheduler.java`:
```java
package com.makeup.platform.service.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.event.BookingReminderEvent;
import com.makeup.platform.repository.booking.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingReminderScheduler {

    private final BookingRepository bookingRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final StringRedisTemplate redisTemplate;

    private static final int BATCH_SIZE = 100;

    /**
     * Chạy định kỳ mỗi 15 phút.
     * QUY TẮC ZERO-OFFSET: Vì các bản ghi sau khi cập nhật reminder_24h_sent = true sẽ lập tức
     * biến mất khỏi tập kết quả (WHERE reminder_24h_sent = FALSE), nên ta LUÔN truy vấn ở trang
     * đầu tiên PageRequest.of(0, BATCH_SIZE) cho tới khi danh sách trả về rỗng.
     * Triệt tiêu hoàn toàn lỗi trôi Offset bỏ sót 50% số đơn hàng.
     */
    @Scheduled(cron = "0 */15 * * * *")
    public void scanAndSendBookingReminders() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Quét đơn nhắc trước 24 giờ (Zero-Offset Pagination Batching)
        LocalDateTime max24h = now.plusHours(24);
        List<BookingEntity> batch24h;
        do {
            batch24h = bookingRepository.findPending24hRemindersBatch(max24h, PageRequest.of(0, BATCH_SIZE));
            batch24h.forEach(this::processReminder24h);
        } while (!batch24h.isEmpty());

        // 2. Quét đơn nhắc trước 2 giờ (Zero-Offset Pagination Batching)
        LocalDateTime max2h = now.plusHours(2);
        List<BookingEntity> batch2h;
        do {
            batch2h = bookingRepository.findPending2hRemindersBatch(max2h, PageRequest.of(0, BATCH_SIZE));
            batch2h.forEach(this::processReminder2h);
        } while (!batch2h.isEmpty());
    }

    /**
     * Xử lý gửi nhắc 24h bọc trong Transaction độc lập, TTL Redis 48 giờ
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processReminder24h(BookingEntity booking) {
        String lockKey = "reminder:lock:24h:" + booking.getId();
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "SENT", Duration.ofHours(48));
        if (Boolean.TRUE.equals(acquired)) {
            booking.setReminder24hSent(true);
            bookingRepository.save(booking);
            // Bắn event: Đẩy sang Transactional Event Listener xử lý AFTER_COMMIT
            eventPublisher.publishEvent(new BookingReminderEvent(this, booking.getId(), "REMINDER_24H"));
            log.info("Queued 24h reminder event for scheduled booking ID: {}", booking.getId());
        }
    }

    /**
     * Xử lý gửi nhắc 2h bọc trong Transaction độc lập, TTL Redis 24 giờ
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processReminder2h(BookingEntity booking) {
        String lockKey = "reminder:lock:2h:" + booking.getId();
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "SENT", Duration.ofHours(24));
        if (Boolean.TRUE.equals(acquired)) {
            booking.setReminder2hSent(true);
            bookingRepository.save(booking);
            // Bắn event: Đẩy sang Transactional Event Listener xử lý AFTER_COMMIT
            eventPublisher.publishEvent(new BookingReminderEvent(this, booking.getId(), "REMINDER_2H"));
            log.info("Queued 2h reminder event for scheduled booking ID: {}", booking.getId());
        }
    }
}
```

#### Listener Xử lý Thông Báo Nhắc Lịch (`BookingReminderEventListener.java`):
```java
package com.makeup.platform.listener;

import com.makeup.platform.event.BookingReminderEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingReminderEventListener {

    /**
     * TÁCH BIỆT EVENT TRANSACTION:
     * 1. Chỉ thực thi sau khi DB Transaction đã Commit thành công (phase = AFTER_COMMIT).
     * 2. Chạy trên Thread Pool bất đồng bộ (@Async), hoàn toàn tách rời khỏi Scheduler thread.
     * 3. Lỗi mạng khi gửi WebSocket / Push notification tuyệt đối không làm rollback trạng thái DB.
     */
    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBookingReminder(BookingReminderEvent event) {
        try {
            log.info("Dispatching async reminder notification [{}] for booking ID: {}", 
                    event.getType(), event.getBookingId());
            // Gửi In-App Notification và phát STOMP WebSocket tới Client
        } catch (Exception e) {
            log.error("Failed to send notification for reminder event: {}", event, e);
        }
    }
}
```

---

### 7.3. Scheduler Quét Hủy Đơn Quá Hạn Cọc 15 Phút (Deadlock-Free & Race-Free)

Tự động quét định kỳ mỗi 1 phút để giải phóng slot bị "om" ảo khi khách không thanh toán cọc trong $15\text{ phút}$:

```java
package com.makeup.platform.service.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.event.BookingDepositExpiredEvent;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.mua.MUACalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingDepositExpirationScheduler {

    private final BookingRepository bookingRepository;
    private final MUACalendarService muaCalendarService;
    private final ApplicationEventPublisher eventPublisher;

    // Inject self-proxy để kích hoạt AOP Proxy cho @Transactional(REQUIRES_NEW)
    @Lazy
    private final BookingDepositExpirationScheduler selfProxy;

    /**
     * KHÔNG ĐẶT @Transactional ở method cha quét danh sách.
     * Việc duyệt từng đơn qua transaction độc lập loại bỏ hoàn toàn rủi ro Deadlock
     * và ngăn ngừa 1 đơn lỗi làm rollback toàn bộ các đơn hết hạn khác.
     */
    @Scheduled(cron = "0 */1 * * * *") // Chạy mỗi phút 1 lần
    public void scanAndExpireUnpaidBookings() {
        List<BookingEntity> expiredBookings = bookingRepository.findExpiredPendingDepositBookings();

        for (BookingEntity booking : expiredBookings) {
            try {
                selfProxy.expireSingleBooking(booking.getId());
            } catch (Exception e) {
                log.error("Failed to expire booking ID: {} during expiration job", booking.getId(), e);
            }
        }
    }

    /**
     * Xử lý hủy đơn độc lập trong Transaction riêng biệt.
     * Áp dụng Atomic Conditional Update: Chỉ nhả slot khi update trạng thái thành công 1 dòng.
     * Khắc phục triệt để race-condition khi khách bấm thanh toán cọc ở giây 14:59.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void expireSingleBooking(Long bookingId) {
        int updatedRows = bookingRepository.cancelExpiredBookingIfPendingDeposit(bookingId);

        if (updatedRows == 1) {
            // Đơn hủy thành công do đúng trạng thái PENDING_DEPOSIT
            muaCalendarService.releaseSlotByBookingId(bookingId);
            eventPublisher.publishEvent(new BookingDepositExpiredEvent(this, bookingId));
            log.info("Successfully expired unpaid booking ID: {} and released calendar slot", bookingId);
        } else {
            // rowsUpdated == 0: Khách hàng đã thanh toán thành công ở giây 14:59 chuyển sang ACCEPTED
            log.info("Booking ID: {} is no longer in PENDING_DEPOSIT. Cancellation skipped to protect customer payment.", bookingId);
        }
    }
}
```

---

## 🎨 8. ĐẶC TẢ PHÁT TRIỂN FRONTEND (REACT + VITE + TAILWIND + ZOD)

Tuân thủ nghiêm ngặt **Quy chuẩn 3 (Frontend Engineering Standards)** và **Quy chuẩn 5.3 (Client Error Handling Standard)**:

### 8.1. Zod Schemas Validation (`src/schemas/booking/scheduledBookingSchema.js`)
Đồng bộ hoàn toàn với Bean Validation Backend (`@ValidBookingTime` và `@ValidTimeRange`):

```javascript
import { z } from 'zod';

export const createScheduledBookingSchema = z.object({
  packageId: z.number({ required_error: 'Vui lòng chọn gói dịch vụ' }),
  addOnItemIds: z.array(z.number()).optional().default([]),
  bookingPartner: z.enum(['FREELANCER_DIRECT', 'AGENCY_DISPATCH'], {
    required_error: 'Vui lòng chọn hình thức đặt thợ (Trực tiếp hoặc Studio)'
  }),
  agencyId: z.number().nullable().optional(),
  muaId: z.number().nullable().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày hẹn không đúng định dạng YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ bắt đầu không đúng định dạng HH:mm:ss'),
  destinationAddress: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự').max(255, 'Địa chỉ tối đa 255 ký tự'),
  destinationLatitude: z.number().min(8.0, 'Vĩ độ không hợp lệ').max(24.0, 'Vĩ độ không hợp lệ'),
  destinationLongitude: z.number().min(102.0, 'Kinh độ không hợp lệ').max(110.0, 'Kinh độ không hợp lệ'),
  voucherCode: z.string().nullable().optional()
})
// Rule 1: Đối tác đặt hẹn phải tương ứng với ID chỉ định
.refine(data => {
  if (data.bookingPartner === 'FREELANCER_DIRECT' && !data.muaId) {
    return false;
  }
  if (data.bookingPartner === 'AGENCY_DISPATCH' && !data.agencyId) {
    return false;
  }
  return true;
}, {
  message: 'Vui lòng chỉ định đúng đối tác Thợ tự do hoặc Studio điều phối',
  path: ['bookingPartner']
})
// Rule 2: Khung giờ phục vụ hợp lệ (05:00 - 22:00) đồng bộ với Backend @ValidBookingTime
.refine(data => {
  if (!data.startTime) return false;
  const timeStr = data.startTime.substring(0, 5); // "HH:mm"
  return timeStr >= '05:00' && timeStr <= '22:00';
}, {
  message: 'Dịch vụ đặt hẹn chỉ phục vụ trong khung giờ từ 05:00 đến 22:00',
  path: ['startTime']
})
// Rule 3: Thời điểm đặt hẹn phải ở tương lai tối thiểu 2 giờ
.refine(data => {
  if (!data.bookingDate || !data.startTime) return false;
  const scheduledDateTime = new Date(`${data.bookingDate}T${data.startTime.substring(0, 5)}:00`);
  const minAllowedTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // Now + 2 hours
  return scheduledDateTime >= minAllowedTime;
}, {
  message: 'Thời gian đặt hẹn trước phải cách thời điểm hiện tại tối thiểu 2 giờ',
  path: ['startTime']
});

export const blockCalendarSlotSchema = z.object({
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày hẹn không đúng định dạng YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ bắt đầu không đúng định dạng HH:mm:ss'),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ kết thúc không đúng định dạng HH:mm:ss'),
  reason: z.string().min(3, 'Lý do tối thiểu 3 ký tự').max(255, 'Lý do tối đa 255 ký tự')
})
// Rule: Giờ kết thúc phải lớn hơn giờ bắt đầu đồng bộ @ValidTimeRange
.refine(data => data.endTime > data.startTime, {
  message: 'Giờ kết thúc phải sau giờ bắt đầu',
  path: ['endTime']
});
```

### 8.2. Axios Service Client (`src/services/scheduledBookingService.js`)
```javascript
import axiosClient from './axiosClient';

export const scheduledBookingService = {
  /**
   * Tạo đơn đặt hẹn trước (Backend trả về PENDING_DEPOSIT và deposit_expired_at)
   */
  createScheduledBooking: (payload) => 
    axiosClient.post('/customer/bookings/scheduled', payload),

  /**
   * Thanh toán cọc giữ chỗ 20% trong vòng 15 phút
   */
  confirmDepositPayment: (bookingId, paymentMethod) =>
    axiosClient.post(`/customer/bookings/${bookingId}/deposit`, { paymentMethod }),

  /**
   * Tra cứu danh sách slot khả dụng với bước nhảy thời gian linh hoạt (mặc định 30m)
   */
  getAvailableSlots: (muaId, date, durationMinutes = 90, stepMinutes = 30) => 
    axiosClient.get(`/mua/${muaId}/available-slots`, {
      params: { 
        date, 
        duration_minutes: durationMinutes,
        step_minutes: stepMinutes
      }
    }),

  /**
   * Thợ tự do chủ động khóa lịch bận cá nhân
   */
  blockPersonalSlot: (payload) => 
    axiosClient.post('/freelancer/calendar/block', payload),

  /**
   * Thợ tự do mở lại lịch bận cá nhân
   */
  unblockPersonalSlot: (calendarId) => 
    axiosClient.delete(`/freelancer/calendar/block/${calendarId}`)
};
```

### 8.3. UI/UX Flow: Đếm Ngược Giữ Chỗ 15 Phút & Phân Biệt Slot Bận / Khoảng Đệm
Giao diện tuân thủ triết lý **Luxury Beauty Aesthetic**:

#### 1. Đếm ngược Giữ chỗ Thanh toán Cọc 15 Phút (Hold & Expire Flow)
* Khi tạo đơn thành công, Backend phản hồi `status: "PENDING_DEPOSIT"` kèm `deposit_expired_at` (mốc ISO-8601).
* Màn hình thanh toán hiển thị hộp đồng hồ đếm ngược vàng hổ phách (Amber Warning Countdown Bar):
  - Đồng hồ hiển thị thời gian còn lại: `mm:ss` (Ví dụ: `14:52`).
  - Khi còn $< 3\text{ phút}$, đồng hồ chuyển sang nhấp nháy đỏ (`animate-pulse text-red-500`) kèm dòng nhắc: *"Khung giờ của bạn sắp được giải phóng cho khách hàng khác"*.
  - Khi đồng hồ về `00:00` hoặc nhận event WebSocket thông báo quá hạn:
    - Vô hiệu hóa nút thanh toán.
    - Hiển thị Modal thông báo: *"Hết hạn giữ chỗ: Đơn đặt hẹn đã tự động hủy do quá hạn thanh toán cọc 15 phút. Khung giờ đã được giải phóng"*.
    - Nút hành động: "Chọn lại khung giờ khác".

#### 2. Hiển thị Trực quan Lưới Giờ (Dynamic Slots Grid) với `is_buffer_blocked`
Giao diện lưới các khung giờ sáng/chiều/tối hiển thị rõ ràng 3 trạng thái của từng slot:
1. **Slot Khả dụng (`is_available === true`):**
   - Nút bấm sang trọng viền vàng champagne (`border-amber-400 hover:bg-amber-50 text-slate-800`).
   - Khách có thể click chọn.
2. **Slot Trực tiếp Bận Ca / Khóa Lịch (`is_available === false && !is_buffer_blocked`):**
   - Nút nền xám nhạt mờ (`bg-slate-100 text-slate-400 cursor-not-allowed line-through`).
   - Tooltip: *"Thợ đã có ca trang điểm hoặc khóa lịch bận"*.
3. **Slot Vướng Khoảng Đệm Di Chuyển (`is_available === false && is_buffer_blocked === true`):**
   - Nút nền viền đứt cam nhạt (`border-dashed border-orange-300 bg-orange-50/60 text-orange-600 cursor-not-allowed`).
   - Kèm biểu tượng xe di chuyển nhỏ 🚗 (`Travel Buffer`).
   - Tooltip: *"Khoảng đệm 30 phút thợ di chuyển giữa 2 địa điểm phục vụ"*. Giúp khách hàng thấu hiểu lý do khung giờ không thể đặt mà không gây cảm giác khó chịu.

#### 3. Chuẩn Hóa Xử Lý Lỗi Form & Tự Động Làm Mới Khung Giờ (Rule 5.3 Integration)
* **Bắt buộc dùng `parseApiError(err)`:** Mọi thao tác submit đặt hẹn phải được bọc qua tiện ích `parseApiError(err)` tại `src/utils/error.js`.
* **Trích xuất lỗi Form:** Khi `errorCode === 'ERR_VALIDATION'`, trích xuất `fieldErrors` và map vào `errors[field]` để hiển thị cảnh báo đỏ trực quan dưới từng ô nhập liệu.
* **Tự động làm mới khi gặp Conflict (`409 CONFLICT`):**
  - Khi nhận mã lỗi `ERR_SLOT_ALREADY_BOOKED` hoặc `ERR_SLOT_BEING_RESERVED`, Frontend lập tức hiển thị Toast cảnh báo bản địa hóa từ Backend.
  - Đồng thời, Frontend **tự động gọi lại `getAvailableSlots(muaId, date, duration, stepMinutes)`** để cập nhật trạng thái các nút slot trên màn hình, vô hiệu hóa (Disabled) khung giờ vừa bị tranh chấp mà người dùng không cần bấm F5 tải lại trang.

---

## 🛡️ 9. YÊU CẦU PHI CHỨC NĂNG & AN TOÀN HỆ THỐNG (NFRS & SECURITY)

### 9.1. Hiệu Năng & Khả Năng Mở Rộng (Performance & Scalability)
1. **Tốc Độ Phản Hồi Tra Cứu Slot Rảnh (Slot Availability Latency):**
   - API `GET /api/v1/mua/{muaId}/available-slots` phải hoàn thành tính toán giao thoa và trả về kết quả trong thời gian **$< 15\text{ms}$** nhờ chỉ mục PostgreSQL GiST `idx_mua_calendars_gist_range` tối ưu trên miền `tstzrange(start_at, end_at)`.
2. **Thông Lượng Batching Của Scheduler Nhắc Lịch (Zero-Offset Job Throughput):**
   - Cron Job `BookingReminderScheduler` xử lý batching `do-while` với kích thước $100$ bản ghi/batch luôn truy vấn tại trang `0` (`PageRequest.of(0, BATCH_SIZE)`).
   - Hoàn thành quét sạch $10,000$ đơn hàng trong thời gian **$< 400\text{ms}$**, triệt tiêu $100\%$ lỗi trôi Offset và đảm bảo không bỏ sót bất kỳ đơn hàng nào.
   - Việc phát thông báo được đẩy qua Spring `ApplicationEventPublisher` và xử lý bất đồng bộ đa luồng (`@Async`), không gây tắc nghẽn luồng chính của Scheduler và không làm tăng đột biến bộ nhớ JVM Heap.
3. **SLA Giải Phóng Slot Giữ Chỗ Quá Hạn & Chống Deadlock (Deadlock-Free Expiration SLA):**
   - `BookingDepositExpirationScheduler` chạy mỗi $60\text{s}$, cam kết $100\%$ các đơn quá hạn 15 phút chưa thanh toán cọc sẽ được chuyển trạng thái `CANCELLED_EXPIRED` và thu hồi slot trong vòng tối đa $60\text{ giây}$ sau thời điểm `deposit_expired_at`.
   - Cơ chế xử lý độc lập từng đơn trong transaction riêng (`Propagation.REQUIRES_NEW`) bảo đảm không giữ khóa kéo dài, loại bỏ hoàn toàn nguy cơ Deadlock với luồng khách hàng nạp tiền thanh toán cọc.

### 9.2. Toàn Vẹn Dữ Liệu & Chống Race-Condition (Defense-in-Depth Concurrency)
1. **Phòng Thủ Đa Tầng (Multi-Layer Defense - Hard Overlap vs Buffer Window):**
   - **Lớp Database (Hard Overlap Guard):**
     - Ràng buộc vật lý `EXCLUDE USING gist (mua_id WITH =, tstzrange(start_at, end_at) WITH &&)` tại `mua_schema.mua_calendars` đóng vai trò là "chốt chặn thép cuối cùng".
     - Kể cả trong kịch bản xấu nhất (Redis cluster timeout, mạng chập chờn), PostgreSQL vẫn thẳng tay từ chối bản ghi trùng lặp và ném lỗi `DataIntegrityViolationException`, bảo đảm tuyệt đối không thể xảy ra Overbooking ở cấp độ vật lý cho khung giờ làm thực tế $[S_i, E_i]$.
   - **Lớp Application (Buffer Window Guard):**
     - Tầng Application chịu trách nhiệm tính toán và bảo vệ khoảng đệm di chuyển linh hoạt $\pm 30\text{ phút}$ qua query `existsOverlappingSlot`. (Hệ thống hỗ trợ cột sinh `transit_window` nếu tổ chức muốn CSDL bảo vệ cả đệm cố định).
   - **Lớp Application Distributed Lock (Redisson):**
     - Với Thợ tự do (`FREELANCER_DIRECT`): Áp dụng Redisson Lock theo phạm vi ngày: `lock:mua:calendar:{muaId}:{bookingDate}`.
     - Với Studio (`AGENCY_DISPATCH`): Áp dụng Redisson Lock theo phạm vi slot cụ thể: `lock:agency:capacity:{agencyId}:{bookingDate}:{slotStartTime}`. Triệt tiêu hoàn toàn điểm nghẽn cổ chai của toàn bộ Studio trong ngày.
2. **Khắc Phục Hoàn Toàn Race-Condition Phút 14:59 (Atomic Conditional Update & Optimistic Lock):**
   - Câu lệnh cập nhật trạng thái hủy đơn hết hạn cọc được thực thi có điều kiện nguyên tử:
     `UPDATE booking_schema.bookings SET status = 'CANCELLED_EXPIRED', updated_at = NOW() WHERE id = :id AND status = 'PENDING_DEPOSIT'`.
   - Kết hợp `@Version` (Optimistic Locking) trên `BookingEntity`. Nếu khách vừa thanh toán cọc thành công ở giây 14:59 (`status` chuyển sang `ACCEPTED`), câu lệnh trả về 0 dòng, scheduler lập tức bỏ qua và bảo vệ trọn vẹn quyền lợi của khách hàng.
3. **Khắc Phục Hoàn Toàn Lỗi Ca Vắt Ngày (Midnight Crossing Immunity):**
   - Việc sử dụng cặp trường `start_at TIMESTAMPTZ` và `end_at TIMESTAMPTZ` kết hợp toán tử phạm vi `&&` loại bỏ triệt để mọi lỗi logic so sánh giờ vắt qua nửa đêm (23:30 $\rightarrow$ 01:30 sáng hôm sau).

### 9.3. Bảo Mật Phân Quyền & Kiểm Soát Truy Cập (Security & RBAC)
1. **Chống Tấn Công IDOR Trên Quản Lý Lịch Bận (IDOR Prevention):**
   - Khi MUA thực hiện xóa slot bận cá nhân (`DELETE /freelancer/calendar/block/{id}`), Service bắt buộc kiểm tra điều kiện kép:
     - `calendar.mua_id == authenticatedUserId`.
     - `calendar.booking_id IS NULL` (chỉ cho phép mở lại slot do chính thợ tự khóa thủ công, nghiêm cấm xóa slot lịch gắn với đơn hàng của khách hàng).
2. **Bảo Đảm Năng Lực Nhân Sự Studio (Agency Capacity Guarantee):**
   - Với đơn đặt qua Studio (`AGENCY_DISPATCH`), hệ thống tính toán số lượng thợ của Studio có kỹ năng phù hợp với gói dịch vụ và chưa bị xếp lịch trong khung giờ đó. Tuyệt đối không cho phép tạo đơn nếu số đơn trong slot đã đạt trần năng lực ($N_{\text{staff}}$).
3. **Idempotency & Tách Biệt Event Transaction (Transactional Event Listener Guard):**
   - Khóa phân tán Redis `reminder:lock:24h:{id}` (TTL 48h) và `reminder:lock:2h:{id}` (TTL 24h) kết hợp cờ đánh dấu `reminder_24h_sent` / `reminder_2h_sent` trong CSDL bảo đảm $100\%$ không xảy ra trường hợp khách hàng hay thợ bị spam thông báo lặp lại khi cụm server được scale ngang.
   - Cơ chế `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` kết hợp `@Async("taskExecutor")` đảm bảo thông báo chỉ phát đi khi DB đã commit thành công, và lỗi mạng ở tầng hạ tầng thông báo không bao giờ làm rollback dữ liệu của scheduler.

