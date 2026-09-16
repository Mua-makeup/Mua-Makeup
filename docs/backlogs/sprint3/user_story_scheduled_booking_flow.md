# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐẶT LỊCH HẸN TRƯỚC (SCHEDULED BOOKING), LỊCH BẬN CÁ NHÂN & CRON NHẮC LỊCH
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schemas: `mua_schema`, `booking_schema`, `catalog_schema`, `wallet_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Scheduled Booking Flow, MUA Calendar Engine & Reminder Cron Scheduler`
* **Mã Jira Issues phụ trách (Sprint 3):**
  * `ISSUE-18.1`: **User Story** - Luồng 2: Đặt Lịch Hẹn Trước cho tương lai (Scheduled Booking Flow) - Khách hàng chọn Thợ/Studio, chọn ngày giờ hẹn, tính cọc 30% và giữ chỗ.
  * `ISSUE-18.2`: **Task** - Lịch bận cá nhân Thợ (`mua_schema.mua_calendars`) - Khóa ca làm trùng giờ, kiểm tra khoảng đệm di chuyển an toàn (Buffer Time $30\text{--}45\text{ phút}$).
  * `ISSUE-18.3`: **Task** - Scheduler Cron Job tự động quét và phát thông báo nhắc lịch ca hẹn trước 24h & 2h cho cả Khách hàng và Thợ trang điểm (kèm Redis Idempotency Key).
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Động cơ Quản lý Thời gian & Lịch bận (MUA Calendar Engine):** Thuật toán phát hiện giao thoa khoảng thời gian (Interval Overlap Detection: $\max(S_1, S_2) < \min(E_1, E_2)$) kết hợp khoảng đệm di chuyển chuẩn ($30\text{--}45\text{ phút}$) để ngăn chặn tuyệt đối tình trạng thợ nhận 2 ca sát giờ nhau không kịp di chuyển.
  * **Tự động hóa Tác vụ Nền (Background Scheduled Worker):** Spring `@Scheduled` / `ThreadPoolTaskScheduler` quét định kỳ mỗi 15 phút, kết hợp **Redis Idempotency Key** (`SET NX EX`) chống phát trùng lặp thông báo nhắc lịch trong môi trường phân tán.
  * **Phân định Phân kỳ Phát triển (Phasing Strategy - Sprint 3 vs Sprint 5):**
    * **Giai đoạn Sprint 3 (Hiện tại):** 
      - Tập trung hoàn thiện 100% logic nghiệp vụ đặt lịch hẹn: kiểm tra tính khả dụng của slot, tính phụ phí giờ sớm/ngày lễ, tính tổng tiền và số tiền cọc 30% (`deposit_amount = total_amount * 0.3`).
      - Lưu trực tiếp `deposit_amount` vào bảng `booking_schema.bookings`.
      - Khóa slot bận của thợ trong `mua_schema.mua_calendars`.
      - Bắn sự kiện `ScheduledBookingCreatedEvent` qua Spring EventBus để sẵn sàng tích hợp module Ví mà không cần viết lại logic đặt lịch.
    * **Giai đoạn Sprint 5 (Tương lai - Wallet & Escrow Module):**
      - Kích hoạt Event Listener lắng nghe `ScheduledBookingCreatedEvent` để trừ tiền số dư khả dụng và phong tỏa cọc vào quỹ Escrow trên `wallet_schema.wallets` & `wallet_schema.ledger_entries`.
  * **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`makeup_platform_db`) tuân thủ nghiêm ngặt 8 Schemas:
    * `mua_schema.mua_calendars`: Quản lý lịch bận cá nhân và các khung giờ đã bị khóa bởi đơn hàng của thợ make-up.
    * `booking_schema.bookings` & `booking_schema.booking_history`: Lưu trữ thông tin đơn đặt lịch hẹn trước, audit log biến động trạng thái và cờ nhắc lịch.
    * `catalog_schema.service_packages` & `catalog_schema.surcharges`: Gói dịch vụ và bảng phụ phí giờ làm sớm / ngày Lễ Tết.
    * `wallet_schema.wallets` & `wallet_schema.ledger_entries`: Dự phòng cho phân hệ ví và quỹ cọc Escrow (kích hoạt ở Sprint 5).
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
│   │   ├── CalendarConstants.java             # DEFAULT_BUFFER_MINUTES (30m), MAX_FUTURE_BOOKING_DAYS (90d)
│   │   └── ErrorCodes.java                    # ERR_SLOT_ALREADY_BOOKED, ERR_BUFFER_TIME_VIOLATION...
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung toàn hệ thống
│   │   ├── CustomBusinessException.java       # Ngoại lệ nghiệp vụ ném kèm ErrorCodes và message key i18n
│   │   ├── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (HTTP 404)
│   │   └── AccessDeniedException.java         # Lỗi vi phạm phân quyền/IDOR (HTTP 403)
│   ├── i18n/
│   │   ├── CustomLocaleResolver.java          # Xác định ngôn ngữ từ Accept-Language / User Profile
│   │   └── JsonMessageSource.java             # Nạp file i18n JSON đa ngôn ngữ
│   └── utils/
│       ├── DateTimeIntervalUtils.java         # Thuật toán kiểm tra giao thoa 2 khoảng thời gian [start, end]
│       ├── HolidayCalendarUtils.java          # Nhận diện phụ phí Lễ/Tết cho các ngày đặt trong tương lai
│       └── SecurityContextUtils.java          # Trích xuất userId, role từ SecurityContext an toàn
│
├── config/
│   └── SchedulingConfig.java                  # Cấu hình ThreadPoolTaskScheduler đa luồng phục vụ Cron Job
│
├── controller/                                # TẦNG CONTROLLER MỎNG (Thin Controller - phân theo Actor)
│   ├── customer/
│   │   └── CustomerScheduledBookingController.java # POST /api/v1/customer/bookings/scheduled
│   ├── mua/
│   │   └── MUACalendarQueryController.java         # GET /api/v1/mua/{muaId}/available-slots
│   └── freelancer/
│       └── FreelancerCalendarController.java       # POST, GET, DELETE /api/v1/freelancer/calendar/block
│
├── dto/
│   ├── request/
│   │   ├── booking/
│   │   │   └── CreateScheduledBookingReq.java # packageId, bookingPartner, agencyId, muaId, bookingDate, startTime...
│   │   └── mua/
│   │       ├── BlockCalendarSlotReq.java      # bookingDate, startTime, endTime, reason
│   │       └── GetAvailableSlotsReq.java      # muaId, bookingDate, packageEstimatedDurationMinutes
│   └── response/
│       ├── booking/
│       │   └── ScheduledBookingCreatedRes.java # bookingId, bookingCode, depositAmount, scheduleSummary
│       └── mua/
│           ├── AvailableTimeSlotRes.java      # slotStartTime, slotEndTime, isAvailable, unavailableReason
│           ├── MUACalendarSlotRes.java        # calendarId, bookingDate, startTime, endTime, reason
│           └── MUACalendarMonthRes.java       # Tổng hợp trạng thái rảnh/bận các ngày trong tháng
│
├── entity/
│   ├── booking/
│   │   └── BookingEntity.java                 # Map với table: booking_schema.bookings (@Version)
│   └── mua/
│       └── MUACalendarEntity.java             # Map với table: mua_schema.mua_calendars
│
├── mapper/                                    # TẦNG CHUYỂN ĐỔI DỮ LIỆU (MANUAL MAPPER @Component - Builder Pattern)
│   ├── booking/
│   │   └── ScheduledBookingMapper.java        # Manual Mapper: BookingEntity <-> DTOs (KHÔNG DÙNG MAPSTRUCT)
│   └── mua/
│       └── MUACalendarMapper.java             # Manual Mapper: MUACalendarEntity <-> DTOs (KHÔNG DÙNG MAPSTRUCT)
│
├── repository/
│   ├── booking/
│   │   └── BookingRepository.java             # findUpcomingBookingsForReminder, findByBookingCode
│   └── mua/
│       └── MUACalendarRepository.java         # existsOverlappingSlot, findByMuaIdAndBookingDate
│
├── event/
│   ├── ScheduledBookingCreatedEvent.java      # Event bắn ra khi đơn hẹn trước tạo thành công (giữ cọc Escrow)
│   └── BookingReminderEvent.java              # Event bắn ra khi cron quét đến mốc nhắc lịch 24h hoặc 2h
│
└── service/                                   # TẦNG NGHIỆP VỤ LÕI (CHỨA 100% BUSINESS LOGIC)
    ├── booking/
    │   ├── ScheduledBookingService.java       # Interface tạo đơn hẹn trước, tính cọc, kiểm tra slot
    │   ├── BookingReminderScheduler.java      # Scheduled cron quét nhắc lịch định kỳ 15 phút
    │   └── impl/
    │       └── ScheduledBookingServiceImpl.java # Code thực thi thật nghiệp vụ đặt lịch hẹn trước
    └── mua/
        ├── MUACalendarService.java            # Interface quản lý lịch bận, slot rảnh, tính đệm di chuyển
        └── impl/
            └── MUACalendarServiceImpl.java    # Code thực thi thật quản lý calendar thợ
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
    1. **Kiểm tra ngày hẹn hợp lệ:** Ngày hẹn phải nằm trong khoảng từ ngày mai đến tối đa 90 ngày tới ($T_{\text{booking}} \in [D_{\text{now}} + 1, D_{\text{now}} + 90]$).
    2. **Kiểm tra tính khả dụng của Slot:** Khung giờ từ `08:30:00` đến `10:00:00` ($90\text{ phút}$) cộng thêm khoảng đệm di chuyển $30\text{ phút}$ (tổng cửa sổ kiểm tra: `08:30:00` đến `10:30:00`) không bị giao thoa với bất kỳ bản ghi nào trong `mua_schema.mua_calendars`.
    3. **Tính toán tài chính minh bạch:**
       - Giá gói niêm yết: $2,500,000\text{ VNĐ}$.
       - Dịch vụ đi kèm (Add-on 112): $80,000\text{ VNĐ}$.
       - Phí di chuyển (theo khoảng cách GPS): $45,000\text{ VNĐ}$.
       - Phụ phí (giờ sớm / ngày Lễ): $0\text{ VNĐ}$ (sau 5h sáng và không phải ngày Lễ).
       - Tổng hóa đơn: $2,625,000\text{ VNĐ}$.
       - Tiền cọc giữ trước ($30\%$): $787,500\text{ VNĐ}$. Số tiền còn lại trả sau: $1,837,500\text{ VNĐ}$.
    4. **Khởi tạo bản ghi Đơn hàng:**
       - Chèn bản ghi vào `booking_schema.bookings` với `booking_type = 'SCHEDULED'`, `booking_partner = 'FREELANCER_DIRECT'`, `status = 'ACCEPTED'`, `deposit_amount = 787500.00`.
       - Chèn bản ghi Audit Log vào `booking_schema.booking_history` (`from_status = null`, `to_status = 'ACCEPTED'`, `note = 'Khách hàng đặt lịch hẹn trước trực tiếp thợ thành công'`).
    5. **Tự động khóa lịch bận của Thợ:**
       - Chèn bản ghi vào `mua_schema.mua_calendars` từ `08:30:00` đến `10:30:00` (đã gồm 30 phút đệm) với `reason = 'BOOKING_BK2610200830'`.
  * **And** Hệ thống bắn sự kiện `ScheduledBookingCreatedEvent` qua Spring EventBus (để gửi thông báo xác nhận và dự phòng cho Event Listener trừ ví ở Sprint 5).
  * **And** Trả về HTTP `201 Created` kèm thông điệp bản địa hóa qua i18n key `booking.schedule_create_success`.

* **Scenario 02: Đặt lịch hẹn trước chỉ định Studio (AGENCY_DISPATCH Flow - Kết nối ISSUE-19)**
  * **Given** Khách hàng chọn Studio `agency_id = 12` cho gói chụp kỷ yếu nhóm vào ngày `2026-11-15`.
  * **When** Khách hàng gửi request đặt lịch với `booking_partner = 'AGENCY_DISPATCH'`, `agency_id = 12`, `mua_id = null`.
  * **Then** Hệ thống tạo bản ghi `booking_schema.bookings` với:
    - `booking_type = 'SCHEDULED'`
    - `booking_partner = 'AGENCY_DISPATCH'`
    - `status = 'PENDING_AGENCY_DISPATCH'` (chưa gán thợ cụ thể).
  * **And** Chưa khóa lịch trong `mua_schema.mua_calendars` vì chưa phân bổ thợ.
  * **And** Đơn hàng lập tức xuất hiện trong Hàng đợi Tiếp nhận của Web Studio Portal (`ISSUE-19.1`) để Chủ Studio duyệt và gán thợ chính/thợ phụ (`ISSUE-19.2`).
  * **And** Trả về HTTP `201 Created`.

* **Scenario 03: Tự động tính phụ phí Ngày Lễ/Tết và Giờ làm sớm cho lịch hẹn tương lai**
  * **Given** Khách hàng đặt lịch hẹn trang điểm vào lúc `04:30:00` sáng ngày `2027-01-01` (Tết Dương Lịch).
  * **When** Khách hàng gửi request đặt lịch hẹn trước.
  * **Then** Tầng nghiệp vụ gọi `HolidayCalendarUtils` và `DynamicPricingService`:
    - Áp dụng phụ phí làm sớm (`EARLY_MORNING` trước 5h sáng): $+150,000\text{ VNĐ}$.
    - Áp dụng phụ phí ngày Lễ Quốc gia (`HOLIDAY` Tết Dương Lịch): $+200,000\text{ VNĐ}$.
  * **And** Tổng phụ phí $350,000\text{ VNĐ}$ được cộng minh bạch vào hóa đơn tạm tính và tiền cọc ($30\%$) được tính toán chính xác trên tổng số tiền cuối cùng.

* **Scenario 04: Chặn đặt lịch trong quá khứ hoặc vượt quá giới hạn 90 ngày tới**
  * **When** Khách gửi `booking_date` là ngày hôm nay, ngày trong quá khứ hoặc vượt quá 90 ngày so với hiện tại.
  * **Then** Tầng Bean Validation hoặc Service phát hiện vi phạm quy tắc thời gian.
  * **And** Ném `CustomBusinessException(ErrorCodes.ERR_BOOKING_DATE_TOO_FAR, "booking.date_out_of_range")`.
  * **And** Trả về HTTP `400 BAD_REQUEST` với mã lỗi và thông điệp đa ngôn ngữ chuẩn xác từ `messages_vi.json` hoặc `messages_en.json`.

* **Scenario 05: [Sprint 5 Extension] Kiểm tra số dư ví khi tích hợp phân hệ Ví & Escrow**
  * **Given** Phân hệ Ví & Escrow (`wallet_schema`) đã được kích hoạt ở Sprint 5.
  * **When** Khách hàng đặt lịch hẹn nhưng số dư khả dụng trong ví không đủ để thanh toán cọc 30%.
  * **Then** Hệ thống ném `CustomBusinessException(ErrorCodes.ERR_WALLET_INSUFFICIENT_BALANCE, "wallet.insufficient_balance_for_deposit")`.
  * **And** Trả về HTTP `400 BAD_REQUEST` kèm thông báo hướng dẫn nạp tiền.

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

* **Scenario 03: Thợ tự chủ động khóa lịch bận cá nhân (Block Personal Busy Slot)**
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
  * **Then** Hệ thống kiểm tra khung giờ này chưa có ca hẹn nào được khách đặt trước đó.
  * **And** Chèn bản ghi vào `mua_schema.mua_calendars` với `mua_id = <current_mua_id>`, `booking_id = null`.
  * **And** Trên giao diện của khách hàng, toàn bộ ngày `2026-12-25` của thợ này lập tức chuyển sang trạng thái Disabled, không ai có thể đặt hẹn.
  * **And** Trả về HTTP `201 Created` kèm thông điệp i18n `calendar.slot_blocked_success`.

* **Scenario 04: Thợ mở lại slot bận cá nhân đã khóa trước đó**
  * **When** Thợ gọi `DELETE /api/v1/freelancer/calendar/block/{calendarId}`.
  * **Then** Hệ thống kiểm tra quyền sở hữu bản ghi (IDOR Protection) và kiểm tra đây là slot do thợ tự khóa (`booking_id IS NULL`).
  * **And** Nếu bản ghi gắn với đơn hàng của khách (`booking_id IS NOT NULL`), hệ thống từ chối và ném lỗi `ERR_CANNOT_UNBLOCK_BOOKED_SLOT`.
  * **And** Nếu hợp lệ, xóa bản ghi khỏi `mua_schema.mua_calendars`, khung giờ mở lại trạng thái rảnh đón khách.
  * **And** Trả về HTTP `200 OK` kèm thông điệp i18n `calendar.slot_unblocked_success`.

---

### **US-SCHED-03: Scheduler Cron Job Tự Động Nhắc Lịch Ca Hẹn Trước 24h & 2h (`ISSUE-18.3`)**
> **As a** Khách hàng và Thợ trang điểm có ca hẹn sắp tới,  
> **I want** hệ thống tự động gửi thông báo nhắc nhở trước 24 giờ và trước 2 giờ trước khi ca làm bắt đầu,  
> **So that** thợ chuẩn bị đầy đủ cốp đồ nghề lên đường đúng giờ và khách hàng chuẩn bị sẵn sàng không gian làm đẹp.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Tự động gửi thông báo nhắc lịch trước 24 giờ (Reminder 24h Flow)**
  * **Given** Đơn hàng `booking_id = 605` có lịch hẹn lúc `09:00:00` sáng ngày mai (`2026-10-20`).
  * **And** Trạng thái đơn là `ACCEPTED` và cờ `reminder_24h_sent = false`.
  * **When** Cron Job `@Scheduled(cron = "0 */15 * * * *")` quét tại thời điểm `08:45 - 09:15` hôm nay.
  * **Then** Worker phát hiện đơn 605 nằm trong cửa sổ nhắc nhở 24 giờ ($T_{\text{start}} - \text{now} \approx 24\text{h}$).
  * **And** Bắn Event `BookingReminderEvent(bookingId = 605, type = REMINDER_24H)` qua Spring In-Memory EventBus.
  * **And** Hệ thống lưu bản ghi vào `interaction_schema.in_app_notifications` và gửi thông báo qua WebSocket/Push:
    - **Khách hàng:** `"⏰ Nhắc lịch hẹn: Ca trang điểm cô dâu của bạn sẽ bắt đầu vào 09:00 sáng mai. Vui lòng rửa mặt sạch và dưỡng ẩm tối nay nhé!"`.
    - **Thợ trang điểm:** `"⏰ Nhắc lịch hẹn: Bạn có ca make-up vào 09:00 sáng mai tại Khách sạn Sheraton, Q.1. Vui lòng kiểm tra vệ sinh cọ và cốp đồ nghề!"`.
  * **And** Cập nhật cờ `reminder_24h_sent = true` trên bảng `booking_schema.bookings` trong cùng transaction để đảm bảo không bao giờ bị gửi lặp lại.

* **Scenario 02: Tự động gửi thông báo nhắc lịch khẩn cấp trước 2 giờ (Reminder 2h Flow)**
  * **Given** Đơn hàng `booking_id = 605` có lịch làm lúc `09:00:00`, thời điểm hiện tại là `07:00:00` sáng cùng ngày.
  * **And** Cờ `reminder_2h_sent = false`.
  * **When** Cron Job quét lúc 07:00.
  * **Then** Worker kích hoạt thông báo nhắc 2 giờ:
    - **Thợ trang điểm:** `"🚗 Chuẩn bị xuất phát: Ca hẹn của bạn sẽ bắt đầu sau 2 tiếng nữa (09:00). Nhớ bấm 'Bắt đầu đi' khi xuất phát để khách theo dõi lộ trình nhé!"`.
    - **Khách hàng:** `"✨ Thợ trang điểm Lê Bảo Ngọc đang chuẩn bị đồ nghề và sẽ có mặt tại điểm hẹn trước 09:00 sáng nay."`.
  * **And** Cập nhật cờ `reminder_2h_sent = true`.

* **Scenario 03: Chống gửi trùng lặp thông báo trong môi trường phân tán (Redis Idempotency Guard)**
  * **Given** Môi trường cụm triển khai nhiều máy chủ (Cluster Node A và Node B cùng chạy).
  * **When** Worker trên Node A bắt đầu quét và xử lý đơn 605.
  * **Then** Worker thiết lập Redis Key `lock:reminder:24h:605` với TTL 1 giờ bằng lệnh `SET NX EX`.
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
| **`400 BAD_REQUEST`** | `ERR_CANNOT_UNBLOCK_BOOKED_SLOT` | `calendar.cannot_unblock_booked_slot` | Thợ cố tình xóa bản ghi lịch bận gắn liền với một đơn hàng đã có khách đặt (`booking_id IS NOT NULL`). | Chặn thao tác xóa, yêu cầu xử lý qua quy trình hủy đơn chuẩn. |
| **`400 BAD_REQUEST`** | `ERR_WALLET_INSUFFICIENT_BALANCE` | `wallet.insufficient_balance_for_deposit` | [Sprint 5] Số dư ví không đủ thanh toán cọc 30%. | Ném ngoại lệ yêu cầu nạp thêm tiền vào ví. |
| **`404 NOT_FOUND`** | `ERR_MUA_NOT_FOUND` | `mua.not_found` | `mua_id` của Thợ không tồn tại trong hệ thống. | Ném `ResourceNotFoundException("mua.not_found")`. |
| **`409 CONFLICT`** | `ERR_SLOT_ALREADY_BOOKED` | `booking.slot_already_booked` | Khung giờ chọn bị trùng khớp hoặc giao thoa với ca làm đã có trong `mua_schema.mua_calendars`. | Báo bận, yêu cầu khách chọn khung giờ khác. |
| **`409 CONFLICT`** | `ERR_BUFFER_TIME_VIOLATION` | `booking.buffer_time_violation` | Khung giờ chọn quá sát với ca làm liền trước/liền sau ($< 30\text{ phút}$ đệm di chuyển). | Báo lỗi không đủ thời gian di chuyển giữa 2 ca. |
| **`409 CONFLICT`** | `ERR_CALENDAR_ALREADY_BLOCKED` | `calendar.already_blocked` | Thợ tự khóa lịch bận nhưng khoảng thời gian đó đã được khóa từ trước. | Chặn tạo bản ghi trùng lặp trong DB. |

---

### 4.2. Bảng Đồng Bộ Khóa Đa Ngôn Ngữ (System-Wide i18n JSON Keys)

Tuân thủ nghiêm ngặt **Quy chuẩn 5 (System-Wide Internationalization - i18n)**, mọi thông báo phải được khai báo đồng thời tại cả 2 file:

| Message Key | Tiếng Việt (`messages_vi.json`) | Tiếng Anh (`messages_en.json`) |
| :--- | :--- | :--- |
| `booking.schedule_create_success` | `"Đặt lịch hẹn thành công! Thợ đã được giữ chỗ cho bạn."` | `"Scheduled booking created successfully! Provider has been reserved for you."` |
| `booking.slot_already_booked` | `"Thợ trang điểm đã có ca làm việc khác trong khung giờ này. Vui lòng chọn khung giờ khác!"` | `"The beauty artist is already booked for this time slot. Please choose another slot!"` |
| `booking.buffer_time_violation` | `"Không đủ thời gian di chuyển giữa 2 ca làm (tối thiểu 30 phút). Vui lòng chọn khung giờ khác!"` | `"Insufficient transit buffer between bookings (minimum 30 minutes required). Please select another slot!"` |
| `booking.date_must_be_future` | `"Ngày hẹn phải nằm trong tương lai (từ ngày mai trở đi)."` | `"Booking date must be in the future (starting tomorrow)."` |
| `booking.date_too_far` | `"Ngày hẹn không được vượt quá 90 ngày kể từ hôm nay."` | `"Booking date cannot exceed 90 days from today."` |
| `calendar.slot_blocked_success` | `"Đã khóa lịch bận cá nhân thành công!"` | `"Personal busy slot blocked successfully!"` |
| `calendar.slot_unblocked_success` | `"Đã mở lại khung giờ làm việc thành công!"` | `"Time slot unblocked and opened successfully!"` |
| `calendar.cannot_unblock_booked_slot` | `"Không thể mở khóa khung giờ đã được khách hàng đặt trước. Vui lòng xử lý qua luồng hủy đơn!"` | `"Cannot unblock a slot tied to an active customer booking. Please use the booking cancellation flow!"` |
| `calendar.slots_retrieved_success` | `"Lấy danh sách khung giờ rảnh thành công."` | `"Available time slots retrieved successfully."` |

---

### 4.3. Mã Nguồn Validation DTO Mẫu (Bean Validation Tuân Thủ i18n)

#### DTO Đặt Lịch Hẹn Trước: `CreateScheduledBookingReq.java`
```java
package com.makeup.platform.dto.request.booking;

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

#### DTO Thợ Khóa Lịch Bận Cá Nhân: `BlockCalendarSlotReq.java`
```java
package com.makeup.platform.dto.request.mua;

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
  "message": "Đặt lịch hẹn thành công! Thợ đã được giữ chỗ cho bạn.",
  "data": {
    "booking_id": 605,
    "booking_code": "BK-261020-SHERATON",
    "status": "ACCEPTED",
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

### 5.2. `GET /api/v1/mua/{muaId}/available-slots` (Tra Cứu Slot Trống Trong Ngày Của Thợ)
* **Quyền truy cập:** `permitAll` (Công khai cho mọi người dùng).
* **Query Parameters:** `date=2026-10-20`, `duration_minutes=90`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "AVAILABLE_SLOTS_RETRIEVED",
  "message": "Lấy danh sách khung giờ rảnh thành công.",
  "data": {
    "mua_id": 89,
    "booking_date": "2026-10-20",
    "buffer_time_minutes": 30,
    "slots": [
      {
        "slot_start": "06:30:00",
        "slot_end": "08:00:00",
        "is_available": true,
        "is_early_morning": false
      },
      {
        "slot_start": "08:30:00",
        "slot_end": "10:00:00",
        "is_available": false,
        "unavailable_reason": "Đã có khách đặt ca hẹn"
      },
      {
        "slot_start": "11:00:00",
        "slot_end": "12:30:00",
        "is_available": true,
        "is_early_morning": false
      },
      {
        "slot_start": "14:00:00",
        "slot_end": "15:30:00",
        "is_available": true,
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
    "start_time": "00:00:00",
    "end_time": "23:59:59",
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
     * Tạo đơn đặt lịch hẹn trước cho tương lai (Customer)
     */
    ScheduledBookingCreatedRes createScheduledBooking(Long customerId, CreateScheduledBookingReq req);
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
import java.time.LocalTime;

public interface MUACalendarService {

    /**
     * Tra cứu các slot rảnh trong ngày của thợ (Public API)
     */
    AvailableTimeSlotRes getAvailableSlots(Long muaId, LocalDate date, Integer durationMinutes);

    /**
     * Thợ chủ động khóa slot bận cá nhân
     */
    MUACalendarSlotRes blockPersonalSlot(Long muaId, BlockCalendarSlotReq req);

    /**
     * Mở lại slot bận cá nhân đã khóa
     */
    void unblockPersonalSlot(Long muaId, Long calendarId);

    /**
     * Kiểm tra giao thoa khoảng thời gian có tính buffer time di chuyển
     */
    boolean isSlotAvailableWithBuffer(Long muaId, LocalDate date, LocalTime startTime, LocalTime endTime, int bufferMinutes);

    /**
     * Tự động khóa lịch khi có đơn hàng được tạo thành công
     */
    void lockSlotForBooking(Long muaId, Long bookingId, LocalDate date, LocalTime startTime, LocalTime endTime, String reason);
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16 & FLYWAY STANDARD)

Tuân thủ nghiêm ngặt **Quy chuẩn 2.9 (Database Migration với Flyway - Timestamp Versioning)**, script migration mới được đặt tên theo quy tắc:
`code/backend/core-api/src/main/resources/db/migration/V20260916170000__Create_Mua_Calendars_And_Booking_Reminders.sql`

```sql
-- ==============================================================================
-- Migration: V20260916170000__Create_Mua_Calendars_And_Booking_Reminders.sql
-- Description: Khởi tạo bảng mua_calendars trong mua_schema và bổ sung cờ cron nhắc lịch
-- ==============================================================================

-- 1. BẢNG QUẢN LÝ LỊCH BẬN CÁ NHÂN & KHUNG GIỜ ĐÃ ĐẶT CỦA THỢ (MUA_SCHEMA - ISSUE-18.2)
CREATE TABLE IF NOT EXISTS mua_schema.mua_calendars (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255) NOT NULL, -- 'BOOKING_BK2610200830', 'PERSONAL_LEAVE', 'FAMILY_EVENT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_time_range CHECK (end_time > start_time)
);

-- 2. BỔ SUNG CÁC CỜ PHỤC VỤ CRON JOB NHẮC LỊCH TRÊN BẢNG BOOKINGS (ISSUE-18.3)
ALTER TABLE booking_schema.bookings 
    ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. CHỈ MỤC TỐI ƯU TRUY VẤN GIAO THOA THỜI GIAN VÀ CRON NHẮC LỊCH
CREATE INDEX IF NOT EXISTS idx_mua_calendars_overlap 
    ON mua_schema.mua_calendars(mua_id, booking_date, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_cron 
    ON booking_schema.bookings(status, booking_type, booking_date, start_time) 
    WHERE status = 'ACCEPTED' AND booking_type = 'SCHEDULED';

-- 4. BÌNH LUẬN GIẢI THÍCH SCHEMA
COMMENT ON TABLE mua_schema.mua_calendars IS 'Bảng quản lý lịch bận cá nhân và các khung giờ đã bị khóa bởi đơn hàng của thợ make-up';
COMMENT ON COLUMN booking_schema.bookings.reminder_24h_sent IS 'Cờ đánh dấu đã gửi thông báo nhắc lịch trước 24 giờ';
COMMENT ON COLUMN booking_schema.bookings.reminder_2h_sent IS 'Cờ đánh dấu đã gửi thông báo nhắc lịch trước 2 giờ';
```

---

## ⚡ 7. THUẬT TOÁN KIỂM TRA GIAO THOA THỜI GIAN, BUFFER TIME & CRON ENGINE

### 7.1. Thuật toán Kiểm tra Giao thoa Thời gian & Khoảng đệm (Interval Overlap with Buffer)

Hai khoảng thời gian $[S_1, E_1]$ và $[S_2, E_2]$ giao nhau khi và chỉ khi:
$$\max(S_1, S_2) < \min(E_1, E_2)$$

Khi khách hàng yêu cầu đặt slot từ $T_{\text{start}}$ đến $T_{\text{end}}$, hệ thống tự động mở rộng khoảng thời gian cần kiểm tra sang 2 đầu với khoảng đệm di chuyển $B = 30\text{ phút}$:
$$[T_{\text{start}} - B, \; T_{\text{end}} + B]$$

#### Native Query trong `MUACalendarRepository.java`:
```java
package com.makeup.platform.repository.mua;

import com.makeup.platform.entity.mua.MUACalendarEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface MUACalendarRepository extends JpaRepository<MUACalendarEntity, Long> {

    @Query("""
        SELECT COUNT(c) > 0 FROM MUACalendarEntity c
        WHERE c.mua.id = :muaId
          AND c.bookingDate = :bookingDate
          AND (c.startTime < :windowEnd AND c.endTime > :windowStart)
    """)
    boolean existsOverlappingSlot(
        @Param("muaId") Long muaId,
        @Param("bookingDate") LocalDate bookingDate,
        @Param("windowStart") LocalTime windowStart,
        @Param("windowEnd") LocalTime windowEnd
    );

    List<MUACalendarEntity> findByMuaIdAndBookingDateOrderByStartTimeAsc(Long muaId, LocalDate bookingDate);
}
```

---

### 7.2. Logic Cron Job Nhắc Lịch Tự Động (Sliding Window Algorithm & Redis Idempotency)

Cron Job được đặt tại `service/booking/BookingReminderScheduler.java`, chạy định kỳ mỗi 15 phút với bộ trượt cửa sổ (Sliding Window):

```java
package com.makeup.platform.service.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.event.BookingReminderEvent;
import com.makeup.platform.repository.booking.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
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

    @Scheduled(cron = "0 */15 * * * *") // Chạy định kỳ mỗi 15 phút
    @Transactional
    public void scanAndSendBookingReminders() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Quét đơn nhắc trước 24 giờ: Cửa sổ [now + 23h45m, now + 24h15m]
        LocalDateTime w24Start = now.plusHours(23).plusMinutes(45);
        LocalDateTime w24End = now.plusHours(24).plusMinutes(15);
        List<BookingEntity> bookings24h = bookingRepository.findUpcomingBookingsForReminder(
            w24Start.toLocalDate(), w24Start.toLocalTime(),
            w24End.toLocalDate(), w24End.toLocalTime(), false, "24H"
        );

        for (BookingEntity booking : bookings24h) {
            String lockKey = "reminder:lock:24h:" + booking.getId();
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "SENT", Duration.ofHours(2));
            if (Boolean.TRUE.equals(acquired)) {
                eventPublisher.publishEvent(new BookingReminderEvent(this, booking.getId(), "REMINDER_24H"));
                booking.setReminder24hSent(true);
                bookingRepository.save(booking);
                log.info("Triggered 24h reminder for scheduled booking ID: {}", booking.getId());
            }
        }

        // 2. Quét đơn nhắc trước 2 giờ: Cửa sổ [now + 1h45m, now + 2h15m]
        LocalDateTime w2Start = now.plusHours(1).plusMinutes(45);
        LocalDateTime w2End = now.plusHours(2).plusMinutes(15);
        List<BookingEntity> bookings2h = bookingRepository.findUpcomingBookingsForReminder(
            w2Start.toLocalDate(), w2Start.toLocalTime(),
            w2End.toLocalDate(), w2End.toLocalTime(), false, "2H"
        );

        for (BookingEntity booking : bookings2h) {
            String lockKey = "reminder:lock:2h:" + booking.getId();
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "SENT", Duration.ofHours(2));
            if (Boolean.TRUE.equals(acquired)) {
                eventPublisher.publishEvent(new BookingReminderEvent(this, booking.getId(), "REMINDER_2H"));
                booking.setReminder2hSent(true);
                bookingRepository.save(booking);
                log.info("Triggered 2h reminder for scheduled booking ID: {}", booking.getId());
            }
        }
    }
}
```

---

## 🎨 8. ĐẶC TẢ PHÁT TRIỂN FRONTEND (REACT + VITE + TAILWIND + ZOD)

Tuân thủ nghiêm ngặt **Quy chuẩn 3 (Frontend Engineering Standards)**:

### 8.1. Zod Schemas Validation (`src/schemas/booking/scheduledBookingSchema.js`)
```javascript
import { z } from 'zod';

export const createScheduledBookingSchema = z.object({
  packageId: z.number({ required_error: 'Vui lòng chọn gói dịch vụ' }),
  addOnItemIds: z.array(z.number()).optional(),
  bookingPartner: z.enum(['FREELANCER_DIRECT', 'AGENCY_DISPATCH']),
  agencyId: z.number().nullable().optional(),
  muaId: z.number().nullable().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày hẹn không đúng định dạng YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ bắt đầu không đúng định dạng HH:mm:ss'),
  destinationAddress: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự').max(255),
  destinationLatitude: z.number().min(8.0).max(24.0),
  destinationLongitude: z.number().min(102.0).max(110.0),
  voucherCode: z.string().nullable().optional()
}).refine(data => {
  if (data.bookingPartner === 'FREELANCER_DIRECT' && !data.muaId) {
    return false;
  }
  if (data.bookingPartner === 'AGENCY_DISPATCH' && !data.agencyId) {
    return false;
  }
  return true;
}, {
  message: 'Vui lòng chỉ định đúng đối tác Thợ tự do hoặc Studio',
  path: ['bookingPartner']
});

export const blockCalendarSlotSchema = z.object({
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày hẹn không đúng định dạng YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ bắt đầu không đúng định dạng HH:mm:ss'),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ kết thúc không đúng định dạng HH:mm:ss'),
  reason: z.string().min(3, 'Lý do tối thiểu 3 ký tự').max(255, 'Lý do tối đa 255 ký tự')
}).refine(data => data.endTime > data.startTime, {
  message: 'Giờ kết thúc phải sau giờ bắt đầu',
  path: ['endTime']
});
```

### 8.2. Axios Service Client (`src/services/scheduledBookingService.js`)
```javascript
import axiosClient from './axiosClient';

export const scheduledBookingService = {
  createScheduledBooking: (payload) => 
    axiosClient.post('/customer/bookings/scheduled', payload),

  getAvailableSlots: (muaId, date, durationMinutes = 90) => 
    axiosClient.get(`/mua/${muaId}/available-slots`, {
      params: { date, duration_minutes: durationMinutes }
    }),

  blockPersonalSlot: (payload) => 
    axiosClient.post('/freelancer/calendar/block', payload),

  unblockPersonalSlot: (calendarId) => 
    axiosClient.delete(`/freelancer/calendar/block/${calendarId}`)
};
```

---

## 🛡️ 9. YÊU CẦU PHI CHỨC NĂNG & AN TOÀN HỆ THỐNG (NFRS & SECURITY)

1. **Tốc Độ Phản Hồi Tra Cứu Slot Rảnh (Slot Availability Latency):**
   - API `GET /api/v1/mua/{muaId}/available-slots` phải hoàn thành tính toán giao thoa và trả về kết quả trong thời gian **$< 20\text{ms}$** nhờ chỉ mục Composite B-Tree `idx_mua_calendars_overlap`.
2. **Độ Bền Vững Của Cron Job Nhắc Lịch (Job Reliability & Idempotency):**
   - Cron Job hoàn thành quét trong vòng **$< 500\text{ms}$** trên tập dữ liệu $10,000$ ca hẹn.
   - Cơ chế khóa phân tán Redis kết hợp cờ Database đảm bảo $100\%$ không bao giờ bỏ sót và không bao giờ bắn trùng lặp thông báo nhắc hẹn cho người dùng.
3. **Tính Toàn Vẹn Khóa Lịch (Calendar Consistency):**
   - Thao tác tạo đơn hẹn trước và ghi bản ghi khóa lịch vào `mua_schema.mua_calendars` được bao bọc trong cùng một **Database Transaction (`@Transactional`)**. Tuyệt đối không bao giờ có đơn hẹn thành công mà lịch của thợ vẫn mở trống.
4. **Phòng Ngừa IDOR & Kiểm Soát Phân Quyền (RBAC & Ownership Security):**
   - Thợ trang điểm chỉ có quyền xóa các bản ghi slot lịch do chính mình tạo ra và có `booking_id IS NULL`. Không một ai có thể xóa slot lịch gắn với đơn hàng của khách qua API quản lý lịch bận.
