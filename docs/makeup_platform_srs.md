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
* **Hệ thống Thông báo Trực tiếp trên App (In-App Realtime Notifications via Kafka):** Đẩy thông báo tức thì (<100ms) trực tiếp trên giao diện Ứng dụng qua kết nối WebSocket & Kafka Event Streaming, hoàn toàn loại bỏ sự phụ thuộc vào Email.
* **Đầy đủ Đặc tả Backend Microservices & Frontend Multi-platform:** Cung cấp chi tiết kiến trúc Backend Microservices, Mô hình Phân quyền RBAC 4 Bảng, Phân vùng Ví 7 Bảng Sổ cái Kế toán Đúp, Database PostgreSQL + PostGIS 26 Bảng cốt lõi và Giao diện Ứng dụng Mobile App / Web App cho cả 3 nhóm người dùng.

### 2. Phạm vi hệ thống (System Scope)
* **Trong phạm vi (In-Scope):**
  * **Phân hệ Khách hàng (Customer Mobile / Web App):** Giao diện Đặt lịch 2 luồng, Khám phá vị trí, Live Tracking GPS thợ, In-App Toast Popup, Thanh toán Ví/Thẻ, Đánh giá & Tip.
  * **Phân hệ Thợ Make-up Tự do (Freelance MUA Mobile App):** Giao diện Popup đếm ngược 30s nhận ca, Quản lý Portfolio Album hoàn thiện, Bật/Tắt phát sóng GPS, Ví cá nhân & Rút tiền Ngân hàng.
  * **Phân hệ Đại lý Make-up (Agency Studio Web Portal):** Dashboard quản lý thợ, Giao diện Điều phối Dispatching thợ chính/phụ, Quản lý kỹ năng phong cách thợ (`agency_staff_styles`), Ví đại lý & Payout API.
  * **Hệ thống Backend Microservices:** 10 Microservices chuyên sâu với **WebSocket Gateway riêng biệt** và Event-Driven Architecture qua Apache Kafka Event Bus.
* **Ngoài phạm vi (Out-of-Scope):**
  * Tích hợp máy POS phần cứng tại cửa hàng vật lý.
  * Gửi Email thông báo truyền thống (thay thế 100% bằng In-App Realtime Notifications & Kafka Event Streaming).

### 3. Mục tiêu hệ thống (System Objective)
* **Tập trung hóa dữ liệu & Kết nối:** Lưu trữ toàn bộ thông tin tài khoản, lịch hẹn, hồ sơ tay nghề, lịch sử giao dịch trong một hệ thống duy nhất.
* **Thời gian thực (Realtime Efficiency):** Cập nhật vị trí di chuyển của thợ (GPS Telemetry) và Broadcast thông báo In-App qua Kafka & WebSocket Gateway (<100ms).
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

### 1. Kiến trúc Modular Monolith Chi tiết (Modular Monolith Architecture)

Hệ thống Backend được thiết kế theo mô hình **Modular Monolith Architecture (Monolith Mô-đun hóa dựa trên Domain-Driven Design)**. Toàn bộ hệ thống đóng gói và triển khai trong **1 ứng dụng Spring Boot đơn lẻ**, gọi hàm trực tiếp hoặc qua **Spring In-Memory EventBus (`ApplicationEventPublisher`)** giữa các mô-đun (<5ms latency), kết hợp với **Embedded WebSocket Gateway** phục vụ kết nối WSS thời gian thực.

```
                                    +-------------------------------------------------------+
                                    |              SINGLE MONOLITH CORE APP                 |
                                    |                (Spring Boot :8080)                    |
                                    +-------------------------------------------------------+
                                                                 |
            +--------------------+-------------------------------+-------------------------------+--------------------+
            |                    |                               |                               |                    |
      +-----------+        +-----------+                   +-----------+                   +-----------+        +-----------+
      | Module 1: |        | Module 2: |                   | Module 3: |                   | Module 4: |        | Module 7: |
      | Auth &    |        | Agency    |                   | Catalog & |                   | Booking & |        | Wallet &  |
      | Profile   |        | Operations|                   | Media     |                   | Dispatch  |        | Escrow    |
      +-----------+        +-----------+                   +-----------+                   +-----------+        +-----------+
            |                    |                               |                               |                    |
      +-----v--------------------v-------------------------------v-------------------------------+--------------------v-----+
      |                        SPRING IN-MEMORY EVENT BUS (ApplicationEventPublisher) / REDIS GEO                        |
      +-------------------------------------------------------------------------------------------------------------------+
            |                                            |                                               |
      +-----------+                                +-----------+                                   +-----------+
      | Module 5: |                                | Module 6: |                                   | Module 8: |
      | Telemetry |                                | Dynamic   |                                   | In-App    |
      | GPS       |                                | Pricing   |                                   | Notif     |
      +-----------+                                +-----------+                                   +-----------+
            |                                                                                            |
            +--------------------------------------------+-----------------------------------------------+
                                                         |
                                    +-------------------------------------------------------+
                                    |            Module 9: Embedded WebSocket Gateway       |
                                    +-------------------------------------------------------+
```

#### **Cấu trúc Thư mục Mã nguồn Phân tách Miền (Modular Folder Structure):**
```
src/main/java/com/makeup/platform/
├── MakeupBookingApplication.java             # Entry point đơn lẻ khởi chạy Monolith App
├── config/                                    # Security, CORS, PostGIS, Async & Event Config
├── common/                                    # Base Entities, Base DTOs, Exception Handlers, Utils
└── modules/                                   # 10 DOMAIN MODULES ĐỘC LẬP (BOUNDED CONTEXTS)
    ├── auth/                                  # Module 1: Auth & User Profile (RBAC 4 Bảng)
    ├── agency/                                # Module 2: Agency Operations & Staff Management
    ├── catalog/                               # Module 3: Service Catalog, Styles & Surcharges
    ├── booking/                               # Module 4: Booking Engine & Dispatching (State Machine)
    ├── telemetry/                             # Module 5: GPS Location Telemetry & Redis GEO Index
    ├── pricing/                               # Module 6: Dynamic Pricing & Distance Calculator
    ├── wallet/                                # Module 7: Double-Entry Ledger Wallet & Escrow (7 Bảng)
    ├── notification/                          # Module 8: In-App Realtime Toast Notifications
    ├── websocket/                             # Module 9: Embedded WSS Gateway Connection Handler
    └── review/                                # Module 10: Ratings, Tips & Dispute Management
```

Danh sách 10 Domain Modules trong Modular Monolith Core:
1. **Auth & Profile Module** (`com.makeup.platform.modules.auth`): Auth OAuth2/JWT, Profile 3 nhóm, Phân quyền RBAC 4 Bảng (`users`, `roles`, `user_roles`, `role_permissions`).
2. **Agency Operations Module** (`com.makeup.platform.modules.agency`): Mời/duyệt thợ đại lý, gán kỹ năng phong cách (`agency_staff_styles` & `mua_styles`), xếp ca cố định & hoa hồng nội bộ.
3. **Catalog & Media Module** (`com.makeup.platform.modules.catalog`): Gói dịch vụ Agency vs Freelancer & Album Ảnh sản phẩm hoàn thiện của Freelancer & Studio Staff (`portfolio_showcases`).
4. **Booking & Dispatching Module** (`com.makeup.platform.modules.booking`): Máy trạng thái đơn (State Machine), 2 luồng đặt lịch, chống race-condition bằng Redlock.
5. **Location & Telemetry Module** (`com.makeup.platform.modules.telemetry`): Stream GPS thợ (5-10s) high-throughput lưu Redis GEO & PostGIS Spatial Index.
6. **Dynamic Pricing Module** (`com.makeup.platform.modules.pricing`): Phí km di chuyển, phụ phí giờ sớm/đêm, Surge Pricing & Preview Hóa đơn.
7. **Wallet & Escrow Module** (`com.makeup.platform.modules.wallet`): Ví 7 Bảng Sổ cái Kế toán Đúp (`wallets`, `user_bank_accounts`, `withdrawal_requests`, `payment_transactions`, `transactions`, `wallet_transactions`, `ledger_entries`), Escrow cọc, Payout API.
8. **In-App Notification Module** (`com.makeup.platform.modules.notification`): Tiêu thụ Sự kiện In-Memory đẩy Toast Popup Realtime qua Embedded WebSocket Gateway <5ms.
9. **Embedded WebSocket Gateway Module** (`com.makeup.platform.modules.websocket`): Xử lý kết nối persistent 2 chiều WSS trực tiếp trên ứng dụng chính.
10. **Review, Tip & Dispute Module** (`com.makeup.platform.modules.review`): Đánh giá 1-5★, Tip tiền trực tiếp cho Thợ & Đơn khiếu nại chất lượng dịch vụ.

---

### 2. Danh mục Công nghệ Sử dụng (Technology Stack)

Hệ thống được xây dựng trên nền tảng công nghệ hiện đại, đảm bảo tính sẵn sàng cao, chịu tải lớn và độ trễ thấp (<5ms):

| Phân hệ / Tầng | Thành phần Kỹ thuật | Công nghệ & Thư viện sử dụng | Lý do Lựa chọn & Vai trò Kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Backend Core** | Ngôn ngữ & Runtime | **Java 21 LTS** | Hỗ trợ Virtual Threads (Project Loom) xử lý hàng chục nghìn kết nối đồng thời với mức tiêu hao RAM tối thiểu. |
| | Framework Chính | **Spring Boot 3.3.x** | Chuẩn công nghiệp mạnh mẽ, tích hợp Spring Web, Spring Security, Spring Data JPA, Spring Validation. |
| | Kiến trúc Ứng dụng | **Modular Monolith (DDD)** | Đóng gói đơn lẻ (Single Deployment), cấu trúc theo Bounded Contexts, dễ bảo trì và sẵn sàng tách Microservices khi mở rộng. |
| | In-Memory EventBus | **Spring ApplicationEvents** | Truyền phát sự kiện nội bộ bất đồng bộ (`@Async`) giữa các Domain Modules với độ trễ siêu thấp (<5ms), không tốn chi phí mạng. |
| | Distributed Lock | **Redisson (Redis Lock)** | Cơ chế Redlock chống tranh chấp nhận đơn ca khẩn cấp (Race condition) giữa nhiều thợ cùng lúc. |
| **Cơ sở Dữ liệu & Lưu trữ** | Hệ quản trị CSDL Quan hệ | **PostgreSQL 16** | Cơ sở dữ liệu chính tuân thủ chuẩn ACID, tối ưu hóa JSONB, Partitioning và độ tin cậy giao dịch tài chính cực cao. |
| | Không gian Địa lý (GIS) | **PostGIS 3.4 Extension** | Xử lý tọa độ địa lý, chỉ mục không gian `GIST(location_point)`, tính khoảng cách cầu phẳng `ST_DistanceSphere` và quét bán kính `ST_DWithin`. |
| | In-Memory Cache & GEO | **Redis 7.2** | Cấu trúc dữ liệu `GEOADD` / `GEORADIUS` quét thợ rảnh thời gian thực theo tọa độ GPS, lưu Session và Cache dữ liệu truy vấn cao. |
| | Migration Công cụ | **Flyway 10.x** | Tự động hóa quản lý và đồng bộ phiên bản cấu trúc Database DDL giữa các môi trường phát triển và Production. |
| **Frontend Clients** | Mobile App (Khách & Thợ) | **Flutter 3.22+ / Dart** (hoặc **React Native**) | Đa nền tảng (iOS & Android) từ một codebase duy nhất, render đồ họa Skia 60fps mượt mà, hỗ trợ background GPS tracking. |
| | Web Portal (Studio & Admin)| **Next.js 14 (App Router) & React 18** | Tối ưu hóa SEO, Server-Side Rendering (SSR), quản lý trạng thái phức tạp cho Dashboard điều phối Dispatching và Ma trận xếp ca. |
| | UI & Styling Framework | **Tailwind CSS & Shadcn UI** | Thiết kế giao diện hiện đại, chuẩn Responsive trên Desktop, Tablet và Mobile. |
| | Bản đồ & Định vị SDK | **Google Maps SDK / Goong Maps API** | Tìm kiếm địa điểm (Autocomplete Places), tính toán ma trận khoảng cách và dẫn đường cho thợ. |
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
1. **Bước 1:** Khách hàng chọn gói dịch vụ & nhập địa điểm $\rightarrow$ Gọi Dynamic Pricing Service tính tổng tiền (Giá gói + Phí km + Phụ phí).
2. **Bước 2:** Location Service quét danh sách Thợ/Đại lý rảnh trong bán kính $R$ km dựa trên vị trí Redis GEO.
3. **Bước 3:** Booking Engine phát sự kiện `INSTANT_BOOKING_CREATED` vào In-Memory EventBus.
4. **Bước 4:** In-App Notification Module tiêu thụ sự kiện $\rightarrow$ Gọi Embedded WebSocket Gateway bật Popup đếm ngược (Countdown 30-45s) đồng loạt trên App các Thợ rảnh.
5. **Bước 5:** Thợ nhấn "Chấp nhận" $\rightarrow$ Booking Engine xử lý Redlock (Redis Distributed Lock) đảm bảo duy nhất 1 thợ trúng đơn $\rightarrow$ Chuyển trạng thái đơn `ACCEPTED`.
6. **Bước 6:** Thợ bật phát sóng GPS di chuyển $\rightarrow$ Cập nhật trạng thái chặng ca làm (Đã đến $\rightarrow$ Bắt đầu make $\rightarrow$ Chụp ảnh nghiệm thu $\rightarrow$ Hoàn thành).
7. **Bước 7:** Payment Service tự động giải ngân tiền từ Ví Escrow sang Ví Thợ sau khi trừ % hoa hồng Sàn.

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
| **IN_PROGRESS** | Thợ upload ảnh nghiệm thu & bấm "Hoàn thành" | `COMPLETED` | Bắn Event `BOOKING_COMPLETED` vào Kafka Topic. |
| **COMPLETED** | Wallet Service nhận Event Kafka | `PAID_OUT` | Cắt % hoa hồng Sàn, chuyển tiền còn lại về Ví Thợ / Ví Đại lý. |
| **Bất kỳ (REQUESTED / ACCEPTED)** | Khách / Thợ hủy đơn | `CANCELLED` | Tính phí hoàn hủy theo chính sách, hoàn trả tiền ví khách nếu hợp lệ. |
| **COMPLETED** | Khách gửi khiếu nại | `DISPUTED` | Tạm đóng băng tiền ví đơn hàng, đẩy ticket về Bộ phận CSKH. |

---

## III. ĐẶC TẢ CHI TIẾT GIAO DIỆN & MÀN HÌNH FRONTEND (CLIENT UI/UX SPECIFICATION)

### 1. Phân hệ App Khách hàng (Customer Mobile / Web App)

| Tên Màn hình UI | Thành phần Giao diện (UI Components) | Luồng Tương tác & Xử lý Kỹ thuật (Client-Side Logic) |
| :--- | :--- | :--- |
| **Trang chủ & Khám phá<br>(Home & Discovery)** | • Bản đồ hiển thị Pin vị trí các Thợ/Studio rảnh gần nhất.<br>• Thanh tìm kiếm theo tên thợ, phong cách make-up.<br>• Tab chuyển đổi: **[Đại lý / Studio]** vs **[Thợ Tự do]**.<br>• Carousel Banner ưu đãi & Gói dịch vụ HOT. | • Gọi Location Service quét thợ gần nhất trong bán kính $R$ km.<br>• Bộ lọc nâng cao theo Mức giá, Rating 1-5★, Khung giờ rảnh.<br>• Chuyển sang màn hình Profile khi bấm vào Pin/Card. |
| **Profile Thợ / Studio<br>(Profile & Portfolio)** | • Ảnh đại diện, Bio phong cách, Số năm kinh nghiệm, Chứng chỉ.<br>• Điểm Rating & Danh sách Đánh giá từ khách hàng cũ.<br>• Album ảnh sản phẩm hoàn thiện của khách trước đó (`portfolio_showcases`).<br>• Danh sách Bảng giá gói dịch vụ & Phụ phí niêm yết. | • Tải danh mục gói từ Catalog Service.<br>• Tải danh sách ảnh mẫu thực tế từ `portfolio_showcases`.<br>• Nút "Đặt ngay (Realtime)" & "Đặt lịch hẹn trước (Scheduled)". |
| **Đặt lịch 2 Luồng<br>(Booking Flow)** | • Form chọn Ngày/Giờ (Scheduled) hoặc Đặt gấp 30-60 phút (Realtime).<br>• Ô nhập Địa điểm trang điểm (Tích hợp Google Autocomplete Places).<br>• Bảng tính tiền chi tiết minh bạch: *Giá gói + Phí km + Phụ phí - Voucher*. | • Trích xuất tọa độ GPS nhà khách.<br>• Gọi Dynamic Pricing API trả về hóa đơn chi tiết realtime.<br>• Màn hình Chờ đếm ngược (Luồng Realtime) hiển thị đĩa quay tìm thợ. |
| **Tracking Thợ Realtime<br>(Live Location Tracking)** | • Bản đồ hiển thị icon Thợ đang di chuyển Realtime về nhà khách.<br>• Khung thông tin Thợ: Tên, SĐT, Thời gian dự kiến đến (ETA).<br>• Nút bấm: Chat In-App, Gọi điện trực tiếp. | • Đăng ký kênh WebSocket `location-stream-{booking_id}`.<br>• Render vị trí thợ di chuyển mượt mà trên bản đồ từ dữ liệu GPS nhận qua WSS.<br>• Cập nhật trạng thái ca làm Realtime. |
| **Ví Khách & Thanh toán<br>(Wallet & Payment)** | • Số dư Ví khách, Nút Nạp tiền.<br>• Danh sách Phương thức thanh toán (MoMo, VNPay, ZaloPay, Thẻ, Tiền mặt).<br>• Lịch sử giao dịch & biên lai thanh toán. | • Gọi Payment Service khởi tạo giao dịch thanh toán/nạp tiền.<br>• Mở SDK Thanh toán MoMo/VNPay/ZaloPay.<br>• Nhận Webhook xác nhận nạp tiền thành công. |
| **Đánh giá & Tip<br>(Review & Tip)** | • Chọn số sao (1-5★), Nhập câu nhận xét.<br>• Khung chọn số tiền Tip cho thợ (20k, 50k, 100k hoặc tùy chọn).<br>• Nút Tải ảnh sản phẩm hoàn thành sau make-up. | • Gửi đánh giá về Review Service.<br>• Trừ tiền Tip từ Ví khách/Cổng thanh toán để chuyển trực tiếp cho Thợ. |

---

### 2. Phân hệ App Thợ Make-up Tự do (Freelance MUA Mobile App)

| Tên Màn hình UI | Thành phần Giao diện (UI Components) | Luồng Tương tác & Xử lý Kỹ thuật (Client-Side Logic) |
| :--- | :--- | :--- |
| **Trang chính & Công tắc Rảnh<br>(Dashboard & Status Toggle)** | • Công tắc gạt (Switch Button): **[Sẵn sàng nhận job / Bận / Offline]**.<br>• Danh sách Ca hẹn hôm nay theo mốc thời gian.<br>• Widget Thống kê nhanh: Thu nhập hôm nay, Số ca hoàn thành. | • Khi bật "Sẵn sàng", kích hoạt Location Task phát sóng GPS (Telemetry) mỗi 5-10s về Location Service.<br>• Đăng ký kênh WebSocket `mua-channel-{mua_id}` nhận đơn. |
| **Nhận Ca Realtime<br>(Instant Match Countdown)** | • Màn hình Popup đếm ngược **30 - 45 giây** với vòng tròn thời gian.<br>• Thông tin ca: Gói dịch vụ, Địa chỉ khách, Số tiền thực nhận.<br>• 2 Nút hành động lớn: **[CHẤP NHẬN CA]** (Màu xanh) & **[TỪ CHỐI]** (Màu đỏ). | • Phát âm thanh chuông báo có ca khẩn cấp.<br>• Khi bấm "Chấp nhận", gọi API `acceptBooking` (gửi Redlock).<br>• Nếu hết 45s không bấm, tự động đóng Popup và ghi nhận bỏ lỡ. |
| **Quản lý Portfolio & Gói Dịch vụ** | • Giao diện Upload Album ảnh sản phẩm hoàn thiện của khách trước đó.<br>• Form tạo/sửa gói dịch vụ cá nhân: Tên gói, Giá, Thời gian hoàn thành.<br>• Cấu hình Bán kính nhận đơn tối đa (Slider chọn từ 1km - 30km). | • Nén ảnh client-side trước khi upload lên Cloudinary/S3 CDN.<br>• Cập nhật bảng giá cá nhân & album mẫu về Catalog Service. |
| **Thực hiện Ca làm<br>(Job Execution Flow)** | • Thanh tiến trình 5 chặng:<br>  *1. Bắt đầu đi $\rightarrow$ 2. Đã đến $\rightarrow$ 3. Bắt đầu make $\rightarrow$ 4. Chụp ảnh $\rightarrow$ 5. Hoàn thành*.<br>• Nút Tải ảnh nghiệm thu khách hàng sau khi make-up xong.<br>• Nút Yêu cầu phát sinh chi phí tại chỗ. | • Kích hoạt GPS di chuyển ở Chặng 1.<br>• Gửi Event cập nhật trạng thái đơn qua WebSocket Gateway.<br>• Bắt buộc upload 1 ảnh nghiệm thu ở Chặng 4 để kích hoạt hoàn thành. |
| **Ví Thợ & Rút tiền<br>(MUA Wallet & Payout)** | • Số dư Ví thợ khả dụng, Số tiền đang giữ cọc.<br>• Bảng kê doanh thu chi tiết từng job (đã trừ % hoa hồng sàn).<br>• Form nhập số tiền & Chọn Ngân hàng nhận tiền (Payout). | • Gọi Wallet Service kiểm tra hạn mức rút tiền.<br>• Gửi yêu cầu Rút tiền về Ngân hàng (`withdrawal_requests`).<br>• Nhận In-App Toast Notification khi tiền về tài khoản. |

---

### 3. Phân hệ Web App Đại lý / Studio (Agency Web Portal)

| Tên Màn hình UI | Thành phần Giao diện (UI Components) | Luồng Tương tác & Xử lý Kỹ thuật (Client-Side Logic) |
| :--- | :--- | :--- |
| **Dashboard Quản lý Tổng quan<br>(Overview Dashboard)** | • Biểu đồ Doanh thu Studio theo Ngày/Tuần/Tháng.<br>• Thống kê: Tổng số thợ, Số ca đang làm, Tỷ lệ lấp đầy lịch.<br>• Bảng cảnh báo ca làm sắp đến giờ cần điều phối. | • Tải dữ liệu báo cáo thống kê từ Analytics Engine.<br>• Đăng ký WebSocket `agency-dashboard-{agency_id}` cập nhật số liệu Realtime. |
| **Quản lý Thợ thuộc Studio<br>(Staff Management)** | • Danh sách thợ thuộc Studio (Thông tin, SĐT, Trạng thái rảnh/bận).<br>• Form Gán kỹ năng Tone Make-up cho thợ (`agency_staff_styles`).<br>• Mã QR / Mã Code mời thợ mới gia nhập Studio.<br>• Form Cấu hình % Hoa hồng nội bộ (% Studio nhận vs % Thợ nhận). | • API Mời/Duyệt thợ vào Studio.<br>• Cấu hình quy tắc gán Tone Make-up & chia hoa hồng.<br>• Khóa/Tạm dừng hoạt động của thợ trong Studio. |
| **Tiếp nhận & Điều phối Job<br>(Agency Dispatching)** | • Màn hình Tiếp nhận đơn đặt dành cho Studio.<br>• Ma trận Lịch rảnh, Vị trí GPS & Tone Make-up của thợ thuộc Studio.<br>• Form Gán thợ chính / Thợ phụ cho đơn hàng.<br>• Bản đồ Giám sát vị trí toàn bộ thợ của Studio đang đi làm Realtime. | • Nhận In-App Toast Popup thông báo có đơn mới qua WebSocket.<br>• Gọi API Dispatching gán thợ $\rightarrow$ Đẩy notification về App Thợ.<br>• Đổi thợ dự phòng khi thợ chính báo bận đột xuất. |
| **Quản lý Bảng giá Studio<br>(Agency Catalog)** | • Form thiết lập Danh mục Gói trang điểm của Studio (Cô dâu, Tiệc, Kỷ yếu...).<br>• Thiết lập phụ phí Studio: Phụ phí làm sớm 3h-5h sáng, phụ phí đi tỉnh.<br>• Quản lý Album ảnh sản phẩm chính thức của Studio. | • Cập nhật Agency Service Catalog lên Catalog Service.<br>• Tải ảnh chất lượng cao quảng bá Studio lên CDN. |
| **Ví Đại lý & Thu chi Studio<br>(Agency Wallet & Payout)** | • Số dư Ví Đại lý (Doanh thu đã trừ % hoa hồng Sàn).<br>• Bảng kê chi tiết phân bổ thu nhập cho từng thợ thuộc Studio.<br>• Form Yêu cầu Rút tiền về Tài khoản Ngân hàng doanh nghiệp (`withdrawal_requests`). | • Trích xuất báo cáo thu chi dạng Excel/PDF.<br>• Gọi Payout API giải ngân tiền từ Ví Đại lý về Ngân hàng doanh nghiệp. |

---

## IV. THIẾT KẾ CHI TIẾT CƠ SỞ DỮ LIỆU (DATABASE DESIGN & SQL SPECIFICATION)

Cơ sở dữ liệu hệ thống áp dụng mô hình **PostgreSQL 16 + PostGIS Extension** chuẩn hóa 3NF kết hợp Phân quyền RBAC 4 Bảng và Phân vùng Ví 7 Bảng Sổ cái Kế toán Đúp:

### **Danh sách 26 Bảng Dữ liệu Cốt lõi:**
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
26. **`in_app_notifications`**, **`reviews`** & **`disputes`**: Thông báo In-App qua Kafka, Đánh giá sao 1-5★, Tip tiền & Đơn khiếu nại chất lượng dịch vụ (`DSP-260908-A9X2K`).

---

## V. YÊU CẦU TÍCH HỢP HỆ THỐNG & BẢO MẬT (INTEGRATION & SECURITY REQUIREMENTS)

### 1. Tích hợp Hệ thống Thanh toán & Ví điện tử (Payment Integration)
* **Phương thức:** MoMo, VNPay, ZaloPay, Thẻ ATM/Visa/Mastercard, VietQR, Tiền mặt.
* **Cơ chế Escrow:** Tự động giữ cọc $\rightarrow$ Ca hoàn thành $\rightarrow$ Tự động cắt hoa hồng Sàn (%) $\rightarrow$ Chuyển tiền còn lại vào Ví Đại lý hoặc Ví Thợ tự do theo mô hình Sổ cái Kế toán Đúp.

### 2. Tích hợp Định vị GPS & Maps (Telemetry Integration)
* **Dịch vụ:** Google Maps / Goong Maps API kết hợp Redis GEO và PostGIS.
* **Nhiệm vụ:** Tính khoảng cách di chuyển thực tế, tính phí ship/km và hiển thị vị trí thợ di chuyển Realtime.

### 3. Tích hợp Hệ thống Thông báo Trực tiếp trên App qua Kafka (In-App Notification Integration)
#### A. An toàn & Bảo mật (Security & Compliance):
* **Bảo mật Kết nối Realtime WebSocket:** Sử dụng mã hóa WSS (WebSocket Secure) qua TLS/SSL. Xác thực kết nối WebSocket bằng Short-lived JWT Token.
* **Xác thực Event Message trong Kafka:** Áp dụng SASL/PLAIN hoặc SASL/SCRAM cho kết nối giữa Microservices và Apache Kafka Cluster.
* **Chống Spam & Trùng tin (Rate Limiting):** Sử dụng Idempotency Key cho mỗi sự kiện thông báo tránh lặp thông báo khi Kafka Retry.
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

## VI. BẢNG PHÂN RÃ CÔNG VIỆC CHI TIẾT TỪNG TÍNH NĂNG (45-DAY GRANULAR WBS - 84 ISSUES / 7 SPRINTS)

### Danh sách 84 Jira Issues Phân bổ trong 7 Sprints (11 - 13 Issues / Sprint):

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPRINT 0** | **INFRAS & AUTH** | **Sprint 0: Khởi Tạo Dự Án, DB & Auth (13 Issues)** | | | | |
| **ISSUE-6** | Task | Khởi tạo Git Monorepo và cấu trúc thư mục Microservices | Done | 8/9/2026 | Medium | DE, SA |
| **ISSUE-4** | User Story | Tạo cấu trúc thư mục dự án tổng quan | Done | 8/9/2026 | High | DE, SA |
| **ISSUE-1** | User Story | Phân tích và tạo tài liệu đặc tả SRS cho phân hệ ADMIN | Done | 8/9/2026 | High | SA, BE1 |
| **ISSUE-8.1** | Task | Cấu hình Docker Compose cho PostgreSQL 16 & PostGIS Extension | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.2** | Task | Cấu hình Docker Compose cho Redis GEO Cluster & Cache | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.3** | Task | Cấu hình Docker Compose cho Apache Kafka Broker & Zookeeper | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.4** | Task | Viết Script DDL Migration 26 Bảng (RBAC 4 Bảng, Ví 7 Bảng) | In Progress | 9/9/2026 | High | BE1, DE |
| **ISSUE-3** | User Story | Tạo file User Story cho hệ thống mua-makeup | To Do | 9/9/2026 | High | SA, QA |
| **ISSUE-5** | User Story | Bổ sung file đặc tả cấu trúc hoàn chỉnh, Skills, Rules & Workflows | In Review | 9/9/2026 | High | SA |
| **ISSUE-9.1** | User Story | API Gateway Service - Khởi tạo Spring Cloud Gateway Microservice | To Do | - | Medium | BE1, SA |
| **ISSUE-9.2** | Task | API Gateway Service - Viết JWT Filter & Dynamic Routing | To Do | - | Medium | BE1 |
| **ISSUE-10.1** | User Story | User & Auth Service - API Đăng ký / Login OTP & OAuth2 3 Phân hệ | To Do | - | Medium | BE1, FE1 |
| **ISSUE-10.2** | Task | User & Auth Service - Tích hợp Phân quyền RBAC 4 Bảng (`users`, `roles`, `user_roles`, `role_permissions`) | To Do | - | Medium | BE1 |
| **SPRINT 1** | **PROFILE & CATALOG** | **Sprint 1: Hồ Sơ Thợ, Studio & Gói Dịch Vụ (12 Issues)** | | | | |
| **ISSUE-11.1** | User Story | Hồ sơ Thợ Make-up (`mua_profiles`), Bio & Chứng chỉ | To Do | - | Medium | BE2, FE2 |
| **ISSUE-11.2** | Task | Upload CDN (Cloudinary/S3) nén ảnh Portfolio chất lượng cao | To Do | - | Medium | BE2, FE2 |
| **ISSUE-11.3** | Task | Quản lý Album Ảnh sản phẩm hoàn thiện của khách trước đó (`staff_portfolio_showcases`) | To Do | - | High | BE2, FE2 |
| **ISSUE-12.1** | User Story | Quản lý Studio / Đại lý (`agency_profiles`), Hotline & Mã giới thiệu thợ | To Do | - | Medium | BE1, FE3 |
| **ISSUE-12.2** | Task | Quản lý Nhân viên Studio (`agency_staff`) & Duyệt thợ gia nhập | To Do | - | Medium | BE1, FE3 |
| **ISSUE-12.3** | Task | Cấu hình % Hoa hồng nội bộ giữa Studio và Thợ làm việc | To Do | - | Medium | BE1, FE3 |
| **ISSUE-12.4** | Task | Quản lý Năng lực thợ Studio theo Tone Make-up (`agency_staff_styles`) | To Do | - | High | BE2 |
| **ISSUE-13.1** | User Story | CRUD Master Categories & Tone Make-up (`master_service_categories`, `makeup_styles`) | To Do | - | Medium | BE2, FE1 |
| **ISSUE-13.2** | Task | CRUD Gói dịch vụ Studio/Freelancer (`service_packages`) | To Do | - | Medium | BE2, FE1 |
| **ISSUE-13.3** | Task | Chi tiết các bước thực hiện mặc định & Option mua thêm (`package_items`) | To Do | - | Medium | BE2, FE1 |
| **ISSUE-13.4** | Task | Gán Kỹ năng Gói Dịch vụ cho thợ Studio (`agency_staff_services`) | To Do | - | Medium | BE2, FE3 |
| **ISSUE-13.5** | Task | Cấu hình Phụ phí (`surcharges`): Làm sớm 3h-5h sáng, đi tỉnh & ngày Lễ/Tết | To Do | - | Medium | BE2, FE1 |
| **SPRINT 2** | **TELEMETRY & PRICING**| **Sprint 2: Telemetry GPS & Dynamic Pricing (11 Issues)** | | | | |
| **ISSUE-14.1** | User Story | Location Telemetry Service - Khởi tạo Microservice bằng Go / PostGIS | To Do | - | Medium | BE3, DE |
| **ISSUE-14.2** | Task | Redis GEO Spatial Index lưu tọa độ Thợ rảnh Realtime | To Do | - | High | BE3 |
| **ISSUE-14.3** | Task | GPS Telemetry Background Task trên Mobile App Thợ (Stream 5-10s) | To Do | - | High | FE2, BE3 |
| **ISSUE-14.4** | Task | API Quét danh sách Thợ/Studio rảnh trong bán kính R km từ vị trí khách | To Do | - | High | BE3 |
| **ISSUE-14.5** | Task | Bảng lưu vết Lịch sử tọa độ GPS di chuyển thợ (`telemetry_logs`) | To Do | - | Medium | BE3 |
| **ISSUE-15.1** | User Story | Dynamic Pricing Engine - Khởi tạo Microservice Tính giá động | To Do | - | Medium | BE3, FE1 |
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
| **ISSUE-17.2** | Task | Bắn Event `INSTANT_BOOKING_CREATED` vào Apache Kafka Topic | To Do | - | High | BE1, DE |
| **ISSUE-17.3** | Task | Màn hình Popup Đếm ngược 30-45s nhận ca khẩn cấp trên App Thợ | To Do | - | High | FE2 |
| **ISSUE-17.4** | Task | Logic Thợ bấm 'Chấp nhận' ca -> Khóa đơn duy nhất và phát sinh Escrow cọc | To Do | - | High | BE1, FE2 |
| **ISSUE-18.1** | User Story | Luồng 2: Đặt Lịch Hẹn Trước cho tương lai (Scheduled Booking Flow) | To Do | - | Medium | BE1, FE1 |
| **ISSUE-18.2** | Task | Lịch bận cá nhân Thợ (`mua_calendars`) - Khóa ca làm trùng giờ | To Do | - | High | BE1, FE2 |
| **ISSUE-18.3** | Task | Scheduler Cron Job tự động phát thông báo nhắc lịch ca hẹn trước 24h & 2h | To Do | - | Medium | BE1 |
| **ISSUE-19.1** | User Story | Agency Dispatching Engine - Tiếp nhận đơn đặt chỉ định Studio | To Do | - | Medium | BE1, FE3 |
| **ISSUE-19.2** | Task | UI Ma trận Lịch rảnh & Gán Thợ chính / Thợ phụ cho ca trên Web Studio | To Do | - | High | FE3, BE1 |
| **ISSUE-19.3** | Task | Tính năng Đổi Thợ dự phòng khi Thợ chính báo bận đột xuất trên Web Studio | To Do | - | Medium | BE1, FE3 |
| **SPRINT 4** | **WSS & KAFKA NOTIF** | **Sprint 4: WebSocket WSS & Kafka Notification (11 Issues)** | | | | |
| **ISSUE-20.1** | User Story | WebSocket Realtime Gateway - Khởi tạo Microservice độc lập (Node.js/WebFlux) | To Do | - | Medium | BE2, SA |
| **ISSUE-20.2** | Task | Kết nối màng lưới thời gian thực mã hóa WSS (WebSocket Secure qua SSL) | To Do | - | High | BE2, DE |
| **ISSUE-20.3** | Task | Authentication Middleware xác thực kết nối WebSocket bằng Short-lived JWT | To Do | - | High | BE2 |
| **ISSUE-20.4** | Task | Tích hợp Redis PubSub Adapter đồng bộ kết nối WebSocket trên nhiều Gateway | To Do | - | High | BE2, DE |
| **ISSUE-20.5** | Task | Kênh Broadcast Popup Đếm ngược 30s đồng loạt đến App các Thợ rảnh | To Do | - | High | BE2, FE2 |
| **ISSUE-20.6** | Task | Kênh Stream vị trí GPS Thợ di chuyển Realtime cho Khách xem trên bản đồ | To Do | - | High | BE2, FE1 |
| **ISSUE-21.1** | User Story | In-App Notification Service - Khởi tạo Service tiêu thụ Kafka Event Bus | To Do | - | Medium | BE2, DE |
| **ISSUE-21.2** | Task | Kafka Consumer lắng nghe Kafka Topic `notification-events` | To Do | - | High | BE2 |
| **ISSUE-21.3** | Task | Idempotency Key chống trùng lặp tin nhắn thông báo khi Kafka Retry | To Do | - | Medium | BE2 |
| **ISSUE-21.4** | Task | In-App Toast Popup Notification Client-side (<100ms response time) | To Do | - | High | FE1, FE2, FE3 |
| **ISSUE-21.5** | Task | Lưu danh sách thông báo In-App vào Bảng `in_app_notifications` & Đánh dấu Đã đọc | To Do | - | Medium | BE2 |
| **SPRINT 5** | **WALLETS & PAYMENTS** | **Sprint 5: Ví 7 Bảng Sổ Cái & Thanh Toán Payout (11 Issues)** | | | | |
| **ISSUE-22.1** | User Story | Phân vùng Ví 7 Bảng - Khởi tạo Schema Sổ cái Kế toán Đúp (`payment_service`) | To Do | - | Medium | BE3, SA |
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
| **ISSUE-26.1** | User Story | Viết Kịch bản Integration Test E2E: Đặt đơn -> Kafka -> WebSocket -> Ví | To Do | - | Medium | QA, BE1-3 |
| **ISSUE-26.2** | Task | Thực thi Kiểm thử Tích hợp E2E trên Môi trường Staging | To Do | - | High | QA |
| **ISSUE-27.1** | User Story | Load Testing Kafka & WSS: Giả lập 1,000 Thợ phát sóng GPS Telemetry đồng thời | To Do | - | Medium | QA, DE, SA |
| **ISSUE-27.2** | Task | Stress Testing Booking Engine: Giả lập 500 yêu cầu Đặt ca khẩn cấp/giây | To Do | - | High | QA, DE |
| **ISSUE-28.1** | User Story | Security Audit: Kiểm tra mã hóa TLS/WSS, Masking số dư Ví & OWASP Top 10 | To Do | - | Medium | SA, DE |
| **ISSUE-28.2** | Task | Bug Fixing & Tối ưu hóa hiệu năng SQL Queries, B-Tree & GIST Spatial Indexes | To Do | - | High | BE1-3 |
| **ISSUE-29.1** | User Story | Triển khai Kubernetes Cluster Production, Domain/SSL & Go-Live | To Do | - | Medium | Full Team |

---

*Tài liệu Đặc tả SRS được chuẩn hóa 100% theo chuẩn ISO/IEC/IEEE 29148.*
