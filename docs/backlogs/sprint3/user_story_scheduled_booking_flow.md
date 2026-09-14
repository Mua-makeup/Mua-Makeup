# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐẶT LỊCH HẸN TRƯỚC (SCHEDULED BOOKING), LỊCH BẬN CÁ NHÂN & CRON NHẮC LỊCH
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schema: `booking_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Scheduled Booking Flow, MUA Calendar Engine & Reminder Cron Scheduler`
* **Mã Jira Issues phụ trách (Sprint 3):**
  * `ISSUE-18.1`: **User Story** - Luồng 2: Đặt Lịch Hẹn Trước cho tương lai (Scheduled Booking Flow) - Khách hàng chọn Thợ/Studio, chọn ngày giờ và đặt cọc giữ chỗ.
  * `ISSUE-18.2`: **Task** - Lịch bận cá nhân Thợ (`booking_schema.mua_calendars`) - Khóa ca làm trùng giờ, kiểm tra khoảng đệm di chuyển (Buffer Time).
  * `ISSUE-18.3`: **Task** - Scheduler Cron Job tự động phát thông báo nhắc lịch ca hẹn trước 24h & 2h cho cả Khách hàng và Thợ trang điểm.
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Động cơ Quản lý Thời gian & Lịch bận:** Thuật toán phát hiện giao thoa khoảng thời gian (Interval Overlap Detection) kết hợp khoảng đệm di chuyển chuẩn ($30\text{–}45\text{ phút}$) để ngăn chặn tuyệt đối tình trạng thợ nhận 2 ca sát giờ nhau không kịp di chuyển.
  * **Tự động hóa Tác vụ Nền (Background Scheduled Worker):** Spring `@Scheduled` / `ThreadPoolTaskScheduler` quét định kỳ mỗi 15 phút, kết hợp **Redis Idempotency Key** chống bắn trùng lặp thông báo nhắc lịch.
  * **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`booking_schema.bookings`, `booking_schema.mua_calendars`, `catalog_schema.surcharges`, `wallet_schema.wallets`).
* **Đối tượng Sử dụng (User Personas):**
  1. **Customer (Khách hàng đặt lịch hẹn sự kiện tương lai):**
     * Có kế hoạch trước cho ngày cưới hỏi, tiệc sinh nhật, chụp ảnh kỷ yếu (đặt trước từ vài ngày đến vài tháng).
     * Xem bảng lịch rảnh trực quan của Thợ/Studio yêu thích, chọn khung giờ phù hợp và đặt cọc 30% để khóa lịch chắc chắn.
     * Nhận được thông báo nhắc lịch tự động trước 24 giờ và trước 2 giờ kèm hướng dẫn chuẩn bị da mặt trước khi thợ đến.
  2. **Freelance MUA & Studio Staff MUA (Thợ trang điểm):**
     * Xem toàn bộ lịch làm việc tuần/tháng trên giao diện Calendar trực quan.
     * Chủ động khóa các khung giờ bận việc cá nhân (nghỉ ốm, việc gia đình, đi du lịch) để hệ thống không cho khách đặt vào giờ đó.
     * Được đảm bảo có đủ thời gian nghỉ ngơi và di chuyển giữa các ca làm liên tiếp.
  3. **Agency Owner / Studio Admin (Chủ Studio):**
     * Nắm bắt lịch trực và công suất phục vụ của từng thợ trong Studio, điều phối phân công ca làm không bị chồng chéo.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Mã nguồn Luồng Đặt lịch Hẹn trước & Quản lý Lịch bận được tổ chức tại `code/backend/core-api/src/main/java/com/makeup/platform/`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # ok, created, error
│   │   └── ApiResponse.java                   # Envelope: {success, code, message, data, timestamp}
│   ├── constants/
│   │   ├── CalendarConstants.java             # DEFAULT_BUFFER_MINUTES (30m), MAX_FUTURE_BOOKING_DAYS (90d)
│   │   └── ErrorCodes.java                    # ERR_SLOT_ALREADY_BOOKED, ERR_CALENDAR_OVERLAP
│   └── utils/
│       ├── DateTimeIntervalUtils.java         # Thuật toán kiểm tra giao thoa 2 khoảng thời gian [start, end]
│       └── HolidayCalendarUtils.java          # Nhận diện phụ phí Lễ/Tết cho các ngày đặt trong tương lai
│
├── config/
│   └── SchedulingConfig.java                  # Cấu hình TaskScheduler đa luồng phục vụ Cron Job
│
├── controller/
│   └── booking/
│       ├── ScheduledBookingCustomerController.java # POST /api/v1/customer/bookings/scheduled
│       ├── MUACalendarQueryController.java         # GET /api/v1/providers/{id}/available-slots
│       └── MUACalendarManagementController.java    # POST & DELETE /api/v1/freelancer/calendar/block
│
├── dto/
│   ├── request/booking/
│   │   ├── CreateScheduledBookingReq.java     # packageId, bookingDate, startTime, destinationAddress, lat, lng
│   │   ├── BlockCalendarSlotReq.java          # bookingDate, startTime, endTime, reason
│   │   └── GetAvailableSlotsReq.java          # providerId, date, packageEstimatedDurationMinutes
│   └── response/booking/
│       ├── ScheduledBookingCreatedRes.java    # bookingId, bookingCode, depositAmount, scheduleSummary
│       ├── AvailableTimeSlotRes.java          # slotStartTime, slotEndTime, isAvailable, unavailableReason
│       └── MUACalendarMonthRes.java           # Danh sách các ngày trong tháng (Tổng số ca, trạng thái rảnh/bận)
│
├── entity/
│   └── booking/
│       ├── BookingEntity.java                 # table: booking_schema.bookings
│       └── MUACalendarEntity.java             # table: booking_schema.mua_calendars
│
├── repository/
│   └── booking/
│       ├── BookingRepository.java             # findScheduledBookingsForReminder
│       └── MUACalendarRepository.java         # findOverlappingSlots, findByMuaIdAndBookingDate
│
├── event/
│   ├── ScheduledBookingCreatedEvent.java      # Bắn ra khi đơn hẹn trước tạo thành công
│   └── BookingReminderEvent.java              # Bắn ra khi đến mốc nhắc lịch 24h hoặc 2h
│
└── service/
    └── booking/
        ├── ScheduledBookingService.java       # Nghiệp vụ tạo đơn hẹn trước, tính giá tương lai, trừ cọc
        ├── MUACalendarService.java            # Khóa lịch, kiểm tra trùng giờ, tính khoảng đệm buffer
        └── BookingReminderScheduler.java      # Cron Job định kỳ 15 phút quét nhắc lịch 24h & 2h
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-SCHED-01: Khách Hàng Đặt Lịch Hẹn Trước Cho Tương Lai (`ISSUE-18.1`)**
> **As a** Khách hàng có nhu cầu trang điểm tiệc cưới hoặc sự kiện sắp tới,  
> **I want to** chọn Thợ/Studio yêu thích, xem các khung giờ còn trống trong ngày chỉ định và đặt cọc giữ chỗ trước,  
> **So that** tôi an tâm có thợ chuyên nghiệp phục vụ đúng ngày giờ mong muốn mà không lo bị hết chỗ.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Đặt lịch hẹn trước thành công cho ngày tương lai (Happy Path)**
  * **Given** Khách hàng chọn Thợ `mua_id = 89`, Gói dịch vụ Cô dâu (thời lượng ước tính: $90\text{ phút}$).
  * **And** Khách hàng xem lịch ngày `20/10/2026` thấy slot `08:30` sáng còn trống (thợ chưa có lịch bận).
  * **When** Khách gửi request `POST /api/v1/customer/bookings/scheduled`:
    ```json
    {
      "package_id": 45,
      "provider_type": "FREELANCER",
      "provider_id": 89,
      "booking_date": "2026-10-20",
      "start_time": "08:30:00",
      "destination_address": "Khách sạn Sheraton, Q.1, TP.HCM",
      "destination_latitude": 10.774500,
      "destination_longitude": 106.703200
    }
    ```
  * **Then** Hệ thống kiểm tra:
    1. Ngày hẹn hợp lệ: `booking_date > current_date` và nằm trong vòng 90 ngày tới.
    2. Khung giờ từ `08:30` đến `10:00` ($90\text{m}$) kèm $30\text{ phút}$ đệm di chuyển đến `10:30` không bị giao thoa với bất kỳ ca làm nào trong `mua_calendars`.
    3. Tính toán hóa đơn: Giá gói niêm yết $2,500,000\text{ đ}$, phí di chuyển $45,000\text{ đ}$, không có phụ phí làm sớm (do sau 5h sáng).
    4. Tổng tiền: $2,545,000\text{ đ}$. Tiền cọc Escrow giữ trước ($30\%$): $763,500\text{ đ}$.
  * **And** Khởi tạo bản ghi `bookings` với `booking_type = 'SCHEDULED'`, `status = 'ACCEPTED'`.
  * **And** Tự động chèn 1 bản ghi vào `mua_calendars` từ `08:30:00` đến `10:30:00` với lý do `"BOOKING_BK261020"`.
  * **And** Phong tỏa $763,500\text{ đ}$ tiền cọc trong ví khách hàng.
  * **And** Trả về HTTP `201 Created` kèm thông tin lịch hẹn chi tiết.

* **Scenario 02: Tự động tính phụ phí Ngày Lễ/Tết và Giờ làm sớm cho lịch hẹn tương lai**
  * **Given** Khách đặt lịch cưới vào lúc `04:30:00` sáng ngày `01/01/2027` (Tết Dương Lịch).
  * **When** Khách gửi request đặt lịch.
  * **Then** `DynamicPricingService` tự động áp dụng:
    - Phụ phí làm sớm (`EARLY_MORNING` trước 5h sáng): $+150,000\text{ đ}$.
    - Phụ phí ngày Lễ quốc gia (`HOLIDAY` Tết Dương Lịch): $+200,000\text{ đ}$.
  * **And** Tổng phụ phí $350,000\text{ đ}$ được cộng minh bạch vào hóa đơn tạm tính và tính cọc chuẩn xác.

* **Scenario 03: Chặn đặt lịch trong quá khứ hoặc vượt quá giới hạn tương lai cho phép**
  * **When** Khách gửi `booking_date` là ngày hôm qua hoặc ngày vượt quá 90 ngày tới.
  * **Then** Tầng Bean Validation chặn lại và ném lỗi `MethodArgumentNotValidException`.
  * **And** Trả về HTTP `400 BAD_REQUEST` với thông điệp: `"Ngày hẹn phải nằm trong khoảng từ ngày mai đến tối đa 90 ngày tới"`.

---

### **US-SCHED-02: Lịch Bận Cá Nhân Thợ & Cơ Chế Khóa Trùng Ca (`ISSUE-18.2`)**
> **As a** Thợ Trang điểm hoặc Hệ thống Đặt lịch,  
> **I want** hệ thống tự động khóa các khoảng thời gian đã có lịch và cho phép tôi tự khóa các ca bận cá nhân,  
> **So that** không bao giờ xảy ra tình trạng 2 khách đặt trùng giờ và tôi không bị quấy rầy vào ngày nghỉ phép của mình.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Chặn đặt lịch khi bị trùng giờ với ca làm đã có từ trước (Overlap Prevention)**
  * **Given** Thợ `mua_id = 89` đã có ca làm từ `09:00` đến `11:00` ngày `20/10/2026`.
  * **When** Khách hàng B gửi request đặt ca lúc `10:00` đến `11:30` cùng ngày với thợ đó.
  * **Then** Hệ thống kích hoạt thuật toán kiểm tra giao thoa:
    $$\max(09:00, 10:00) < \min(11:00, 11:30) \implies 10:00 < 11:00 \quad (\text{Bị trùng ca!})$$
  * **And** Từ chối thao tác, ném `CustomBusinessException` mã lỗi `ERR_SLOT_ALREADY_BOOKED`.
  * **And** Trả về HTTP `409 CONFLICT` với thông báo: `"Thợ trang điểm đã có ca làm việc khác trong khung giờ này. Vui lòng chọn khung giờ khác!"`.

* **Scenario 02: Chặn đặt lịch do vi phạm khoảng đệm di chuyển (Buffer Time Violation)**
  * **Given** Thợ kết thúc ca làm trước lúc `10:00` tại Quận 7. Khoảng đệm di chuyển quy định là $30\text{ phút}$.
  * **When** Khách hàng đặt ca mới bắt đầu lúc `10:15` (chỉ cách 15 phút, thợ không kịp chạy xe sang địa điểm mới).
  * **Then** Backend phát hiện vi phạm khoảng đệm: $10:15 < (10:00 + 30\text{m})$.
  * **And** Trả về HTTP `409 CONFLICT` với mã lỗi `ERR_BUFFER_TIME_VIOLATION`.

* **Scenario 03: Thợ tự chủ động khóa lịch bận cá nhân (Block Personal Busy Slot)**
  * **Given** Thợ có kế hoạch đi du lịch cả ngày `25/12/2026` (Lễ Giáng Sinh).
  * **When** Thợ gọi API `POST /api/v1/freelancer/calendar/block`:
    ```json
    {
      "booking_date": "2026-12-25",
      "start_time": "00:00:00",
      "end_time": "23:59:59",
      "reason": "Nghỉ phép cá nhân đi du lịch cùng gia đình"
    }
    ```
  * **Then** Hệ thống chèn bản ghi vào `mua_calendars`.
  * **And** Trên giao diện của khách hàng, toàn bộ ngày `25/12/2026` của thợ này lập tức chuyển sang màu xám mờ (Disabled), không ai có thể chọn đặt đơn.
  * **And** Trả về HTTP `201 Created`.

* **Scenario 04: Thợ mở lại slot bận cá nhân đã khóa trước đó**
  * **When** Thợ gọi `DELETE /api/v1/freelancer/calendar/block/{calendarId}`.
  * **Then** Hệ thống kiểm tra bản ghi đó là do thợ tự khóa (`reason != 'BOOKING_*'`).
  * **And** Xóa bản ghi khỏi `mua_calendars`, khung giờ mở lại trạng thái rảnh đón khách.

---

### **US-SCHED-03: Scheduler Cron Job Tự Động Nhắc Lịch Ca Hẹn Trước 24h & 2h (`ISSUE-18.3`)**
> **As a** Khách hàng và Thợ trang điểm,  
> **I want** hệ thống tự động gửi thông báo nhắc nhở trước 24 giờ và trước 2 giờ trước khi ca làm bắt đầu,  
> **So that** thợ chuẩn bị đầy đủ cốp đồ nghề lên đường đúng giờ và khách hàng chuẩn bị sẵn sàng không gian làm đẹp.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Tự động gửi thông báo nhắc lịch trước 24 giờ (Reminder 24h Flow)**
  * **Given** Đơn hàng `booking_id = 605` có lịch hẹn lúc `09:00:00` sáng ngày mai (`2026-10-20`).
  * **And** Trạng thái đơn là `ACCEPTED` và cờ `reminder_24h_sent = false`.
  * **When** Cron Job `@Scheduled(cron = "0 */15 * * * *")` chạy quét tại thời điểm `08:45 - 09:15` hôm nay.
  * **Then** Worker phát hiện đơn 605 nằm trong cửa sổ nhắc nhở 24 giờ ($T_{\text{start}} - \text{now} \approx 24\text{h}$).
  * **And** Bắn Event `BookingReminderEvent(bookingId = 605, type = REMINDER_24H)` qua Spring EventBus.
  * **And** Hệ thống đẩy thông báo In-App Toast & Push Notification:
    - **Gửi Khách hàng:** `"⏰ Nhắc lịch hẹn: Ca trang điểm cô dâu của bạn sẽ bắt đầu vào 09:00 sáng mai. Vui lòng rửa mặt sạch và đắp mặt nạ dưỡng ẩm tối nay nhé!"`.
    - **Gửi Thợ:** `"⏰ Nhắc lịch hẹn: Bạn có ca make-up vào 09:00 sáng mai tại Khách sạn Sheraton, Q.1. Vui lòng kiểm tra vệ sinh cọ và đồ nghề!"`.
  * **And** Cập nhật cờ `reminder_24h_sent = true` trong database để đảm bảo không bao giờ bị gửi lặp lại.

* **Scenario 02: Tự động gửi thông báo nhắc lịch khẩn cấp trước 2 giờ (Reminder 2h Flow)**
  * **Given** Đơn hàng `booking_id = 605` có lịch làm lúc `09:00:00`, thời điểm hiện tại là `07:00:00` sáng cùng ngày.
  * **And** Cờ `reminder_2h_sent = false`.
  * **When** Cron Job quét lúc 07:00.
  * **Then** Worker kích hoạt thông báo nhắc 2 giờ:
    - **Gửi Thợ:** `"🚗 Chuẩn bị xuất phát: Ca hẹn của bạn sẽ bắt đầu sau 2 tiếng nữa (09:00). Nhớ bấm 'Bắt đầu đi' khi xuất phát để khách theo dõi lộ trình nhé!"`.
    - **Gửi Khách:** `"✨ Thợ trang điểm Lê Bảo Ngọc đang chuẩn bị đồ nghề và sẽ có mặt tại nhà bạn trước 09:00 sáng nay."`.
  * **And** Cập nhật cờ `reminder_2h_sent = true`.

* **Scenario 03: Chống gửi trùng lặp thông báo (Idempotency Guard)**
  * **Given** Trong môi trường cụm nhiều máy chủ (Cluster Node A và Node B cùng chạy).
  * **When** Worker trên Node A bắt đầu gửi reminder cho đơn 605.
  * **Then** Worker thiết lập Redis Key `lock:reminder:24h:605` với TTL 1 giờ.
  * **And** Node B quét thấy key đã tồn tại $\rightarrow$ Bỏ qua không gửi lại.
  * **And** Người dùng tuyệt đối không bao giờ bị nhận 2 thông báo nhắc nhở giống hệt nhau.

---

### **US-SCHED-UI-01: Trải Nghiệm Khách Hàng Chọn Ngày Giờ Trên Ứng Dụng (UI/UX Flow)**
> **As a** Khách hàng trên ứng dụng Web/Mobile,  
> **I want to** thao tác trên giao diện chọn ngày giờ trực quan và mượt mà,  
> **So that** tôi thấy ngay khung giờ nào thợ còn rảnh để lựa chọn nhanh chóng.

#### **Tiêu chí Nghiệm thu UI/UX:**
* **AC-01 (Màn hình Lịch Tháng):**
  * Lịch thiết kế sang trọng theo tông Luxury Beauty (Trắng kem, Hồng Rose Gold, Viền vàng tinh tế).
  * Những ngày thợ đã kín lịch hiển thị dấu chấm đỏ hoặc mờ xám. Những ngày thợ còn nhiều khung giờ rảnh hiển thị dấu chấm xanh.
* **AC-02 (Danh sách Khung giờ Trong Ngày - Time Slots):**
  * Khi bấm vào 1 ngày $\rightarrow$ Mở rộng danh sách các Slot giờ (mỗi slot cách nhau $90\text{ phút} + 30\text{ phút}$ đệm):
    - `[07:00 - 08:30]` $\rightarrow$ Nút bấm sáng màu: "Còn trống".
    - `[09:00 - 10:30]` $\rightarrow$ Nút mờ xám kèm nhãn: "Đã có người đặt".
    - `[14:00 - 15:30]` $\rightarrow$ Nút bấm sáng màu: "Còn trống".
  * Nhấp chọn 1 slot trống $\rightarrow$ Tự động cuộn xuống khung tính giá và hiển thị số tiền cọc minh bạch.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI BACK-END

Tất cả các lỗi nghiệp vụ được xử lý chuẩn hóa qua `GlobalExceptionHandler.java`:

```json
{
  "success": false,
  "code": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Mô tả lỗi thân thiện với người dùng",
  "errors": [],
  "timestamp": "2026-09-14T09:35:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Phân hệ Scheduled Booking & Calendar

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_PAST_DATE_NOT_ALLOWED` | Chọn ngày hoặc giờ hẹn trong quá khứ so với thời điểm hiện tại. | Bean Validation chặn lại ngay tại tầng Controller DTO. |
| **`400 BAD_REQUEST`** | `ERR_BOOKING_DATE_TOO_FAR` | Đặt lịch hẹn quá xa (vượt quá giới hạn tối đa 90 ngày của sàn). | Giới hạn khoảng thời gian đặt lịch trong tương lai gần. |
| **`400 BAD_REQUEST`** | `ERR_CANNOT_UNBLOCK_BOOKED_SLOT` | Thợ cố tình xóa bản ghi lịch bận gắn liền với một đơn hàng đã có khách đặt. | Chặn thao tác xóa, yêu cầu xử lý qua quy trình hủy đơn chuẩn. |
| **`404 NOT_FOUND`** | `ERR_MUA_NOT_FOUND` | `provider_id` của Thợ không tồn tại trong hệ thống. | Ném `ResourceNotFoundException("Thợ không tồn tại")`. |
| **`409 CONFLICT`** | `ERR_SLOT_ALREADY_BOOKED` | Khung giờ chọn bị trùng khớp hoặc giao thoa với ca làm đã có trong `mua_calendars`. | Báo bận, yêu cầu khách chọn khung giờ khác. |
| **`409 CONFLICT`** | `ERR_BUFFER_TIME_VIOLATION` | Khung giờ chọn quá sát với ca làm liền trước/liền sau ($< 30\text{ phút}$ đệm di chuyển). | Báo lỗi không đủ thời gian di chuyển giữa 2 ca. |
| **`409 CONFLICT`** | `ERR_CALENDAR_ALREADY_BLOCKED` | Thợ tự khóa lịch bận nhưng khoảng thời gian đó đã được khóa từ trước. | Chặn tạo bản ghi trùng lặp trong DB. |

---

### 4.2. Mã nguồn Validation DTO Mẫu (Bean Validation)

#### DTO Đặt Lịch Hẹn Trước: `CreateScheduledBookingReq.java`
```java
package com.makeup.platform.dto.request.booking;

import jakarta.validation.constraints.*;
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

    @NotNull(message = "{booking.provider_type.required}")
    @Pattern(regexp = "^(FREELANCER|AGENCY)$", message = "Loại đối tác phải là FREELANCER hoặc AGENCY")
    private String providerType;

    @NotNull(message = "{booking.provider_id.required}")
    private Long providerId;

    @NotNull(message = "{booking.date.required}")
    @FutureOrPresent(message = "{booking.date.must_be_future}")
    private LocalDate bookingDate;

    @NotNull(message = "{booking.start_time.required}")
    private LocalTime startTime;

    @NotBlank(message = "{booking.destination_address.required}")
    @Size(max = 255)
    private String destinationAddress;

    @NotNull(message = "{booking.latitude.required}")
    @DecimalMin(value = "8.0")
    @DecimalMax(value = "24.0")
    private BigDecimal destinationLatitude;

    @NotNull(message = "{booking.longitude.required}")
    @DecimalMin(value = "102.0")
    @DecimalMax(value = "110.0")
    private BigDecimal destinationLongitude;

    private String voucherCode;
}
```

#### DTO Thợ Khóa Lịch Bận Cá Nhân: `BlockCalendarSlotReq.java`
```java
package com.makeup.platform.dto.request.booking;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class BlockCalendarSlotReq {

    @NotNull(message = "Ngày khóa lịch không được để trống")
    @FutureOrPresent(message = "Ngày khóa lịch phải từ hôm nay trở đi")
    private LocalDate bookingDate;

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalTime endTime;

    @NotBlank(message = "Vui lòng nhập lý do bận cá nhân")
    @Size(max = 255, message = "Lý do tối đa 255 ký tự")
    private String reason;
}
```

---

## 💻 5. ĐẶC TẢ REST API CONTRACTS

---

### 5.1. `POST /api/v1/customer/bookings/scheduled` (Tạo Đơn Hẹn Trước Cho Tương Lai)
* **Quyền truy cập:** `ROLE_CUSTOMER`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "package_id": 45,
  "add_on_item_ids": [112],
  "provider_type": "FREELANCER",
  "provider_id": 89,
  "booking_date": "2026-10-20",
  "start_time": "08:30:00",
  "destination_address": "Khách sạn Sheraton, Q.1, TP.HCM",
  "destination_latitude": 10.774500,
  "destination_longitude": 106.703200,
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
    "booking_date": "2026-10-20",
    "start_time": "08:30:00",
    "estimated_end_time": "10:00:00",
    "service_name": "Gói Trang điểm Cô Dâu Luxury 2026",
    "assigned_provider": {
      "provider_id": 89,
      "provider_name": "Lê Bảo Ngọc (Pro MUA)",
      "phone_number": "0987123456"
    },
    "financial_summary": {
      "service_subtotal": 2580000.00,
      "distance_fee": 45000.00,
      "surcharges": 0.00,
      "total_amount": 2625000.00,
      "deposit_locked_amount": 787500.00,
      "remaining_amount": 1837500.00
    },
    "reminders": {
      "reminder_24h_at": "2026-10-19T08:30:00Z",
      "reminder_2h_at": "2026-10-20T06:30:00Z"
    }
  },
  "timestamp": "2026-09-14T09:35:00Z"
}
```

---

### 5.2. `GET /api/v1/providers/{providerId}/available-slots` (Tra cứu Slot Trống Trong Ngày)
* **Quyền truy cập:** `permitAll` (Công khai cho mọi khách hàng).
* **Query Parameters:** `date=2026-10-20`, `package_duration_minutes=90`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "AVAILABLE_SLOTS_RETRIEVED",
  "message": "Lấy danh sách khung giờ rảnh thành công",
  "data": {
    "provider_id": 89,
    "date": "2026-10-20",
    "buffer_time_minutes": 30,
    "slots": [
      {
        "slot_start": "06:30:00",
        "slot_end": "08:00:00",
        "is_available": true,
        "is_early_morning_surcharge": false
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
        "is_early_morning_surcharge": false
      },
      {
        "slot_start": "14:00:00",
        "slot_end": "15:30:00",
        "is_available": true,
        "is_early_morning_surcharge": false
      }
    ]
  },
  "timestamp": "2026-09-14T09:35:01Z"
}
```

---

### 5.3. `POST /api/v1/freelancer/calendar/block` (Thợ Tự Khóa Lịch Bận Cá Nhân)
* **Quyền truy cập:** `ROLE_FREELANCE_MUA` hoặc `ROLE_AGENCY_STAFF`.
* **Headers:** `Authorization: Bearer <JWT>`
* **Request Body:**
```json
{
  "booking_date": "2026-12-25",
  "start_time": "00:00:00",
  "end_time": "23:59:59",
  "reason": "Nghỉ phép cá nhân dịp Lễ Giáng Sinh"
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
    "reason": "Nghỉ phép cá nhân dịp Lễ Giáng Sinh"
  },
  "timestamp": "2026-09-14T09:35:02Z"
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16)

```sql
-- 1. BẢNG QUẢN LÝ LỊCH BẬN CÁ NHÂN & LỊCH CA HẸN THỢ (MUA CALENDARS - ISSUE-18.2)
CREATE TABLE IF NOT EXISTS booking_schema.mua_calendars (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255) NOT NULL, -- 'BOOKING_BK261020', 'PERSONAL_BUSY', 'SICK_LEAVE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_time_range CHECK (end_time > start_time),
    UNIQUE (mua_id, booking_date, start_time)
);

-- 2. CÁC CỜ PHỤC VỤ CRON JOB NHẮC LỊCH TRÊN BẢNG BOOKINGS (ISSUE-18.3)
ALTER TABLE booking_schema.bookings 
    ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. CHỈ MỤC TỐI ƯU TRUY VẤN GIAO THOA THỜI GIAN & CRON QUÉT
CREATE INDEX IF NOT EXISTS idx_mua_calendars_overlap 
    ON booking_schema.mua_calendars(mua_id, booking_date, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_cron 
    ON booking_schema.bookings(status, booking_type, booking_date, start_time) 
    WHERE status = 'ACCEPTED' AND booking_type = 'SCHEDULED';
```

---

## ⚡ 7. THUẬT TOÁN KIỂM TRA GIAO THOA THỜI GIAN & CRON ENGINE

### 7.1. Thuật toán Kiểm tra Giao thoa (Interval Overlap SQL Query)

Hai khoảng thời gian $[S_1, E_1]$ và $[S_2, E_2]$ giao nhau khi và chỉ khi:
$$\max(S_1, S_2) < \min(E_1, E_2)$$

#### Native Query trong `MUACalendarRepository.java`:
```java
@Query("""
    SELECT COUNT(c) > 0 FROM MUACalendarEntity c
    WHERE c.muaId = :muaId
      AND c.bookingDate = :bookingDate
      AND (c.startTime < :requestedEndTime AND c.endTime > :requestedStartTime)
""")
boolean existsOverlappingSlot(
    @Param("muaId") Long muaId,
    @Param("bookingDate") LocalDate bookingDate,
    @Param("requestedStartTime") LocalTime requestedStartTime,
    @Param("requestedEndTime") LocalTime requestedEndTime
);
```

---

### 7.2. Logic Cron Job Nhắc Lịch Tự Động (Sliding Window Algorithm)

```java
@Scheduled(cron = "0 */15 * * * *") // Chạy định kỳ mỗi 15 phút
@Transactional
public void scanAndSendBookingReminders() {
    LocalDateTime now = LocalDateTime.now();

    // 1. Quét đơn nhắc trước 24 giờ: Cửa sổ [now + 23h45m, now + 24h15m]
    LocalDateTime window24hStart = now.plusHours(23).plusMinutes(45);
    LocalDateTime window24hEnd = now.plusHours(24).plusMinutes(15);
    List<BookingEntity> bookings24h = bookingRepository.findUpcomingBookings(
        window24hStart.toLocalDate(), window24hStart.toLocalTime(),
        window24hEnd.toLocalDate(), window24hEnd.toLocalTime(), false, "24H"
    );

    for (BookingEntity booking : bookings24h) {
        String lockKey = "reminder:lock:24h:" + booking.getId();
        if (redisTemplate.opsForValue().setIfAbsent(lockKey, "SENT", Duration.ofHours(2))) {
            eventPublisher.publishEvent(new BookingReminderEvent(this, booking.getId(), ReminderType.HOURS_24));
            booking.setReminder24hSent(true);
            bookingRepository.save(booking);
        }
    }

    // 2. Quét đơn nhắc trước 2 giờ: Cửa sổ [now + 1h45m, now + 2h15m]
    LocalDateTime window2hStart = now.plusHours(1).plusMinutes(45);
    LocalDateTime window2hEnd = now.plusHours(2).plusMinutes(15);
    List<BookingEntity> bookings2h = bookingRepository.findUpcomingBookings(
        window2hStart.toLocalDate(), window2hStart.toLocalTime(),
        window2hEnd.toLocalDate(), window2hEnd.toLocalTime(), false, "2H"
    );

    for (BookingEntity booking : bookings2h) {
        String lockKey = "reminder:lock:2h:" + booking.getId();
        if (redisTemplate.opsForValue().setIfAbsent(lockKey, "SENT", Duration.ofHours(2))) {
            eventPublisher.publishEvent(new BookingReminderEvent(this, booking.getId(), ReminderType.HOURS_2));
            booking.setReminder2hSent(true);
            bookingRepository.save(booking);
        }
    }
}
```

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Tốc Độ Phản Hồi Tra Cứu Slot Rảnh (Slot Availability Latency):**
   - API `GET /api/v1/providers/{id}/available-slots` phải hoàn thành tính toán giao thoa và trả về kết quả trong thời gian **$< 20\text{ms}$** nhờ chỉ mục Composite B-Tree `idx_mua_calendars_overlap`.
2. **Độ Bền Vững Của Cron Job Nhắc Lịch (Job Reliability & Idempotency):**
   - Cron Job hoàn thành quét trong vòng **$< 500\text{ms}$** trên tập dữ liệu $10,000$ ca hẹn.
   - Cơ chế khóa phân tán Redis kết hợp cờ Database đảm bảo $100\%$ không bao giờ bỏ sót và không bao giờ bắn trùng lặp thông báo nhắc hẹn cho người dùng.
3. **Tính Toàn Vẹn Khóa Lịch (Calendar Consistency):**
   - Thao tác tạo đơn hẹn trước và ghi bản ghi khóa lịch vào `mua_calendars` được bao bọc trong cùng một **Database Transaction (`@Transactional`)**. Tuyệt đối không bao giờ có đơn hẹn thành công mà lịch của thợ vẫn mở trống.
