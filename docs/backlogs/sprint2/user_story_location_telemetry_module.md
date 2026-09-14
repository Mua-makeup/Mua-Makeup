# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐỊNH VỊ GPS TELEMETRY & CHỈ MỤC KHÔNG GIAN REDIS GEO (LOCATION & TELEMETRY MODULE)
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schema: `telemetry_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Location Telemetry & Geospatial Tracking Module`
* **Mã Jira Issues phụ trách (Sprint 2):**
  * `ISSUE-14.1`: **User Story** - Location Telemetry Module - Xây dựng Module Định vị GPS & Redis GEO trong Monolith.
  * `ISSUE-14.2`: **Task** - Redis GEO Spatial Index lưu tọa độ Thợ rảnh Realtime (`mua:geo:active`, heartbeat, công tắc sẵn sàng).
  * `ISSUE-14.3`: **Task** - GPS Telemetry Background Task trên Mobile App Thợ (Stream 5–10s, tracking lộ trình thợ đang di chuyển).
  * `ISSUE-14.4`: **Task** - API Quét danh sách Thợ/Studio rảnh trong bán kính $R$ km từ vị trí khách (`/api/v1/telemetry/nearby`).
  * `ISSUE-14.5`: **Task** - Bảng lưu vết Lịch sử tọa độ GPS di chuyển thợ (`telemetry_schema.telemetry_logs`, PostGIS Point 4326).
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Bộ nhớ đệm không gian thời gian thực (In-Memory Geospatial Index):** Redis 7.x GEO (`GEOADD`, `GEOSEARCH` / `GEORADIUS`, `GEODIST`, `GEOPOS`).
  * **Cơ sở Dữ liệu Quan hệ & Không gian Địa lý (RDBMS & GIS):** PostgreSQL 16 tích hợp extension **PostGIS** (`makeup_platform_db`, schema: `telemetry_schema`).
  * **Giao thức Truyền tải Dữ liệu:**
    * **HTTP/REST API:** Tiếp nhận vị trí định kỳ, bật/tắt trạng thái rảnh, quét radar tìm thợ gần nhất.
    * **Embedded STOMP WebSocket Gateway (`/ws-makeup`):** Tiếp nhận GPS Stream trực tiếp từ App Thợ và Broadcast tọa độ thợ di chuyển tức thì (< 50ms) tới Khách hàng qua Topic `/topic/gps-stream/{bookingId}`.
* **Đối tượng Sử dụng (User Personas):**
  1. **Freelance MUA & Studio Staff MUA (Thợ trang điểm tự do & Thợ Studio):**
     * Bật/tắt công tắc "Sẵn sàng nhận việc" trên Mobile App để hệ thống đưa vào / rút khỏi bản đồ radar Redis GEO.
     * Khi nhận đơn và chuyển trạng thái `ON_THE_WAY` (Đang trên đường đến), Mobile App tự động chạy background task phát sóng GPS định kỳ mỗi 5–10s để truyền tải tọa độ về máy chủ.
  2. **Customer (Khách hàng cá nhân):**
     * Xem bản đồ Radar Khám phá hiển thị các Thợ/Studio đang rảnh trong bán kính từ 1km – 30km xung quanh vị trí của mình.
     * Khi đặt ca khẩn cấp hoặc theo dõi thợ đang đến, xem trực tiếp biểu tượng thợ di chuyển mượt mà trên bản đồ Google Maps / Mapbox theo thời gian thực kèm thời gian dự kiến đến nơi (ETA).
  3. **Agency Owner / Studio Dispatcher (Chủ Studio & Quản trị viên điều phối):**
     * Định vị chính xác tọa độ cơ sở Studio cố định trên bản đồ.
     * Giám sát vị trí trực quan của đội ngũ thợ trực thuộc Studio đang thực hiện nhiệm vụ ngoài hiện trường.
  4. **Hệ thống Điều phối Tự động & Chăm sóc Khách hàng (Matching Engine & CSKH):**
     * Thuật toán quét danh sách thợ đủ điều kiện gần nhất để bắn thông báo nhận ca khẩn cấp (30s Instant Booking).
     * Truy xuất bảng nhật ký `telemetry_logs` để đối soát lộ trình di chuyển khi có khiếu nại (ví dụ: thợ báo đã đến nhưng khách phản ánh không thấy thợ).

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
│   ├── RedisConfig.java                       # Khởi tạo RedisTemplate<String, Object>, GeospatialOperations
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
│   │   ├── LocationStreamReq.java             # @NotNull lat, lng, @Min speed, heading, accuracy, bookingId
│   │   └── NearbyProvidersReq.java            # @NotNull lat, lng, radiusKm, masterCategoryId, minRating
│   └── response/telemetry/
│       ├── NearbyProviderRes.java             # muaId/agencyId, fullName, avatar, distanceKm, rating, price
│       ├── LiveTrackingRes.java               # bookingId, currentLat, currentLng, speed, heading, etaMinutes
│       └── TelemetryLogRes.java               # Danh sách tọa độ lịch sử vẽ polyline lộ trình
│
├── entity/
│   └── telemetry/
│       └── TelemetryLogEntity.java            # table: telemetry_schema.telemetry_logs (Point 4326 PostGIS)
│
├── mapper/
│   └── telemetry/
│       └── TelemetryLogMapper.java            # MapStruct: TelemetryLogEntity <-> DTOs
│
├── repository/
│   └── telemetry/
│       └── TelemetryLogRepository.java        # Spring Data JPA + PostGIS native queries: ST_DistanceSphere
│
└── service/
    └── telemetry/
        ├── RedisGeoService.java               # Giao tiếp Redis: GEOADD, GEOSEARCH, GEODIST, ZREM
        ├── TelemetryStreamService.java        # Xử lý Stream vị trí, broadcast STOMP, lọc nhiễu GPS
        ├── TelemetryQueryService.java         # Quét thợ gần nhất, kết hợp filter profile & rating
        ├── TelemetryLogService.java           # Ghi nhật ký bất đồng bộ (@Async) vào telemetry_logs
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
  * **And** Thiết lập Heartbeat Key `mua:geo:heartbeat:89` trong Redis với TTL là `60` giây.
  * **And** Cập nhật trạng thái `availability_status = 'AVAILABLE'` trong bảng `mua_schema.mua_profiles`.
  * **And** Trả về HTTP `200 OK` kèm thông báo: `"Đã chuyển sang trạng thái sẵn sàng nhận việc"`.

* **Scenario 02: Thợ chủ động tắt công tắc sang "Nghỉ ngơi / Offline"**
  * **Given** Thợ `mua_id = 89` đang ở trạng thái sẵn sàng trong Redis GEO.
  * **When** Thợ gạt công tắc sang OFF qua `POST /api/v1/telemetry/availability` với `is_available = false`.
  * **Then** Hệ thống thực thi lệnh Redis: `ZREM mua:geo:active 89` và xóa key heartbeat `mua:geo:heartbeat:89`.
  * **And** Cập nhật trạng thái `availability_status = 'OFFLINE'` trong database.
  * **And** Trả về HTTP `200 OK`. Thợ ngay lập tức biến mất khỏi kết quả tìm kiếm radar của khách hàng (< 5ms).

* **Scenario 03: Hệ thống tự động dọn thợ Offline khi mất Heartbeat (Auto-Eviction)**
  * **Given** Thợ đang bật sẵn sàng nhưng ứng dụng bị mất kết nối mạng, tắt ngầm hoặc hết pin quá `60` giây.
  * **When** Key `mua:geo:heartbeat:89` hết hạn (TTL expire).
  * **Then** Scheduled Task quét định kỳ (mỗi 30s) kiểm tra đối chiếu hoặc bắt Redis Keyspace Notification `expired`.
  * **And** Tự động gọi `ZREM mua:geo:active 89` để loại bỏ thợ khỏi danh sách nhận đơn, đảm bảo khách hàng không bị đặt nhầm thợ ảo đã mất kết nối.

* **Scenario 04: Thất bại do tọa độ GPS gửi lên không hợp lệ**
  * **When** Gửi request với `latitude = 195.00` hoặc `longitude = 200.00`.
  * **Then** Tầng Bean Validation ném lỗi `MethodArgumentNotValidException`.
  * **And** Server trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_INVALID_GEO_COORDINATE`.

---

### **US-LOC-02: Background GPS Telemetry Stream từ Mobile App Thợ (Chu kỳ 5–10s) (`ISSUE-14.3`)**
> **As a** Thợ Trang điểm đang di chuyển thực hiện đơn hàng (`ON_THE_WAY`),  
> **I want** ứng dụng Mobile tự động phát sóng tọa độ GPS định kỳ (5–10s một lần) chạy ngầm dưới nền,  
> **So that** khách hàng xem được vị trí di chuyển trực tiếp của tôi và an tâm chờ đợi mà tôi không cần thao tác thủ công.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Stream tọa độ GPS định kỳ qua REST API thành công (Happy Path)**
  * **Given** Thợ `mua_id = 89` có đơn hàng `booking_id = 1250` ở trạng thái `ON_THE_WAY`.
  * **When** Mobile Background Task gửi payload `POST /api/v1/telemetry/stream` (hoặc gửi qua STOMP WS `/app/telemetry/location`):
    ```json
    {
      "booking_id": 1250,
      "latitude": 10.778200,
      "longitude": 106.702100,
      "speed_kmh": 28.5,
      "heading_degree": 45.0,
      "accuracy_meters": 8.5
    }
    ```
  * **Then** Hệ thống kiểm tra độ chính xác: `accuracy_meters <= 50.0` (chấp nhận GPS).
  * **And** Cập nhật tọa độ mới nhất vào Redis:
    * `GEOADD mua:geo:active 106.702100 10.778200 89`
    * Cập nhật Redis Hash `booking:geo:trip:1250` lưu thông số `{lat, lng, speed, heading, updated_at}`.
  * **And** Broadcast gói tin STOMP tới Topic `/topic/gps-stream/1250` cho Client của Khách hàng.
  * **And** Trả về HTTP `200 OK` (thời gian phản hồi < 10ms).

* **Scenario 02: Lọc bỏ tọa độ nhiễu hoặc nhảy cóc bất thường (GPS Noise & Anti-Spoofing)**
  * **Given** Tọa độ trước đó của thợ ghi nhận lúc $T_0$ tại Quận 1, TP.HCM.
  * **When** Tại $T_0 + 5$ giây, payload gửi lên có tọa độ tại TP. Vũng Tàu (cách 100km, tương đương vận tốc > 70,000 km/h) hoặc `accuracy_meters = 120.0` (> 50m).
  * **Then** Hệ thống phát hiện bất thường về tốc độ (`speed > 120 km/h`) hoặc GPS nhiễu do khuất sóng toà nhà cao tầng.
  * **And** Bỏ qua không broadcast tọa độ nhảy cóc này tới khách hàng để tránh icon bị giật giật trên bản đồ.
  * **And** Ghi log `WARN` giám sát và trả về HTTP `200 OK` (bỏ qua bản ghi nhiễu).

* **Scenario 03: Chặn Stream tọa độ khi đơn hàng không ở trạng thái di chuyển**
  * **Given** Đơn hàng `booking_id = 1250` đã chuyển sang trạng thái `IN_PROGRESS` (đang trang điểm tại nhà) hoặc `COMPLETED`.
  * **When** App Thợ vẫn tiếp tục gửi stream tọa độ cho đơn hàng này.
  * **Then** Backend từ chối tiếp nhận và trả về HTTP `400 BAD_REQUEST` với mã `ERR_BOOKING_NOT_IN_TRANSIT`.
  * **And** Ứng dụng Mobile tự động hủy Background Task để tiết kiệm pin thiết bị.

---

### **US-LOC-03: API Quét Danh sách Thợ/Studio Rảnh trong Bán kính R km (`ISSUE-14.4`)**
> **As a** Khách hàng (Customer) hoặc Động cơ Phân bổ Đơn khẩn cấp (Dispatching Engine),  
> **I want to** quét tìm danh sách toàn bộ Thợ tự do và Cơ sở Studio đang hoạt động trong bán kính $R$ km từ vị trí chỉ định,  
> **So that** khách hàng có thể chọn người trang điểm gần nhất hoặc hệ thống tự động bắn đơn khẩn cấp đến các thợ phù hợp.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Khách hàng quét thợ rảnh trong bán kính 5km thành công (Happy Path)**
  * **Given** Vị trí của Khách hàng tại Hồ Con Rùa, Q.3 (`latitude: 10.7828, longitude: 106.6958`).
  * **When** Gọi API `GET /api/v1/telemetry/nearby?latitude=10.7828&longitude=106.6958&radius_km=5.0&category_id=1`:
  * **Then** Backend gọi `GEOSEARCH mua:geo:active FROMLONLAT 106.6958 10.7828 BYRADIUS 5.0 KM WITHDIST WITHCOORD ASC`.
  * **And** Lấy danh sách các `mua_id` nằm trong bán kính trả về từ Redis (ví dụ: `[89, 102, 115]`).
  * **And** Thực hiện truy vấn Entity từ cơ sở dữ liệu để đính kèm thông tin: Tên thợ, Avatar, Số sao đánh giá (Rating), Giá khởi điểm dịch vụ, và khoảng cách thực tế (ví dụ: `1.2 km`, `2.8 km`).
  * **And** Kết quả trả về danh sách sắp xếp tăng dần theo khoảng cách địa lý (`distance_km ASC`).
  * **And** Thời gian xử lý toàn bộ request hoàn tất trong vòng **< 25ms**.

* **Scenario 02: Không tìm thấy thợ nào trong bán kính chỉ định**
  * **When** Khách hàng tìm kiếm tại vùng ngoại thành với `radius_km = 3.0` nhưng không có thợ nào online.
  * **Then** Backend trả về HTTP `200 OK` với mảng `data: []` rỗng kèm trường gợi ý: `suggested_radius_km: 10.0`.

* **Scenario 03: Giới hạn bán kính tối đa cho phép (Radius Threshold Guard)**
  * **When** Khách hàng gửi request với `radius_km = 80.0` (vượt ngưỡng cho phép tối đa 30km của hệ thống).
  * **Then** Hệ thống tự động giới hạn (clamp) bán kính về `30.0 km` hoặc trả về lỗi validation nếu `radius_km > 50.0`.

---

### **US-LOC-04: Lưu vết Lịch sử Tọa độ GPS Di chuyển Thợ (`telemetry_logs`) (`ISSUE-14.5`)**
> **As a** Đội ngũ Vận hành & Quản trị Hệ thống (System Admin & CSKH),  
> **I want** hệ thống lưu vết có chọn lọc lịch sử lộ trình di chuyển của thợ vào bảng `telemetry_schema.telemetry_logs`,  
> **So that** chúng tôi có dữ liệu đối soát khi xảy ra tranh chấp, chứng minh thợ đã di chuyển đúng lộ trình và tính toán khoảng cách thực tế.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Ghi log tọa độ bất đồng bộ với cơ chế Dead-Reckoning (Tránh phình Database)**
  * **Given** Thợ đang stream GPS mỗi 5s cho chuyến đi `booking_id = 1250`.
  * **When** Hệ thống tiếp nhận tọa độ mới:
  * **Then** Hệ thống kiểm tra điều kiện ghi DB (Dead-reckoning threshold):
    1. Khoảng cách so với điểm ghi log gần nhất $\ge 30$ mét, HOẶC
    2. Thời gian kể từ lần ghi log gần nhất $\ge 30$ giây.
  * **And** Nếu thỏa mãn điều kiện, kích hoạt phương thức `@Async` ghi bản ghi mới vào bảng `telemetry_schema.telemetry_logs`:
    * `mua_id`: 89
    * `booking_id`: 1250
    * `latitude`: 10.778200
    * `longitude`: 106.702100
    * `location_point`: `ST_SetSRID(ST_MakePoint(106.702100, 10.778200), 4326)`
    * `speed_kmh`: 28.5
    * `recorded_at`: Thời gian hiện tại.
  * **And** Thao tác ghi DB chạy ngầm dưới background, hoàn toàn không làm chậm luồng xử lý WebSocket/REST API của thợ.

* **Scenario 02: CSKH truy xuất lịch sử lộ trình chuyến đi (Dispute Resolution)**
  * **Given** Khách hàng khiếu nại "Thợ báo hủy chuyến vì tắc đường nhưng thực tế không chịu di chuyển".
  * **When** Nhân viên CSKH gọi API `GET /api/v1/telemetry/bookings/1250/history`.
  * **Then** Hệ thống truy vấn bảng `telemetry_logs` sắp xếp theo `recorded_at ASC`.
  * **And** Trả về chuỗi tọa độ (Polyline Coordinates) kèm mốc thời gian và vận tốc từng điểm để hiển thị lại đường đi thực tế của thợ trên bản đồ Admin.

---

### **US-LOC-UI-01: Trải nghiệm Giao diện Bản đồ Radar & Live Tracking (Frontend Flow)**
> **As a** Khách hàng sử dụng ứng dụng,  
> **I want to** nhìn thấy radar quét các thợ xung quanh và xem thợ di chuyển mượt mà trên bản đồ khi họ đang đến,  
> **So that** tôi có trải nghiệm hiện đại, an tâm và nắm bắt chính xác thời gian thợ đến nhà.

#### **Tiêu chí Nghiệm thu UI/UX:**
* **AC-01 (Màn hình Radar Khám phá):**
  * Hiển thị vòng tròn sóng radar quét xung quanh vị trí khách.
  * Các marker thợ hiển thị Avatar tròn có viền gradient hồng cam sang trọng (Luxury Beauty Token).
  * Nhấp vào Marker $\rightarrow$ Hiển thị Bottom Sheet thông tin nhanh: Tên thợ, Rating 4.9★, Khoảng cách (ví dụ: `Cách bạn 1.5 km`), Nút "Xem Hồ sơ" & "Đặt Lịch".
* **AC-02 (Màn hình Live Tracking Đơn hàng):**
  * Kết nối tự động tới STOMP Topic `/topic/gps-stream/{bookingId}` khi đơn chuyển sang `ON_THE_WAY`.
  * Biểu tượng Marker xe máy di chuyển mượt mà nhờ thuật toán nội suy (Interpolation) giữa các điểm GPS nhận được (chu kỳ 5–10s), không bị hiện tượng nhảy giật tọa độ.
  * Hiển thị Card trạng thái đè trên bản đồ: Thời gian dự kiến (ETA: `12 phút`), Khoảng cách còn lại (`3.2 km`), Nút "Gọi cho Thợ" và "Nhắn tin".

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI BACK-END

Tất cả các ngoại lệ đều được chuẩn hóa qua `GlobalExceptionHandler.java`, trả về JSON envelope đồng nhất:

```json
{
  "success": false,
  "code": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Thông điệp mô tả lỗi chi tiết cho client",
  "errors": [],
  "timestamp": "2026-09-14T08:50:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Phân hệ Location Telemetry

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_INVALID_GEO_COORDINATE` | Vĩ độ (`latitude`) không nằm trong `[-90, 90]` hoặc Kinh độ (`longitude`) không nằm trong `[-180, 180]`. | Bean Validation chặn lại ngay tại tầng Controller DTO. |
| **`400 BAD_REQUEST`** | `ERR_INVALID_SEARCH_RADIUS` | Bán kính quét tìm kiếm $R \le 0$ hoặc vượt quá mức trần tối đa cho phép (50 km). | Trả về thông báo yêu cầu bán kính từ 0.5km đến 50km. |
| **`400 BAD_REQUEST`** | `ERR_BOOKING_NOT_IN_TRANSIT` | Thợ gửi stream tọa độ cho đơn hàng nhưng đơn đó chưa ở trạng thái `ON_THE_WAY` hoặc đã kết thúc. | Chặn stream để tránh ghi rác vào DB và ngắt task mobile. |
| **`400 BAD_REQUEST`** | `ERR_GPS_ACCURACY_TOO_LOW` | Độ chính xác GPS của thiết bị quá kém (`accuracy_meters > 100m`) khiến vị trí bị sai lệch lớn. | Server từ chối cập nhật Redis GEO và cảnh báo thợ kiểm tra GPS. |
| **`401 UNAUTHORIZED`** | `ERR_UNAUTHORIZED` | Thiếu token JWT hoặc token đã hết hạn khi gọi API phát sóng vị trí. | Spring Security từ chối kết nối hoặc interceptor ngắt kết nối STOMP. |
| **`403 FORBIDDEN`** | `ERR_MUA_PROFILE_NOT_APPROVED` | Thợ chưa được Quản trị viên duyệt hồ sơ (`is_verified = false`) nhưng cố tình bật sẵn sàng nhận việc. | Chặn không cho ghi vào Redis GEO, yêu cầu hoàn tất xác minh hồ sơ. |
| **`403 FORBIDDEN`** | `ERR_TELEMETRY_ACCESS_DENIED` | Thợ A cố tình gửi tọa độ cho đơn hàng thuộc về Thợ B (Lỗ hổng IDOR). | Đối chiếu `current_user.mua_id == booking.assigned_mua_id`. |
| **`404 NOT_FOUND`** | `ERR_BOOKING_NOT_FOUND` | `booking_id` truyền lên trong stream không tồn tại trong hệ thống. | Ném `ResourceNotFoundException("Đơn hàng không tồn tại")`. |
| **`429 TOO_MANY_REQUESTS`** | `ERR_TELEMETRY_RATE_LIMITED` | Client spam request gửi tọa độ GPS với tần suất quá cao (< 2 giây/lần). | Redis Rate Limiter chặn bớt request dư thừa, trả về HTTP 429. |
| **`500 INTERNAL_SERVER_ERROR`** | `ERR_REDIS_GEO_UNAVAILABLE` | Cụm Redis gặp sự cố kết nối khiến các thao tác GEO bị gián đoạn. | Fallback sang truy vấn tạm thời bằng PostGIS Spatial Index trong DB. |

---

### 4.2. Mã nguồn Validation DTO Mẫu (Bean Validation)

#### DTO Tiếp nhận Stream Tọa độ: `LocationStreamReq.java`
```java
package com.makeup.platform.dto.request.telemetry;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationStreamReq {

    @NotNull(message = "{telemetry.booking_id.required}")
    private Long bookingId;

    @NotNull(message = "{telemetry.latitude.required}")
    @DecimalMin(value = "-90.0", message = "{telemetry.latitude.invalid}")
    @DecimalMax(value = "90.0", message = "{telemetry.latitude.invalid}")
    private BigDecimal latitude;

    @NotNull(message = "{telemetry.longitude.required}")
    @DecimalMin(value = "-180.0", message = "{telemetry.longitude.invalid}")
    @DecimalMax(value = "180.0", message = "{telemetry.longitude.invalid}")
    private BigDecimal longitude;

    @DecimalMin(value = "0.0", message = "{telemetry.speed.positive}")
    @DecimalMax(value = "150.0", message = "{telemetry.speed.unrealistic}")
    private BigDecimal speedKmh;

    @DecimalMin(value = "0.0", message = "{telemetry.heading.invalid}")
    @DecimalMax(value = "360.0", message = "{telemetry.heading.invalid}")
    private BigDecimal headingDegree;

    @DecimalMin(value = "0.0", message = "{telemetry.accuracy.positive}")
    private BigDecimal accuracyMeters;
}
```

#### DTO Quét Tìm Thợ Trong Bán Kính: `NearbyProvidersReq.java`
```java
package com.makeup.platform.dto.request.telemetry;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class NearbyProvidersReq {

    @NotNull(message = "{telemetry.latitude.required}")
    @DecimalMin(value = "-90.0", message = "{telemetry.latitude.invalid}")
    @DecimalMax(value = "90.0", message = "{telemetry.latitude.invalid}")
    private BigDecimal latitude;

    @NotNull(message = "{telemetry.longitude.required}")
    @DecimalMin(value = "-180.0", message = "{telemetry.longitude.invalid}")
    @DecimalMax(value = "180.0", message = "{telemetry.longitude.invalid}")
    private BigDecimal longitude;

    @DecimalMin(value = "0.5", message = "Bán kính quét tối thiểu là 0.5 km")
    @DecimalMax(value = "50.0", message = "Bán kính quét tối đa là 50.0 km")
    private Double radiusKm = 5.0; // Giá trị mặc định 5km

    private Integer masterCategoryId; // Lọc theo danh mục make-up (VD: Cô dâu, Tiệc)

    @DecimalMin(value = "1.0")
    @DecimalMax(value = "5.0")
    private BigDecimal minRating;     // Lọc thợ có đánh giá từ minRating trở lên
}
```

---

## 💻 5. ĐẶC TẢ REST API & WEBSOCKET STOMP CONTRACTS

---

### 5.1. `POST /api/v1/telemetry/availability` (Bật/Tắt Trạng thái Sẵn sàng & Tọa độ Khởi tạo)
* **Mục đích:** Thợ bật hoặc tắt công tắc nhận việc trên màn hình Dashboard.
* **Quyền truy cập:** `ROLE_FREELANCE_MUA` hoặc `ROLE_AGENCY_STAFF`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "is_available": true,
  "latitude": 10.776889,
  "longitude": 106.700806
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "AVAILABILITY_STATUS_UPDATED",
  "message": "Cập nhật trạng thái sẵn sàng nhận việc thành công!",
  "data": {
    "mua_id": 89,
    "is_available": true,
    "availability_status": "AVAILABLE",
    "latitude": 10.776889,
    "longitude": 106.700806,
    "heartbeat_ttl_seconds": 60,
    "updated_at": "2026-09-14T08:50:00Z"
  },
  "timestamp": "2026-09-14T08:50:00Z"
}
```

---

### 5.2. `POST /api/v1/telemetry/stream` (Stream Tọa độ GPS Định kỳ 5–10s)
* **Mục đích:** Mobile App của Thợ gửi tọa độ GPS định kỳ khi đang di chuyển thực hiện đơn hàng.
* **Quyền truy cập:** `ROLE_FREELANCE_MUA` hoặc `ROLE_AGENCY_STAFF` (Người được gán cho đơn hàng).
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "booking_id": 1250,
  "latitude": 10.778200,
  "longitude": 106.702100,
  "speed_kmh": 28.5,
  "heading_degree": 45.0,
  "accuracy_meters": 8.5
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "TELEMETRY_STREAM_ACCEPTED",
  "message": "Tiếp nhận tọa độ di chuyển thành công",
  "data": {
    "booking_id": 1250,
    "is_broadcasted": true,
    "is_persisted_to_db": true,
    "recorded_at": "2026-09-14T08:52:15Z"
  },
  "timestamp": "2026-09-14T08:52:15Z"
}
```

---

### 5.3. `GET /api/v1/telemetry/nearby` (Quét Danh sách Thợ Rảnh trong Bán kính R km)
* **Mục đích:** Khách hàng mở bản đồ Radar hoặc thuật toán điều phối quét thợ gần nhất.
* **Quyền truy cập:** `permitAll` (Công khai cho mọi người dùng đã/chưa đăng nhập).
* **Query Parameters:**
  * `latitude`: `10.782800` (Bắt buộc)
  * `longitude`: `106.695800` (Bắt buộc)
  * `radius_km`: `5.0` (Tùy chọn, mặc định 5.0)
  * `category_id`: `1` (Tùy chọn: Gói cô dâu)
  * `min_rating`: `4.5` (Tùy chọn)
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "NEARBY_PROVIDERS_FOUND",
  "message": "Tìm thấy 3 thợ trang điểm rảnh xung quanh bạn",
  "data": {
    "search_center": {
      "latitude": 10.782800,
      "longitude": 106.695800
    },
    "radius_km": 5.0,
    "total_found": 3,
    "providers": [
      {
        "provider_type": "FREELANCER",
        "provider_id": 89,
        "full_name": "Linh Đan Makeup Artist",
        "avatar_url": "https://cdn.makeup.vn/avatars/linhdan_pro.webp",
        "phone_number": "0987***321",
        "rating_average": 4.92,
        "total_reviews": 128,
        "distance_km": 1.25,
        "current_location": {
          "latitude": 10.776889,
          "longitude": 106.700806
        },
        "starting_price": 500000.00,
        "highlighted_styles": ["Tone Hàn Trong Trẻo", "Tone Thái Sang Trọng"]
      },
      {
        "provider_type": "FREELANCER",
        "provider_id": 102,
        "full_name": "Hương Giang Beauty",
        "avatar_url": "https://cdn.makeup.vn/avatars/hgiang.webp",
        "rating_average": 4.85,
        "total_reviews": 84,
        "distance_km": 2.80,
        "current_location": {
          "latitude": 10.789500,
          "longitude": 106.687200
        },
        "starting_price": 650000.00,
        "highlighted_styles": ["Tone Tây Sắc Sảo"]
      }
    ]
  },
  "timestamp": "2026-09-14T08:50:30Z"
}
```

---

### 5.4. `GET /api/v1/telemetry/bookings/{bookingId}/track` (Truy vấn Tọa độ Realtime & ETA Thợ đang đến)
* **Mục đích:** Khách hàng load lại trạng thái ban đầu của bản đồ tracking trước khi kết nối WebSocket.
* **Quyền truy cập:** Khách hàng sở hữu đơn hoặc Thợ phụ trách đơn (`hasAuthority('booking:read')`).
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "BOOKING_TRACKING_RETRIEVED",
  "message": "Lấy thông tin định vị ca hẹn thành công",
  "data": {
    "booking_id": 1250,
    "booking_status": "ON_THE_WAY",
    "mua_info": {
      "mua_id": 89,
      "full_name": "Linh Đan Makeup Artist",
      "phone": "0987123456",
      "avatar": "https://cdn.makeup.vn/avatars/linhdan_pro.webp"
    },
    "current_position": {
      "latitude": 10.778200,
      "longitude": 106.702100,
      "speed_kmh": 28.5,
      "heading_degree": 45.0,
      "last_updated_at": "2026-09-14T08:52:15Z"
    },
    "destination": {
      "address_line": "Tòa nhà Bitexco, Q.1, TP.HCM",
      "latitude": 10.771600,
      "longitude": 106.704400
    },
    "remaining_distance_km": 1.4,
    "estimated_eta_minutes": 6
  },
  "timestamp": "2026-09-14T08:52:16Z"
}
```

---

### 5.5. Giao thức Truyền tải WebSocket STOMP (Embedded Gateway)

#### 1. Inbound Message (Thợ phát sóng qua WebSocket):
* **STOMP Destination:** `/app/telemetry/location`
* **STOMP Payload:**
```json
{
  "bookingId": 1250,
  "latitude": 10.778200,
  "longitude": 106.702100,
  "speedKmh": 28.5,
  "heading": 45.0,
  "accuracy": 8.5,
  "timestamp": 1726303935000
}
```

#### 2. Outbound Broadcast (Khách hàng đăng ký nhận tọa độ trực tiếp):
* **STOMP Subscription Topic:** `/topic/gps-stream/1250`
* **Broadcast Payload phát tới Khách hàng:**
```json
{
  "type": "LOCATION_UPDATE",
  "bookingId": 1250,
  "muaId": 89,
  "latitude": 10.778200,
  "longitude": 106.702100,
  "speedKmh": 28.5,
  "heading": 45.0,
  "remainingDistanceKm": 1.4,
  "etaMinutes": 6,
  "timestamp": 1726303935000
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16) & THIẾT KẾ REDIS GEO

### 6.1. DDL PostgreSQL 16 PostGIS (`telemetry_schema`)

```sql
-- 1. KÍCH HOẠT EXTENSION POSTGIS NẾU CHƯA CÓ
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. TẠO SCHEMA TELEMETRY
CREATE SCHEMA IF NOT EXISTS telemetry_schema;

-- 3. BẢNG LƯU VẾT LỊCH SỬ TỌA ĐỘ GPS DI CHUYỂN CỦA THỢ (ISSUE-14.5)
CREATE TABLE IF NOT EXISTS telemetry_schema.telemetry_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_point GEOMETRY(Point, 4326) NOT NULL, -- WGS 84 GPS Standard
    speed_kmh DECIMAL(5, 2) DEFAULT 0.00,
    heading_degree DECIMAL(5, 2) DEFAULT 0.00,
    accuracy_meters DECIMAL(6, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. BẢNG CƠ SỞ ĐỊA CHỈ & TỌA ĐỘ CỐ ĐỊNH CỦA STUDIO (DÀNH CHO ĐẠI LÝ)
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

-- 5. CHỈ MỤC TỐI ƯU TRUY VẤN (SPATIAL & B-TREE INDEXES)
-- PostGIS Spatial Index (GIST) phục vụ tính toán không gian và truy vấn bán kính
CREATE INDEX IF NOT EXISTS idx_telemetry_spatial 
    ON telemetry_schema.telemetry_logs USING GIST(location_point);

CREATE INDEX IF NOT EXISTS idx_agency_branch_spatial 
    ON agency_schema.agency_branches USING GIST(location_point);

-- Composite B-Tree Index phục vụ truy xuất lộ trình chuyến đi (Dispute / Audit)
CREATE INDEX IF NOT EXISTS idx_telemetry_booking_time 
    ON telemetry_schema.telemetry_logs(booking_id, recorded_at ASC);

CREATE INDEX IF NOT EXISTS idx_telemetry_mua_time 
    ON telemetry_schema.telemetry_logs(mua_id, recorded_at DESC);
```

---

### 6.2. Cấu trúc Khóa & Lệnh Redis GEO In-Memory (Redis 7.x)

| Tên Khóa (Key) | Kiểu Dữ liệu (Type) | Mục đích & Mô tả | Cơ chế Hết hạn (TTL) | Lệnh Redis Thao tác Chính |
| :--- | :--- | :--- | :--- | :--- |
| `mua:geo:active` | `zset` (Geospatial) | Lưu trữ chỉ mục vị trí thời gian thực của toàn bộ thợ đang ở trạng thái **Sẵn sàng** (`AVAILABLE`). | Không set TTL (Quản lý qua lệnh `ZREM` khi offline hoặc heartbeat hết hạn). | `GEOADD mua:geo:active <lng> <lat> <mua_id>`<br>`GEOSEARCH mua:geo:active ...`<br>`GEODIST mua:geo:active <m1> <m2> km` |
| `mua:geo:heartbeat:{muaId}` | `string` | Đóng vai trò cờ Heartbeat (Liveness probe). Ứng dụng của thợ phải ping duy trì mỗi 30s. | `TTL: 60s` (Nếu quá 60s không ping $\rightarrow$ tự hủy). | `SET mua:geo:heartbeat:89 "ALIVE" EX 60` |
| `booking:geo:trip:{bookingId}` | `hash` | Lưu trữ trạng thái di chuyển mới nhất của cuốc xe (Vị trí hiện tại, vận tốc, góc hướng, ETA, mốc thời gian). | `TTL: 4 hours` (Tự giải phóng sau khi chuyến đi hoàn tất). | `HSET booking:geo:trip:1250 lat 10.778 lng 106.702 speed 28.5 heading 45`<br>`HGETALL booking:geo:trip:1250` |
| `agency:geo:locations` | `zset` (Geospatial) | Lưu tọa độ cố định của tất cả cơ sở/Studio trên toàn quốc để phục vụ quét cơ sở gần nhất. | Persistent (Cập nhật khi Studio đổi địa chỉ). | `GEOADD agency:geo:locations <lng> <lat> <branch_id>` |

---

## ⚡ 7. THUẬT TOÁN TỐI ƯU & QUY TRÌNH KỸ THUẬT NÂNG CAO

```text
  [ Mobile App Thợ (GPS Stream 5-10s) ]
                 │
                 ▼ (REST POST / STOMP WSS)
  [ LocationStreamController / Handler ]
                 │
                 ├── 1. Validate Tọa độ & Rate Limit (<2s)
                 ├── 2. Kiểm tra GPS Noise: (accuracy <= 50m, speed <= 120km/h)
                 │
                 ├── 3. [ In-Memory Redis GEO ]
                 │      GEOADD mua:geo:active <lng> <lat> <mua_id>
                 │      HSET booking:geo:trip:{bookingId} ...
                 │
                 ├── 4. [ STOMP WebSocket Broadcast ]
                 │      Topic: /topic/gps-stream/{bookingId} ───> [ Khách hàng xem Live Map ]
                 │
                 └── 5. [ Async Dead-Reckoning Filter ]
                        Δs >= 30m OR Δt >= 30s ?
                             │
                            YES ──> [ @Async Task: Insert PostgreSQL telemetry_logs ]
                             │
                            NO  ──> (Skip DB, giảm 85% I/O Disk Write)
```

1. **Thuật toán Dead-Reckoning giảm tải I/O Disk Write (PostgreSQL Optimization):**
   * Nếu 1,000 thợ stream vị trí mỗi 5 giây, hệ thống sẽ phải ghi `200 TPS` liên tục vào ổ cứng DB.
   * **Giải pháp:** Chỉ ghi bản ghi mới vào `telemetry_logs` khi thỏa mãn:
     $$\Delta s = \text{distance}(\text{current\_point}, \text{last\_saved\_point}) \ge 30\text{ mét} \quad \text{HOẶC} \quad \Delta t \ge 30\text{ giây}$$
   * Giúp cắt giảm hơn **85% khối lượng ghi đĩa** mà vẫn giữ trọn vẹn lộ trình di chuyển của thợ.

2. **Thuật toán Tính khoảng cách Haversine & ST_DistanceSphere:**
   * **Trong Redis GEO:** Sử dụng `GEODIST` dựa trên công thức Haversine cầu chuẩn tế WGS 84, trả về khoảng cách km với độ chính xác sai số $< 0.3\%$.
   * **Trong PostGIS:** Sử dụng hàm chuyên dụng `ST_DistanceSphere(point1, point2)` với chỉ mục GIST spatial, cho phép truy vấn không gian cực nhanh trên tập dữ liệu hàng triệu dòng.

3. **Cơ chế Liveness Heartbeat & Auto-Eviction:**
   * Mỗi khi thợ gửi vị trí, Redis gia hạn key `mua:geo:heartbeat:{muaId}` với TTL 60s.
   * Một Scheduled Worker (`@Scheduled(fixedRate = 30000)`) kiểm tra các member trong `mua:geo:active`. Nếu thợ nào bị mất key heartbeat, hệ thống lập tức loại khỏi sorted set để đảm bảo radar của khách hàng luôn phản ánh đúng 100% thợ đang trực tuyến thực tế.

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Thời gian Phản hồi Truy vấn Không gian (Geospatial Latency):**
   * API quét thợ rảnh trong bán kính (`GET /api/v1/telemetry/nearby`) phải trả về kết quả trong thời gian **$< 30\text{ms}$** đối với bán kính 5km.
   * Thao tác cập nhật vị trí Redis GEO (`GEOADD`) phải hoàn thành trong **$< 2\text{ms}$**.
2. **Khả năng Chịu tải Đồng thời (Concurrency & Throughput):**
   * Hệ thống đảm bảo tiếp nhận và xử lý mượt mà tối thiểu **1,000 gói tin GPS Stream mỗi giây (1,000 TPS)** mà CPU của máy chủ `core-api` duy trì dưới mức $35\%$.
3. **Độ trễ Truyền tải Thời gian thực (End-to-End WebSocket Latency):**
   * Thời gian từ lúc Mobile App của thợ phát tọa độ GPS đến khi bản đồ trên điện thoại của khách hàng nhận được tọa độ mới qua WebSocket STOMP không vượt quá **$100\text{ms}$**.
4. **Bảo mật & Toàn vẹn Lộ trình (Security & Privacy):**
   * Tọa độ của thợ chỉ được chia sẻ công khai dưới dạng điểm xấp xỉ (bán kính ngẫu nhiên hóa 50m) khi đang ở trạng thái rảnh trên Radar.
   * Tọa độ chính xác theo thời gian thực (Live Stream) chỉ được broadcast duy nhất tới Khách hàng sở hữu đơn hàng đang ở trạng thái `ON_THE_WAY` thông qua kênh STOMP được phân quyền nghiêm ngặt.
