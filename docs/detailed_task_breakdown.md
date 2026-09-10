# BẢNG PHÂN RÃ CÔNG VIỆC CHI TIẾT (GRANULAR JIRA WBS - 84 ISSUES / 7 SPRINTS)

---

## 📌 SPRINT 0: KHỞI TẠO DỰ ÁN LAYERED MONOLITH (CORE-API), DB & AUTH MODULE (13 ISSUES)

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-6** | Task | Khởi tạo Git Repository và cấu trúc thư mục Layered Monolith (`controller`, `service`, `repository`, `entity`) | Done | 8/9/2026 | Medium | DE, SA |
| **ISSUE-4** | User Story | Tạo cấu trúc thư mục dự án tổng quan | Done | 8/9/2026 | High | DE, SA |
| **ISSUE-1** | User Story | Phân tích và tạo tài liệu đặc tả SRS cho phân hệ ADMIN | Done | 8/9/2026 | High | SA, BE1 |
| **ISSUE-8.1** | Task | Cấu hình Docker Compose cho PostgreSQL 16 & PostGIS Extension | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.2** | Task | Cấu hình Docker Compose cho Redis GEO Cluster & Cache | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.3** | Task | Cấu hình Spring In-Memory EventBus (`ApplicationEventPublisher`) | In Progress | 9/9/2026 | Medium | DE |
| **ISSUE-8.4** | Task | Viết Script DDL Migration 26 Bảng (RBAC 4 Bảng, Ví 7 Bảng) | In Progress | 9/9/2026 | High | BE1, DE |
| **ISSUE-3** | User Story | Tạo file User Story cho hệ thống mua-makeup | To Do | 9/9/2026 | High | SA, QA |
| **ISSUE-5** | User Story | Bổ sung file đặc tả cấu trúc hoàn chỉnh, Skills, Rules & Workflows | In Review | 9/9/2026 | High | SA |
| **ISSUE-9.1** | User Story | Monolith Core Application - Khởi tạo Spring Boot App (:8080) | To Do | - | Medium | BE1, SA |
| **ISSUE-9.2** | Task | Spring Security & JWT Filter Middleware trong Single App | To Do | - | Medium | BE1 |
| **ISSUE-10.1** | User Story | Auth & Profile Module - API Đăng ký / Login OTP & OAuth2 3 Phân hệ | To Do | - | Medium | BE1, FE1 |
| **ISSUE-10.2** | Task | Auth & Profile Module - Tích hợp Phân quyền RBAC 4 Bảng (`users`, `roles`, `user_roles`, `role_permissions`) | To Do | - | Medium | BE1 |

---

## 📌 SPRINT 1: HỒ SƠ THỢ, STUDIO/ĐẠI LÝ & DANH MỤC GÓI DỊCH VỤ (12 ISSUES)

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
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

---

## 📌 SPRINT 2: LOCATION TELEMETRY GPS & DYNAMIC PRICING ENGINE (11 ISSUES)

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
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

---

## 📌 SPRINT 3: BOOKING ENGINE, LUỒNG 1 INSTANT, LUỒNG 2 SCHEDULED & DISPATCHING (13 ISSUES)

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
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

---

## 📌 SPRINT 4: EMBEDDED WEBSOCKET REALTIME GATEWAY & IN-APP NOTIFICATION MODULE (11 ISSUES)

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-20.1** | User Story | WebSocket Realtime Gateway - Tích hợp Embedded STOMP WebSocket trong core-api | To Do | - | Medium | BE2, SA |
| **ISSUE-20.2** | Task | Kết nối màng lưới thời gian thực mã hóa WSS (WebSocket Secure qua SSL) | To Do | - | High | BE2, DE |
| **ISSUE-20.3** | Task | Authentication Middleware xác thực kết nối WebSocket bằng Short-lived JWT | To Do | - | High | BE2 |
| **ISSUE-20.4** | Task | Tích hợp Redis PubSub Adapter đồng bộ kết nối WebSocket trên nhiều Gateway | To Do | - | High | BE2, DE |
| **ISSUE-20.5** | Task | Kênh Broadcast Popup Đếm ngược 30s đồng loạt đến App các Thợ rảnh gần nhất | To Do | - | High | BE2, FE2 |
| **ISSUE-20.6** | Task | Kênh Stream vị trí GPS Thợ di chuyển Realtime cho Khách xem trên bản đồ | To Do | - | High | BE2, FE1 |
| **ISSUE-21.1** | User Story | In-App Notification Module - Xử lý thông báo In-App qua In-Memory EventBus | To Do | - | Medium | BE2, DE |
| **ISSUE-21.2** | Task | @EventListener lắng nghe Event phát sinh từ các Domain Modules | To Do | - | High | BE2 |
| **ISSUE-21.3** | Task | Xử lý chống trùng lặp thông báo Event qua Event ID | To Do | - | Medium | BE2 |
| **ISSUE-21.4** | Task | In-App Toast Popup Notification Client-side (<100ms response time) | To Do | - | High | FE1, FE2, FE3 |
| **ISSUE-21.5** | Task | Lưu danh sách thông báo In-App vào Bảng `in_app_notifications` & Đánh dấu Đã đọc | To Do | - | Medium | BE2 |

---

## 📌 SPRINT 5: VÍ 7 BẢNG SỔ CÁI KẾ TOÁN ĐÚP & TÍCH HỢP THANH TOÁN PAYOUT (11 ISSUES)

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-22.1** | User Story | Phân vùng Ví 7 Bảng - Khởi tạo Schema Sổ cái Kế toán Đúp (`wallet_schema` trong core-api) | To Do | - | Medium | BE3, SA |
| **ISSUE-22.2** | Task | Module Quản lý Số dư khả dụng & Số dư phong tỏa trong Bảng `wallets` | To Do | - | High | BE3 |
| **ISSUE-22.3** | Task | Bảng Sổ cái Kế toán Đúp (`ledger_entries`) hạch toán Nợ (`debit`) / Có (`credit`) đối ứng | To Do | - | High | BE3 |
| **ISSUE-22.4** | Task | Bảng Sao kê Biến động số dư từng Ví (`wallet_transactions`) CREDIT/DEBIT/FREEZE | To Do | - | High | BE3 |
| **ISSUE-22.5** | Task | Cơ chế Escrow Tự động: Giữ cọc -> Giải ngân Ví Thợ/Studio -> Cắt % Hoa hồng Sàn | To Do | - | High | BE3 |
| **ISSUE-23.1** | User Story | Bảng Quản lý Tài khoản Ngân hàng chính chủ đã liên kết (`user_bank_accounts`) | To Do | - | Medium | BE3, FE2 |
| **ISSUE-23.2** | Task | Tích hợp Cổng thanh toán MoMo API (Khởi tạo QR & Webhook IPN xác nhận) | To Do | - | High | BE3, FE1 |
| **ISSUE-23.3** | Task | Tích hợp Cổng thanh toán VNPay API (VNPay Sandbox Checkout & IPN Callback) | To Do | - | High | BE3, FE1 |
| **ISSUE-23.4** | Task | Tích hợp Cổng thanh toán ZaloPay & Phương thức VietQR Nạp tiền Ví | To Do | - | Medium | BE3, FE1 |
| **ISSUE-23.5** | Task | Bảng Yêu cầu Rút tiền (`withdrawal_requests`) & Payout API giải ngân Ngân hàng | To Do | - | High | BE3, FE2, FE3 |
| **ISSUE-23.6** | Task | Dashboard Quản lý Duyệt Yêu cầu Rút tiền cho Admin / Studio Web Portal | To Do | - | Medium | FE3, BE3 |

---

## 📌 SPRINT 6: ĐÁNH GIÁ, POLISH UI, TESTING, SECURITY AUDIT & GO-LIVE PRODUCTION (13 ISSUES)

| Mã Issue | Loại Issue | Tên Tính năng / Task Kỹ thuật | Trạng thái | Hạn chót | Ưu tiên | Phụ trách |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
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

### 📊 TỔNG KẾT HỆ THỐNG JIRA BACKLOG:
- **Sprint 0**: 13 Issues (Sprint Khởi tạo & DDL DB).
- **Sprint 1**: 12 Issues (Profile, Studio & Gói dịch vụ).
- **Sprint 2**: 11 Issues (Telemetry GPS & Pricing Engine).
- **Sprint 3**: 13 Issues (Booking Engine 2 luồng & Dispatching).
- **Sprint 4**: 11 Issues (Embedded WebSocket WSS Gateway & In-App Notifications).
- **Sprint 5**: 11 Issues (Ví 7 Bảng Sổ cái & Cổng thanh toán Payout).
- **Sprint 6**: 13 Issues (Review, Polish UI, Testing, Security & Go-Live).
- **TỔNG CỘNG HỆ THỐNG**: **84 Issues chi tiết** phân bổ đều trong 7 Sprints (chuẩn 10-15 Issues / Sprint).
