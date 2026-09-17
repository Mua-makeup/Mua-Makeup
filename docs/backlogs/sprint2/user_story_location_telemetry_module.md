# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐỊNH VỊ GPS TELEMETRY & CHỈ MỤC KHÔNG GIAN REDIS GEO (LOCATION & TELEMETRY MODULE)
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schema: `telemetry_schema`, Port `8080`)
### Phiên bản: 2.0.0 (Đã tích hợp toàn bộ các tối ưu hóa: Adaptive Stream, Keyspace Events, PostGIS Partitioning, Polyline Compression & In-Memory Profile Cache)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Location Telemetry & Geospatial Tracking Module`
* **Mã Jira Issues phụ trách (Sprint 2):**
  * `ISSUE-14.1`: **User Story** - Location Telemetry Module - Xây dựng Module Định vị GPS & Redis GEO trong Monolith.
  * `ISSUE-14.2`: **Task** - Redis GEO Spatial Index lưu tọa độ Thợ rảnh Realtime (`mua:geo:active`, heartbeat Keyspace Event, công tắc sẵn sàng).
  * `ISSUE-14.3`: **Task** - GPS Telemetry Background Task trên Mobile App Thợ với **Adaptive Sampling Rate** (Stream linh hoạt 3s - 20s, tiết kiệm 50% pin).
  * `ISSUE-14.4`: **Task** - API Quét danh sách Thợ/Studio rảnh trong bán kính $R$ km (`/api/v1/telemetry/nearby`) kết hợp **Redis Profile Summary Cache** (< 5ms).
  * `ISSUE-14.5`: **Task** - Bảng lưu vết Lịch sử tọa độ GPS di chuyển thợ có **PostgreSQL Table Partitioning** theo tháng & Nén **Polyline LineString** khi kết thúc cuốc.
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Bộ nhớ đệm không gian thời gian thực (In-Memory Geospatial Index):** Redis 7.x GEO (`GEOADD`, `GEOSEARCH` / `GEORADIUS`, `GEODIST`, `GEOPOS`).
  * **Cơ chế Hướng sự kiện Dọn dẹp Thợ Offline (Event-Driven Eviction):** Redis Keyspace Notifications (`__keyevent@*__:expired`).
  * **Cơ sở Dữ liệu Quan hệ & Không gian Địa lý (RDBMS & GIS):** PostgreSQL 16 tích hợp extension **PostGIS** (`makeup_platform_db`, schema: `telemetry_schema`) với Table Partitioning.
  * **Giao thức Truyền tải Dữ liệu:**
    * **HTTP/REST API:** Tiếp nhận vị trí định kỳ, bật/tắt trạng thái rảnh, quét radar tìm thợ gần nhất.
    * **Embedded STOMP WebSocket Gateway (`/ws-makeup`):** Tiếp nhận GPS Stream trực tiếp từ App Thợ và Broadcast tọa độ thợ di chuyển tức thì (< 50ms) tới Khách hàng qua Topic `/topic/gps-stream/{bookingId}`.
* **Đối tượng Sử dụng (User Personas):**
  1. **Freelance MUA & Studio Staff MUA (Thợ trang điểm tự do & Thợ Studio):**
     * Bật/tắt công tắc "Sẵn sàng nhận việc" trên Mobile App để hệ thống đưa vào / rút khỏi bản đồ radar Redis GEO.
     * Khi nhận đơn và chuyển trạng thái `ON_THE_WAY`, Mobile App tự động điều chỉnh tần suất stream GPS thông minh (Adaptive Sampling: dừng đèn đỏ 20s, chạy xe 5s, gần tới nhà khách 3s).
  2. **Customer (Khách hàng cá nhân):**
     * Xem bản đồ Radar Khám phá hiển thị các Thợ/Studio đang rảnh trong bán kính từ 1km – 30km xung quanh vị trí của mình (với tọa độ làm mờ bảo vệ riêng tư thợ).
     * Khi theo dõi thợ đang đến, xem trực tiếp biểu tượng xe máy thợ di chuyển mượt mà nhờ thuật toán nội suy (Interpolation & Heading Smoothing) kèm thời gian dự kiến đến nơi (ETA).
  3. **Agency Owner / Studio Dispatcher (Chủ Studio & Quản trị viên điều phối):**
     * Định vị chính xác tọa độ cơ sở Studio cố định trên bản đồ.
     * Giám sát vị trí trực quan của đội ngũ thợ trực thuộc Studio đang thực hiện nhiệm vụ ngoài hiện trường.
  4. **Hệ thống Điều phối Tự động & Chăm sóc Khách hàng (Matching Engine & CSKH):**
     * Thuật toán quét danh sách thợ đủ điều kiện gần nhất trong 5ms để bắn thông báo nhận ca khẩn cấp (30s Instant Booking).
     * Truy xuất lộ trình nén `LineString` để đối soát khiếu nại (ví dụ: thợ báo đã đến nhưng khách phản ánh không thấy thợ).

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Mã nguồn phân hệ Telemetry được tổ chức theo tiêu chuẩn phân tầng nghiêm ngặt tại `code/backend/core-api/src/main/java/com/makeup/platform/`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # Helper response (ok, created, error)
│   │   ├── ApiResponse.java                   # JSON envelope: {success, code, message, data, timestamp}
│   │   ├── PageResponse.java                  # Envelope phân trang chuẩn
│   │   ├── BaseService.java
│   │   └── BaseServiceImpl.java
│   ├── constants/
│   │   ├── TelemetryConstants.java            # REDIS_KEY_MUA_GEO, HEARTBEAT_TTL_SECONDS, MAX_RADIUS_KM
│   │   └── ErrorCodes.java                    # ERR_LOCATION_INVALID, ERR_GEO_EMPTY, ERR_MUA_NOT_AVAILABLE
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Lỗi nghiệp vụ có mã lỗi ErrorCodes
│   │   ├── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (404)
│   │   └── AccessDeniedException.java         # Lỗi vi phạm phân quyền/IDOR (403)
│   ├── i18n/
│   │   ├── CustomLocaleResolver.java          # Đa ngôn ngữ Accept-Language
│   │   └── JsonMessageSource.java             # Nạp file i18n JSON
│   └── utils/
│       ├── GeoDistanceUtils.java              # Tiện ích tính khoảng cách Haversine & Geohash
│       └── SecurityContextUtils.java          # Trích xuất userId, muaId từ JWT Principal
│
├── config/
│   ├── RedisConfig.java                       # Khởi tạo RedisTemplate, GeospatialOperations & Keyspace Listener
│   └── WebSocketConfig.java                   # Cấu hình STOMP endpoint /ws-makeup & Message Broker
│
├── controller/
│   └── telemetry/
│       ├── LocationStreamController.java      # REST API: /api/v1/telemetry/stream & /availability
│       ├── TelemetryQueryController.java      # REST API: /api/v1/telemetry/nearby & /bookings/{id}/track
│       └── WebSocketTelemetryHandler.java     # STOMP Handler: @MessageMapping("/telemetry/location")
│
├── dto/
│   ├── request/telemetry/
│   │   ├── ToggleAvailabilityReq.java         # @NotNull isAvailable, @NotNull latitude, longitude
│   │   ├── LocationStreamReq.java             # @NotNull lat, lng, speed, heading, accuracy, bookingId
│   │   └── NearbyProvidersReq.java            # @NotNull lat, lng, radiusKm, masterCategoryId, minRating
│   └── response/telemetry/
│       ├── NearbyProviderRes.java             # muaId/agencyId, fullName, avatar, distanceKm, rating, startingPrice
│       ├── LiveTrackingRes.java               # bookingId, currentLat, currentLng, speed, heading, etaMinutes
│       └── TelemetryLogRes.java               # Danh sách tọa độ lịch sử vẽ polyline lộ trình
│
├── entity/
│   └── telemetry/
│       ├── TelemetryLogEntity.java            # table: telemetry_schema.telemetry_logs (Point 4326 PostGIS)
│       └── BookingTripEntity.java             # table: telemetry_schema.booking_trips (LineString 4326 PostGIS)
│
├── mapper/
│   └── telemetry/
│       └── TelemetryLogMapper.java            # Manual Spring @Component Mapper
│
├── repository/
│   └── telemetry/
│       ├── TelemetryLogRepository.java        # Spring Data JPA + PostGIS native queries
│       └── BookingTripRepository.java         # Quản lý lộ trình chuyến đi dạng LineString
│
└── service/
    └── telemetry/
        ├── RedisGeoService.java               # Giao tiếp Redis: GEOADD, GEOSEARCH, GEODIST, ZREM
        ├── TelemetryStreamService.java        # Xử lý Stream, broadcast STOMP, lọc nhiễu GPS
        ├── TelemetryQueryService.java         # Quét thợ gần nhất kết hợp Cache Profile MUA (< 5ms)
        ├── TelemetryLogService.java           # Ghi Dead-Reckoning (@Async) & Nén Polyline
        ├── RedisExpirationListener.java       # Lắng nghe Keyspace Event dọn thợ offline tức thì (0ms latency)
        └── impl/
            ├── RedisGeoServiceImpl.java
            ├── TelemetryStreamServiceImpl.java
            ├── TelemetryQueryServiceImpl.java
            └── TelemetryLogServiceImpl.java
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-LOC-01: Quản lý Trạng thái Sẵn sàng & Đồng bộ Tọa độ Khởi tạo trên Redis GEO (`ISSUE-14.2`)**
> **As a** Thợ Trang điểm Tự do (Freelance MUA) hoặc Thợ trực thuộc Studio,  
> **I want to** bật hoặc tắt công tắc "Sẵn sàng nhận khách" và gửi tọa độ GPS hiện tại của tôi lên hệ thống,  
> **So that** khách hàng xung quanh có thể nhìn thấy tôi trên bản đồ Radar và thuật toán có thể phân bổ đơn khẩn cấp cho tôi.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Thợ bật công tắc "Sẵn sàng nhận việc" thành công (Happy Path)**
  * **Given** Thợ trang điểm đã đăng nhập với vai trò `ROLE_FREELANCE_MUA` (`mua_id = 89`) và hồ sơ đã được duyệt (`is_verified = true`).
  * **When** Thợ bật công tắc sang trạng thái ON và gửi request `POST /api/v1/telemetry/availability`:
    ```json
    {
      "is_available": true,
      "latitude": 10.776889,
      "longitude": 106.700806
    }
    ```
  * **Then** Hệ thống kiểm tra tọa độ hợp lệ (`-90 <= lat <= 90`, `-180 <= lng <= 180`).
  * **And** Thực hiện lệnh Redis: `GEOADD mua:geo:active 106.700806 10.776889 89`.
  * **And** Thiết lập Heartbeat Key `mua:geo:heartbeat:89` trong Redis với TTL là `60` giây (`SET mua:geo:heartbeat:89 "ALIVE" EX 60`).
  * **And** Đồng bộ thông tin tóm tắt thợ vào Redis String: `mua:summary:89` (JSON Profile tóm tắt) với TTL 24h.
  * **And** Cập nhật trạng thái `availability_status = 'AVAILABLE'` trong bảng `mua_schema.mua_profiles`.
  * **And** Trả về HTTP `200 OK` kèm thông báo: `"Đã chuyển sang trạng thái sẵn sàng nhận việc"`.

* **Scenario 02: Thợ chủ động tắt công tắc sang "Nghỉ ngơi / Offline"**
  * **Given** Thợ `mua_id = 89` đang ở trạng thái sẵn sàng trong Redis GEO.
  * **When** Thợ gạt công tắc sang OFF qua `POST /api/v1/telemetry/availability` với `is_available = false`.
  * **Then** Hệ thống thực thi lệnh Redis: `ZREM mua:geo:active 89`, xóa key heartbeat `mua:geo:heartbeat:89` và xóa key `mua:summary:89`.
  * **And** Cập nhật trạng thái `availability_status = 'OFFLINE'` trong database.
  * **And** Trả về HTTP `200 OK`. Thợ ngay lập tức biến mất khỏi kết quả tìm kiếm radar của khách hàng (< 5ms).

* **Scenario 03: Tự động dọn thợ Offline qua Redis Keyspace Notifications (Event-Driven Auto-Eviction)**
  * **Given** Thợ đang bật sẵn sàng nhưng ứng dụng bị mất kết nối mạng, tắt ngầm hoặc hết pin quá `60` giây.
  * **When** Key `mua:geo:heartbeat:89` hết hạn TTL trên Redis.
  * **Then** Redis tự động kích hoạt thông báo hết hạn trên kênh Pub/Sub: `__keyevent@*__:expired` mang giá trị `mua:geo:heartbeat:89`.
  * **And** Class `RedisExpirationListener` của Spring Boot bắt sự kiện này trong **$0\text{ms}$ độ trễ**.
  * **And** Trích xuất `muaId = 89` và thực thi ngay lệnh `ZREM mua:geo:active 89` và `DEL mua:summary:89`.
  * **And** Cập nhật database: `availability_status = 'OFFLINE'`. Không cần bất kỳ tiến trình quét lặp (polling worker) nào, loại bỏ $100\%$ tải CPU dư thừa.

---

### **US-LOC-02: Background GPS Telemetry Stream Thích Ứng (Adaptive Sampling Rate) (`ISSUE-14.3`)**
> **As a** Thợ Trang điểm đang di chuyển thực hiện đơn hàng (`ON_THE_WAY`),  
> **I want** ứng dụng Mobile tự động điều chỉnh tần suất phát sóng GPS thông minh dựa trên vận tốc thực tế,  
> **So that** khách hàng xem được vị trí di chuyển trực tiếp của tôi mà điện thoại của tôi không bị hao pin hay quá nhiệt.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Stream tọa độ thích ứng theo vận tốc (Adaptive Sampling)**
  * **Given** Thợ `mua_id = 89` đang trên đường đến địa chỉ khách hàng (`booking_id = 1250`).
  * **When** Mobile Background Task đo đạc vận tốc tức thời:
    - **Trường hợp A (Dừng đèn đỏ / Kẹt xe: $v < 3\text{ km/h}$ trong 15s):** Ứng dụng tự động giãn chu kỳ stream lên **$20\text{ giây}/lần$**.
    - **Trường hợp B (Di chuyển bình thường: $15\text{ km/h} \le v \le 60\text{ km/h}$):** Ứng dụng stream đều đặn **$5 - 7\text{ giây}/lần$**.
    - **Trường hợp C (Gần tới nhà khách: Khoảng cách còn lại $< 300\text{m}$):** Ứng dụng tăng tốc độ stream lên **$2 - 3\text{ giây}/lần$**.
  * **Then** Backend tiếp nhận payload `POST /api/v1/telemetry/stream` (hoặc WebSocket `/app/telemetry/location`).
  * **And** Kiểm tra tính hợp lệ (`accuracy_meters <= 50.0`, `speed_kmh <= 120.0`).
  * **And** Cập nhật Redis Hash `booking:geo:trip:1250` và phát sóng STOMP tới `/topic/gps-stream/1250`.
  * **And** Giúp điện thoại của thợ tiết kiệm hơn $50\%$ lượng pin tiêu thụ trên mỗi cuốc di chuyển.

* **Scenario 02: Lọc bỏ tọa độ nhiễu hoặc nhảy cóc bất thường (GPS Noise & Anti-Spoofing)**
  * **Given** Tọa độ trước đó của thợ ghi nhận lúc $T_0$ tại Quận 1, TP.HCM.
  * **When** Tại $T_0 + 5$ giây, payload gửi lên có tọa độ tại TP. Vũng Tàu (cách 100km, tương đương vận tốc > 70,000 km/h) hoặc `accuracy_meters = 120.0` (> 50m).
  * **Then** Hệ thống phát hiện bất thường về tốc độ (`speed > 120 km/h`) hoặc GPS nhiễu do khuất sóng toà nhà cao tầng.
  * **And** Bỏ qua không broadcast tọa độ nhảy cóc này tới khách hàng để tránh icon bị giật giật trên bản đồ.

* **Scenario 03: Bảo vệ Quyền riêng tư của Thợ trên Bản đồ Radar Khám phá (Privacy Fuzzing / Jittering)**
  * **Given** Thợ đang ở trạng thái rảnh (`AVAILABLE`) tại nhà riêng hoặc khu vực cá nhân.
  * **When** Khách hàng quét thợ quanh đây qua API `/api/v1/telemetry/nearby`.
  * **Then** Backend tự động cộng thêm độ lệch ngẫu nhiên nhỏ (Jittering bán kính $\pm 30 - 50\text{ mét}$) vào tọa độ hiển thị công khai trên radar.
  * **And** Tọa độ GPS chính xác thực tế $100\%$ chỉ được phát sóng trực tiếp tới khách hàng đã đặt đơn thành công khi thợ chính thức chuyển sang trạng thái `ON_THE_WAY`.

---

### **US-LOC-03: API Quét Danh sách Thợ/Studio Rảnh Bằng Redis In-Memory Summary Cache (`ISSUE-14.4`)**
> **As a** Khách hàng (Customer) hoặc Động cơ Phân bổ Đơn khẩn cấp (Dispatching Engine),  
> **I want to** quét tìm danh sách toàn bộ Thợ tự do đang rảnh trong bán kính $R$ km với tốc độ cực nhanh,  
> **So that** ứng dụng phản hồi tức thì dưới 5ms mà không làm nghẽn cơ sở dữ liệu.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Quét Radar Siêu Tốc 100% In-Memory (Zero DB Query)**
  * **Given** Vị trí Khách hàng tại tọa độ `latitude: 10.7828, longitude: 106.6958` với bán kính $R = 5.0\text{ km}$.
  * **When** Gọi API `GET /api/v1/telemetry/nearby?latitude=10.7828&longitude=106.6958&radius_km=5.0`.
  * **Then** Backend gọi lệnh `GEOSEARCH mua:geo:active FROMLONLAT 106.6958 10.7828 BYRADIUS 5.0 KM WITHDIST WITHCOORD ASC`.
  * **And** Lấy danh sách ID thợ trả về (ví dụ: `[89, 102, 115]`).
  * **And** Dùng lệnh `MGET mua:summary:89 mua:summary:102 mua:summary:115` để lấy toàn bộ thông tin profile tóm tắt (Tên, avatar, rating, giá tối thiểu, styles) trực tiếp từ RAM Redis.
  * **And** Ghép nối khoảng cách `distance_km` và trả về danh sách sắp xếp tăng dần.
  * **And** Toàn bộ API hoàn tất trong vòng **$< 5\text{ms}$**, hoàn toàn không tạo truy vấn SQL nào xuống PostgreSQL.

---

### **US-LOC-04: Lưu Vết Lịch Sử Với PostgreSQL Table Partitioning & Nén Polyline (`ISSUE-14.5`)**
> **As a** Đội ngũ Vận hành & Quản trị Hệ thống (System Admin & CSKH),  
> **I want** hệ thống phân vùng bảng lịch sử di chuyển theo tháng và tự động nén toàn bộ lộ trình thành một đường Polyline khi đơn hàng hoàn tất,  
> **So that** dữ liệu không bị phình to, tiết kiệm 80% bộ nhớ ổ cứng và truy xuất lộ trình giải quyết tranh chấp cực nhanh.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Ghi log có chọn lọc qua thuật toán Dead-Reckoning vào Bảng Phân Vùng**
  * **Given** Thợ đang stream GPS cho chuyến đi `booking_id = 1250`.
  * **When** Backend tiếp nhận điểm tọa độ mới:
  * **Then** Kiểm tra điều kiện Dead-Reckoning: $\Delta s \ge 30\text{m}$ HOẶC $\Delta t \ge 30\text{s}$.
  * **And** Nếu thỏa mãn, kích hoạt phương thức `@Async` ghi bản ghi vào bảng phân vùng của tháng hiện tại: `telemetry_logs_YYYY_MM`.
  * **And** Cắt giảm hơn $85\%$ số lượng lệnh INSERT vào ổ cứng DB.

* **Scenario 02: Tự động Nén Lộ trình thành LineString khi Hoàn tất Đơn hàng (Polyline Compression)**
  * **Given** Đơn hàng `booking_id = 1250` chuyển trạng thái sang `COMPLETED` (hoặc `CANCELLED`).
  * **When** Spring EventBus kích hoạt sự kiện `BookingFinishedEvent`.
  * **Then** Background Worker gom toàn bộ các điểm tọa độ từ bảng `telemetry_logs` của đơn hàng này và gọi hàm PostGIS:
    `ST_MakeLine(location_point ORDER BY recorded_at ASC)`.
  * **And** Lưu đối tượng đường thẳng nén duy nhất `GEOMETRY(LineString, 4326)` vào bảng `telemetry_schema.booking_trips`.
  * **And** Sau 30 ngày đối soát (Data Retention Policy), các điểm rời rạc của đơn hàng 1250 trong `telemetry_logs` được tự động dọn dẹp bằng Scheduled Purge Job, giải phóng $90\%$ dung lượng lưu trữ chi tiết.

* **Scenario 03: CSKH truy xuất lộ trình chuyến đi giải quyết khiếu nại (Dispute Resolution)**
  * **When** Nhân viên CSKH gọi API `GET /api/v1/telemetry/bookings/1250/history`.
  * **Then** Hệ thống ưu tiên truy vấn chuỗi `route_linestring` từ bảng `booking_trips` trong **$< 10\text{ms}$** để vẽ toàn bộ lộ trình di chuyển thực tế của thợ lên bản đồ Admin.

---

### **US-LOC-UI-01: Trải nghiệm Giao diện Bản đồ Radar & Live Tracking Mượt Mà**
* **Nội suy tọa độ LERP & Làm mượt góc xoay (Heading Smoothing):**
  * Client sử dụng thuật toán **Linear Interpolation (LERP)** giữa tọa độ cũ $P_1$ và tọa độ mới $P_2$ trong khung thời gian 5s để marker xe máy lướt đi êm ái với tần số quét màn hình 60 FPS, không bị giật cóc.
  * Góc xoay của xe máy được tính toán tự động dựa trên vector di chuyển giữa 2 điểm liên tiếp $\text{atan2}(\Delta y, \Delta x)$, giúp đầu xe luôn hướng đúng theo chiều di chuyển trên đường.

---

## 🗄️ 6. THIẾT KẾ CƠ SỞ DỮ LIỆU POSTGRESQL POSTGIS & REDIS

### 6.1. DDL PostgreSQL 16 PostGIS Với Table Partitioning & Nén Polyline

```sql
-- 1. KÍCH HOẠT EXTENSION POSTGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. TẠO SCHEMA TELEMETRY
CREATE SCHEMA IF NOT EXISTS telemetry_schema;

-- 3. BẢNG LƯU VẾT LỊCH SỬ TỌA ĐỘ GPS (ÁP DỤNG RANGE PARTITIONING THEO THÁNG)
CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    mua_id BIGINT NOT NULL,
    booking_id BIGINT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_point GEOMETRY(Point, 4326) NOT NULL,
    speed_kmh DECIMAL(5, 2) DEFAULT 0.00,
    heading_degree DECIMAL(5, 2) DEFAULT 0.00,
    accuracy_meters DECIMAL(6, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Tạo các phân vùng cụ thể theo tháng (Ví dụ: Tháng 09/2026, 10/2026...)
CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_09 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs_2026_10 
    PARTITION OF telemetry_schema.telemetry_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

-- 4. BẢNG LƯU LỘ TRÌNH ĐÃ NÉN (POLYLINE LINESTRING) SAU KHI KẾT THÚC ĐƠN
CREATE TABLE IF NOT EXISTS telemetry_schema.booking_trips (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT UNIQUE NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    total_distance_km DECIMAL(6, 2) DEFAULT 0.00,
    total_duration_minutes INT DEFAULT 0,
    route_linestring GEOMETRY(LineString, 4326) NOT NULL, -- Toàn bộ lộ trình nén trong 1 dòng
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. BẢNG CƠ SỞ ĐỊA CHỈ & TỌA ĐỘ CỐ ĐỊNH CỦA STUDIO
CREATE TABLE IF NOT EXISTS agency_schema.agency_branches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    branch_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address_line TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_point GEOMETRY(Point, 4326) NOT NULL,
    is_main_branch BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_telemetry_spatial 
    ON telemetry_schema.telemetry_logs USING GIST(location_point);

CREATE INDEX IF NOT EXISTS idx_booking_trips_spatial 
    ON telemetry_schema.booking_trips USING GIST(route_linestring);

CREATE INDEX IF NOT EXISTS idx_booking_trips_booking 
    ON telemetry_schema.booking_trips(booking_id);

CREATE INDEX IF NOT EXISTS idx_agency_branch_spatial 
    ON agency_schema.agency_branches USING GIST(location_point);
```

---

### 6.2. Cấu trúc Khóa & Lệnh Redis In-Memory

| Tên Khóa (Key) | Kiểu Dữ liệu | Mục đích & Mô tả | TTL | Lệnh Redis Chính |
| :--- | :--- | :--- | :--- | :--- |
| **`mua:geo:active`** | `zset` (Geospatial) | Chỉ mục vị trí thời gian thực của toàn bộ thợ đang ở trạng thái **Sẵn sàng**. | Không set TTL (Dọn dẹp qua sự kiện Expire). | `GEOADD mua:geo:active <lng> <lat> <mua_id>`<br>`GEOSEARCH mua:geo:active ...`<br>`ZREM mua:geo:active <mua_id>` |
| **`mua:geo:heartbeat:{muaId}`** | `string` | Cờ Heartbeat. Khi hết hạn sau 60s, kích hoạt Keyspace Notification. | `60s` | `SET mua:geo:heartbeat:89 "ALIVE" EX 60` |
| **`mua:summary:{muaId}`** | `string` (JSON) | Cache tóm tắt hồ sơ MUA (Tên, avatar, rating, startingPrice, styles) phục vụ quét radar $< 5\text{ms}$. | `24h` | `SET mua:summary:89 '{"fullName":"Linh Đan",...}' EX 86400`<br>`MGET mua:summary:89 mua:summary:102` |
| **`booking:geo:trip:{bookingId}`** | `hash` | Trạng thái di chuyển mới nhất của đơn hàng (vị trí hiện tại, vận tốc, heading, ETA). | `4 hours` | `HSET booking:geo:trip:1250 lat 10.778 lng 106.702 speed 28.5`<br>`HGETALL booking:geo:trip:1250` |
| **`agency:geo:locations`** | `zset` (Geospatial) | Tọa độ cố định của tất cả chi nhánh/Studio trên toàn quốc. | Persistent | `GEOADD agency:geo:locations <lng> <lat> <branch_id>` |

> **Cấu hình Redis Keyspace Events**:
> Trong file cấu hình `redis.conf`, bắt buộc kích hoạt:
> ```text
> notify-keyspace-events "Ex"
> ```
> Giúp Redis tự động phát sinh sự kiện mỗi khi khóa heartbeat hết hạn để Spring Boot dọn thợ offline tức thì.

---

## ⚡ 7. SƠ ĐỒ LUỒNG KỸ THUẬT NÂNG CAO & THUẬT TOÁN TỐI ƯU

```text
  [ Mobile App Thợ (Adaptive Stream: 3s - 20s) ]
                     │
                     ▼ (REST POST / STOMP WSS)
    [ LocationStreamController / STOMP Handler ]
                     │
                     ├── 1. Rate Limit (< 2s) & Lọc nhiễu GPS (accuracy <= 50m, speed <= 120km/h)
                     │
                     ├── 2. Gia hạn Heartbeat (TTL 60s)
                     │      SET mua:geo:heartbeat:{muaId} "ALIVE" EX 60
                     │      [Nếu hết hạn ──> Keyspace Event ──> Spring Boot gọi ZREM tức thì]
                     │
                     ├── 3. [ In-Memory Redis 7.x ]
                     │      GEOADD mua:geo:active <lng> <lat> <mua_id>
                     │      HSET booking:geo:trip:{bookingId} (speed, heading, eta)
                     │
                     ├── 4. [ STOMP WebSocket Broadcast ]
                     │      Topic: /topic/gps-stream/{bookingId} ───> [ Khách hàng xem Live Map với LERP ]
                     │
                     ├── 5. [ Dead-Reckoning Filter ]
                     │      Δs >= 30m HOẶC Δt >= 30s ?
                     │           │
                     │          YES ──> [@Async: Ghi vào Partition Table: telemetry_logs_YYYY_MM]
                     │           │
                     │          NO  ──> (Bỏ qua DB, giảm 85% I/O Disk Write)
                     │
                     └── 6. [ Khi Đơn Chuyển COMPLETED / CANCELLED ]
                            EventBus kích hoạt Polyline Compressor:
                            ST_MakeLine(points) ──> Lưu 1 dòng duy nhất vào booking_trips (LineString)
```

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG (NFRS)

1. **Độ trễ API Quét Radar (`GET /api/v1/telemetry/nearby`):**
   * Do tận dụng 100% In-Memory Cache (`GEOSEARCH` + `MGET mua:summary`), thời gian phản hồi đạt **$< 5\text{ms}$** cho bán kính 5km.
2. **Khả năng Tiết kiệm Pin Thiết bị:**
   * Cơ chế Adaptive Sampling Rate giúp giảm thiểu hơn **$50\%$ lượng pin tiêu hao** trên điện thoại thợ so với stream tần suất cố định.
3. **Hiệu quả Lưu trữ PostGIS:**
   * Cơ chế Dead-Reckoning kết hợp Table Partitioning và nén Polyline LineString giúp hệ thống **giảm hơn $80\%$ dung lượng ổ cứng lưu trữ** và đảm bảo tốc độ truy vấn đối soát luôn dưới $15\text{ms}$ ngay cả khi hệ thống đạt hàng chục triệu bản ghi.
4. **Bảo mật & Quyền riêng tư:**
   * Tọa độ hiển thị trên Radar công khai luôn được làm mờ bán kính $\pm 30 - 50\text{m}$. Tọa độ thật chỉ được phát sóng cho khách hàng đang có đơn hàng trực tiếp với thợ.
