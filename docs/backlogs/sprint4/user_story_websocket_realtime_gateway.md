# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: EMBEDDED STOMP WEBSOCKET REALTIME GATEWAY & GPS STREAMING ENGINE
### (Spring Boot 3.3.x Layered Monolith with Domain Sub-packages `core-api` - Endpoint: `/ws-makeup`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Embedded STOMP WebSocket Realtime Gateway & GPS Telemetry Streaming`
* **Mã Jira Issues phụ trách (Sprint 4):**
  * `ISSUE-20.1`: **User Story** - WebSocket Realtime Gateway - Tích hợp Embedded STOMP WebSocket trong `core-api`.
  * `ISSUE-20.2`: **Task** - Kết nối màng lưới thời gian thực mã hóa WSS (WebSocket Secure qua SSL/TLS).
  * `ISSUE-20.3`: **Task** - Authentication Middleware xác thực kết nối WebSocket bằng Short-lived JWT qua STOMP CONNECT frame.
  * `ISSUE-20.4`: **Task** - Tích hợp Redis PubSub Adapter đồng bộ kết nối WebSocket trên nhiều Gateway / Backend Instances.
  * `ISSUE-20.5`: **Task** - Kênh Broadcast Popup Đếm ngược 30s đồng loạt đến App các Thợ rảnh gần nhất (`/topic/booking-broadcast`).
  * `ISSUE-20.6`: **Task** - Kênh Stream vị trí GPS Thợ di chuyển Realtime cho Khách xem trên bản đồ (`/topic/gps-stream/{bookingId}`).

* **Mô hình Kiến trúc Toàn Hệ Thống:**
  * **Backend (Modular Monolith - Layered DDD Sub-packages):** Gom toàn bộ các phân hệ về **1 ứng dụng Spring Boot duy nhất (`code/backend/core-api`)** chạy trên Port `8080`. Không tách Microservices độc lập, loại bỏ network overhead bằng cách dùng Service Interface trực tiếp và **Spring In-Memory EventBus (`ApplicationEventPublisher`)** với độ trễ nội bộ $< 1\text{ms}$.
  * **Tầng Realtime Nhúng (Embedded STOMP Broker):** Nhúng trực tiếp Simple STOMP Broker tại endpoint `/ws-makeup` trong `core-api`, quản lý các kênh Broadcast (`/topic`), Hàng đợi cá nhân P2P (`/user/queue`), và nhận frame nghiệp vụ từ Client (`/app`).
  * **Bảo mật Tầng Giao vận (Transport Layer Security):** Bắt buộc kết nối mã hóa **WSS (WebSocket Secure)** qua TLS 1.3 với SSL Termination tại Nginx Reverse Proxy / Cloudflare hoặc Spring Boot SSL.
  * **Đồng bộ Đa Node Phân Tán (Distributed Message Relay):**
    * **Redis PubSub Adapter (`RedisMessageListenerContainer`):** Đóng vai trò message bus chuyển tiếp tin nhắn giữa các instance `core-api` khi scale ngang trong Docker / Kubernetes cluster.
    * **Redis GEO Cluster (`mua:geo:active`):** Lưu trữ tọa độ không gian thời gian thực của thợ đang trực tuyến, phục vụ truy vấn bán kính $R$ km (`GEOSEARCH`).
  * **Cơ sở Dữ liệu Tập trung (1 Database + 8 PostgreSQL Schemas):**
    * Quản lý phân vùng độc lập trên PostgreSQL 16 + PostGIS extension.
    * Tọa độ vết di chuyển lịch sử lưu tại schema `telemetry_schema.telemetry_logs` với kiểu dữ liệu không gian `geometry(Point, 4326)`.

* **Đối tượng Sử dụng (User Personas):**
  1. **Customer (`ROLE_CUSTOMER` - Web & Mobile App):**
     * Kết nối WSS để theo dõi biểu tượng xe của Thợ di chuyển mượt mà trên bản đồ trực quan theo thời gian thực (chu kỳ cập nhật 5s/lần).
     * Nhận thông báo kết quả tìm kiếm thợ tức thì (< 50ms) ngay khi có thợ bấm nhận đơn qua WebSocket.
  2. **Freelance MUA (`ROLE_FREELANCE_MUA`) & Studio Staff MUA (`ROLE_AGENCY_STAFF`):**
     * Duy trì kết nối WSS nền khi bật công tắc "Sẵn sàng nhận việc".
     * Nhận Popup toàn màn hình rung chuông báo động đếm lùi 30s khi có đơn khẩn cấp trong bán kính phục vụ.
     * Liên tục stream tọa độ GPS từ thiết bị di động về server trong suốt quá trình di chuyển đến nhà khách.
  3. **Super Admin & Agency Admin (`ROLE_SUPER_ADMIN`, `ROLE_AGENCY_ADMIN`):**
     * Theo dõi ma trận vị trí thợ đang hoạt động trên Web Quản trị (Data-dense Clean Dashboard) phục vụ điều phối cứu hộ khi có sự cố thợ trễ hẹn hoặc hủy ca.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE WITH DOMAIN SUB-PACKAGES)

Tuân thủ 100% quy chuẩn cấu trúc dự án chuẩn mực được định nghĩa tại `docs/project_structure.md` và `docs/convention.md`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── Application.java                           # Bootstrap Spring Boot 3.3.x Monolith
│
├── common/                                    # TẦNG DÙNG CHUNG TOÀN HỆ THỐNG (Cross-cutting Concerns)
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # ok, created, noContent, error
│   │   ├── ApiResponse.java                   # Envelope: {success, code, message, data, timestamp}
│   │   ├── PageResponse.java                  # Chuẩn hóa dữ liệu phân trang
│   │   ├── BaseService.java                   # Interface generic CRUD
│   │   └── BaseServiceImpl.java               # Implementation generic CRUD
│   ├── constants/
│   │   ├── SecurityConstants.java             # Bearer prefix, Header Authorization, JWT TTL
│   │   ├── WebSocketConstants.java            # Prefix: /app, /topic, /queue, /user, Endpoint: /ws-makeup
│   │   └── ErrorCodes.java                    # ERR_WS_UNAUTHORIZED, ERR_WS_TOKEN_EXPIRED...
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Ngoại lệ nghiệp vụ có mã lỗi ErrorCodes
│   │   └── WebSocketAuthenticationException.java # Ngoại lệ xác thực frame STOMP
│   ├── i18n/
│   │   ├── CustomLocaleResolver.java          # Xác định ngôn ngữ từ Accept-Language
│   │   └── JsonMessageSource.java             # Nạp file đa ngôn ngữ từ resources/i18n/
│   └── utils/
│       ├── JwtUtils.java                      # Giải mã & kiểm tra chữ ký Access Token
│       └── SecurityContextUtils.java          # Trích xuất userId, role từ SecurityContext / Principal
│
├── config/                                    # CẤU HÌNH FRAMEWORK & HẠ TẦNG
│   ├── SecurityConfig.java                    # Cấu hình Spring Security 6 & Whitelist URL
│   ├── JwtAuthenticationFilter.java           # Filter kiểm tra JWT Access Token trên HTTP REST API
│   ├── RedisConfig.java                       # Cấu hình RedisTemplate, Redis GEO & PubSub Listener
│   ├── RedissonConfig.java                    # Cấu hình Redlock Distributed Lock chống tranh chấp đơn
│   └── WebSocketConfig.java                   # Cấu hình Embedded STOMP Broker & Channel Interceptors
│
├── security/                                  # BẢO MẬT & USER PRINCIPAL
│   ├── CustomUserDetails.java                 # UserPrincipal tích hợp roles & permissions
│   ├── CustomUserDetailsService.java          # Tải UserDetails từ Database
│   └── websocket/                             # TẦNG BẢO MẬT RIÊNG CHO GIAO THỨC WEBSOCKET
│       ├── WebSocketAuthInterceptor.java      # ChannelInterceptor chặn STOMP CONNECT validate JWT
│       ├── WebSocketHandshakeHandler.java     # Gán Custom StompPrincipal(userId, role) vào WebSocket Session
│       └── WebSocketSubscriptionInterceptor.java # Kiểm tra phân quyền khi client SUBSCRIBE Topic
│
├── controller/                                # TẦNG REST & WEBSOCKET CONTROLLERS (Nhóm theo Domain)
│   ├── telemetry/
│   │   ├── LocationStreamController.java      # @MessageMapping("/telemetry/send") tiếp nhận tọa độ GPS
│   │   └── TelemetryQueryController.java      # GET /api/v1/telemetry/nearby, /history (REST API)
│   └── notification/
│       └── NotificationController.java        # GET /api/v1/notifications/in-app (REST API)
│
├── dto/                                       # DATA TRANSFER OBJECTS (Request & Response theo Domain)
│   ├── request/
│   │   ├── telemetry/
│   │   │   ├── LocationStreamReq.java         # Payload thợ gửi GPS: bookingId, lat, lng, speed, heading
│   │   │   ├── ToggleAvailabilityReq.java     # Công tắc thợ bật/tắt Online (isAvailable, lat, lng)
│   │   │   └── NearbyProvidersReq.java        # Tham số tìm thợ quanh bán kính: lat, lng, radiusKm
│   │   └── notification/
│   │       └── MarkNotificationReadReq.java   # Đánh dấu đã đọc thông báo
│   └── response/
│       ├── telemetry/
│       │   ├── LiveTrackingRes.java           # Payload stream tới khách: thợ, lat, lng, heading, ETA
│       │   ├── NearbyProviderRes.java         # Danh sách thợ rảnh gần nhất từ Redis GEO
│       │   └── TelemetryLogRes.java           # Dữ liệu lịch sử vết di chuyển
│       └── notification/
│           ├── InstantBookingBroadcastOfferRes.java # Payload Offer 30s bắn tới thợ (/topic/booking-broadcast)
│           ├── BookingDismissRes.java         # Gói tin hủy popup 30s (/topic/booking-dismiss/{id})
│           └── InAppNotificationRes.java      # Thông báo chuông In-App
│
├── entity/                                    # JPA ENTITIES (Phân bổ theo PostgreSQL Schemas)
│   └── telemetry/
│       └── TelemetryLogEntity.java            # Mapping bảng telemetry_schema.telemetry_logs (PostGIS Point 4326)
│
├── mapper/                                    # MANUAL MAPPERS (@Component tường minh, KHÔNG dùng MapStruct)
│   └── telemetry/
│       └── TelemetryMapper.java               # Manual mapping giữa TelemetryLogEntity và DTOs
│
├── event/                                     # SPRING IN-MEMORY EVENTS (ApplicationEvent)
│   ├── telemetry/
│   │   └── GpsLocationReceivedEvent.java      # Sự kiện bắn ra khi thợ gửi tọa độ GPS mới
│   └── notification/
│       └── InstantBookingBroadcastEvent.java  # Sự kiện kích hoạt phát sóng nhận ca khẩn cấp 30s
│
├── listener/                                  # EVENT LISTENERS
│   ├── telemetry/
│   │   └── GpsLocationEventListener.java      # Nhận Event tọa độ để cập nhật Redis GEO & Stream tới khách
│   ├── notification/
│   │   └── InstantBookingBroadcastListener.java # Lắng nghe Event để kích hoạt WebSocket broadcast
│   └── websocket/
│       └── WebSocketSessionEventListener.java # Lắng nghe SessionConnectedEvent, SessionDisconnectEvent
│
├── repository/                                # SPRING DATA JPA REPOSITORIES (Nhóm theo Domain)
│   └── telemetry/
│       └── TelemetryLogRepository.java        # Lưu vết tọa độ & truy vấn PostGIS ST_DistanceSphere
│
└── service/                                   # TẦNG NGHIỆP VỤ LÕI (Nhóm sub-package theo Domain)
    ├── telemetry/                             # Domain Quản lý GPS & Telemetry
    │   ├── RedisGeoService.java               # Cập nhật & quét vị trí thợ rảnh trên Redis GEO
    │   ├── TelemetryStreamService.java        # Điều phối luồng stream tọa độ và phân quyền theo dõi
    │   ├── TelemetryQueryService.java         # Truy vấn lịch sử vết di chuyển từ PostgreSQL PostGIS
    │   └── impl/
    │       ├── RedisGeoServiceImpl.java       # Implement 100% logic Redis GEO (GEOADD, GEOSEARCH)
    │       ├── TelemetryStreamServiceImpl.java# Xử lý tọa độ, ghi Redis Hash, buffer async ghi DB
    │       └── TelemetryQueryServiceImpl.java # Implement truy vấn lịch sử lộ trình
    └── notification/                          # Domain Thông báo & WebSocket Messaging
        ├── NotificationService.java           # Quản lý thông báo In-App trong CSDL
        ├── WebSocketBroadcastService.java     # Gửi tin nhắn STOMP tới Topic và Hàng đợi người dùng
        ├── RedisMessagePublisher.java         # Publish tin nhắn ra Redis PubSub đồng bộ đa node
        ├── RedisMessageSubscriber.java        # Lắng nghe Redis Channel để forward vào STOMP nội bộ
        └── impl/
            ├── NotificationServiceImpl.java   # Triển khai lưu và đọc thông báo in-app
            ├── WebSocketBroadcastServiceImpl.java # Implement SimpMessagingTemplate gửi STOMP
            ├── RedisMessagePublisherImpl.java # Triển khai phát tin ra Redis Topic
            └── RedisMessageSubscriberImpl.java# Triển khai lắng nghe kênh Redis
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-WS-01: Kết Nối Màng Lưới Realtime Embedded STOMP Qua WSS SSL/TLS (`ISSUE-20.1` & `ISSUE-20.2`)**
> **As a** Nhà phát triển Ứng dụng & Người dùng nền tảng (Client),  
> **I want** thiết lập kết nối WebSocket mã hóa an toàn qua giao thức `wss://` đến endpoint `/ws-makeup`,  
> **So that** toàn bộ luồng truyền tải thời gian thực được bảo mật chống nghe lén (Man-in-the-Middle) và không bị tường lửa nhà mạng 4G chặn kết nối.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Thiết lập kết nối WSS thành công với Handshake HTTP 101 Switching Protocols**
  * **Given** Ứng dụng Khách hàng hoặc Thợ khởi tạo kết nối WebSocket tới `wss://api.makeup.vn/ws-makeup` (hoặc `ws://localhost:8080/ws-makeup` trong môi trường dev).
  * **When** Client gửi HTTP Handshake Request với headers:
    ```http
    GET /ws-makeup HTTP/1.1
    Host: api.makeup.vn
    Upgrade: websocket
    Connection: Upgrade
    Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
    Sec-WebSocket-Version: 13
    ```
  * **Then** Spring Boot WebSocket Gateway chấp nhận kết nối, hoàn tất nâng cấp giao thức và phản hồi:
    ```http
    HTTP/1.1 101 Switching Protocols
    Upgrade: websocket
    Connection: Upgrade
    Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
    ```
  * **And** Kênh truyền thông nhị phân TCP được mở và chuyển sang lắng nghe các Frame giao thức STOMP.

* **Scenario 02: Từ chối các kết nối không an toàn qua WS thường trên môi trường Production**
  * **Given** Hệ thống đang chạy với profile `prod` (`server.ssl.enabled=true` hoặc đằng sau Nginx Reverse Proxy bắt buộc SSL).
  * **When** Client cố tình gửi yêu cầu kết nối không mã hóa `ws://api.makeup.vn/ws-makeup`.
  * **Then** Nginx / Spring Security từ chối kết nối, chuyển hướng hoặc trả về mã lỗi HTTP `403 Forbidden` / `301 Moved Permanently` sang `wss://`.

* **Scenario 03: Duy trì kết nối bằng cơ chế Heartbeat Ping/Pong định kỳ (Keep-Alive)**
  * **Given** Kết nối STOMP đã được thiết lập giữa Client và Gateway.
  * **When** Hai bên cấu hình chu kỳ Heartbeat `[10000, 10000]` (10 giây gửi / 10 giây nhận).
  * **Then** Cứ mỗi 10 giây, Client và Server tự động trao đổi ký tự xuống dòng `\n` (Ping/Pong frame).
  * **And** Nếu sau 20 giây (2 nhịp heartbeat) Server không nhận được bất kỳ tín hiệu nào từ Client, Server sẽ tự động đóng kết nối TCP và giải phóng tài nguyên session (`WebSocketSessionEventListener`).

---

### **US-WS-02: Authentication Middleware Xác Thực Short-Lived JWT Lúc STOMP CONNECT (`ISSUE-20.3`)**
> **As a** Chuyên viên An toàn Hệ thống (Security Architect),  
> **I want** kiểm tra tính hợp lệ của Short-lived JWT ngay trong Frame STOMP `CONNECT` thông qua `WebSocketAuthInterceptor`,  
> **So that** ngăn chặn tuyệt đối các kết nối trái phép, token giả mạo hoặc token đã bị đưa vào danh sách đen (Blacklist) truy cập vào hạ tầng realtime.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Xác thực thành công STOMP CONNECT với Bearer Token hợp lệ**
  * **Given** Client đã có kết nối TCP WebSocket vật lý.
  * **When** Client gửi STOMP Frame `CONNECT` với Header `Authorization: Bearer <valid_jwt>`:
    ```text
    CONNECT
    accept-version:1.2,1.1,1.0
    heart-beat:10000,10000
    Authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
    
    ^@
    ```
  * **Then** `WebSocketAuthInterceptor` trích xuất JWT, kiểm tra chữ ký số HMAC-SHA256, hạn sử dụng và kiểm tra Redis Blacklist (`jwt:blacklist:{token}`).
  * **And** Xác thực thành công: Gán `StompPrincipal` chứa `userId = 89`, `username = "mua_baongoc"`, `role = "ROLE_FREELANCE_MUA"` vào `StompHeaderAccessor.setUser()`.
  * **And** Server gửi lại Frame `CONNECTED`:
    ```text
    CONNECTED
    version:1.2
    heart-beat:10000,10000
    user-name:89
    
    ^@
    ```

* **Scenario 02: Từ chối và ngắt kết nối ngay lập tức khi Token hết hạn (Expired JWT)**
  * **Given** Client mang theo Short-lived JWT đã quá hạn (thời gian sống token > 15 phút).
  * **When** Client gửi Frame `CONNECT`.
  * **Then** `JwtUtils.validateToken()` ném ngoại lệ `ExpiredJwtException`.
  * **And** `WebSocketAuthInterceptor` chặn frame, gửi lại STOMP Frame `ERROR`:
    ```text
    ERROR
    message:ERR_WS_TOKEN_EXPIRED
    content-type:application/json

    {"success":false,"code":"ERR_WS_TOKEN_EXPIRED","message":"Phiên xác thực WebSocket đã hết hạn. Vui lòng cấp lại Token mới.","timestamp":"2026-09-14T10:00:00Z"}
    ^@
    ```
  * **And** Ngay lập tức đóng kết nối TCP của Client (Close Status: `1008 Policy Violation`).

* **Scenario 03: Chặn kết nối khi Token nằm trong Blacklist (Đã Logout)**
  * **Given** Người dùng đã bấm Đăng xuất trên Web/App và Token đã bị ghi nhận vào Redis key `jwt:blacklist:{token}`.
  * **When** Kẻ tấn công hoặc thiết bị cũ cố tình dùng token này gửi Frame `CONNECT`.
  * **Then** Interceptor phát hiện token nằm trong Blacklist và ném lỗi `ERR_WS_UNAUTHORIZED`.
  * **And** Trả về Frame `ERROR` và đóng kết nối.

* **Scenario 04: Chặn kết nối khi không có Header Authorization**
  * **Given** Client gửi Frame `CONNECT` nhưng khuyết thiếu hoàn toàn Header `Authorization`.
  * **Then** Interceptor từ chối, trả về lỗi `ERR_WS_MISSING_TOKEN` và hủy session.

---

### **US-WS-03: Tích Hợp Redis PubSub Adapter Đồng Bộ Kết Nối Trên Nhiều Gateway Nodes (`ISSUE-20.4`)**
> **As a** Kỹ sư Hạ tầng Phân tán (Distributed Systems Engineer),  
> **I want** tích hợp `RedisMessageListenerContainer` làm cầu nối Pub/Sub đồng bộ tin nhắn giữa các Instance `core-api`,  
> **So that** khi hệ thống mở rộng quy mô (Scale Out) lên nhiều node container, các tin nhắn Broadcast và P2P đều được chuyển tiếp chính xác đến người dùng bất kể họ đang kết nối ở node nào.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Broadcast tin nhắn xuyên node (Cross-Node Broadcast)**
  * **Given** Hệ thống gồm 2 Instance: `Node A` và `Node B` cùng kết nối chung một cụm Redis Cluster.
  * **And** Khách hàng kết nối WebSocket tới `Node A`, Thợ trang điểm kết nối WebSocket tới `Node B`.
  * **When** Khách hàng tạo đơn khẩn cấp trên `Node A`, `Node A` gọi `RedisMessagePublisher.publish("ws:broadcast:instant", payload)`.
  * **Then** Redis phân phối gói tin đến tất cả các node đăng ký kênh `ws:broadcast:instant`.
  * **And** `RedisMessageSubscriber` tại `Node B` nhận được tin nhắn và dùng `SimpMessagingTemplate` đẩy ra STOMP Topic nội bộ `/topic/booking-broadcast`.
  * **And** Thợ trang điểm tại `Node B` nhận được thông báo với độ trễ chuyển tiếp qua Redis $< 15\text{ms}$.

* **Scenario 02: Đồng bộ gửi tin nhắn riêng đích danh (User-Specific Queue Relay)**
  * **Given** Đơn vị điều phối cần gửi thông báo riêng đến `userId = 89` qua `/user/89/queue/notifications`.
  * **When** Request gửi tin được kích hoạt từ `Node A`, nhưng session của `userId = 89` lại đang kết nối tại `Node B`.
  * **Then** `Node A` publish vào Redis channel `ws:user:89`.
  * **And** `Node B` lắng nghe channel, phát hiện `userId = 89` đang thuộc quản lý session nội bộ của mình và forward vào hàng đợi đích danh của user.

---

### **US-WS-04: Kênh Broadcast Popup Đếm Ngược 30s Đồng Loạt Đến App Các Thợ Rảnh Gần Nhất (`ISSUE-20.5`)**
> **As a** Động cơ Điều phối Khẩn cấp (Dispatch Engine),  
> **I want** phát sóng gói tin `INSTANT_BOOKING_OFFER` qua Topic `/topic/booking-broadcast` tới danh sách thợ rảnh trong bán kính $R$ km với đồng hồ đếm ngược 30s,  
> **So that** các thợ nhận được chuông báo đồng loạt và đưa ra quyết định nhận ca nhanh chóng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Phát sóng thông báo nhận đơn 30s thành công**
  * **Given** Đơn khẩn cấp `booking_id = 901` vừa tạo, danh sách thợ rảnh gần nhất từ Redis GEO gồm `target_mua_ids = [89, 102, 115]`.
  * **When** `WebSocketBroadcastService.broadcastInstantOffer(offerDto)` được kích hoạt từ Spring Event `InstantBookingBroadcastEvent`.
  * **Then** Hệ thống đẩy gói tin STOMP tới `/topic/booking-broadcast`:
    ```json
    {
      "type": "INSTANT_BOOKING_OFFER",
      "booking_id": 901,
      "target_mua_ids": [89, 102, 115],
      "service_name": "Trang điểm Dự Tiệc Khẩn Cấp",
      "customer_address": "Chung cư Sunrise City, Q.7, TP.HCM",
      "distance_km": 1.85,
      "estimated_travel_minutes": 8,
      "mua_earnings_amount": 2184000.00,
      "countdown_seconds": 30,
      "timestamp": 1726308000000
    }
    ```
  * **And** Thiết bị của các thợ trong danh sách `target_mua_ids` đồng loạt kích hoạt popup đếm lùi từ 30 về 0 kèm chuông báo động.
  * **And** Các thợ không nằm trong mảng `target_mua_ids` sẽ tự động bỏ qua gói tin trên client-side.

* **Scenario 02: Bắn gói tin Dismiss hủy Popup khi đã có thợ nhận đơn thành công**
  * **Given** Thợ A (`mua_id = 89`) vừa bấm nhận đơn thành công qua Redlock.
  * **When** Hệ thống phát sinh sự kiện `InstantBookingAcceptedEvent`.
  * **Then** WebSocket Gateway phát sóng ngay lập tức gói tin Dismiss tới `/topic/booking-dismiss/901`:
    ```json
    {
      "type": "BOOKING_DISMISSED",
      "booking_id": 901,
      "winner_mua_id": 89,
      "reason": "TAKEN_BY_ANOTHER_MUA",
      "timestamp": 1726308012000
    }
    ```
  * **And** Màn hình popup đếm ngược trên máy của Thợ B và Thợ C lập tức đóng lại trong vòng $< 30\text{ms}$ kèm thông báo toast nhẹ: *"Ca làm này đã được đồng nghiệp tiếp nhận!"*.

---

### **US-WS-05: Kênh Stream Vị Trí GPS Thợ Di Chuyển Realtime Cho Khách Xem Trên Bản Đồ (`ISSUE-20.6`)**
> **As a** Khách hàng đang chờ thợ trang điểm đến nhà,  
> **I want** xem biểu tượng xe của thợ di chuyển liên tục trên bản đồ theo thời gian thực (chu kỳ 5 giây/lần),  
> **So that** tôi hoàn toàn an tâm nắm bắt được hành trình và ước tính chính xác thời gian thợ có mặt.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Thợ truyền tọa độ GPS và hệ thống phân phối tức thời tới Khách hàng**
  * **Given** Đơn hàng `booking_id = 901` đang ở trạng thái `EN_ROUTE` (Thợ đang di chuyển).
  * **And** Khách hàng đã gửi STOMP Frame: `SUBSCRIBE /topic/gps-stream/901`.
  * **When** Mobile App của Thợ gửi STOMP Frame: `SEND /app/telemetry/send` với payload:
    ```json
    {
      "booking_id": 901,
      "latitude": 10.758234,
      "longitude": 106.701456,
      "speed_kmh": 32.5,
      "heading_degrees": 145.0,
      "accuracy_meters": 4.5,
      "battery_level": 85
    }
    ```
  * **Then** `LocationStreamController` ủy quyền cho `TelemetryStreamService`:
    1. Cập nhật vị trí tức thời vào Redis GEO: `GEOADD mua:geo:active 106.701456 10.758234 "mua:89"`.
    2. Cập nhật Hash vị trí mới nhất: `HSET telemetry:latest:901 lat 10.758234 lng 106.701456 speed 32.5 heading 145.0`.
    3. Đẩy tin nhắn qua STOMP Topic: `/topic/gps-stream/901`.
  * **And** Ứng dụng Khách hàng nhận được gói tin với độ trễ $< 40\text{ms}$, biểu tượng thợ trên bản đồ mượt mà di chuyển xoay theo góc `heading = 145.0`.
  * **And** Vết tọa độ được đưa vào hàng đợi đệm (In-Memory Buffer) để Async Batch Insert vào bảng `telemetry_schema.telemetry_logs`.

* **Scenario 02: Chặn trái phép hành vi nghe lén tọa độ GPS (Subscription Authorization Guard)**
  * **Given** Khách hàng lạ (`userId = 999`) không phải là người đặt hay thợ phụ trách đơn `booking_id = 901`.
  * **When** Kẻ tấn công gửi STOMP Frame: `SUBSCRIBE /topic/gps-stream/901`.
  * **Then** `WebSocketSubscriptionInterceptor` can thiệp kiểm tra:
    * Truy vấn nhanh quyền sở hữu đơn `booking_id = 901` từ Redis Cache `booking:owner:901`.
    * Phát hiện `userId = 999` không có quyền (không phải customer, mua, hay admin).
  * **And** Server từ chối cho phép đăng ký topic, gửi lại STOMP Frame `ERROR`:
    ```text
    ERROR
    message:ERR_WS_SUBSCRIPTION_FORBIDDEN
    content-type:application/json

    {"success":false,"code":"ERR_WS_SUBSCRIPTION_FORBIDDEN","message":"Bạn không có quyền theo dõi tọa độ GPS của đơn hàng này.","timestamp":"2026-09-14T10:05:00Z"}
    ^@
    ```

* **Scenario 03: Chặn dữ liệu tọa độ ảo/GPS giả mạo (Invalid Telemetry Coordinates)**
  * **Given** Thợ gửi tọa độ có giá trị kinh độ, vĩ độ nằm ngoài lãnh thổ Việt Nam hoặc giá trị nhảy vọt phi thực tế (tốc độ > 150 km/h trên xe máy).
  * **When** DTO validation hoặc Service phát hiện vi phạm.
  * **Then** Hệ thống loại bỏ gói tin GPS đó, ghi log cảnh báo gian lận và không phát sóng tọa độ ảo tới khách.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI STOMP WEBSOCKET

Trong kiến trúc STOMP WebSocket, lỗi không trả về HTTP Status code như REST thông thường mà được đóng gói trong **STOMP ERROR Frame** theo chuẩn sau:

```text
ERROR
message:MÃ_LỖI_HỆ_THỐNG
content-type:application/json

{
  "success": false,
  "code": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Mô tả lỗi đa ngôn ngữ thân thiện",
  "errors": [],
  "timestamp": "2026-09-14T10:00:00Z"
}
^@
```

### 4.1. Bảng Ma Trận Mã Lỗi Phân Hệ WebSocket Gateway

| STOMP Error Code | Tên Lỗi Kỹ Thuật | Nguyên Nhân Kích Hoạt | Xử Lý Phía Server | Hành Động Phía Client |
| :--- | :--- | :--- | :--- | :--- |
| **`ERR_WS_UNAUTHORIZED`** | Lỗi Xác Thực Kết Nối | JWT không hợp lệ, sai chữ ký số bí mật hoặc nằm trong Redis Blacklist. | Trả về Frame ERROR và đóng kết nối TCP với Close Code `1008`. | Điều hướng về trang Đăng nhập / Refresh Token. |
| **`ERR_WS_TOKEN_EXPIRED`** | Token Hết Hạn | Short-lived JWT đã hết hạn sử dụng (> 15 phút). | Trả về Frame ERROR, ngắt kết nối. | Dùng Refresh Token gọi API `/auth/refresh` lấy token mới rồi Reconnect. |
| **`ERR_WS_MISSING_TOKEN`** | Thiếu Token | Frame `CONNECT` không gửi kèm Header `Authorization`. | Chặn kết nối ngay tại `WebSocketAuthInterceptor`. | Bổ sung Header `Authorization: Bearer <jwt>`. |
| **`ERR_WS_SUBSCRIPTION_FORBIDDEN`** | Cấm Đăng Ký Topic | User cố tình `SUBSCRIBE` vào kênh GPS / Chat của đơn hàng mà mình không tham gia. | Chặn đăng ký topic, gửi Frame ERROR cảnh báo vi phạm IDOR. | Hiển thị thông báo không có quyền truy cập. |
| **`ERR_INVALID_GPS_COORDINATES`** | Tọa Độ Không Hợp Lệ | Vĩ độ/kinh độ nằm ngoài biên giới Việt Nam hoặc số liệu null/NaN. | Bỏ qua gói tin, ghi cảnh báo log hệ thống. | Kiểm tra lại quyền truy cập Location trên thiết bị di động. |
| **`ERR_WS_RATE_LIMIT_EXCEEDED`** | Vượt Ngưỡng Gửi Tin | Client spam gửi tọa độ GPS với tần suất quá cao (> 2 lần/giây). | Tạm thời drop gói tin dư thừa qua Redis Token Bucket. | Hạ tần suất gửi tọa độ về chuẩn 5 giây/lần. |

---

### 4.2. Mã Nguồn Validation DTO Tọa Độ GPS (Bean Validation)

#### DTO Gửi Tọa Độ Thợ: `LocationStreamReq.java` (gắn tại `dto/request/telemetry/`)
```java
package com.makeup.platform.dto.request.telemetry;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationStreamReq {

    @NotNull(message = "{telemetry.booking_id.required}")
    private Long bookingId;

    @NotNull(message = "{telemetry.latitude.required}")
    @DecimalMin(value = "8.0", message = "{telemetry.latitude.out_of_bounds}")
    @DecimalMax(value = "24.0", message = "{telemetry.latitude.out_of_bounds}")
    private BigDecimal latitude;

    @NotNull(message = "{telemetry.longitude.required}")
    @DecimalMin(value = "102.0", message = "{telemetry.longitude.out_of_bounds}")
    @DecimalMax(value = "110.0", message = "{telemetry.longitude.out_of_bounds}")
    private BigDecimal longitude;

    @DecimalMin(value = "0.0", message = "{telemetry.speed.invalid}")
    @DecimalMax(value = "150.0", message = "{telemetry.speed.exceeded}")
    private Double speedKmh;

    @Min(value = 0, message = "{telemetry.heading.invalid}")
    @Max(value = 360, message = "{telemetry.heading.invalid}")
    private Double headingDegrees; // Hướng di chuyển (0-360 độ)

    @Min(value = 0, message = "{telemetry.accuracy.invalid}")
    private Double accuracyMeters; // Bán kính sai số GPS (mét)

    @Min(0) @Max(100)
    private Integer batteryLevel; // Phần trăm pin của thợ (để phát hiện pin yếu)
}
```

---

## 💻 5. ĐẶC TẢ GIAO THỨC STOMP CONTRACTS & PAYLOAD SPECIFICATIONS

### 5.1. Bảng Tổng Hợp Endpoint & Destination Prefixes

| Loại Kênh | Đường Dẫn Kênh (Destination) | Chiều Truyền | Mục Đích Sử Dụng | Phân Quyền |
| :--- | :--- | :--- | :--- | :--- |
| **WSS Handshake** | `/ws-makeup` | Client $\leftrightarrow$ Server | Điểm chạm khởi tạo kết nối WebSocket TCP. | Public (Xác thực ở bước STOMP CONNECT) |
| **App Prefix** | `/app/telemetry/send` | Client $\rightarrow$ Server | Thợ đẩy tọa độ GPS vị trí hiện tại lên hệ thống. | `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF` |
| **Broadcast Topic** | `/topic/booking-broadcast` | Server $\rightarrow$ Client | Phát sóng Offer đếm ngược 30s tìm thợ khẩn cấp. | Authenticated MUA |
| **Dismiss Topic** | `/topic/booking-dismiss/{bookingId}` | Server $\rightarrow$ Client | Lệnh đóng popup 30s khi đơn đã có thợ nhận. | Authenticated MUA |
| **Stream Topic** | `/topic/gps-stream/{bookingId}` | Server $\rightarrow$ Client | Stream tọa độ thợ di chuyển thời gian thực tới khách. | Customer sở hữu đơn & Thợ được gán |
| **User Queue** | `/user/queue/notifications` | Server $\rightarrow$ Client | Đẩy thông báo riêng đích danh cho từng tài khoản. | Owner User only |

---

### 5.2. Chi Tiết STOMP Frames & Payloads

#### 1. Frame STOMP CONNECT (Client $\rightarrow$ Server):
```text
CONNECT
accept-version:1.2,1.1,1.0
heart-beat:10000,10000
Authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

^@
```

#### 2. Frame STOMP CONNECTED (Server $\rightarrow$ Client):
```text
CONNECTED
version:1.2
heart-beat:10000,10000
user-name:89

^@
```

#### 3. Frame SUBSCRIBE Theo Dõi GPS (Khách $\rightarrow$ Server):
```text
SUBSCRIBE
id:sub-gps-901
destination:/topic/gps-stream/901

^@
```

#### 4. Payload Tin Nhắn Stream GPS (Server $\rightarrow$ Khách hàng qua `/topic/gps-stream/901`):
```json
{
  "type": "LOCATION_STREAM",
  "booking_id": 901,
  "mua_id": 89,
  "latitude": 10.758234,
  "longitude": 106.701456,
  "speed_kmh": 32.5,
  "heading_degrees": 145.0,
  "accuracy_meters": 4.5,
  "estimated_arrival_minutes": 7,
  "timestamp": 1726308060000
}
```

#### 5. Payload Tin Nhắn Broadcast Offer 30s (Server $\rightarrow$ Thợ qua `/topic/booking-broadcast`):
```json
{
  "type": "INSTANT_BOOKING_OFFER",
  "booking_id": 901,
  "target_mua_ids": [89, 102, 115],
  "service_name": "Trang điểm Dự Tiệc Khẩn Cấp",
  "customer_address": "Chung cư Sunrise City, Q.7, TP.HCM",
  "distance_km": 1.85,
  "estimated_travel_minutes": 8,
  "mua_earnings_amount": 2184000.00,
  "countdown_seconds": 30,
  "timestamp": 1726308000000
}
```

---

## ⚡ 6. SƠ ĐỒ TUẦN TỰ KHÉP KÍN (MERMAID SEQUENCE DIAGRAMS)

### 6.1. Luồng Xác Thực Kết Nối WSS & Đăng Ký Kênh STOMP
```mermaid
sequenceDiagram
    autonumber
    actor Client as Mobile / Web Client
    participant GW as Spring Boot WebSocket Gateway
    participant AUTH as WebSocketAuthInterceptor
    participant JWT as JwtUtils & Redis Blacklist
    participant SUB as WebSocketSubscriptionInterceptor

    Client->>GW: GET /ws-makeup (HTTP Upgrade: websocket)
    GW-->>Client: HTTP 101 Switching Protocols (TCP Socket Open)

    Client->>AUTH: STOMP CONNECT (Header: Authorization: Bearer <token>)
    AUTH->>JWT: validateToken(token) & checkBlacklist()
    alt Token Hợp lệ
        JWT-->>AUTH: Valid (userId=89, role=ROLE_FREELANCE_MUA)
        AUTH->>GW: Gán Custom StompPrincipal(89)
        GW-->>Client: STOMP CONNECTED (heart-beat: 10s/10s)
    else Token Hết Hạn / Blacklist
        JWT-->>AUTH: ExpiredJwtException
        AUTH-->>Client: STOMP ERROR (ERR_WS_TOKEN_EXPIRED)
        GW->>Client: Close Socket TCP (Code 1008)
    end

    Client->>SUB: STOMP SUBSCRIBE /topic/gps-stream/901
    SUB->>SUB: Kiểm tra quyền truy cập booking 901
    alt Hợp lệ (Là Khách hoặc Thợ của đơn)
        SUB-->>Client: Subscribed Successfully
    else Không Hợp lệ (IDOR vi phạm)
        SUB-->>Client: STOMP ERROR (ERR_WS_SUBSCRIPTION_FORBIDDEN)
    end
```

---

### 6.2. Luồng Đồng Bộ Đa Gateway Qua Redis PubSub & Broadcast 30s
```mermaid
sequenceDiagram
    autonumber
    actor C as Khách Hàng (Đặt đơn)
    participant N1 as Gateway Instance 1
    participant BUS as Spring EventBus
    participant REDIS as Redis PubSub Cluster
    participant N2 as Gateway Instance 2
    actor M1 as Thợ 1 (Kết nối tại Node 1)
    actor M2 as Thợ 2 (Kết nối tại Node 2)

    C->>N1: Tạo đơn khẩn cấp thành công
    N1->>BUS: publishEvent(InstantBookingBroadcastEvent)
    BUS->>REDIS: PUBLISH "ws:broadcast:instant" (payload offer 30s)
    
    par Redis Pub/Sub đồng bộ tới mọi Nodes
        REDIS-->>N1: MessageListenerAdapter nhận payload
        N1->>M1: STOMP: Popup đếm ngược 30s (/topic/booking-broadcast)
    and
        REDIS-->>N2: MessageListenerAdapter nhận payload
        N2->>M2: STOMP: Popup đếm ngược 30s (/topic/booking-broadcast)
    end
```

---

### 6.3. Luồng Gửi & Stream GPS Telemetry Realtime
```mermaid
sequenceDiagram
    autonumber
    actor M as Thợ Trang Điểm (Đang chạy xe)
    participant GW as WebSocket Gateway
    participant GEO as Redis GEO (mua:geo:active)
    participant HASH as Redis Hash (telemetry:latest:901)
    participant STOMP as STOMP Broker (/topic/gps-stream/901)
    actor C as Khách Hàng (Xem bản đồ Live)
    participant ASYNC as Async Telemetry Buffer
    participant DB as PostgreSQL (telemetry_schema.telemetry_logs)

    loop Mỗi 5 giây (GPS Stream Loop)
        M->>GW: SEND /app/telemetry/send (lat, lng, speed, heading)
        GW->>GEO: GEOADD mua:geo:active lng lat "mua:89"
        GW->>HASH: HSET telemetry:latest:901 lat lng heading
        GW->>STOMP: Broadcast tới /topic/gps-stream/901
        STOMP-->>C: MESSAGE (Vị trí mới + góc xoay xe)
        GW->>ASYNC: Đẩy vào In-Memory Buffer (Non-blocking)
    end

    Note over ASYNC,DB: Batch Insert mỗi 30s hoặc khi tích lũy đủ 100 tọa độ
    ASYNC->>DB: INSERT INTO telemetry_logs (point, booking_id, speed...)
```

---

## 🗄️ 7. THIẾT KẾ CƠ SỞ DỮ LIỆU & CẤU TRÚC REDIS KEY

### 7.1. Bảng Lưu Vết Tọa Độ: `telemetry_schema.telemetry_logs`

```sql
CREATE SCHEMA IF NOT EXISTS telemetry_schema;

CREATE TABLE telemetry_schema.telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    mua_id BIGINT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL, -- Tọa độ PostGIS WGS84
    speed_kmh NUMERIC(5, 2) DEFAULT 0.0,
    heading_degrees NUMERIC(5, 2) DEFAULT 0.0,
    accuracy_meters NUMERIC(5, 2),
    battery_level SMALLINT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetry_booking_recorded ON telemetry_schema.telemetry_logs (booking_id, recorded_at DESC);
CREATE INDEX idx_telemetry_spatial_location ON telemetry_schema.telemetry_logs USING GIST (location);
```

### 7.2. Cấu Trúc Khóa Redis Phục Vụ Realtime

| Tên Khóa (Redis Key Pattern) | Cấu Trúc Dữ Liệu | Mục Đích | TTL / Cơ Chế Hết Hạn |
| :--- | :--- | :--- | :--- |
| `mua:geo:active` | `GEO (Sorted Set)` | Lưu tọa độ GPS tức thời của tất cả thợ đang trực tuyến phục vụ quét bán kính `GEOSEARCH`. | Vĩnh viễn (Xóa phần tử khi thợ tắt app / logout) |
| `telemetry:latest:{bookingId}` | `Hash` | Lưu tọa độ GPS mới nhất của thợ theo từng đơn để khách mới mở app có ngay vị trí mà không cần chờ nhịp 5s tiếp theo. | `TTL = 2 giờ` (hoặc xóa khi đơn hoàn tất) |
| `ws:session:{sessionId}` | `String` | Ánh xạ `sessionId` với `userId` và node ID phục vụ quản lý kết nối rớt mạng. | `TTL = 10 phút` |
| `ws:ratelimit:telemetry:{userId}` | `String (Counter)` | Đếm số lượng frame gửi lên để Rate-limiting chống spam DDOS. | `TTL = 1 giây` (Max 2 requests/s) |

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG (NFRS)

1. **Độ Trễ Phân Phối Tin Nhắn (End-to-End Latency):**
   * Độ trễ từ khi Thợ gửi tọa độ GPS đến khi màn hình Khách hàng nhận được gói tin hiển thị trên bản đồ không được vượt quá **$50\text{ms}$** (trong điều kiện mạng 4G tiêu chuẩn).
   * Độ trễ chuyển tiếp tin nhắn qua Redis PubSub Adapter giữa các instance không được vượt quá **$15\text{ms}$**.
2. **Khả Năng Chịu Tải Kết Nối Đồng Thời (Concurrent Connection Capacity):**
   * Mỗi instance `core-api` tối thiểu phải chịu tải được **$10,000$ kết nối WebSocket WSS đồng thời** mà không gây tràn bộ nhớ Heap (`OutOfMemoryError`) hay làm tăng thời gian phản hồi của các REST API khác.
3. **Mức Độ Tiêu Hao Bộ Nhớ Của Kết Nối (Memory Footprint):**
   * Mức chiếm dụng RAM trung bình cho mỗi phiên kết nối WebSocket không vượt quá **$50\text{ KB}$**.
4. **Cơ Chế Khôi Phục Kết Nối Phía Client (Reconnection & Exponential Backoff):**
   * Khi mất sóng 4G hoặc chuyển đổi mạng Wi-Fi $\leftrightarrow$ 4G, Client tự động kết nối lại theo thuật toán Exponential Backoff (1s, 2s, 4s, 8s, tối đa 30s) kèm Jitter ngẫu nhiên và tự động subscribe lại các topic đang theo dõi.

---

## ⚠️ 9. ĐÁNH GIÁ CÁC ĐIỂM CHƯA TỐI ƯU & RỦI RO KIẾN TRÚC CỦA TÍNH NĂNG (CRITICAL GAP ANALYSIS & BOTTLENECK AUDIT)

> [!WARNING]
> Dưới đây là **6 điểm nghẽn kỹ thuật và hạn chế cố hữu** của thiết kế WebSocket Embedded hiện tại trong `core-api`, cùng phương án khắc phục tương ứng:

---

### 9.1. Điểm Chưa Tối Ưu 1: Nhúng STOMP Broker Vào Monolith Gây Cạnh Tranh Bộ Nhớ & Rủi Ro Deploy (Monolithic Resource Coupling)
* **Thực trạng chưa tối ưu:**
  * Việc nhúng trực tiếp Simple STOMP Broker vào trong tiến trình Spring Boot `core-api` (Embedded Monolith) khiến hàng ngàn kết nối TCP stateful (giữ luồng và socket buffers) sống chung bộ nhớ Heap với các nghiệp vụ transactional nặng như Thanh toán, Xuất hóa đơn, Chạy báo cáo tài chính.
  * Khi tiến hành Restart hoặc Deploy phiên bản mới của `core-api`, **toàn bộ 100% kết nối WebSocket của khách hàng và thợ đều bị đứt đột ngột cùng một lúc**. Khi server vừa khởi động lại, hàng ngàn thiết bị sẽ đồng loạt gửi request kết nối lại cùng một giây (**Hiện tượng Thundering Herd Problem**), có thể làm sập hoặc nghẽn mạng server mới khởi động.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Tách tầng Realtime thành một **Edge Realtime Gateway riêng biệt** (ví dụ: Service `realtime-gateway` độc lập hoặc sử dụng External Dedicated Broker như RabbitMQ Web STOMP / EMQX MQTT).
  * Phía Client phải cài đặt **Jitter (độ trễ ngẫu nhiên)** vào thuật toán Reconnect để làm phẳng đỉnh lưu lượng kết nối lại.

---

### 9.2. Điểm Chưa Tối Ưu 2: Hạn Chế Cố Hữu Của Redis PubSub ("Fire-and-Forget", Không Lưu Trữ & Nguy Cơ Mất Tin Nhắn)
* **Thực trạng chưa tối ưu:**
  * `ISSUE-20.4` sử dụng **Redis Pub/Sub** để đồng bộ giữa các instance. Tuy nhiên, kiến trúc của Redis Pub/Sub là **At-Most-Once Delivery (Bắn rồi quên - Fire-and-forget)**:
    * Redis Pub/Sub **hoàn toàn không có cơ chế Acknowledgement (ACK)**, không có Buffer lưu trữ tin nhắn cũ.
    * Nếu một instance `core-api` đang trong nhịp GC pause (Garbage Collection dừng vài trăm mili-giây) hoặc mạng nội bộ chập chờn đúng thời điểm phát tin `INSTANT_BOOKING_OFFER`, tin nhắn đó sẽ **mất vĩnh viễn** trên node đó mà không có cách nào phát lại (Replay).
    * Khách hàng vừa kết nối lại sau 2 giây rớt sóng hầm chung cư sẽ bị lỡ mất thông báo quan trọng mà không có cơ chế kéo lại (No Message History).
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Chuyển đổi cơ chế đồng bộ đa node từ Redis Pub/Sub sang **Redis Streams** (`XADD`, `XREADGROUP`) hoặc **RabbitMQ / Kafka**.
  * Redis Streams có Consumer Groups, hỗ trợ ACK và lưu trữ lịch sử tin nhắn trong khoảng thời gian TTL nhất định, cho phép Client kéo lại các tin nhắn bị nhỡ khi vừa reconnect.

---

### 9.3. Điểm Chưa Tối Ưu 3: Bão Ghi Dữ Liệu Tọa Độ GPS Vào PostgreSQL (Database Write Amplification)
* **Thực trạng chưa tối ưu:**
  * Trong giờ cao điểm, nếu có $500$ thợ trang điểm đang di chuyển trên đường, mỗi thợ gửi tọa độ đều đặn mỗi $5\text{ giây}$:
    $$\text{Tải ghi CSDL} = \frac{500 \text{ thợ}}{5\text{ giây}} = 100 \text{ write requests/giây vào bảng } \text{telemetry\_logs}.$$
  * Sau 1 tháng, bảng `telemetry_logs` sẽ tích lũy hàng chục triệu bản ghi không gian PostGIS, gây phình dung lượng ổ cứng cực nhanh, phân mảnh chỉ mục GiST và làm giảm hiệu năng I/O của toàn bộ cơ sở dữ liệu `makeup_platform_db`.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * **TUYỆT ĐỐI KHÔNG ghi từng tọa độ tức thì vào PostgreSQL**.
  * Tọa độ GPS chỉ ghi vào **Redis GEO** và **Redis Hash** để phục vụ Realtime Streaming.
  * Chỉ thực hiện lưu vết vào PostgreSQL theo 2 cơ chế lọc thông minh:
    1. **Dead Reckoning / Distance Threshold Filter**: Chỉ lưu vào DB khi thợ đã di chuyển cách điểm lưu trước đó tối thiểu $> 50\text{ mét}$ hoặc sau mỗi $30\text{ giây}$.
    2. **Async Batch Insert (Gom cụm ghi theo lô)**: Dùng Spring Task Scheduler hoặc Redis List gom 100 tọa độ lại rồi thực hiện 1 câu lệnh `INSERT INTO telemetry_logs VALUES (...), (...);` duy nhất.

---

### 9.4. Điểm Chưa Tối Ưu 4: Nghịch Lý Hết Hạn Token Trên Kết Nối Kéo Dài (Long-Lived Connection Token Expiration)
* **Thực trạng chưa tối ưu:**
  * `ISSUE-20.3` quy định xác thực bằng **Short-lived JWT** (thời hạn 15–30 phút) tại thời điểm gửi Frame STOMP `CONNECT`.
  * Tuy nhiên, kết nối WebSocket là dạng kết nối duy trì liên tục kéo dài hàng giờ (Persistent Long-Lived TCP Connection). Thợ trang điểm có thể mở app từ 7h sáng đến 12h trưa (5 tiếng liên tục).
  * Sau 15 phút đầu tiên, JWT thực chất **đã hết hạn**, nhưng phiên WebSocket vẫn mở và thợ vẫn tiếp tục gửi tọa độ, nhận đơn hàng nhạy cảm bình thường. Nếu tài khoản của thợ bị Admin khóa hoặc bị đổi mật khẩu giữa chừng, thợ vẫn thao tác được qua WebSocket đang mở sẵn.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Thiết lập cơ chế **Heartbeat Re-authentication** hoặc **Periodic Token Renewal Frame**:
    * Client phải định kỳ gửi frame làm mới xác thực: `SEND /app/auth/refresh` kèm Access Token mới mỗi 10 phút.
    * Server duy trì một bộ hẹn giờ theo dõi hạn token của từng Session; nếu quá hạn mà Client không cung cấp token mới, Server sẽ chủ động ngắt kết nối WebSocket với mã lỗi `ERR_WS_TOKEN_EXPIRED`.

---

### 9.5. Điểm Chưa Tối Ưu 5: Rủi Ro Lỗ Hổng Bảo Mật Bị Nghe Lén Tọa Độ (STOMP Subscription IDOR Vulnerability)
* **Thực trạng chưa tối ưu:**
  * Theo chuẩn Simple Broker mặc định của Spring STOMP, bất kỳ client nào sau khi vượt qua bước `CONNECT` thành công đều có thể tự do gửi frame `SUBSCRIBE /topic/gps-stream/{bookingId}` đến bất kỳ đơn hàng nào nếu biết được `bookingId`.
  * Nếu không lập trình một tầng **Subscription Interceptor** chặt chẽ để chặn và truy vấn quyền sở hữu, kẻ xấu có thể quét vòng lặp từ `bookingId = 1` đến `10000` để theo dõi lén vị trí nhà riêng của khách hàng và hành trình của thợ (Vi phạm nghiêm trọng quyền riêng tư khách hàng).
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Bắt buộc triển khai `ChannelInterceptor` chặn sự kiện `StompCommand.SUBSCRIBE`.
  * Trích xuất `destination` và `Principal`. Kiểm tra quyền trong Redis Cache: Chỉ cho phép người có `userId` trùng với `customer_id` hoặc `assigned_mua_id` của đơn hàng đó mới được phép Subscribe thành công. Nếu không, lập tức ném lỗi và từ chối đăng ký kênh.

---

### 9.6. Điểm Chưa Tối Ưu 6: Hao Tốn Pin & Băng Thông 4G Do Tần Suất Gửi Cố Định (Battery Drain & Bandwidth Inefficiency)
* **Thực trạng chưa tối ưu:**
  * Thợ trang điểm gửi gói tin GPS cố định mỗi 5 giây bất kể hoàn cảnh:
    * Khi thợ đang dừng chờ đèn đỏ 90 giây hoặc bị kẹt xe đứng yên một chỗ, app vẫn liên tục kích hoạt chip GPS và bắn gói tin lặp lại tọa độ cũ.
    * Việc bật GPS độ chính xác cao liên tục và truyền tải qua 4G sẽ khiến điện thoại của thợ bị nóng ran và cạn kiệt pin chỉ sau 2–3 tiếng làm việc ngoài trời.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * **Adaptive GPS Sampling (Thu thập tọa độ thích ứng thông minh):**
    * Khi cảm biến gia tốc phát hiện thợ đang đứng yên (Vận tốc $< 3\text{ km/h}$), tự động giãn chu kỳ gửi GPS lên $15\text{–}30\text{ giây/lần}$.
    * Khi thợ di chuyển với tốc độ $> 20\text{ km/h}$, duy trì nhịp $5\text{ giây/lần}$.
  * **Tối ưu hóa Payload:** Rút gọn key JSON hoặc áp dụng Protobuf / nhị phân nếu cần tiết kiệm tối đa dung lượng data 4G cho thợ.
