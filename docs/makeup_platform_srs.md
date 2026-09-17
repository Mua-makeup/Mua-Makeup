# TÀI LIỆU YÊU CẦU PHẦN MỀM (SRS)
## NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)

---

## I. GIỚI THIỆU (INTRODUCTION)

### 1. Mục đích (Purpose)
Mục đích của dự án Nền tảng Đặt lịch Make-up (Makeup Booking Platform) là:
* **Tin học hóa & Tự động hóa** quy trình đặt lịch trang điểm tận nơi hoặc tại Studio giữa Khách hàng, Thợ Make-up tự do (Freelance MUA) và các Đại lý/Studio Make-up.
* **Tối ưu hóa khả năng điều phối**: Hỗ trợ các Đại lý Make-up quản lý đội ngũ thợ, nhận đơn và điều phối lịch ca làm việc minh bạch.
* **Linh hoạt luồng đặt lịch theo thời gian**:
  * **Luồng Đặt Ngay Realtime (Instant Booking):** Đáp ứng nhu cầu cần thợ trang điểm gấp trong vòng 30-60 phút.
  * **Luồng Đặt Lịch Hẹn Trước (Scheduled Booking):** Cho phép đặt lịch cho các sự kiện tương lai (đám cưới, kỷ yếu, sự kiện).
* **Hệ thống Thông báo Trực tiếp trên App (In-App Realtime Notifications via In-Memory EventBus):** Đẩy thông báo tức thì (<100ms) trực tiếp trên giao diện Ứng dụng qua kết nối Embedded WebSocket & Spring In-Memory EventBus (`ApplicationEventPublisher`), hoàn toàn loại bỏ sự phụ thuộc vào Email.
* **Đầy đủ Đặc tả Backend Monolith & Frontend Phân hệ Độc lập:** Cung cấp chi tiết kiến trúc Backend Layered Architecture Monolith (`core-api`), Mô hình Phân quyền RBAC 4 Bảng, Phân vùng Ví 7 Bảng Sổ cái Kế toán Đúp, Database PostgreSQL + PostGIS 28 Bảng cốt lõi chia thành 8 Schemas độc lập; đồng thời quy định chuẩn hóa cấu trúc Frontend:
  * **Cổng thông tin Web Quản trị (Web Portal):** Phát triển trên nền tảng **ReactJS + JavaScript (JSX)** phục vụ Quản trị viên Sàn (`ROLE_SUPER_ADMIN`) và Ban điều hành/Nhân viên Đại lý Studio (`ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`).
  * **Ứng dụng Di động Đa nền tảng (Mobile App):** Phát triển trên nền tảng **React Native + TypeScript (TSX)** phục vụ Khách hàng đặt dịch vụ (`ROLE_CUSTOMER`) và Thợ Make-up nhận ca (`ROLE_FREELANCE_MUA`).

### 2. Phạm vi hệ thống (System Scope)
* **Trong phạm vi (In-Scope):**
  * **Cổng Thông tin Web Quản trị Sàn (Super Admin Web Portal - ReactJS + JavaScript):** Dashboard KPI toàn sàn, Phê duyệt chứng chỉ thợ (`/api/v1/admin/muas/{id}/certificates/verify`), Thẩm định đại lý mới, Quản trị danh mục gốc (Master Categories / Styles), Điều chỉnh Surge Pricing, Trung tâm giải quyết khiếu nại (Dispute Resolution & Escrow Refund), Quản lý Ví đối soát Sàn & Phê duyệt Payout.
  * **Cổng Thông tin Web Quản lý Studio (Agency Admin Web Portal - ReactJS + JavaScript):** Dashboard doanh thu Studio, Quản lý hồ sơ nhân sự thợ (`agency_staff`), Ma trận xếp ca làm việc tuần (`agency_staff_shifts`), Bảng điều phối Job (Dispatching Board: Gán Thợ chính/Thợ phụ/Đổi thợ khẩn cấp), Quản trị bảng giá & phụ phí studio, Quản lý Quy chế Quá giờ & Duyệt giải trình ca làm vượt thời gian (`agency_overtime_rules`, `agency_staff_overtime_reports`), Ví Studio & Yêu cầu rút tiền.
  * **Ứng dụng Di động Khách hàng (Customer Mobile App - React Native + TypeScript):** Radar GPS quét thợ xung quanh theo bán kính PostGIS/Redis GEO, Đặt lịch 2 luồng (Realtime khẩn cấp 30-60 phút & Scheduled hẹn trước), Live Tracking vị trí thợ di chuyển trên bản đồ qua WebSocket STOMP, Cổng thanh toán giữ cọc Escrow (MoMo, VNPay, VietQR, ZaloPay), Nghiệm thu ca làm, Đánh giá 1-5★, Tip tiền thợ.
  * **Ứng dụng Di động Thợ Make-up (MUA Mobile App - React Native + TypeScript):** Nút công tắc chuyển đổi trạng thái Sẵn sàng/Bận, Dịch vụ chạy ngầm phát sóng tọa độ GPS Telemetry (5-10s), Popup đếm ngược 30s-45s nhận đơn khẩn cấp có âm thanh cảnh báo, Quy trình 5 chặng thực hiện ca làm việc (Bắt đầu đi $\rightarrow$ Đến nơi $\rightarrow$ Bắt đầu làm $\rightarrow$ Chụp ảnh nghiệm thu $\rightarrow$ Hoàn thành), Nộp giải trình quá giờ kèm ảnh đối chứng khi vượt thời lượng dự kiến, Lịch bận cá nhân (`mua_calendars`), Xem ca trực Studio (`agency_staff_shifts`), Quản lý Portfolio Album mẫu, Ví thợ & Yêu cầu Payout về ngân hàng cá nhân.
  * **Hệ thống Backend Monolith:** Đóng gói đơn lẻ trong 1 ứng dụng Spring Boot (`core-api`: 8080) gồm 11 Domain Modules, **Embedded WebSocket Gateway** (`/ws-makeup`) và Event-Driven Architecture nội bộ qua Spring `ApplicationEventPublisher`.
* **Ngoài phạm vi (Out-of-Scope):**
  * Tích hợp máy POS quẹt thẻ phần cứng tại cửa hàng vật lý.
  * Gửi Email thông báo truyền thống (thay thế 100% bằng In-App Realtime Notifications qua Embedded WebSocket & In-Memory EventBus).

### 3. Mục tiêu hệ thống (System Objective)
* **Tập trung hóa dữ liệu & Kết nối:** Lưu trữ toàn bộ thông tin tài khoản, lịch hẹn, hồ sơ tay nghề, lịch sử giao dịch trong một hệ thống CSDL duy nhất (`makeup_platform_db`) phân tách 8 Schemas.
* **Thời gian thực (Realtime Efficiency):** Cập nhật vị trí di chuyển của thợ (GPS Telemetry) và Broadcast thông báo In-App qua Embedded WebSocket Gateway (<100ms).
* **Minh bạch tài chính:** Đảm bảo công bằng trong việc phân chia doanh thu giữa Sàn - Đại lý - Thợ qua mô hình Ví 7 Bảng Sổ cái Kế toán Đúp (Double-Entry Ledger).

### 4. Chữ viết tắt & Thuật ngữ (Abbreviations & Acronyms)

| Từ viết tắt | Giải thích ý nghĩa chi tiết |
| :--- | :--- |
| **SRS** | Software Requirements Specification (Tài liệu đặc tả yêu cầu phần mềm) |
| **MUA** | Makeup Artist (Thợ trang điểm chuyên nghiệp) |
| **MBS / HMS** | Makeup Booking System (Hệ thống quản lý & đặt lịch trang điểm) |
| **EDA** | Event-Driven Architecture (Kiến trúc hướng sự kiện bất đồng bộ) |
| **WSS** | WebSocket Secure (Giao thức kết nối màng lưới thời gian thực có mã hóa SSL/TLS) |
| **GPS** | Global Positioning System (Hệ thống định vị toàn cầu phát sóng tọa độ) |
| **RBAC** | Role-Based Access Control (Cơ chế phân quyền người dùng dựa trên vai trò) |
| **API** | Application Programming Interface (Giao diện lập trình ứng dụng giao tiếp dịch vụ) |
| **CDN** | Content Delivery Network (Mạng lưới phân phối nội dung nén ảnh/video tốc độ cao) |
| **JWT** | JSON Web Token (Mã định danh xác thực & phân quyền an toàn) |
| **FCM** | Firebase Cloud Messaging (Dịch vụ thông báo đẩy Push Notification của Google) |
| **TTL** | Time To Live (Thời gian tồn tại tối đa của dữ liệu trong RAM/Redis Cache) |
| **ACID** | Atomicity, Consistency, Isolation, Durability (Các tính chất đảm bảo an toàn giao dịch DB) |
| **WBS** | Work Breakdown Structure (Bảng phân rã cấu trúc công việc chi tiết) |
| **Escrow** | Cơ chế tài khoản trung gian giữ tiền cọc an toàn cho đến khi đơn hàng hoàn tất |

---

## II. MÔ TẢ TỔNG QUAN HỆ THỐNG & KIẾN TRÚC

### 1. Kiến trúc Layered Monolith Chi tiết (Layered Architecture Monolith)

Hệ thống Backend được thiết kế theo mô hình **Layered Architecture Monolith (Kiến trúc Monolith Phân tầng Chuẩn mực)**. Toàn bộ hệ thống đóng gói và triển khai trong **1 ứng dụng Spring Boot đơn lẻ (`core-api`, Port: 8080)**, phân tách theo các tầng Controller - Service - Repository - Entity kết hợp **Spring In-Memory EventBus (`ApplicationEventPublisher`)** (<5ms latency) và **Embedded WebSocket STOMP Gateway** phục vụ kết nối WSS thời gian thực.

```
+---------------------------------------------------------------------------------------------------+
|                              MAKEUP PLATFORM MONOLITH (core-api: 8080)                            |
|                                                                                                   |
|  [PRESENTATION LAYER: REST Controllers & Embedded STOMP WebSocket Gateway (/ws-makeup)]          |
|  +-------------------+  +-------------------+  +-------------------+  +------------------------+  |
|  | AuthController    |  | AgencyController  |  | CatalogController |  | BookingController      |  |
|  | TelemetryCtrler   |  | PricingController |  | WalletController  |  | ReviewController       |  |
|  +---------+---------+  +---------+---------+  +---------+---------+  +-----------+------------+  |
|            |                      |                      |                        |               |
|  +---------v----------------------v----------------------v------------------------v------------+  |
|  | [BUSINESS LOGIC LAYER: Spring Services & In-Memory EventBus (ApplicationEventPublisher)]     |  |
|  | AuthService, AgencyService, MuaService, CatalogService, BookingService, TelemetryService,     |  |
|  | PricingService, WalletService (Double-Entry Ledger), NotificationService, ReviewService     |  |
|  +---------+----------------------------------------------------------------------+------------+  |
|            |                                                                      |               |
|  +---------v----------------------------------------------------------------------v------------+  |
|  | [DATA ACCESS LAYER: Spring Data JPA Repositories & Hibernate Entities mapped to 8 Schemas]    |  |
|  | UserRepository, AgencyRepository, PackageRepository, BookingRepository, WalletRepository...  |  |
|  +----------------------------------------------------+----------------------------------------+  |
+-------------------------------------------------------|-------------------------------------------+
                                                        |
                           +----------------------------+----------------------------+
                           |                                                         |
              +------------v-----------+                                +------------v-----------+
              |  PostgreSQL 16 + GIS   |                                |    Redis 7.2 Cache     |
              |  (makeup_platform_db)  |                                |   (GEO, Redlock, TTL)  |
              |  - 8 Business Schemas  |                                +------------------------+
              +------------------------+
```

#### **Cấu trúc Thư mục Mã nguồn Phân tầng (Layered Folder Structure):**
```text
code/backend/core-api/
├── src/main/java/com/makeup/platform/
│   ├── Application.java                   # Class bootstrap Spring Boot 3.3.x Monolith
│   │
│   ├── common/                            # Tiện ích và core classes dùng chung
│   │   ├── base/                          # BaseEntity (@MappedSuperclass), BaseController, ApiResponse, BaseService, BaseServiceImpl
│   │   ├── constants/                     # ErrorCodes, SecurityConstants, RegexConstants
│   │   ├── exception/                     # GlobalExceptionHandler (@RestControllerAdvice), CustomBusinessException
│   │   └── utils/                         # JwtUtils, CookieUtils, GeoSpatialUtils, DateUtils
│   │
│   ├── config/                            # Cấu hình Framework (Security, OpenAPI, Database, Redis, Redisson, WebSocket)
│   ├── controller/                        # TẦNG GIAO TIẾP HTTP (auth/, agency/, catalog/, booking/, telemetry/, pricing/, wallet/, review/)
│   ├── dto/                               # DATA TRANSFER OBJECT (request/ với @Valid, response/)
│   ├── entity/                            # TẦNG MAP DATABASE (JPA Entity kế thừa BaseEntity, ánh xạ vào 8 PostgreSQL Schemas)
│   ├── repository/                        # TẦNG TRUY VẤN DỮ LIỆU (Spring Data JPA & Custom Native Spatial Queries)
│   ├── security/                          # TẦNG BẢO MẬT (JwtFilter, UserDetails, SecurityConfig)
│   └── service/                           # TẦNG NGHIỆP VỤ LÕI
│       ├── impl/                          # Triển khai code nghiệp vụ thực tế
│       └── <Domain>Service.java           # Interfaces định nghĩa hợp đồng nghiệp vụ
│
├── src/main/resources/
│   ├── application.yaml                   # Cấu hình port 8080, datasource (8 schemas), redis
│   └── db/migration/                      # Scripts Flyway DDL cho CSDL duy nhất makeup_platform_db
```

Danh sách Phân hệ Nghiệp vụ trong Monolith Core (`core-api`):
1. **Auth & Profile Module** (`controller.auth`, `service.AuthService`, `entity.auth.*`, `repository.auth.*`, `auth_schema`): Đăng ký, Đăng nhập, JWT 1 ngày, Refresh Token Cookie HttpOnly, Phân quyền RBAC 4 Bảng.
2. **Agency Operations Module** (`controller.agency`, `service.AgencyService`, `entity.agency.*`, `repository.agency.*`, `agency_schema`): Quản lý Studio, mời/duyệt thợ, gán kỹ năng phong cách (`agency_staff_styles`), điều phối ca làm.
3. **MUA Freelancer Module** (`controller.mua`, `service.MuaService`, `entity.mua.*`, `repository.mua.*`, `mua_schema`): Hồ sơ cá nhân thợ tự do, portfolio chứng chỉ bằng cấp, lịch làm việc.
4. **Catalog & Media Module** (`controller.catalog`, `service.CatalogService`, `entity.catalog.*`, `repository.catalog.*`, `catalog_schema`): Gói dịch vụ Studio vs Freelancer, Album Portfolio ảnh hoàn thiện, bảng phụ phí.
5. **Booking & Dispatching Module** (`controller.booking`, `service.BookingService`, `entity.booking.*`, `repository.booking.*`, `booking_schema`): Máy trạng thái đơn (State Machine), 2 luồng đặt lịch, chống race-condition bằng Redlock.
6. **Location & Telemetry Module** (`controller.telemetry`, `service.TelemetryService`, `entity.telemetry.*`, `repository.telemetry.*`, `telemetry_schema`): Stream GPS thợ (5-10s) lưu Redis GEO & PostGIS Spatial Index.
7. **Dynamic Pricing Module** (`controller.pricing`, `service.PricingService`, `entity.pricing.*`, `repository.pricing.*`, `catalog_schema`): Phí km di chuyển, phụ phí giờ sớm/đêm, Surge Pricing & Preview Hóa đơn.
8. **Wallet & Escrow Module** (`controller.wallet`, `service.WalletService`, `entity.wallet.*`, `repository.wallet.*`, `wallet_schema`): Ví 7 Bảng Sổ cái Kế toán Đúp, Escrow cọc, Payout giải ngân Ngân hàng.
9. **In-App Notification Module** (`service.NotificationService`, `entity.interaction.NotificationEntity`, `interaction_schema`): Bắt sự kiện In-Memory đẩy Toast Popup Realtime qua STOMP WebSocket <5ms.
10. **Embedded WebSocket Gateway Module** (`config.WebSocketConfig`, STOMP broker `/ws-makeup`): Kênh kết nối 2 chiều WSS trực tiếp trong monolith `core-api`.
11. **Review, Tip & Dispute Module** (`controller.review`, `service.ReviewService`, `entity.interaction.*`, `repository.interaction.*`, `interaction_schema`): Đánh giá sao, Tip tiền trực tiếp cho Thợ & Đơn khiếu nại.

---

### 2. Danh mục Công nghệ Sử dụng (Technology Stack)

Hệ thống được xây dựng trên nền tảng công nghệ hiện đại, đảm bảo tính sẵn sàng cao, chịu tải lớn và độ trễ thấp (<5ms):

| Phân hệ / Tầng | Thành phần Kỹ thuật | Công nghệ & Thư viện sử dụng | Lý do Lựa chọn & Vai trò Kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Backend Core** | Ngôn ngữ & Runtime | **Java 21 LTS** | Hỗ trợ Virtual Threads (Project Loom) xử lý hàng chục nghìn kết nối đồng thời với mức tiêu hao RAM tối thiểu. |
| | Framework Chính | **Spring Boot 3.3.x** | Chuẩn công nghiệp mạnh mẽ, tích hợp Spring Web, Spring Security, Spring Data JPA, Spring Validation. |
| | Kiến trúc Ứng dụng | **Layered Architecture Monolith** | Đóng gói đơn lẻ (Single Deployment), cấu trúc phân tầng Controller - Service - Repository - Entity chuẩn mực, hiệu năng cao, dễ bảo trì và mở rộng. |
| | In-Memory EventBus | **Spring ApplicationEvents** | Truyền phát sự kiện nội bộ bất đồng bộ (`@Async`) giữa các Domain Modules với độ trễ siêu thấp (<5ms), không tốn chi phí mạng. |
| | Distributed Lock | **Redisson (Redis Lock)** | Cơ chế Redlock chống tranh chấp nhận đơn ca khẩn cấp (Race condition) giữa nhiều thợ cùng lúc. |
| **Cơ sở Dữ liệu & Lưu trữ** | Hệ quản trị CSDL Quan hệ | **PostgreSQL 16** | Cơ sở dữ liệu chính tuân thủ chuẩn ACID, tối ưu hóa JSONB, Partitioning và độ tin cậy giao dịch tài chính cực cao. |
| | Không gian Địa lý (GIS) | **PostGIS 3.4 Extension** | Xử lý tọa độ địa lý, chỉ mục không gian `GIST(location_point)`, tính khoảng cách cầu phẳng `ST_DistanceSphere` và quét bán kính `ST_DWithin`. |
| | In-Memory Cache & GEO | **Redis 7.2** | Cấu trúc dữ liệu `GEOADD` / `GEORADIUS` quét thợ rảnh thời gian thực theo tọa độ GPS, lưu Session và Cache dữ liệu truy vấn cao. |
| | Migration Công cụ | **Flyway 10.x** | Tự động hóa quản lý và đồng bộ phiên bản cấu trúc Database DDL giữa các môi trường phát triển và Production. |
| **Frontend Clients** | Mobile App (`ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`) | **React Native (0.74+) & TypeScript (TSX)** | Đa nền tảng (iOS & Android) từ một codebase duy nhất, Static Typing TypeScript an toàn, React Navigation v6, tích hợp Native Modules phát sóng GPS ngầm (Background Task) và kết nối STOMP WSS. |
| | Web Portal (`ROLE_SUPER_ADMIN`, `ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`) | **React 18 & JavaScript (JSX) + Vite** | Tốc độ bundle siêu nhanh với Vite, SPA gọn nhẹ, tối ưu hóa giao diện quản trị dữ liệu mật độ cao (Data-Dense Dashboard, Ma trận xếp ca, Bảng điều phối Dispatching thợ). |
| | UI & Styling Framework | **Tailwind CSS & Shadcn UI (Web) / NativeWind (Mobile)** | Thiết kế hệ thống Design Token đồng nhất (Luxury Beauty Palette: Vàng Champagne, Hồng Rose Gold, Đen Obsidian), chuẩn Responsive mượt mà. |
| | Bản đồ & Định vị SDK | **React Native Maps / Google Maps & Goong Maps API** | Tìm kiếm địa điểm (Autocomplete Places), Geocoding, tính toán ma trận khoảng cách km và render Live Tracking thợ di chuyển. |
| **Giao tiếp Realtime** | WebSocket Protocol | **Spring WebSocket & STOMP (WSS)** | Kênh kết nối 2 chiều mã hóa TLS/SSL phục vụ Broadcast Popup đếm ngược nhận ca và Live Tracking GPS thợ di chuyển. |
| | WebSocket Scale Adapter | **Redis Pub/Sub** | Cho phép đồng bộ màng lưới kết nối WebSocket khi scale ngang Monolith Core qua nhiều máy chủ. |
| **Hạ tầng & Dịch vụ Bên ngoài** | Containerization | **Docker & Docker Compose** | Đóng gói môi trường đồng nhất giữa Local, Staging và Production (PostgreSQL, PostGIS, Redis). |
| | Lưu trữ Đa phương tiện | **Cloudinary / AWS S3** | Lưu trữ nén ảnh Portfolio sản phẩm hoàn thiện, ảnh chứng chỉ bằng cấp thợ trang điểm với CDN tốc độ cao. |
| | Thông báo Đẩy (Push Notif) | **Firebase Cloud Messaging (FCM)** | Đẩy thông báo Push Notification khi ứng dụng Mobile đang chạy ngầm hoặc tắt màn hình. |
| | Cổng Thanh toán & Payout | **MoMo, VNPay, ZaloPay, VietQR (PayOS)** | Tích hợp đa kênh thanh toán nạp ví, giữ cọc Escrow và Payout giải ngân trực tiếp về Ngân hàng thợ. |
| | Xác thực OTP Điện thoại | **Firebase Phone Auth / Twilio SMS** | Gửi mã OTP xác minh số điện thoại đăng ký/đăng nhập trong vòng 5 giây với tỷ lệ thành công 99.9%. |

---

### 3. Biểu đồ Luồng công việc (Workflow Diagram)

#### Luồng 1: Quy trình Đặt ca Khẩn cấp Realtime (Instant Booking Workflow)
1. **Bước 1:** Khách hàng chọn gói dịch vụ & nhập địa điểm $\rightarrow$ Gọi Pricing Module (PricingService) tính tổng tiền (Giá gói + Phí km + Phụ phí).
2. **Bước 2:** Telemetry/Location Module (TelemetryService) quét danh sách Thợ/Đại lý rảnh trong bán kính $R$ km dựa trên vị trí Redis GEO.
3. **Bước 3:** Booking Engine phát sự kiện `INSTANT_BOOKING_CREATED` vào In-Memory EventBus.
4. **Bước 4:** In-App Notification Module tiêu thụ sự kiện $\rightarrow$ Gọi Embedded WebSocket Gateway bật Popup đếm ngược (Countdown 30-45s) đồng loạt trên App các Thợ rảnh.
5. **Bước 5:** Thợ nhấn "Chấp nhận" $\rightarrow$ Booking Engine xử lý Redlock (Redis Distributed Lock) đảm bảo duy nhất 1 thợ trúng đơn $\rightarrow$ Chuyển trạng thái đơn `ACCEPTED`.
6. **Bước 6:** Thợ bật phát sóng GPS di chuyển $\rightarrow$ Cập nhật trạng thái chặng ca làm (Đã đến $\rightarrow$ Bắt đầu make $\rightarrow$ Chụp ảnh nghiệm thu $\rightarrow$ Hoàn thành).
7. **Bước 7:** Wallet Module (WalletService) tự động giải ngân tiền từ Ví Escrow sang Ví Thợ sau khi trừ % hoa hồng Sàn.

#### Luồng 2: Quy trình Đặt qua Đại lý & Điều phối Job (Agency Booking & Dispatching Workflow)
1. **Bước 1:** Khách hàng chọn Studio/Đại lý $\rightarrow$ Tạo đơn ở trạng thái `PENDING_AGENCY_DISPATCH`.
2. **Bước 2:** WebSocket Gateway đẩy thông báo Toast Popup Realtime về Web Portal của Đại lý.
3. **Bước 3:** Chủ Đại lý / Lễ tân xem Ma trận Lịch rảnh, Vị trí thợ & Năng lực Tone Make-up (`agency_staff_styles` & `mua_styles`) trên Dashboard.
4. **Bước 4:** Đại lý thực hiện Dispatching: Gán 1 Thợ chính (+ 1 Thợ phụ) phụ trách ca làm $\rightarrow$ Chuyển trạng thái `AGENCY_ASSIGNED`.
5. **Bước 5:** Thợ nhận thông báo phân công ca trên App $\rightarrow$ Nhấn xác nhận $\rightarrow$ Tiến hành đi làm theo lịch hẹn.

---

### 4. Biểu đồ Chuyển đổi trạng thái (State Transition Diagram)

Bảng quy tắc chuyển đổi trạng thái Máy trạng thái Đơn hàng (Booking State Machine):

| Trạng thái Cũ (From State) | Hành động / Sự kiện Kích hoạt (Trigger Event) | Trạng thái Mới (To State) | Hành động Hệ thống Thực thi (System Actions) |
| :--- | :--- | :--- | :--- |
| **None** | Khách tạo đơn Realtime khẩn cấp | `REQUESTED` | Quét thợ Redis GEO + Broadcast WebSocket Popup đếm ngược 45s. |
| **None** | Khách tạo đơn chọn Đại lý | `PENDING_AGENCY_DISPATCH` | Đẩy In-App Notification Toast về Web Portal Đại lý. |
| **REQUESTED** | Thợ bấm "Chấp nhận" (Redlock) | `ACCEPTED` | Hủy Popup ở thợ khác, khóa đơn cho thợ nhận, Escrow giữ cọc. |
| **REQUESTED** | Hết 45s không ai nhận | `CANCELLED` | Gửi thông báo cho Khách: Không tìm thấy thợ phù hợp. |
| **PENDING_AGENCY_DISPATCH** | Đại lý gán thợ cho đơn | `AGENCY_ASSIGNED` | Gửi In-App Notification phân công ca đến App Thợ được gán. |
| **AGENCY_ASSIGNED** | Thợ bấm xác nhận ca | `ACCEPTED` | Khóa khung giờ đó trên Calendar làm việc của Thợ. |
| **ACCEPTED** | Thợ bấm "Bắt đầu đi" | `ON_THE_WAY` | Kích hoạt Background GPS Telemetry stream (mỗi 5-10s). |
| **ON_THE_WAY** | Thợ bấm "Đã đến nơi" | `ARRIVED` | Bắn In-App Notification cho Khách: Thợ đã có mặt tại điểm hẹn. |
| **ARRIVED** | Thợ bấm "Bắt đầu make-up" | `IN_PROGRESS` | Cập nhật đồng hồ đếm ngược thời gian trang điểm dự kiến. |
| **IN_PROGRESS** | Thợ upload ảnh nghiệm thu & bấm "Hoàn thành" | `COMPLETED` | Phát Event `BOOKING_COMPLETED` qua Spring `ApplicationEventPublisher` (In-Memory EventBus). |
| **COMPLETED** | Wallet Module nhận Event từ EventBus | `PAID_OUT` | Cắt % hoa hồng Sàn, chuyển tiền còn lại về Ví Thợ / Ví Đại lý. |
| **Bất kỳ (REQUESTED / ACCEPTED)** | Khách / Thợ hủy đơn | `CANCELLED` | Tính phí hoàn hủy theo chính sách, hoàn trả tiền ví khách nếu hợp lệ. |
| **COMPLETED** | Khách gửi khiếu nại | `DISPUTED` | Tạm đóng băng tiền ví đơn hàng, đẩy ticket về Bộ phận CSKH. |

---

## III. ĐẶC TẢ CHI TIẾT GIAO DIỆN & MÀN HÌNH FRONTEND (CLIENT UI/UX SPECIFICATION)

### 1. Kiến trúc Tổng thể & Phân tách Nền tảng Frontend

Để đáp ứng tối đa tính chuyên dụng của từng nhóm đối tượng sử dụng, hệ thống giao diện Frontend được tách biệt thành 2 nền tảng công nghệ riêng biệt:

```
                                +-------------------------------------------------------+
                                |             HỆ THỐNG GIAO DIỆN FRONTEND               |
                                +---------------------------+---------------------------+
                                                            |
                            +-------------------------------+-------------------------------+
                            |                                                               |
            +---------------v---------------+                               +---------------v---------------+
            |     CỔNG THÔNG TIN WEB        |                               |       ỨNG DỤNG DI ĐỘNG        |
            |     (REACTJS + JAVASCRIPT)    |                               |  (REACT NATIVE + TYPESCRIPT)  |
            +---------------+---------------+                               +---------------+---------------+
                            |                                                               |
            +---------------+---------------+                               +---------------+---------------+
            |                               |                               |                               |
    +-------v-------+               +-------v-------+               +-------v-------+               +-------v-------+
    |  SUPER ADMIN  |               | AGENCY STUDIO |               |   CUSTOMER    |               | FREELANCE MUA |
    |  Web Portal   |               |  Web Portal   |               |  Mobile App   |               |  Mobile App   |
    | (ROLE_SUPER_  |               | (ROLE_AGENCY_ |               | (ROLE_        |               | (ROLE_        |
    |    ADMIN)     |               | ADMIN, STAFF) |               |  CUSTOMER)    |               | FREELANCE_MUA)|
    +---------------+               +---------------+               +---------------+               +---------------+
```

* **Cổng Thông tin Web Quản trị (Web Portal - ReactJS + JavaScript (JSX)):**
  * **Công nghệ cốt lõi:** React 18, Vite, JavaScript (ES2023 JSX), Tailwind CSS, Shadcn UI / Radix Primitives, Lucide Icons, Axios, Zustand State Management, `@stomp/stompjs` WebSocket Client.
  * **Đối tượng phục vụ:** `ROLE_SUPER_ADMIN` (Quản trị viên sàn toàn quốc) và `ROLE_AGENCY_ADMIN` / `ROLE_AGENCY_STAFF` (Chủ studio, quản lý và nhân viên điều phối đại lý).
  * **Đặc tính thiết kế:** Giao diện mật độ dữ liệu cao (Data-Dense Dashboard), hiển thị bảng biểu, biểu đồ phân tích doanh thu, ma trận xếp ca tuần 7 ngày x 3 ca, bảng Kanban điều phối đơn chỉ định và trình duyệt thẩm định hồ sơ pháp lý/chứng chỉ thợ.

* **Ứng dụng Di động Đa nền tảng (Mobile App - React Native + TypeScript (TSX)):**
  * **Công nghệ cốt lõi:** React Native 0.74+, TypeScript (Static Typing), React Navigation v6 (Native Stack & Animated Bottom Tabs), NativeWind (Tailwind CSS cho React Native), React Native Maps, Expo Location & TaskManager Background Geolocation Service, Zustand Store, `@stomp/stompjs` WSS Client.
  * **Đối tượng phục vụ:** `ROLE_CUSTOMER` (Khách hàng đặt lịch make-up lưu động hoặc tại studio) và `ROLE_FREELANCE_MUA` (Thợ trang điểm tự do & Thợ thuộc Studio nhận job di chuyển).
  * **Đặc tính thiết kế:** Chuẩn phong cách sang trọng đẳng cấp (Luxury Beauty Design System: Vàng Champagne `#D4AF37`, Hồng Rose Gold `#B76E79`, Đen Obsidian `#1A1A1A`), cử chỉ vuốt chạm Bottom Sheet mượt mà 60fps, radar quét thợ GPS theo bán kính động, popup đếm ngược 30-45s rung haptic + âm thanh nhận ca và live stream tọa độ di chuyển.

---

### 2. Cổng Thông tin Web Quản trị (Web Portal - ReactJS + JavaScript)

#### A. Phân hệ Web Quản trị Đại lý / Studio (`ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`)

Toàn bộ phân hệ Studio Web Portal được viết bằng **ReactJS + JavaScript**, tối ưu hóa giao diện điều hành và phân quyền nghiêm ngặt giữa Chủ Studio (`ROLE_AGENCY_ADMIN`) và Nhân viên Lễ tân/Điều phối (`ROLE_AGENCY_STAFF`).

| STT | Tên Màn hình Web UI & Đường dẫn (Route) | Thành phần Giao diện (UI Components) | Luồng Tương tác & Xử lý Kỹ thuật (Client-Side Logic) | Endpoint API & STOMP Kênh kết nối |
| :---: | :--- | :--- | :--- | :--- |
| **A1** | **Dashboard Tổng quan Studio**<br>`/agency/dashboard` | • Thẻ KPI số liệu: Doanh thu tháng, Số đơn hoàn tất, Số thợ đang trực, Tỷ lệ hủy.<br>• Biểu đồ Area Chart doanh thu 30 ngày gần nhất.<br>• Bảng cảnh báo Realtime: Đơn hẹn sắp tới trong 2 giờ chưa gán thợ.<br>• Widget Mini-Map vị trí thợ Studio đang di chuyển ngoài đường. | • Gọi API tải báo cáo tổng hợp theo Date Range picker.<br>• Đăng ký kênh WebSocket nhận biến động doanh thu & đơn mới.<br>• Click vào cảnh báo mở nhanh Drawer điều phối đơn. | • `GET /api/v1/agency/dashboard/stats`<br>• STOMP: `/topic/agency/{agencyId}/dashboard` |
| **A2** | **Quản lý Nhân sự & Duyệt Thợ**<br>`/agency/staff` | • Bảng dữ liệu thợ (`agency_staff`): Họ tên, Avatar, SĐT, Số ca đã làm, Rating trung bình.<br>• Nút tạo Mã giới thiệu & Mã QR mời thợ gia nhập Studio.<br>• Modal cấu hình Tỷ lệ % Hoa hồng nội bộ (% Studio vs % Thợ).<br>• Drawer gán Kỹ năng Phong cách Make-up (`agency_staff_styles`) cho từng thợ (Douyin, Tone Thái, Cô dâu...). | • Form validation cấu hình hoa hồng (tổng 2 bên = 100%).<br>• Copy link mời hoặc tải file ảnh QR Code về máy.<br>• Toggle kích hoạt / tạm dừng hoạt động của thợ.<br>• Cập nhật danh sách Tone Make-up của thợ trực tiếp qua Checkbox group. | • `GET /api/v1/agency/staff`<br>• `POST /api/v1/agency/invitations`<br>• `PUT /api/v1/agency/staff/{staffId}/commission`<br>• `PUT /api/v1/agency/staff/{staffId}/styles` |
| **A3** | **Ma trận Xếp ca Tuần của Thợ**<br>`/agency/shifts` | • Bảng Ma trận Tuần (Grid 7 ngày từ Thứ 2 $\rightarrow$ CN, mỗi ngày chia 3 ca: Sáng [6h-12h], Chiều [12h-18h], Tối [18h-23h]).<br>• Ô lịch hiển thị Avatar thợ trực ca, trạng thái: *Đã xếp*, *Đang làm*, *Vắng mặt* (`agency_staff_shifts`).<br>• Thanh lọc nhanh theo Tên thợ hoặc Phong cách make-up.<br>• Modal Sao chép Lịch tuần này sang Tuần sau (Copy Shift Template). | • Drag-and-drop hoặc Click vào ô ca làm để thêm/xóa thợ trực ca.<br>• Kiểm tra xung đột tự động: Cảnh báo đỏ nếu thợ đã có lịch bận cá nhân hoặc trùng ca.<br>• Xuất file Excel / In lịch làm việc của toàn bộ Studio. | • `GET /api/v1/agency/shifts?week={weekNumber}`<br>• `POST /api/v1/agency/shifts/batch-assign`<br>• `DELETE /api/v1/agency/shifts/{shiftId}`<br>• `POST /api/v1/agency/shifts/copy-week` |
| **A4** | **Bảng Điều phối Đơn hàng (Dispatching Board)**<br>`/agency/dispatching` | • Cột Đơn Chờ Gán (`PENDING_AGENCY_DISPATCH`): Chi tiết yêu cầu gói, thời gian, địa chỉ, tone khách mong muốn.<br>• Danh sách Thợ khả dụng trong khung giờ đó kèm Đánh giá kỹ năng Tone khớp yêu cầu (Match Score %).<br>• Nút Gán Thợ chính (`primary_mua_id`) và Thợ phụ đi kèm (`assistant_mua_id`).<br>• Nút Đổi Thợ Khẩn cấp khi thợ chính báo bận đột xuất. | • Nhận Toast Notification tức thì kèm chuông báo khi có khách đặt chỉ định Studio.<br>• Dropdown chọn thợ tự động lọc những ai có ca trực rảnh trong `agency_staff_shifts`.<br>• Bấm "Xác nhận Điều phối" $\rightarrow$ Đẩy WebSocket thông báo đến App của Thợ. | • `GET /api/v1/agency/bookings/pending`<br>• `POST /api/v1/agency/bookings/{bookingId}/assign`<br>• `PUT /api/v1/agency/bookings/{bookingId}/reassign`<br>• STOMP: `/topic/agency/{agencyId}/dispatch` |
| **A5** | **Quản lý Gói Dịch vụ & Phụ phí Studio**<br>`/agency/services` | • Danh sách Gói dịch vụ của Studio (`service_packages`): Make cô dâu, dự tiệc, chụp kỷ yếu.<br>• Modal cấu hình Chi tiết bước thực hiện mặc định và Add-on mua thêm (`package_items`).<br>• Bảng cấu hình Phụ phí Studio (`surcharges`): Phụ phí làm sớm (3h-5h sáng), phụ phí đi xa ngoại thành.<br>• Thư viện Album ảnh sản phẩm mẫu hoàn thiện chính thức của Studio. | • Form nhập thông tin gói với Rich Text Editor mô tả.<br>• Upload nhiều ảnh mẫu chất lượng cao, preview trực tiếp trước khi gửi API nén CDN.<br>• Thiết lập các mức phụ phí linh hoạt tính vào hóa đơn của khách. | • `GET /api/v1/agency/services`<br>• `POST /api/v1/agency/services`<br>• `PUT /api/v1/agency/services/{id}`<br>• `GET /api/v1/agency/surcharges`<br>• `POST /api/v1/agency/surcharges` |
| **A6** | **Ví Studio, Sao kê & Rút tiền (Payout)**<br>`/agency/wallet` | • Card hiển thị: Số dư Ví Studio khả dụng, Số tiền đang giữ cọc Escrow, Doanh thu tạm tính.<br>• Bảng Sao kê Biến động Số dư chi tiết (`wallet_transactions`): Ngày giờ, Mã giao dịch, Phân loại (Doanh thu đơn, Cắt % Sàn, Chia % Thợ).<br>• Bảng phân bổ thu nhập nội bộ chi tiết từng thợ trong tháng.<br>• Form tạo Yêu cầu Rút tiền (`withdrawal_requests`) về Tài khoản Ngân hàng Doanh nghiệp. | • Lọc sao kê theo loại giao dịch (`CREDIT`, `DEBIT`) và khoảng ngày.<br>• Kiểm tra số dư khả dụng so với số tiền nhập rút.<br>• Xuất báo cáo tài chính dạng Excel phục vụ kế toán doanh nghiệp.<br>• Theo dõi trạng thái giải ngân (Đang xử lý $\rightarrow$ Thành công). | • `GET /api/v1/agency/wallet/balance`<br>• `GET /api/v1/agency/wallet/transactions`<br>• `GET /api/v1/agency/bank-accounts`<br>• `POST /api/v1/agency/wallet/withdrawals` |
| **A7** | **Quản lý Quá giờ & Duyệt Giải trình Ca làm**<br>`/agency/overtime-reports` | • Bảng theo dõi giải trình vượt giờ (`agency_staff_overtime_reports`): Thợ thực hiện, Mã ca `BK-...`, Phút vượt dự kiến, Lý do thợ nộp, Ảnh chụp đối chứng tại chỗ.<br>• Modal Cấu hình Quy định Phạt Studio (`agency_overtime_rules`): Mức phạt cố định/theo phút, chế độ tự động khấu trừ hoa hồng.<br>• Bộ công cụ Phán quyết Toàn quyền Admin 4 Quyền: [Trừ theo Quy định], [Miễn phạt 100% - Khách yêu cầu/Bất khả kháng], [Phạt tùy chỉnh số tiền], [Thu thêm phụ phí quá giờ từ khách hàng]. | • Tải danh sách đơn quá giờ đang chờ duyệt (`PENDING_REVIEW`).<br>• Lightbox zoom ảnh đối chứng do thợ nộp.<br>• Khi Admin xác nhận phán quyết: Tự động hạch toán khấu trừ hoa hồng hoặc cộng thêm phụ phí vào hóa đơn/ví thợ.<br>• Đẩy thông báo WebSocket tới App Thợ và App Khách hàng. | • `GET /api/v1/agency/overtime-rules`<br>• `POST /api/v1/agency/overtime-rules`<br>• `GET /api/v1/agency/overtime-reports/pending`<br>• `PUT /api/v1/agency/overtime-reports/{id}/review`<br>• STOMP: `/topic/agency/{agencyId}/overtime` |

---

#### B. Phân hệ Web Quản trị Toàn diện Sàn Nền tảng (`ROLE_SUPER_ADMIN`)

Dành riêng cho Quản trị viên Sàn, viết bằng **ReactJS + JavaScript**, cung cấp các công cụ vận hành quy mô lớn, kiểm soát rủi ro gian lận và giám sát dòng tiền tài chính theo chuẩn Kế toán Đúp.

| STT | Tên Màn hình Web UI & Đường dẫn (Route) | Thành phần Giao diện (UI Components) | Luồng Tương tác & Xử lý Kỹ thuật (Client-Side Logic) | Endpoint API & STOMP Kênh kết nối |
| :---: | :--- | :--- | :--- | :--- |
| **B1** | **Bảng Điều hành Toàn quốc (Platform Central Dashboard)**<br>`/admin/dashboard` | • Thước đo GMV (Tổng giá trị giao dịch toàn sàn), Doanh thu Hoa hồng thực nhận của Sàn.<br>• Tổng số dư Escrow đang đóng băng trên hệ thống.<br>• Biểu đồ phân bố đơn theo Tỉnh/Thành (Hà Nội, TP.HCM, Đà Nẵng...).<br>• Tỷ lệ hoàn thành đơn, Tỷ lệ khiếu nại (Dispute Rate %). | • Cập nhật tự động (Polling mỗi 30s hoặc nhận STOMP event).<br>• Bộ lọc phân tích theo Khung thời gian (Hôm nay, 7 ngày, Tháng này, Quý này).<br>• Thẻ cảnh báo nóng: Số lượng yêu cầu rút tiền đang chờ duyệt > 10 triệu VNĐ. | • `GET /api/v1/admin/analytics/overview`<br>• `GET /api/v1/admin/analytics/gmv-breakdown`<br>• STOMP: `/topic/admin/platform-metrics` |
| **B2** | **Xác minh Thợ & Bằng cấp Chứng chỉ**<br>`/admin/muas/verification` | • Danh sách hồ sơ Thợ Make-up mới đăng ký hoặc cập nhật hồ sơ (`mua_profiles`).<br>• Lightbox Viewer phóng to xem rõ ảnh Chứng chỉ tay nghề, CCCD/CMND 2 mặt.<br>• Nút hành động: **[PHÊ DUYỆT XÁC MINH]** hoặc **[TỪ CHỐI (KÈM LÝ DO)]**.<br>• Huy hiệu trạng thái: `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`. | • Khi bấm Phê duyệt, gửi API cập nhật trạng thái `is_verified = true` và cấp tick xanh uy tín.<br>• Khi từ chối, modal yêu cầu nhập lý do cụ thể (ảnh mờ, chứng chỉ không hợp lệ) $\rightarrow$ Bắn In-App Notification giải thích cho thợ.<br>• Lịch sử log người duyệt và thời gian thao tác. | • `GET /api/v1/admin/muas/pending`<br>• `PUT /api/v1/admin/muas/{id}/certificates/verify`<br>• `POST /api/v1/admin/muas/{id}/certificates/reject` |
| **B3** | **Quản lý & Thẩm định Đại lý / Studio**<br>`/admin/agencies` | • Danh sách Studio toàn quốc: Mã Studio, Tên thương hiệu, Giấy phép ĐKKD, Hotline, Địa chỉ.<br>• Xem chi tiết danh sách thợ thuộc studio và danh mục gói đang phát hành.<br>• Công tắc khóa/mở hoạt động của Studio khi phát hiện vi phạm.<br>• Cấu hình % Phí dịch vụ Sàn áp dụng riêng cho từng Studio (Default: 15-20%). | • Tìm kiếm theo Mã đại lý (`AG-HN-00182`) hoặc số điện thoại.<br>• Cập nhật tỷ lệ chiết khấu sàn cho đại lý đối tác chiến lược.<br>• Audit trail lưu nhật ký thay đổi trạng thái đối tác. | • `GET /api/v1/admin/agencies`<br>• `PUT /api/v1/admin/agencies/{id}/status`<br>• `PUT /api/v1/admin/agencies/{id}/platform-rate` |
| **B4** | **Quản trị Danh mục & Cấu hình Dynamic Surge Pricing**<br>`/admin/catalog-pricing` | • Bảng Danh mục Make-up chuẩn sàn (`master_service_categories`).<br>• Bảng Phong cách Make-up chuẩn sàn (`makeup_styles`).<br>• Bảng cấu hình Surge Pricing tự động: Khung giờ cao điểm (7h-9h Thứ 7/CN, mùa cưới Tháng 10 - Tháng 12) $\rightarrow$ Nhân hệ số từ $1.1\times - 1.5\times$.<br>• Cấu hình Biểu phí Di chuyển Km (Distance Fee Base + Per Km). | • Thêm mới / Ẩn / Hiện các phong cách Tone trang điểm xu hướng.<br>• Thanh Slider điều chỉnh hệ số Surge Pricing và hiển thị Preview công thức tính ngay trên UI.<br>• Xác thực dữ liệu đầu vào chống cấu hình sai lệch số học. | • `GET /api/v1/admin/master-categories`<br>• `POST /api/v1/admin/master-categories`<br>• `GET /api/v1/admin/pricing-rules`<br>• `PUT /api/v1/admin/pricing-rules/surge-configs` |
| **B5** | **Trung tâm Xử lý Tranh chấp & Khiếu nại (Dispute Center)**<br>`/admin/disputes` | • Danh sách Đơn khiếu nại (`disputes`): Mã đơn `DSP-260908-A9X2K`, Khách hàng, Thợ thực hiện, Trạng thái tiền Escrow đang phong tỏa.<br>• Khung đối chứng: Nội dung khiếu nại của khách vs Ý kiến phản hồi của thợ kèm Ảnh nghiệm thu sau make-up.<br>• Công cụ Phán quyết Tài chính: [Hoàn tiền 100% Khách], [Hoàn tiền 50% - 50%], [Bác bỏ khiếu nại - Giải ngân cho Thợ]. | • Xem ảnh nghiệm thu độ phân giải gốc để đánh giá chất lượng.<br>• Khi xác nhận phán quyết, gọi API tự động sinh bút toán Sổ cái Đúp (`ledger_entries`) hoàn/giải ngân.<br>• Đóng ticket khiếu nại và gửi In-App Toast thông báo kết quả cho cả 2 bên. | • `GET /api/v1/admin/disputes`<br>• `GET /api/v1/admin/disputes/{id}/details`<br>• `POST /api/v1/admin/disputes/{id}/resolve` |
| **B6** | **Quản trị Dòng tiền Ví Sàn, Sổ cái & Duyệt Rút tiền**<br>`/admin/finance-ledger` | • Giám sát Ví Tổng Sàn (`SYSTEM_PLATFORM_WALLET`): Doanh thu hoa hồng tích lũy.<br>• Trình tra cứu Sổ cái Kế toán Đúp (`ledger_entries`): Đối soát Nợ (`debit`) / Có (`credit`) đảm bảo cân bằng toán học tuyệt đối.<br>• Danh sách Yêu cầu Rút tiền (`withdrawal_requests`) từ Thợ và Đại lý.<br>• Nút **[DUYỆT GIẢI NGÂN (PAYOUT)]** tự động kích hoạt API Cổng Ngân hàng. | • Lọc theo Mã giao dịch `TXN-...` hoặc Mã đơn đặt.<br>• Modal cảnh báo an toàn: Nhập mật khẩu xác thực cấp 2 (Admin PIN) trước khi bấm duyệt rút tiền lớn.<br>• Tích hợp Webhook kết nối cổng Payout chuyển khoản trực tiếp liên ngân hàng 24/7. | • `GET /api/v1/admin/ledger/entries`<br>• `GET /api/v1/admin/withdrawals/pending`<br>• `POST /api/v1/admin/withdrawals/{id}/approve`<br>• `POST /api/v1/admin/withdrawals/{id}/reject` |

---

### 3. Ứng dụng Di động Đa nền tảng (Mobile App - React Native + TypeScript)

Ứng dụng di động được xây dựng trên một kiến trúc mã nguồn thống nhất bằng **React Native + TypeScript (TSX)**, tận dụng TypeScript Type-Definitions nghiêm ngặt, giao diện Native mượt mà và các Native Modules chuyên dụng cho GPS / STOMP.

#### A. Phân hệ Ứng dụng Khách hàng (`ROLE_CUSTOMER`)

| STT | Tên Màn hình Mobile UI & Component | Thành phần Giao diện & Type Definitions (TSX) | Luồng Tương tác & Xử lý Kỹ thuật (Client-Side Logic) | Endpoint API & STOMP Kênh kết nối |
| :---: | :--- | :--- | :--- | :--- |
| **C1** | **Trang chủ & Radar Khám phá Thợ**<br>`CustomerHomeScreen.tsx` | • Interactive Map (`react-native-maps`) hiển thị Vị trí người dùng (Blue Pin) và các Thợ/Studio rảnh xung quanh (Gold Pin).<br>• Switch chuyển đổi nhanh: **[Studio Chuyên Nghiệp]** $\leftrightarrow$ **[Thợ Make-up Tự Do]**.<br>• Vòng tròn Radar quét bán kính xung quanh vị trí hiện tại.<br>• Bottom Sheet trượt: Top Thợ xuất sắc nhất, Gói trang điểm HOT mùa này. | • Xin quyền định vị GPS thiết bị (`ACCESS_FINE_LOCATION`).<br>• Lấy tọa độ lat/lng hiện tại $\rightarrow$ Gọi Telemetry API quét thợ rảnh trong bán kính $R$ km.<br>• Bấm vào Pin trên bản đồ hiển thị Tooltip Card xem nhanh thông tin thợ.<br>• Chạm vào Card để điều hướng sang trang Hồ sơ chi tiết. | • `GET /api/v1/telemetry/nearby-muas?lat={lat}&lng={lng}&radius={km}`<br>• `GET /api/v1/catalog/promotions/hot` |
| **C2** | **Bộ lọc Tìm kiếm Nâng cao**<br>`DiscoveryFilterScreen.tsx` | • Thanh tìm kiếm Search Bar tự động gợi ý từ khóa phong cách.<br>• Filter Chips chọn Tone Make-up: Tone Thái, Douyin, Hàn Quốc, Tone Tây, Tự nhiên.<br>• Slider chọn Khoảng cách tối đa (1km - 30km) và Khoảng giá (300k - 5 triệu VNĐ).<br>• Radio button chọn Đánh giá tối thiểu (4.0★, 4.5★, 5★). | • Cập nhật tham số bộ lọc vào Zustand `useCustomerFilterStore`.<br>• Gọi API tìm kiếm với cơ chế Debounce 300ms chống spam request.<br>• Hiển thị danh sách kết quả dạng FlashList 60fps tối ưu bộ nhớ. | • `GET /api/v1/catalog/search`<br>• `GET /api/v1/catalog/styles` |
| **C3** | **Chi tiết Hồ sơ MUA / Studio & Portfolio**<br>`MuaProfileDetailScreen.tsx` | • Header Ảnh bìa & Avatar, Tên thợ, Huy hiệu Đã xác minh (Blue Tick).<br>• Thống kê: Số năm kinh nghiệm, Đánh giá trung bình, Số ca đã hoàn thành.<br>• Lightbox Album Showcase (`portfolio_showcases`): Bộ sưu tập ảnh sản phẩm hoàn thiện của khách trước đó chia theo từng phong cách.<br>• Danh sách Bảng giá Gói Dịch vụ (`service_packages`) & Bảng Phụ phí niêm yết.<br>• 2 Nút hành động cố định chân trang: **[ĐẶT KHẨN CẤP 30P]** & **[ĐẶT HẸN TRƯỚC]**. | • Xem ảnh phóng to chất lượng cao với thao tác Pinch-to-Zoom.<br>• Đọc danh sách đánh giá nhận xét thực tế từ các khách hàng trước.<br>• Chọn gói dịch vụ mong muốn $\rightarrow$ Chuyển dữ liệu sang màn hình Booking Flow. | • `GET /api/v1/muas/{id}/profile`<br>• `GET /api/v1/muas/{id}/portfolio`<br>• `GET /api/v1/muas/{id}/packages` |
| **C4** | **Đặt lịch 2 Chế độ (Booking Flow)**<br>`BookingFlowScreen.tsx` | • Tab Luồng 1: **[Đặt Khẩn Cấp Realtime 30-60 Phút]**.<br>• Tab Luồng 2: **[Đặt Lịch Hẹn Trước Ngày/Giờ Tương Lai]**.<br>• Ô nhập Địa chỉ trang điểm tích hợp Google Places Autocomplete.<br>• Danh sách Add-on mua thêm: Làm tóc cô dâu, Dán mi giả, Chăm sóc da trước make.<br>• Hóa đơn Bóc tách Minh bạch: *Giá gốc + Phí km + Phụ phí giờ sớm/đêm - Voucher giảm giá = Tổng tiền*. | • Trích xuất tọa độ GPS từ địa chỉ nhà khách nhập.<br>• Gọi Pricing Service Preview Hóa đơn chi tiết tức thì.<br>• Đối với Luồng Realtime: Mở màn hình Radar đếm ngược 45s tìm kiếm thợ nhận ca.<br>• Khóa cọc đơn hàng vào Ví Escrow. | • `POST /api/v1/pricing/preview-invoice`<br>• `POST /api/v1/bookings/instant`<br>• `POST /api/v1/bookings/scheduled` |
| **C5** | **Live Tracking Thợ Di chuyển Realtime**<br>`LiveTrackingMapScreen.tsx` | • Bản đồ dẫn đường toàn màn hình: Hiển thị Tuyến đường đi (Polyline) từ vị trí thợ đến nhà khách.<br>• Icon MUA Marker di chuyển mượt mà theo tọa độ GPS phát sóng.<br>• Card nổi tiến trình 5 chặng: *1. Đang đến nơi $\rightarrow$ 2. Đã có mặt $\rightarrow$ 3. Đang trang điểm $\rightarrow$ 4. Nghiệm thu $\rightarrow$ 5. Hoàn tất*.<br>• Ước tính thời gian đến (ETA) tính bằng phút.<br>• Nút Gọi điện thoại trực tiếp hoặc Mở Chat trao đổi In-App. | • Kết nối STOMP WebSocket kênh `/topic/booking/{bookingId}/location`.<br>• Giải mã dữ liệu tọa độ GPS `{ lat, lng, bearing, speed }` $\rightarrow$ Animate Marker di chuyển mượt mà trên bản đồ không giật lag.<br>• Lắng nghe sự kiện chuyển trạng thái đơn hàng để cập nhật Timeline chặng. | • STOMP Sub: `/topic/booking/{bookingId}/location`<br>• STOMP Sub: `/topic/booking/{bookingId}/status`<br>• `GET /api/v1/bookings/{id}/tracking` |
| **C6** | **Thanh toán Cọc Escrow & Quản lý Ví**<br>`PaymentEscrowScreen.tsx` | • Thẻ Số dư Ví Khách, Nút Nạp tiền nhanh.<br>• Lựa chọn Phương thức Thanh toán: MoMo QR, VNPay Sandbox, VietQR chuyển khoản tự động, ZaloPay, Số dư Ví.<br>• Trạng thái Escrow: *Cọc được Sàn giữ an toàn 100% cho tới khi quý khách nghiệm thu hài lòng*. | • Mở Deep Link chuyển thẳng sang Ứng dụng MoMo / VNPay / Ngân hàng để quét mã QR.<br>• Lắng nghe Webhook IPN hoặc Polling trạng thái thanh toán thành công.<br>• Tự động chuyển màn hình khi tiền cọc đã được khóa an toàn vào Escrow. | • `POST /api/v1/payments/initiate`<br>• `GET /api/v1/payments/{txId}/status`<br>• `GET /api/v1/customer/wallet` |
| **C7** | **Nghiệm thu, Đánh giá 1-5★ & Tip Thợ**<br>`ReviewTipDisputeScreen.tsx` | • Hiển thị Ảnh nghiệm thu do thợ chụp gửi lên sau khi trang điểm xong.<br>• Khung chấm điểm Rating 1 đến 5 sao & Ô nhập cảm nghĩ nhận xét.<br>• Khung chọn Tip tiền thưởng thêm cho thợ: [20.000đ], [50.000đ], [100.000đ] hoặc Số tiền tùy chọn.<br>• Nút "Gửi Khiếu Nại Dịch Vụ" nếu thợ làm không đúng yêu cầu hoặc trễ giờ nghiêm trọng. | • Gửi đánh giá sao về hệ thống.<br>• Nếu chọn Tip, tiền sẽ được trừ ngay từ Ví khách chuyển thẳng vào Ví thợ.<br>• Nếu bấm Khiếu nại, mở Form tải bằng chứng ảnh và chuyển đơn sang trạng thái `DISPUTED` (đóng băng cọc). | • `POST /api/v1/reviews`<br>• `POST /api/v1/bookings/{id}/tip`<br>• `POST /api/v1/disputes` |

---

#### B. Phân hệ Ứng dụng Thợ Make-up Chuyên nghiệp & Tự do (`ROLE_FREELANCE_MUA`)

Dành riêng cho Thợ Make-up (bao gồm thợ tự do và thợ thuộc Studio đi làm lưu động), được viết bằng **React Native + TypeScript**, đặc biệt tích hợp công nghệ phát sóng GPS chạy ngầm (Background Telemetry) và màn hình đếm ngược phản xạ nhanh.

| STT | Tên Màn hình Mobile UI & Component | Thành phần Giao diện & Type Definitions (TSX) | Luồng Tương tác & Xử lý Kỹ thuật (Client-Side Logic) | Endpoint API & STOMP Kênh kết nối |
| :---: | :--- | :--- | :--- | :--- |
| **D1** | **Bàn làm việc & Công tắc Sẵn sàng (Status Toggle)**<br>`MuaWorkstationScreen.tsx` | • Công tắc lớn (Master Switch): **[ONLINE - SẴN SÀNG NHẬN CA]** $\leftrightarrow$ **[OFFLINE - NGHỈ NGƠI]**.<br>• Widget Thống kê Hôm nay: Số đơn hoàn thành, Thu nhập thực nhận (đã trừ phí sàn), Điểm Uy tín.<br>• Danh sách Ca làm việc hôm nay xếp theo trình tự thời gian.<br>• Huy hiệu cảnh báo nhắc ca hẹn sắp tới trong 30 phút. | • Khi gạt sang "Online", kích hoạt Native Service phát sóng tọa độ GPS chạy ngầm (`Expo Location TaskManager`) chu kỳ 5-10 giây một lần.<br>• Đăng ký lắng nghe kênh WebSocket cá nhân nhận thông báo đơn mới.<br>• Khi gạt sang "Offline", tắt dịch vụ GPS và xóa tọa độ khỏi Redis GEO. | • `PUT /api/v1/mua/readiness-status`<br>• `POST /api/v1/telemetry/ping-location`<br>• STOMP Sub: `/queue/mua/{muaId}/alerts` |
| **D2** | **Popup Đếm ngược 30-45s Nhận Ca Realtime**<br>`InstantBookingModal.tsx` | • Modal Popup toàn màn hình tự động hiển thị đè lên các ứng dụng khác khi có ca khẩn cấp.<br>• Đồng hồ Đĩa tròn đếm ngược từ 45 giây về 0 kèm hiệu ứng màu chuyển từ Xanh $\rightarrow$ Vàng $\rightarrow$ Đỏ.<br>• Thẻ Thông tin Ca: Gói dịch vụ, Địa chỉ khách, Khoảng cách km, Thu nhập thợ thực nhận sau khi trừ hoa hồng sàn.<br>• Nút hành động lớn: **[CHẤP NHẬN CA LÀM]** (Màu xanh) và **[TỪ CHỐI]** (Màu xám). | • Phát chuông âm thanh cảnh báo nhận ca liên tục và kích hoạt rung Haptic thiết bị.<br>• Khi thợ bấm "Chấp nhận", gọi API tức thì với cơ chế Redlock (Redis Distributed Lock) kiểm tra tranh chấp.<br>• Nếu thành công, chuyển thẳng vào màn hình Tiến trình Ca làm.<br>• Nếu hết 45s hoặc bấm từ chối, modal tự đóng và ghi nhận bỏ lỡ. | • `POST /api/v1/bookings/{id}/accept`<br>• STOMP Sub: `/queue/mua/{muaId}/instant-job` |
| **D3** | **Quản lý Lịch bận Cá nhân & Ca trực Studio**<br>`MuaCalendarScheduleScreen.tsx` | • Lịch tương tác tháng & tuần (Agenda Calendar View).<br>• Tab 1: **[Lịch bận Cá nhân (`mua_calendars`)]**: Cho phép thợ tự khóa các khung giờ bận việc gia đình, học tập chống trùng ca hẹn trước.<br>• Tab 2: **[Lịch Trực Studio (`agency_staff_shifts`)]**: Hiển thị các ca trực tại studio mà quản lý đã phân công trong tuần.<br>• Đánh dấu mã màu trực quan: Xanh (Ca đã đặt), Vàng (Ca trực studio), Đỏ (Khung giờ bận). | • Thêm mới khung giờ bận cá nhân với Date-time picker.<br>• Kiểm tra hợp lệ: Không cho khóa giờ nếu khung giờ đó đã có đơn đặt hẹn trước.<br>• Đồng bộ lịch hẹn vào ứng dụng Google Calendar / Apple Calendar của máy. | • `GET /api/v1/mua/calendars`<br>• `POST /api/v1/mua/calendars/block`<br>• `DELETE /api/v1/mua/calendars/{id}`<br>• `GET /api/v1/mua/agency-shifts` |
| **D4** | **Tiến trình Thực hiện Ca làm 5 Chặng**<br>`JobExecutionFlowScreen.tsx` | • Thanh hiển thị 5 Chặng quy chuẩn:<br>  *1. Bắt đầu di chuyển $\rightarrow$ 2. Đã có mặt tại điểm hẹn $\rightarrow$ 3. Bắt đầu make-up $\rightarrow$ 4. Chụp ảnh nghiệm thu $\rightarrow$ 5. Hoàn thành ca*.<br>• Nút Mở Google Maps dẫn đường đến nhà khách.<br>• Bộ đếm thời gian thực hiện make-up dự kiến.<br>• Trình Camera tích hợp bắt buộc chụp ảnh sản phẩm hoàn thiện của khách trước khi bấm "Hoàn thành". | • Chặng 1 kích hoạt chế độ phát sóng GPS tần suất cao (3 giây/lần).<br>• Chặng 4 mở Camera chụp trực tiếp (không cho chọn ảnh cũ từ thư viện để chống gian lận) và upload lên CDN.<br>• Chặng 5 bấm Hoàn thành $\rightarrow$ Hệ thống tự động phát sự kiện giải ngân tiền ví. | • `PUT /api/v1/bookings/{id}/step-progress`<br>• `POST /api/v1/bookings/{id}/proof-photo`<br>• `PUT /api/v1/bookings/{id}/complete` |
| **D5** | **Quản lý Hồ sơ Tay nghề & Portfolio Mẫu**<br>`MuaPortfolioManagerScreen.tsx` | • Form thông tin cá nhân: Họ tên nghệ danh, Bio phong cách sở trường, Số năm kinh nghiệm.<br>• Slider chọn Bán kính Nhận khách tối đa (ví dụ: tối đa 15km quanh nhà).<br>• Danh mục Album Showcase (`portfolio_showcases`): Tải lên các bộ ảnh khách hàng thực tế theo từng Tone Make-up.<br>• Form thiết lập Gói dịch vụ cá nhân (`service_packages`) và giá niêm yết cho khách. | • Nén ảnh tự động trên thiết bị (Client-side Image Compressor) giảm dung lượng trước khi upload.<br>• Chọn Tone phong cách gắn thẻ cho từng bức ảnh album.<br>• Bật/tắt các gói dịch vụ tùy theo lịch rảnh và định hướng của thợ. | • `GET /api/v1/mua/profile`<br>• `PUT /api/v1/mua/profile`<br>• `POST /api/v1/mua/portfolio/upload`<br>• `POST /api/v1/mua/packages` |
| **D6** | **Ví Thợ, Sao kê Thu nhập & Rút tiền (Payout)**<br>`MuaWalletPayoutScreen.tsx` | • Thẻ Số dư Ví Khả dụng & Số tiền Đang phong tỏa giữ cọc.<br>• Thống kê Thu nhập tuần này, tháng này (đã trừ % hoa hồng Sàn).<br>• Danh sách Tài khoản Ngân hàng chính chủ đã liên kết (`user_bank_accounts`).<br>• Form Yêu cầu Rút tiền (`withdrawal_requests`) về Tài khoản Ngân hàng (Hỗ trợ VietQR 24/7). | • Bấm liên kết số tài khoản ngân hàng mới với OTP xác thực.<br>• Kiểm tra hạn mức rút tiền tối thiểu (ví dụ: 100.000 VNĐ).<br>• Gửi yêu cầu rút tiền $\rightarrow$ Nhận thông báo Toast biến động số dư khi tiền về tài khoản ngân hàng. | • `GET /api/v1/mua/wallet`<br>• `GET /api/v1/mua/wallet/transactions`<br>• `POST /api/v1/mua/bank-accounts`<br>• `POST /api/v1/mua/withdrawals` |
| **D7** | **Giải trình Quá giờ & Ảnh Đối chứng**<br>`OvertimeExplanationModal.tsx` | • Modal cảnh báo tự động kích hoạt khi thợ bấm hoàn thành ca làm vượt quá thời gian dự kiến (`estimated_duration_minutes`).<br>• Thẻ tóm tắt: Thời gian dự kiến vs Thực tế, Số phút vượt quá.<br>• Dropdown chọn Lý do theo Quy chế Studio niêm yết sẵn (`rule_id`).<br>• Checkbox & Input "Lý do ngoại lệ khác" (`is_custom_exception`) kèm ô nhập chi tiết giải trình.<br>• Trình Camera chụp trực tiếp ảnh đối chứng tại chỗ (khách đến muộn, yêu cầu vẽ thêm họa tiết...). | • Kiểm tra thời lượng làm việc so với gói dịch vụ.<br>• Tải danh sách quy tắc studio từ API.<br>• Bắt buộc chụp ảnh trực tiếp tại chỗ nếu chọn lý do ngoại lệ ngoài quy định.<br>• Gửi giải trình lên Agency Admin duyệt để tránh bị khấu trừ hoa hồng tự động. | • `GET /api/v1/agency/overtime-rules/public`<br>• `POST /api/v1/agency/overtime-reports` |

---

### 4. Quy chuẩn Trải nghiệm Người dùng, State Management & Tích hợp

#### A. Ma trận Quyền hạn & Phân bổ Nền tảng (Role vs Platform Matrix)

| Vai trò Người dùng (User Role) | Nền tảng Ứng dụng Phụ trách | Ngôn ngữ & Framework | Thư mục Mã nguồn | Phạm vi Chức năng Chính |
| :--- | :--- | :--- | :--- | :--- |
| **`ROLE_SUPER_ADMIN`** | Cổng Quản trị Sàn (Web Portal) | ReactJS 18 + JavaScript (JSX) | `code/frontend/` | Vận hành toàn diện, duyệt thợ, xử lý tranh chấp, đối soát kế toán đúp sổ cái. |
| **`ROLE_AGENCY_ADMIN`** | Cổng Quản lý Đại lý (Web Portal) | ReactJS 18 + JavaScript (JSX) | `code/frontend/` | Điều phối đơn hàng, xếp ca nhân sự, cấu hình hoa hồng studio, rút tiền ví studio. |
| **`ROLE_AGENCY_STAFF`** | Cổng Quản lý Đại lý (Web Portal) | ReactJS 18 + JavaScript (JSX) | `code/frontend/` | Hỗ trợ điều phối đơn hàng, xem ma trận ca trực, tiếp nhận yêu cầu khách. |
| **`ROLE_CUSTOMER`** | Ứng dụng Di động Khách (Mobile App) | React Native 0.74+ & TypeScript | `code/mobile/` | Bản đồ quét thợ GPS, đặt lịch 2 luồng, thanh toán giữ cọc Escrow, live tracking thợ. |
| **`ROLE_FREELANCE_MUA`** | Ứng dụng Di động Thợ (Mobile App) | React Native 0.74+ & TypeScript | `code/mobile/` | Bật/tắt phát sóng GPS, popup đếm ngược 30s nhận ca, tiến trình 5 chặng, rút tiền ví. |

#### B. Cơ chế Quản lý Trạng thái Khách hàng (Client State Architecture with Zustand)
* **Web Portal (ReactJS + JS):**
  * `useAuthStore`: Lưu trữ JWT token, thông tin Profile Admin/Agency, danh sách quyền hạn `permissions`.
  * `useAgencyDispatchStore`: Quản lý danh sách đơn chờ gán thợ, trạng thái thợ trực ca và bộ lọc ma trận điều phối realtime.
  * `useShiftMatrixStore`: Lưu trữ dữ liệu lịch tuần của các thợ, hỗ trợ kéo thả và copy tuần làm việc.
* **Mobile App (React Native + TS):**
  * `useCustomerBookingStore`: Quản lý trạng thái đơn đang đặt, thông tin gói dịch vụ, tọa độ đón và hóa đơn tính tiền preview.
  * `useMuaTelemetryStore`: Quản lý trạng thái Online/Offline, tọa độ GPS hiện tại và chu kỳ phát sóng ngầm.
  * `useRealtimeTrackingStore`: Lưu trữ tọa độ thợ di chuyển stream qua WebSocket và tính toán ETA hiển thị trên bản đồ.

#### C. Quy chuẩn Kết nối Realtime WebSocket STOMP Client
* **Giao thức:** Kết nối qua giao thức an toàn `wss://{domain}/ws-makeup` sử dụng thư viện `@stomp/stompjs`.
* **Xác thực phiên:** Gửi kèm Bearer JWT Token trong Header `CONNECT` khi khởi tạo bắt tay kết nối (Handshake).
* **Chiến lược Tái kết nối (Auto Reconnect):**
  * Cấu hình `reconnectDelay = 5000` (5 giây) với thuật toán Exponential Backoff tối đa 30 giây khi mạng chập chờn.
  * Tự động đăng ký lại (Resubscribe) tất cả các topic/queue đang theo dõi ngay khi kết nối khôi phục thành công.
* **Quy chuẩn Âm thanh & Rung:**
  * Web Portal: Phát âm thanh thông báo Notification Chime ngắn (<1s) và hiển thị Toast góc trên bên phải màn hình khi có đơn chỉ định mới.
  * Mobile App: Kích hoạt `react-native-sound` phát chuông cảnh báo lớn và rung liên tục theo nhịp Haptic Pattern `[0, 500, 200, 500]` khi có Popup đếm ngược nhận ca khẩn cấp.

#### D. Cơ chế Định vị GPS Chạy ngầm (Background Geolocation Telemetry) trên Mobile App Thợ
* **Nền tảng thực thi:** Sử dụng Native Task `Expo Location TaskManager` hoặc React Native Background Actions.
* **Quyền hạn bắt buộc:** Xin quyền `ACCESS_FINE_LOCATION` và `ACCESS_BACKGROUND_LOCATION` (Android), `NSLocationAlwaysAndWhenInUseUsageDescription` (iOS).
* **Chu kỳ phát sóng:**
  * Trạng thái Chờ việc (Online Standby): Phát sóng tọa độ lat/lng mỗi **10 giây/lần** hoặc khi di chuyển vượt quá **15 mét** để tiết kiệm pin.
  * Trạng thái Đang di chuyển đến nhà khách (`ON_THE_WAY`): Phát sóng mỗi **3-5 giây/lần** để khách hàng quan sát Marker di chuyển mượt mà trên bản đồ.
  * Khi pin dưới 15%: Tự động giảm tần suất xuống 15 giây/lần kèm cảnh báo cho thợ.

---

## IV. THIẾT KẾ CHI TIẾT CƠ SỞ DỮ LIỆU (DATABASE DESIGN & SQL SPECIFICATION)

Cơ sở dữ liệu hệ thống áp dụng mô hình **PostgreSQL 16 + PostGIS Extension** chuẩn hóa 3NF kết hợp Phân quyền RBAC 4 Bảng và Phân vùng Ví 7 Bảng Sổ cái Kế toán Đúp:

### **Danh sách 28 Bảng Dữ liệu Cốt lõi:**
1. **`users`**: Quản lý tài khoản đăng nhập (Khách, Thợ tự do, Chủ Studio, Nhân viên Studio) với khóa chính `BIGINT Identity`.
2. **`roles`**, **`user_roles`** & **`role_permissions`**: Mô hình phân quyền RBAC 4 Bảng đầy đủ (`ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`) và danh sách `permission_code` chi tiết.
3. **`agency_profiles`**: Hồ sơ Studio/Đại lý (Mã đại lý `AG-HN-00182`, hotline, địa chỉ, tỷ lệ % hoa hồng nội bộ studio/thợ).
4. **`mua_profiles`**: Hồ sơ Thợ trang điểm (Mã thợ `MUA-2026-08912`, bio, kinh nghiệm, chứng chỉ JSONB, bán kính max km, rating).
5. **`agency_staff`**: Mối quan hệ thợ thuộc studio & % hoa hồng thỏa thuận riêng.
6. **`master_service_categories`**: Danh mục loại Make-up chuẩn sàn (Make tiệc, Kỷ yếu, Cô dâu, Mẹ cô dâu, Người nhà...).
7. **`makeup_styles`**: Danh mục Tone/Phong cách trang điểm (Tone Thái, Douyin, Hồng Baby, Tone Tây, Tone Hàn...).
8. **`service_packages`**: Gói dịch vụ chi tiết của Thợ tự do hoặc Studio.
9. **`package_items`**: Chi tiết các bước thực hiện mặc định (`item_type = COMPONENT`) và Dịch vụ tùy chọn mua thêm (`item_type = ADD-ON`) như Làm tóc, Mi giả, Dưỡng ẩm...
10. **`package_styles`**: Bảng nối N-N liên kết gói dịch vụ với các Tone/Phong cách make-up.
11. **`agency_staff_services`**: Bảng gán kỹ năng Gói Dịch vụ cho thợ Studio.
12. **`agency_staff_styles`** & **`mua_styles`**: Bảng gán kỹ năng Tone Make-up trực tiếp cho Thợ tự do & Thợ Studio (Douyin, Thái, Tây, Hàn...).
13. **`portfolio_showcases`**: Album Ảnh sản phẩm make-up hoàn thiện của khách hàng trước đó theo từng [Gói Dịch Vụ + Tone Make-Up] của Thợ Tự Do & Thợ Studio.
14. **`surcharges`**: Cấu hình phụ phí làm sớm (3h-5h sáng), phụ phí đi tỉnh, phụ phí ngày Lễ/Tết.
15. **`bookings`**: Đơn đặt lịch chính (Mã đơn `BK-260908-A9X2K`, loại Realtime/Scheduled, luồng Direct/Agency, trạng thái, tổng tiền).
16. **`booking_items`** & **`booking_history`**: Chi tiết gói dịch vụ được đặt & Nhật ký audit log lịch sử máy trạng thái đơn hàng.
17. **`mua_calendars`**: Lịch bận cá nhân của thợ (Block Calendar) chống trùng ca hẹn trước.
18. **`telemetry_logs`**: Lịch sử tọa độ GPS thợ di chuyển (Sử dụng kiểu dữ liệu PostGIS `GEOMETRY(Point, 4326)`).
19. **`wallets`**: Quản lý số dư Ví khả dụng & đóng băng của Khách hàng, Thợ, Đại lý, Sàn (`CUSTOMER_WALLET`, `FREELANCER_WALLET`, `AGENCY_WALLET`, `SYSTEM_PLATFORM_WALLET`).
20. **`user_bank_accounts`**: Quản lý danh sách Tài khoản Ngân hàng chính chủ đã liên kết.
21. **`withdrawal_requests`**: Quản lý yêu cầu Rút tiền từ Ví về Ngân hàng (Mã `WTH-...`, số tiền, phí, số tiền thực nhận).
22. **`payment_transactions`**: Quản lý giao dịch với Cổng thanh toán (MoMo, VNPay, ZaloPay, VietQR, Tiền mặt).
23. **`transactions`**: Bảng Master quản lý giao dịch nghiệp vụ tổng hợp (`DEPOSIT`, `WITHDRAWAL`, `ESCROW_LOCK`, `ESCROW_RELEASE`, `PLATFORM_COMMISSION`, `REFUND`, `TIP`).
24. **`wallet_transactions`**: Nhật ký sao kê biến động số dư chi tiết của từng Ví (`balance_before`, `balance_after`, `CREDIT`, `DEBIT`, `FREEZE`, `UNFREEZE`).
25. **`ledger_entries`**: Bảng Sổ cái Kế toán Đúp (Double-Entry General Ledger) hạch toán Nợ (`debit_wallet_id`) / Có (`credit_wallet_id`).
26. **`in_app_notifications`**, **`reviews`** & **`disputes`**: Thông báo In-App qua In-Memory EventBus & Embedded WebSocket, Đánh giá sao 1-5★, Tip tiền & Đơn khiếu nại chất lượng dịch vụ (`DSP-260908-A9X2K`).
27. **`agency_overtime_rules`**: Cấu hình quy chế & mức phạt quá giờ nội bộ của từng Studio (Phạt cố định hoặc theo phút, tự động khấu trừ hoa hồng thợ).
28. **`agency_staff_overtime_reports`**: Báo cáo giải trình thợ làm quá thời gian dự kiến (`estimated_duration_minutes`) kèm ảnh đối chứng và phán quyết toàn quyền của Agency Admin (`DEDUCT_BY_RULE`, `WAIVE_PENALTY`, `CUSTOM_PENALTY`, `CHARGE_CUSTOMER`).

---

## V. YÊU CẦU TÍCH HỢP HỆ THỐNG & BẢO MẬT (INTEGRATION & SECURITY REQUIREMENTS)

### 1. Tích hợp Hệ thống Thanh toán & Ví điện tử (Payment Integration)
* **Phương thức:** MoMo, VNPay, ZaloPay, Thẻ ATM/Visa/Mastercard, VietQR, Tiền mặt.
* **Cơ chế Escrow:** Tự động giữ cọc $\rightarrow$ Ca hoàn thành $\rightarrow$ Tự động cắt hoa hồng Sàn (%) $\rightarrow$ Chuyển tiền còn lại vào Ví Đại lý hoặc Ví Thợ tự do theo mô hình Sổ cái Kế toán Đúp.

### 2. Tích hợp Định vị GPS & Maps (Telemetry Integration)
* **Dịch vụ:** Google Maps / Goong Maps API kết hợp Redis GEO và PostGIS.
* **Nhiệm vụ:** Tính khoảng cách di chuyển thực tế, tính phí ship/km và hiển thị vị trí thợ di chuyển Realtime.

### 3. Tích hợp Hệ thống Thông báo Trực tiếp trên App qua In-Memory EventBus & Embedded WebSocket (In-App Notification Integration)
#### A. An toàn & Bảo mật (Security & Compliance):
* **Bảo mật Kết nối Realtime WebSocket:** Sử dụng mã hóa WSS (WebSocket Secure) qua TLS/SSL. Xác thực kết nối WebSocket bằng Short-lived JWT Token.
* **Truyền phát Sự kiện Nội bộ Siêu tốc (In-Memory EventBus):** Áp dụng Spring `ApplicationEventPublisher` và `@EventListener` (`@Async`) trong cùng tiến trình JVM, bảo mật nội bộ và không phát sinh độ trễ mạng hay rủi ro network.
* **Chống Spam & Trùng tin (Rate Limiting):** Sử dụng Idempotency Key / Event ID cho mỗi sự kiện thông báo tránh xử lý lặp lại.
* **Bảo vệ Dữ liệu Nhạy cảm:** Payload thông báo được mã hóa và ẩn đi các thông tin tài chính nhạy cảm bằng Masking Data.

#### B. Lợi ích Hệ thống mang lại (Key Benefits):
* **Realtime Tức thì (<100ms):** Thông báo nhảy trực tiếp trên màn hình App qua WebSocket ngay khi sự kiện phát sinh (<100ms).
* **Không Phụ thuộc Email:** Hoàn toàn loại bỏ rủi ro thông báo chui vào Spam folder như Email truyền thống, đảm bảo 100% Thợ không bị bỏ lỡ ca làm.
* **Tương tác Cao (High Engagement):** Thông báo dạng In-App Toast/Banner tích hợp nút bấm hành động trực tiếp (VD: Nút "Chấp nhận ca" ngay trên Popup đếm ngược).

### 4. Quy tắc Sinh Mã Tự động Cấu hình (Auto-generated Code Settings)
* **Mã Đơn Đặt Lịch (Booking Code):** Cú pháp `BK-[YYMMDD]-[RANDOM_5_ALPHANUMERIC]` (Ví dụ: `BK-260908-A9X2K`).
* **Mã Đại lý / Studio (Agency Code):** Cú pháp `AG-[PROVINCE_CODE]-[ID_SEQUENTIAL]` (Ví dụ: `AG-HN-00182`, `AG-HCM-00509`).
* **Mã Thợ Make-up (MUA Code):** Cú pháp `MUA-[YEAR]-[ID_SEQUENTIAL]` (Ví dụ: `MUA-2026-08912`).
* **Mã Giao dịch Ví (Transaction Code):** Cú pháp `TXN-[TYPE]-[TIMESTAMP_MS]-[RANDOM_4_DIGITS]` (Ví dụ: `TXN-DEP-1757329500123-9812`).
* **Mã Đơn Khiếu nại (Dispute Code):** Cú pháp `DSP-[YYMMDD]-[BOOKING_CODE_SHORT]` (Ví dụ: `DSP-260908-A9X2K`).
* **Mã Yêu cầu Rút tiền (Withdrawal Code):** Cú pháp `WTH-[YYMMDD]-[RANDOM_5_ALPHANUMERIC]` (Ví dụ: `WTH-260908-X891A`).

---

## VI. BẢNG PHÂN RÃ CÔNG VIỆC CHI TIẾT TỪNG TÍNH NĂNG (45-DAY GRANULAR WBS - 86 ISSUES / 7 SPRINTS)

### Danh sách 86 Jira Issues Phân bổ trong 7 Sprints (11 - 14 Issues / Sprint):

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPRINT 0** | **INFRAS & AUTH** | **Sprint 0: Khởi Tạo Dự Án, DB & Auth (13 Issues)** | | | | |
| **ISSUE-6** | Task | Khởi tạo Git Repository và cấu trúc thư mục Layered Monolith (core-api) | Done | 8/9/2026 | Medium | DE, SA |
| **ISSUE-4** | User Story | Tạo cấu trúc thư mục dự án tổng quan | Done | 8/9/2026 | High | DE, SA |
| **ISSUE-1** | User Story | Phân tích và tạo tài liệu đặc tả SRS cho phân hệ ADMIN | Done | 8/9/2026 | High | SA, BE1 |
| **ISSUE-8.1** | Task | Cấu hình Docker Compose cho PostgreSQL 16 & PostGIS Extension | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.2** | Task | Cấu hình Docker Compose cho Redis GEO Cluster & Cache | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.3** | Task | Cấu hình Spring In-Memory EventBus (ApplicationEventPublisher) | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.4** | Task | Viết Script DDL Migration 26 Bảng (RBAC 4 Bảng, Ví 7 Bảng) | In Progress | 9/9/2026 | High | BE1, DE |
| **ISSUE-3** | User Story | Tạo file User Story cho hệ thống mua-makeup | To Do | 9/9/2026 | High | SA, QA |
| **ISSUE-5** | User Story | Bổ sung file đặc tả cấu trúc hoàn chỉnh, Skills, Rules & Workflows | In Review | 9/9/2026 | High | SA |
| **ISSUE-9.1** | User Story | Monolith Core Application - Khởi tạo Spring Boot App (:8080) | To Do | - | Medium | BE1, SA |
| **ISSUE-9.2** | Task | Spring Security & JWT Filter Middleware trong Single App | To Do | - | Medium | BE1 |
| **ISSUE-10.1** | User Story | Auth & Profile Module - API Đăng ký / Login & Phân hệ người dùng | To Do | - | Medium | BE1, FE1 |
| **ISSUE-10.2** | Task | Auth & Profile Module - Tích hợp Phân quyền RBAC 4 Bảng (`users`, `roles`, `user_roles`, `role_permissions`) | To Do | - | Medium | BE1 |
| **SPRINT 1** | **PROFILE & CATALOG** | **Sprint 1: Hồ Sơ Thợ, Studio & Gói Dịch Vụ (14 Issues)** | | | | |
| **ISSUE-11.1** | User Story | Hồ sơ Thợ Make-up (`mua_profiles`), Bio & Chứng chỉ | To Do | - | Medium | BE2, FE2 |
| **ISSUE-11.2** | Task | Upload CDN (Cloudinary/S3) nén ảnh Portfolio chất lượng cao | To Do | - | Medium | BE2, FE2 |
| **ISSUE-11.3** | Task | Quản lý Album Ảnh sản phẩm hoàn thiện của khách trước đó (`staff_portfolio_showcases`) | To Do | - | High | BE2, FE2 |
| **ISSUE-12.1** | User Story | Quản lý Studio / Đại lý (`agency_profiles`), Hotline & Mã giới thiệu thợ | To Do | - | Medium | BE1, FE3 |
| **ISSUE-12.2** | Task | Quản lý Nhân viên Studio (`agency_staff`) & Duyệt thợ gia nhập | To Do | - | Medium | BE1, FE3 |
| **ISSUE-12.3** | Task | Cấu hình % Hoa hồng nội bộ giữa Studio và Thợ làm việc | To Do | - | Medium | BE1, FE3 |
| **ISSUE-12.4** | Task | Quản lý Năng lực thợ Studio theo Tone Make-up (`agency_staff_styles`) | To Do | - | High | BE2 |
| **ISSUE-12.5** | Task | Bảng ma trận Xếp ca làm việc cố định theo tuần của Thợ Studio (`agency_staff_shifts`) & Theo dõi trạng thái ca làm | To Do | - | High | BE1, FE3 |
| **ISSUE-13.1** | User Story | CRUD Master Categories & Tone Make-up (`master_service_categories`, `makeup_styles`) | To Do | - | Medium | BE2, FE1 |
| **ISSUE-13.2** | Task | CRUD Gói dịch vụ Studio/Freelancer (`service_packages`) | To Do | - | Medium | BE2, FE1 |
| **ISSUE-13.3** | Task | Chi tiết các bước thực hiện mặc định & Option mua thêm (`package_items`) | To Do | - | Medium | BE2, FE1 |
| **ISSUE-13.4** | Task | Gán Kỹ năng Gói Dịch vụ cho thợ Studio (`agency_staff_services`) | To Do | - | Medium | BE2, FE3 |
| **ISSUE-13.5** | Task | Cấu hình Phụ phí (`surcharges`): Làm sớm 3h-5h sáng, đi tỉnh & ngày Lễ/Tết | To Do | - | Medium | BE2, FE1 |
| **ISSUE-13.6** | Task | Quản lý Quy định & Duyệt Giải trình Thợ làm quá giờ (`agency_overtime_rules`, `agency_staff_overtime_reports`) | To Do | - | High | BE2, FE3 |
| **SPRINT 2** | **TELEMETRY & PRICING**| **Sprint 2: Telemetry GPS & Dynamic Pricing (11 Issues)** | | | | |
| **ISSUE-14.1** | User Story | Location Telemetry Module - Xây dựng Module Định vị GPS & Redis GEO trong Monolith | To Do | - | Medium | BE3, DE |
| **ISSUE-14.2** | Task | Redis GEO Spatial Index lưu tọa độ Thợ rảnh Realtime | To Do | - | High | BE3 |
| **ISSUE-14.3** | Task | GPS Telemetry Background Task trên Mobile App Thợ (Stream 5-10s) | To Do | - | High | FE2, BE3 |
| **ISSUE-14.4** | Task | API Quét danh sách Thợ/Studio rảnh trong bán kính R km từ vị trí khách | To Do | - | High | BE3 |
| **ISSUE-14.5** | Task | Bảng lưu vết Lịch sử tọa độ GPS di chuyển thợ (`telemetry_logs`) | To Do | - | Medium | BE3 |
| **ISSUE-15.1** | User Story | Dynamic Pricing Module - Xây dựng Module Tính giá động & Phụ phí trong Monolith | To Do | - | Medium | BE3, FE1 |
| **ISSUE-15.2** | Task | Tích hợp Maps API (Google Maps / Goong Maps API) tính khoảng cách km | To Do | - | High | BE3 |
| **ISSUE-15.3** | Task | Thuật toán tính Phí di chuyển theo km (Distance Fee Calculator) | To Do | - | Medium | BE3 |
| **ISSUE-15.4** | Task | Thuật toán Surge Pricing tự động tăng giá theo khung giờ cao điểm | To Do | - | Medium | BE3 |
| **ISSUE-15.5** | Task | Tự động tính toán và tổng hợp Phụ phí làm sớm/đêm vào tổng tiền hóa đơn | To Do | - | Medium | BE3 |
| **ISSUE-15.6** | Task | API Preview Hóa đơn Chi tiết Realtime trước khi Khách bấm Đặt đơn | To Do | - | High | BE3, FE1 |
| **SPRINT 3** | **BOOKING & DISPATCH** | **Sprint 3: Booking Engine 2 Luồng & Dispatching (13 Issues)** | | | | |
| **ISSUE-16.1** | User Story | Booking Engine - Máy trạng thái Đơn hàng (Booking State Machine) | To Do | - | Medium | BE1, SA |
| **ISSUE-16.2** | Task | Nhật ký Audit Log lịch sử biến động trạng thái đơn (`booking_history`) | To Do | - | Medium | BE1 |
| **ISSUE-16.3** | Task | Tích hợp Redlock (Redis Distributed Lock) chống tranh chấp ca khẩn cấp | To Do | - | High | BE1 |
| **ISSUE-17.1** | User Story | Luồng 1: Đặt ca Khẩn cấp Realtime (Instant 30-60 phút) - API tạo đơn | To Do | - | Medium | BE1, FE1 |
| **ISSUE-17.2** | Task | Bắn Event `INSTANT_BOOKING_CREATED` qua Spring `ApplicationEventPublisher` | To Do | - | High | BE1, DE |
| **ISSUE-17.3** | Task | Màn hình Popup Đếm ngược 30-45s nhận ca khẩn cấp trên App Thợ | To Do | - | High | FE2 |
| **ISSUE-17.4** | Task | Logic Thợ bấm 'Chấp nhận' ca -> Khóa đơn duy nhất và phát sinh Escrow cọc | To Do | - | High | BE1, FE2 |
| **ISSUE-18.1** | User Story | Luồng 2: Đặt Lịch Hẹn Trước cho tương lai (Scheduled Booking Flow) | To Do | - | Medium | BE1, FE1 |
| **ISSUE-18.2** | Task | Lịch bận cá nhân Thợ (`mua_calendars`) - Khóa ca làm trùng giờ | To Do | - | High | BE1, FE2 |
| **ISSUE-18.3** | Task | Scheduler Cron Job tự động phát thông báo nhắc lịch ca hẹn trước 24h & 2h | To Do | - | Medium | BE1 |
| **ISSUE-19.1** | User Story | Agency Dispatching Engine - Tiếp nhận đơn đặt chỉ định Studio | To Do | - | Medium | BE1, FE3 |
| **ISSUE-19.2** | Task | UI Ma trận Lịch rảnh & Gán Thợ chính / Thợ phụ cho ca trên Web Studio | To Do | - | High | FE3, BE1 |
| **ISSUE-19.3** | Task | Tính năng Đổi Thợ dự phòng khi Thợ chính báo bận đột xuất trên Web Studio | To Do | - | Medium | BE1, FE3 |
| **SPRINT 4** | **WSS & IN-APP NOTIF** | **Sprint 4: Embedded WebSocket WSS & In-App Notification (11 Issues)** | | | | |
| **ISSUE-20.1** | User Story | WebSocket Realtime Gateway - Tích hợp Embedded STOMP WebSocket trong core-api | To Do | - | Medium | BE2, SA |
| **ISSUE-20.2** | Task | Kết nối màng lưới thời gian thực mã hóa WSS (WebSocket Secure qua SSL) | To Do | - | High | BE2, DE |
| **ISSUE-20.3** | Task | Authentication Middleware xác thực kết nối WebSocket bằng Short-lived JWT | To Do | - | High | BE2 |
| **ISSUE-20.4** | Task | Tích hợp Redis PubSub Adapter đồng bộ kết nối WebSocket trên nhiều Gateway | To Do | - | High | BE2, DE |
| **ISSUE-20.5** | Task | Kênh Broadcast Popup Đếm ngược 30s đồng loạt đến App các Thợ rảnh | To Do | - | High | BE2, FE2 |
| **ISSUE-20.6** | Task | Kênh Stream vị trí GPS Thợ di chuyển Realtime cho Khách xem trên bản đồ | To Do | - | High | BE2, FE1 |
| **ISSUE-21.1** | User Story | In-App Notification Module - Xử lý thông báo In-App qua In-Memory EventBus | To Do | - | Medium | BE2, DE |
| **ISSUE-21.2** | Task | @EventListener lắng nghe Event phát sinh từ các Domain Modules | To Do | - | High | BE2 |
| **ISSUE-21.3** | Task | Xử lý chống trùng lặp thông báo Event qua Event ID | To Do | - | Medium | BE2 |
| **ISSUE-21.4** | Task | In-App Toast Popup Notification Client-side (<100ms response time) | To Do | - | High | FE1, FE2, FE3 |
| **ISSUE-21.5** | Task | Lưu danh sách thông báo In-App vào Bảng `in_app_notifications` & Đánh dấu Đã đọc | To Do | - | Medium | BE2 |
| **SPRINT 5** | **WALLETS & PAYMENTS** | **Sprint 5: Ví 7 Bảng Sổ Cái & Thanh Toán Payout (11 Issues)** | | | | |
| **ISSUE-22.1** | User Story | Phân vùng Ví 7 Bảng - Khởi tạo Schema Sổ cái Kế toán Đúp (`wallet_schema` trong core-api) | To Do | - | Medium | BE3, SA |
| **ISSUE-22.2** | Task | Module Quản lý Số dư khả dụng & Số dư phong tỏa trong Bảng `wallets` | To Do | - | High | BE3 |
| **ISSUE-22.3** | Task | Bảng Sổ cái Kế toán Đúp (`ledger_entries`) hạch toán Nợ (`debit`) / Có (`credit`) đối ứng | To Do | - | High | BE3 |
| **ISSUE-22.4** | Task | Bảng Sao kê Biến động số dư từng Ví (`wallet_transactions`) CREDIT/DEBIT/FREEZE | To Do | - | High | BE3 |
| **ISSUE-22.5** | Task | Cơ chế Escrow Tự động: Giữ cọc -> Giải ngân Ví Thợ/Studio -> Cắt % Hoa hồng Sàn | To Do | - | High | BE3 |
| **ISSUE-23.1** | User Story | Bảng Quản lý Tài khoản Ngân hàng chính chủ đã liên kết (`user_bank_accounts`) | To Do | - | Medium | BE3, FE2 |
| **ISSUE-23.2** | Task | Tích hợp Cổng thanh toán MoMo API (Khởi tạo QR & Webhook IPN xác nhận) | To Do | - | High | BE3, FE1 |
| **ISSUE-23.3** | Task | Tích hợp Cổng thanh toán VNPay API (VNPay Sandbox Checkout & IPN) | To Do | - | High | BE3, FE1 |
| **ISSUE-23.4** | Task | Tích hợp Cổng thanh toán ZaloPay & Phương thức VietQR Nạp tiền Ví | To Do | - | Medium | BE3, FE1 |
| **ISSUE-23.5** | Task | Bảng Yêu cầu Rút tiền (`withdrawal_requests`) & Payout API giải ngân Ngân hàng | To Do | - | High | BE3, FE2, FE3 |
| **ISSUE-23.6** | Task | Dashboard Quản lý Duyệt Yêu cầu Rút tiền cho Admin / Studio Web Portal | To Do | - | Medium | FE3, BE3 |
| **SPRINT 6** | **TESTING & GO-LIVE** | **Sprint 6: Polish UI, Testing, Security & Go-Live (13 Issues)** | | | | |
| **ISSUE-24.1** | User Story | Module Đánh giá Rating 1-5★ & Nhận xét chất lượng sản phẩm (`reviews`) | To Do | - | Medium | BE1, FE1 |
| **ISSUE-24.2** | Task | Tính năng Tip tiền trực tiếp cho Thợ từ Ví Khách hàng sau khi hoàn thành ca | To Do | - | Medium | BE3, FE1 |
| **ISSUE-24.3** | Task | Module Đơn Khiếu nại Dịch vụ (`disputes`) & Quy trình Tạm đóng băng tiền | To Do | - | Medium | BE1, FE1 |
| **ISSUE-25.1** | User Story | Hoàn thiện UI/UX App Khách hàng (Map tracking thợ, Lightbox Portfolio) | To Do | - | Medium | FE1 |
| **ISSUE-25.2** | Task | Hoàn thiện UI/UX App Thợ (Công tắc On/Off phát sóng GPS, Đĩa đếm ngược) | To Do | - | Medium | FE2 |
| **ISSUE-25.3** | Task | Hoàn thiện UI/UX Web Studio Portal (Dashboard Analytics, Ma trận xếp ca) | To Do | - | Medium | FE3 |
| **ISSUE-26.1** | User Story | Viết Kịch bản Integration Test E2E: Đặt đơn -> EventBus -> WebSocket -> Ví | To Do | - | Medium | QA, BE1-3 |
| **ISSUE-26.2** | Task | Thực thi Kiểm thử Tích hợp E2E trên Môi trường Staging | To Do | - | High | QA |
| **ISSUE-27.1** | User Story | Load Testing Redis GEO & Embedded WSS: Giả lập 1,000 Thợ phát sóng GPS Telemetry đồng thời | To Do | - | Medium | QA, DE, SA |
| **ISSUE-27.2** | Task | Stress Testing Booking Engine: Giả lập 500 yêu cầu Đặt ca khẩn cấp/giây | To Do | - | High | QA, DE |
| **ISSUE-28.1** | User Story | Security Audit: Kiểm tra mã hóa TLS/WSS, Masking số dư Ví & OWASP Top 10 | To Do | - | Medium | SA, DE |
| **ISSUE-28.2** | Task | Bug Fixing & Tối ưu hóa hiệu năng SQL Queries, B-Tree & GIST Spatial Indexes | To Do | - | High | BE1-3 |
| **ISSUE-29.1** | User Story | Triển khai Kubernetes Cluster Production, Domain/SSL & Go-Live | To Do | - | Medium | Full Team |

---

*Tài liệu Đặc tả SRS được chuẩn hóa 100% theo chuẩn ISO/IEC/IEEE 29148.*
