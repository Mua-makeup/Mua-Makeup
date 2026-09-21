# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM & USER STORIES (SRS)
## TOÀN BỘ PHÂN HỆ ỨNG DỤNG DI ĐỘNG (MOBILE APP COMPLETE SPECIFICATION)
### DỰ ÁN: NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
**Mã phân hệ:** `APP-MOBILE-SRS` | **Phiên bản:** `1.0.0` | **Tiêu chuẩn áp dụng:** `ISO/IEC/IEEE 29148`  
**Nền tảng công nghệ:** React Native 0.86 + Expo SDK 57 (Expo Router) + TypeScript + Zustand + Expo SecureStore  
**Hạ tầng tích hợp:** Spring Boot Core API (`http://192.168.0.229:8080/api/v1`) & Embedded WebSocket STOMP (`ws://192.168.0.229:8080/ws-makeup`)  
**Tài liệu cơ sở:** `docs/mobile_app_task_issues.md`, `docs/makeup_platform_srs.md`, `docs/UI/UX style guideline/guideline.md`

---

# MỤC LỤC

1. [TỔNG QUAN HỆ THỐNG & PHẠM VI (SYSTEM OVERVIEW & SCOPE)](#1-tổng-quan-hệ-thống--phạm-vi-system-overview--scope)
   - [1.1 Mục đích tài liệu](#11-mục-đích-tài-liệu-purpose)
   - [1.2 Phạm vi Ứng dụng Di động](#12-phạm-vi-ứng-dụng-di-động-mobile-scope)
   - [1.3 Ma trận 3 Vai trò Người dùng Di động (Personas)](#13-ma-trận-3-vai-trò-người-dùng-di-động-personas)
   - [1.4 Kiến trúc Kỹ thuật Di động & Môi trường Tích hợp](#14-kiến-trúc-kỹ-thuật-di-động--môi-trường-tích-hợp)
2. [QUY CHUẨN THIẾT KẾ & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX DESIGN SYSTEM)](#2-quy-chuẩn-thiết-kế--trải-nghiệm-người-dùng-uiux-design-system)
   - [2.1 Bảng màu chuẩn nhận diện (Figma Rose Ruby Tokens)](#21-bảng-màu-chuẩn-nhận-diện-figma-rose-ruby-tokens)
   - [2.2 Typography, Safe Area & Touch Targets](#22-typography-safe-area--touch-targets)
   - [2.3 Quy chuẩn Bắt buộc về Xử lý & Trích xuất Lỗi Form (Client Error Standard)](#23-quy-chuẩn-bắt-buộc-về-xử-lý--trích-xuất-lỗi-form-client-error-standard)
3. [ĐẶC TẢ CHI TIẾT USER STORIES & YÊU CẦU KỸ THUẬT (28 ISSUES: M-0 ĐẾN M-5)](#3-đặc-tả-chi-tiết-user-stories--yêu-cầu-kỹ-thuật-28-issues-m-0-đến-m-5)
   - [3.1 Sprint M-0: Nền Tảng Hệ Thống, Authentication & Trang Chủ (APP-AUTH-01 → 05, APP-HOME-01)](#31-sprint-m-0-nền-tảng-hệ-thống-authentication--trang-chủ)
   - [3.2 Sprint M-1: Khám Phá Dịch Vụ & Hồ Sơ Thợ MUA (APP-CUST-01 → APP-CUST-04)](#32-sprint-m-1-khám-phá-dịch-vụ--hồ-sơ-thợ-mua)
   - [3.3 Sprint M-2: Đặt Lịch, Báo Giá Động & Quản Lý Đơn (APP-BOOK-01 → APP-BOOK-04)](#33-sprint-m-2-đặt-lịch-báo-giá-động--quản-lý-đơn)
   - [3.4 Sprint M-3: Bàn Làm Việc, Radar 30s & Dịch Vụ/Portfolio (APP-MUA-01 → APP-MUA-06)](#34-sprint-m-3-bàn-làm-việc-radar-30s--quản-lý-portfolio)
   - [3.5 Sprint M-4: Ca Trực Tuần, Đơn Điều Phối & Ảnh Mẫu Tay Nghề (APP-STAFF-01 → APP-STAFF-04)](#35-sprint-m-4-quản-lý-ca-trực--đơn-điều-phối)
   - [3.6 Sprint M-5: Live GPS Streaming, WebSocket STOMP & Tiện Ích (APP-CORE-01 → APP-CORE-04)](#36-sprint-m-5-live-gps-streaming-websocket-stomp--tiện-ích)
4. [MA TRẬN ÁNH XẠ API BACKEND & WEBSOCKET TOPICS](#4-ma-trận-ánh-xạ-api-backend--websocket-topics)
5. [YÊU CẦU PHI CHỨC NĂNG & AN TOÀN HỆ THỐNG (NON-FUNCTIONAL REQUIREMENTS)](#5-yêu-cầu-phi-chức-năng--an-toàn-hệ-thống-non-functional-requirements)

---

# 1. TỔNG QUAN HỆ THỐNG & PHẠM VI (SYSTEM OVERVIEW & SCOPE)

### 1.1 Mục đích tài liệu (Purpose)
Tài liệu này đóng vai trò là **Đặc tả Yêu cầu Kỹ thuật Phần mềm (SRS)** và **Đặc tả Chi tiết User Stories** chính thức cho toàn bộ ứng dụng di động của nền tảng **Makeup Booking Platform**. Tài liệu cung cấp căn cứ để phát triển giao diện (UI), logic xử lý phía máy khách (Client Business Logic), các kịch bản kiểm thử chấp nhận (Acceptance Criteria - BDD Gherkin) và hợp đồng kết nối với máy chủ Backend Spring Boot Core API.

### 1.2 Phạm vi Ứng dụng Di động & Giới hạn Đối Tượng (Mobile Scope & Persona Boundaries)
> [!IMPORTANT]
> **QUY TẮC PHẠM VI NGHIÊM NGẶT (STRICT PERSONA BOUNDARY)**:
> Ứng dụng di động (`code/app`) được phát triển **CHỈ DÀNH RIÊNG CHO 3 VAI TRÒ TÁC NGHIỆP THỰC ĐỊA & ĐẶT LỊCH**:
> 1. **Khách hàng (`ROLE_CUSTOMER`)**
> 2. **Thợ Make-up tự do (`ROLE_FREELANCE_MUA`)**
> 3. **Nhân viên trang điểm của Agency (`ROLE_AGENCY_STAFF`)**
>
> ❌ **TUYỆT ĐỐI LOẠI TRỪ (EXCLUDED FROM MOBILE APP)**:
> Các tài khoản Quản trị gồm **Super Admin (`ROLE_SUPER_ADMIN`)** và **Chủ/Quản lý Agency (`ROLE_AGENCY_ADMIN`)** **KHÔNG ĐƯỢC PHÉP SỬ DỤNG VÀ KHÔNG CÓ GIAO DIỆN TRÊN ỨNG DỤNG DI ĐỘNG**. Nhóm tài khoản Quản trị bắt buộc phải sử dụng **Cổng Quản Trị Web Portal (`code/frontend`)** trên trình duyệt máy tính.
>
> *Quy tắc Chặn Đăng Nhập (Role-Guard)*: Nếu tài khoản Quản trị cố tình đăng nhập trên Mobile App, hệ thống sẽ chặn phiên đăng nhập và hiển thị thông báo: *"Tài khoản Quản trị viên không hỗ trợ trên ứng dụng di động. Vui lòng đăng nhập tại Cổng Quản Trị Web Portal trên máy tính!"*

*   **Bao gồm trên Mobile (Dành riêng cho 3 vai trò)**:
    *   **Khách hàng**: Khám phá dịch vụ, đặt lịch tận nơi/studio, tính giá Realtime, kích hoạt radar khẩn cấp 30s, theo dõi live GPS thợ di chuyển.
    *   **Thợ MUA tự do**: Bàn làm việc, bật/tắt nhận ca trực tuyến, nhận đơn cấp tốc 30s (chuông/rung/Redlock), cập nhật 4 bước tiến độ & camera chụp ảnh nghiệm thu, quản lý Showcase portfolio, cài đặt bán kính hoạt động km.
    *   **Nhân viên Agency Staff**: Xem lịch trực ca tuần, điểm danh GPS tại studio, đăng ký làm thêm giờ (Overtime), nhận đơn điều phối từ Studio.
*   **Loại trừ hoàn toàn khỏi Mobile (Chỉ có trên Web Portal máy tính)**:
    *   Quản trị hệ thống toàn diện, đối soát tài chính đại lý, duyệt hồ sơ KYC đại lý (`ROLE_SUPER_ADMIN`).
    *   Quản lý nhân sự, phân chia hoa hồng nội bộ, tạo ca trực tuần của studio (`ROLE_AGENCY_ADMIN`).

### 1.3 Ma trận 3 Vai trò Người dùng Di động Độc Quyền (Mobile Personas)
| Vai trò Di Động | Mã Phân Quyền | Đặc điểm & Tương tác Cốt lõi trên Ứng dụng Di động | Ghi Chú Giới Hạn |
| :--- | :--- | :--- | :--- |
| **Khách Hàng** | `ROLE_CUSTOMER` | Tìm kiếm phong cách trang điểm, duyệt profile thợ, đặt lịch, thanh toán ký quỹ cọc Escrow, kích hoạt radar khẩn cấp 30s, theo dõi lộ trình di chuyển của thợ trên bản đồ, đánh giá sau dịch vụ. | **Duy nhất trên Mobile** (Có thể dùng thêm Web Client) |
| **Thợ Trang Điểm Tự Do** | `ROLE_FREELANCE_MUA` | Bật/tắt trạng thái nhận ca (Online/Offline), phát sóng GPS chạy ngầm, nhận broadcast ca gấp 30s kèm rung haptic/chuông, cập nhật trạng thái di chuyển/trang điểm, chụp ảnh nghiệm thu, quản lý album portfolio. | **Bắt buộc trên Mobile** để phát sóng tọa độ GPS |
| **Nhân Viên Trang Điểm Agency** | `ROLE_AGENCY_STAFF` | Xem lịch ca trực tuần của Studio, điểm danh Check-in/Check-out GPS tại chi nhánh, đăng ký làm thêm giờ (Overtime), tiếp nhận các đơn trang điểm được quản lý Agency Admin điều phối chỉ định. | **Bắt buộc trên Mobile** để điểm danh GPS tại studio |
| *(Bị Chặn)* **Super Admin** | `ROLE_SUPER_ADMIN` | Không có màn hình trên Mobile. Bị chặn tại API đăng nhập mobile. | Sử dụng Web Portal máy tính |
| *(Bị Chặn)* **Agency Admin** | `ROLE_AGENCY_ADMIN` | Không có màn hình trên Mobile. Bị chặn tại API đăng nhập mobile. | Sử dụng Web Portal máy tính |

### 1.4 Kiến trúc Kỹ thuật Di động & Môi trường Tích hợp
*   **Routing System**: Expo Router v4 (File-based routing tại `code/app/src/app/`).
*   **State Management**: Zustand lightweight stores (`authStore`, `bookingStore`, `locationStore`).
*   **Storage**: `expo-secure-store` mã hóa phần cứng (Keychain trên iOS / Keystore AES-256 trên Android) cho Access Token, Refresh Token và thông tin định danh.
*   **Networking**:
    *   HTTP REST: `axios` cấu hình tự động gắn Bearer Token, header `Accept-Language`, Silent Refresh Token và bộ bóc tách lỗi `parseApiError`.
    *   STOMP WebSocket: Thư viện `@stomp/stompjs` nhúng trực tiếp, kết nối endpoint `ws://192.168.0.229:8080/ws-makeup` qua SockJS/Native WebSocket.
*   **Background Geolocation**: `expo-location` và `expo-task-manager` đăng ký Task phát sóng ngầm chu kỳ 5-10s.

---

# 2. QUY CHUẨN THIẾT KẾ & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX DESIGN SYSTEM)

Tất cả các màn hình di động BẮT BUỘC tuân thủ tài liệu `docs/UI/UX style guideline/guideline.md` và mã token chuẩn tại `src/constants/theme.ts`:

### 2.1 Bảng màu chuẩn nhận diện (Figma Rose Ruby Tokens)
| Token Danh Định | Giá Trị HEX | Ứng Dụng Trong Giao Diện Di Động |
| :--- | :---: | :--- |
| `COLORS.primary` | `#E11D48` | Màu thương hiệu chủ đạo (Rose-600 Ruby). Sử dụng cho nút bấm chính (CTA), tab bar active, huy hiệu VIP, viền ô nhập khi focus. |
| `COLORS.primaryHover` | `#BE123C` | Rose-700. Trạng thái nhấn nút (active opacity/pressed state). |
| `COLORS.primaryLight` | `#FFF1F2` | Rose-50. Nền thông báo nhẹ, nền chip được chọn, viền container mờ. |
| `COLORS.primarySoft` | `#FFE4E6` | Rose-100. Viền thẻ Card nổi bật, viền radio/checkbox active. |
| `COLORS.slate900` | `#0F172A` | Deep Slate. Tiêu đề H1, H2, giá tiền lớn, tên thợ, văn bản quan trọng. |
| `COLORS.slate700` | `#334155` | Nội dung văn bản thân (body text), nhãn form nhập liệu (label). |
| `COLORS.slate500` | `#64748B` | Mô tả phụ, ngày giờ, địa chỉ phụ đề, placeholder text. |
| `COLORS.slate200` | `#E2E8F0` | Đường kẻ phân cách (divider), viền mặc định của ô input và thẻ Card. |
| `COLORS.slate100` | `#F1F5F9` | Nền ô input xám nhạt, nền thanh tìm kiếm, nền chip chưa chọn. |
| `COLORS.background` | `#F8FAFC` | Nền toàn bộ màn hình ứng dụng (Slate-50). |
| `COLORS.surface` | `#FFFFFF` | Nền các khối nội dung, Card dịch vụ, Modal popup, Bottom sheet. |
| `COLORS.error` | `#EF4444` | Trạng thái lỗi: Dòng chữ báo lỗi helper text, viền input lỗi, nút Hủy đơn. |
| `COLORS.success` | `#10B981` | Trạng thái thành công: Đơn hoàn thành, Thợ đang online, Check-in hợp lệ. |
| `COLORS.warning` | `#F59E0B` | Trạng thái cảnh báo: Chờ xác nhận, Đếm ngược 30s radar, Đi muộn. |

### 2.2 Typography, Safe Area & Touch Targets
1.  **Typography**: Sử dụng font chữ Sans-serif hiện đại (`Plus Jakarta Sans` / `Inter`). Nghiêm cấm dùng Serif hay vàng neon.
    *   *Tiêu đề lớn (Screen Title)*: `24px - 28px`, Bold (`font-bold`), màu `#0F172A`.
    *   *Tiêu đề mục (Section Header)*: `18px - 20px`, SemiBold (`font-semibold`), màu `#0F172A`.
    *   *Tiêu đề thẻ (Card Title)*: `15px - 16px`, SemiBold, màu `#0F172A`.
    *   *Văn bản thân (Body Text)*: `14px`, Regular (`font-normal`), line-height `20px`, màu `#334155`.
    *   *Phụ đề / Ghi chú (Caption)*: `12px - 13px`, Regular, màu `#64748B`.
2.  **Safe Area Handling**:
    *   Mọi màn hình gốc BẮT BUỘC sử dụng `useSafeAreaInsets` từ `react-native-safe-area-context` để cộng dồn lề trên (`insets.top`) tránh camera đục lỗ / tai thỏ và lề dưới (`insets.bottom`) cho thanh điều hướng đáy.
3.  **Touch Targets & Ergonomics**:
    *   Mọi nút bấm, tab hoặc biểu tượng tương tác cảm ứng phải có kích thước tối thiểu `44x44 dp` để người dùng chạm ngón tay chính xác mà không bị bấm nhầm.

### 2.3 Quy chuẩn Bắt buộc về Xử lý & Trích xuất Lỗi Form (Client Error Standard)
Tuân thủ nghiêm ngặt **Mục 5.3 của Project Rules**:
1.  **CẤM hiển thị thông báo chung chung**: Khi Backend trả về lỗi Bean Validation (`errorCode: "ERR_VALIDATION"`), tuyệt đối KHÔNG chỉ hiện câu tóm tắt `Dữ liệu đầu vào không hợp lệ`.
2.  **Trích xuất mảng `data` vào Form State**: Frontend sử dụng tiện ích chuẩn hóa `parseApiError(err)` tại `src/utils/error.ts` để trích xuất danh sách `{ [field]: errorMessage }`.
3.  **Hiển thị dòng chữ cảnh báo đỏ chân input**: Từng thông báo lỗi chi tiết được map trực tiếp vào thuộc tính `error` của `BaseInput`, hiển thị chữ đỏ `12px` kèm icon cảnh báo ngay dưới chân ô nhập tương ứng.
4.  **Đồng bộ quy tắc kiểm tra (Client ↔ Backend)**: Form Zod Schema trên mobile phải khớp 100% với Bean Validation của Backend (Mật khẩu 8-50 ký tự, ít nhất 1 hoa, 1 thường, 1 số, 1 ký tự đặc biệt; SĐT đúng định dạng Việt Nam).

---

# 3. ĐẶC TẢ CHI TIẾT USER STORIES & YÊU CẦU KỸ THUẬT (26 ISSUES: M-0 ĐẾN M-5)

---

## 3.1 SPRINT M-0: NỀN TẢNG HỆ THỐNG, AUTHENTICATION & TRANG CHỦ

### 🎯 APP-AUTH-01: Thiết lập Expo SDK 57, Root Layout & SecureStore
*   **Loại**: Task Hạ Tầng (Core Infrastructure)
*   **Phân hệ**: Core Mobile
*   **File nguồn**: `src/app/_layout.tsx`, `src/constants/theme.ts`, `src/utils/storage.ts`
*   **Mô tả**: Thiết lập dự án Expo SDK 57 chạy trên New Architecture (React Native 0.86), cấu hình Root Layout với SafeAreaProvider, nạp cấu hình Theme Rose Ruby và đóng gói module lưu trữ an toàn bằng phần cứng `expo-secure-store`.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [x] **AC-01**: Root Layout tích hợp `SafeAreaProvider` và `StatusBar` dạng `dark-content`.
    *   [x] **AC-02**: Module `src/utils/storage.ts` định nghĩa đầy đủ các phương thức `getSecureItem`, `setSecureItem`, `removeSecureItem` với cơ chế fallback trên Web/Bộ nhớ nếu thiết bị không hỗ trợ Keystore.
    *   [x] **AC-03**: Nạp toàn bộ các tokens màu sắc, kiểu chữ và bóng đổ chuẩn Figma vào `src/constants/theme.ts`.

---

### 🎯 APP-AUTH-02: Màn hình Onboarding 3 Slides Carousel
*   **Loại**: User Story
*   **Phân hệ**: Core Mobile
*   **File nguồn**: `src/app/(auth)/onboarding.tsx`
*   **Mô tả**:
    *   *Là một*: Người dùng mới cài đặt ứng dụng,
    *   *Tôi muốn*: Xem qua 3 slide giới thiệu ngắn gọn, trực quan về dịch vụ làm đẹp cao cấp,
    *   *Để*: Hiểu được giá trị cốt lõi của nền tảng (Đặt thợ uy tín, báo giá minh bạch, thợ tới tận nhà trong 30 phút) trước khi đăng ký tài khoản.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria - Gherkin)**:
    ```gherkin
    Scenario: Người dùng lướt xem các tính năng nổi bật
      Given Người dùng mở ứng dụng lần đầu tiên
      When Người dùng vuốt ngang màn hình sang trái
      Then Màn hình chuyển tuần tự qua 3 slide: "Make-up Chuyên Nghiệp", "Đến Tận Nơi 30 Phút", "Báo Giá Minh Bạch"
      And Chỉ báo trang (Pagination Dots) hiển thị vị trí tương ứng với chấm hồng Rose Ruby nổi bật

    Scenario: Người dùng hoàn tất onboarding
      Given Người dùng đang ở slide cuối cùng hoặc bấm nút "Bỏ qua"
      When Người dùng nhấn nút "Bắt đầu trải nghiệm →"
      Then Ứng dụng lưu cờ ONBOARDING_COMPLETED vào SecureStore
      And Chuyển hướng người dùng sang màn hình Đăng Nhập
    ```

---

### 🎯 APP-AUTH-03: Màn hình Đăng Nhập Chuẩn Figma Kèm Khối Test Nhanh
*   **Loại**: User Story
*   **Phân hệ**: Core Mobile
*   **File nguồn**: `src/app/(auth)/login.tsx`, `src/components/auth/BrandLogo.tsx`, `src/components/auth/QuickTestAccounts.tsx`
*   **Mô tả**:
    *   *Là một*: Khách hàng hoặc Thợ MUA đã có tài khoản,
    *   *Tôi muốn*: Nhập số điện thoại/email và mật khẩu (hoặc bấm chọn nhanh tài khoản thử nghiệm),
    *   *Để*: Đăng nhập vào hệ thống và truy cập đúng phân hệ tương ứng với vai trò của mình.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [x] **AC-01**: Form gồm ô `Số điện thoại / Email` và ô `Mật khẩu` (có nút mắt toggle ẩn/hiện mật khẩu).
    *   [x] **AC-02**: Khối "Tài khoản kiểm thử nhanh" cho phép click 1 chạm điền tự động thông tin của 3 vai trò: `Khách hàng (0912345678)`, `Thợ MUA (0987654321)`, `Nhân viên Agency (0933112233)`.
    *   [x] **AC-03**: Khi bấm `Đăng Nhập Vào Hệ Thống →`, gọi API `POST /api/v1/auth/login`. Nếu thành công, lưu `accessToken`, `refreshToken`, `role` vào SecureStore và cập nhật `authStore`.
    *   [x] **AC-04**: Điều hướng thông minh theo đúng 3 vai trò mobile:
        *   Nếu `ROLE_CUSTOMER`: Chuyển sang Trang chủ làm đẹp (`/`).
        *   Nếu `ROLE_FREELANCE_MUA`: Chuyển sang Bàn làm việc thợ MUA (`/mua/workstation`).
        *   Nếu `ROLE_AGENCY_STAFF`: Chuyển sang Lịch trực ca Studio (`/staff/shifts`).
    *   [x] **AC-05**: **Chặn Tuyệt Đối Tài Khoản Quản Trị**: Nếu tài khoản đăng nhập có vai trò `ROLE_SUPER_ADMIN` hoặc `ROLE_AGENCY_ADMIN`, hệ thống tự động từ chối cấp phiên, xóa token và hiển thị cảnh báo: *"Tài khoản Quản trị viên không hỗ trợ trên ứng dụng di động. Vui lòng đăng nhập tại Cổng Quản Trị Web Portal trên máy tính!"*
*   **Hợp đồng API**:
    *   *Endpoint*: `POST /api/v1/auth/login`
    *   *Request Payload*:
        ```json
        { "phoneNumberOrEmail": "0912345678", "password": "Password123@" }
        ```
    *   *Response Payload (200 OK)*:
        ```json
        {
          "success": true,
          "message": "Đăng nhập thành công.",
          "data": {
            "accessToken": "eyJhbGciOi...",
            "refreshToken": "d8f3a9e...",
            "tokenType": "Bearer",
            "userId": "usr_99182371",
            "role": "ROLE_CUSTOMER",
            "fullName": "Nguyễn Mai Anh"
          }
        }
        ```

---

### 🎯 APP-AUTH-04: Màn hình Đăng Ký Đa Phân Hệ (Customer vs Freelance MUA)
*   **Loại**: User Story
*   **Phân hệ**: Core Mobile
*   **File nguồn**: `src/app/(auth)/register.tsx`, `src/components/auth/RoleSegmentedControl.tsx`
*   **Mô tả**:
    *   *Là một*: Người dùng mới,
    *   *Tôi muốn*: Chọn vai trò "Khách hàng" hoặc "Thợ trang điểm" và điền thông tin đăng ký phù hợp,
    *   *Để*: Tạo tài khoản với đúng hồ sơ và quyền hạn nghiệp vụ tương ứng.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [x] **AC-01**: Thanh chuyển tab vai trò (Segmented Control) cho phép chuyển đổi mượt mà giữa `Khách Hàng` và `Thợ MUA Tự Do`.
    *   [x] **AC-02**: Khi chọn `Khách Hàng`, form yêu cầu: Họ tên, Số điện thoại, Email, Giới tính, Mật khẩu.
    *   [x] **AC-03**: Khi chọn `Thợ MUA`, form tự động mở rộng thêm các trường chuyên môn: Tiểu sử ngắn (Bio), Số năm kinh nghiệm (1-40 năm), Bán kính phục vụ tối đa (1-50 km).
    *   [x] **AC-04**: Validation chặt chẽ: Mật khẩu tối thiểu 8 ký tự bao gồm 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.
*   **Hợp đồng API**:
    *   *Endpoint*: `POST /api/v1/auth/register`
    *   *Request Payload (Thợ MUA)*:
        ```json
        {
          "fullName": "Lê Hoàng Yến",
          "phoneNumber": "0988776655",
          "email": "hoangyen.mua@gmail.com",
          "password": "Password123@",
          "gender": "FEMALE",
          "role": "ROLE_FREELANCE_MUA",
          "bio": "Chuyên gia trang điểm cô dâu tone Tây phong cách tự nhiên 6 năm kinh nghiệm",
          "experienceYears": 6,
          "serviceRadiusKm": 15
        }
        ```

---

### 🎯 APP-AUTH-05: Module Bóc Tách Lỗi API Chuẩn Hóa `parseApiError`
*   **Loại**: Task Kỹ Thuật (Client Error Standard)
*   **Phân hệ**: Core Mobile
*   **File nguồn**: `src/utils/error.ts`, `src/components/base/BaseInput.tsx`
*   **Mô tả**: Hiện thực tiện ích trích xuất lỗi API chuẩn từ Spring Boot Backend. Khi Backend trả về `errorCode: "ERR_VALIDATION"`, hàm tự động bóc tách từng thông điệp trong `err.response.data.data` và gán vào state `errors` của form để hiển thị text đỏ dưới chân `BaseInput`.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [x] **AC-01**: `parseApiError(err)` trả về đối tượng có cấu trúc: `{ message: string, fieldErrors: Record<string, string>, errorCode: string }`.
    *   [x] **AC-02**: Khi backend trả về lỗi mật khẩu, giao diện không alert chung chung mà hiển thị `"Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt."` trực tiếp dưới ô nhập Mật khẩu.
    *   [x] **AC-03**: Ô input bị lỗi đổi màu viền sang đỏ `#EF4444`. Khi người dùng gõ lại, lỗi tự động xóa bỏ.

---

### 🎯 APP-HOME-01: Trang Chủ Đa Vai Trò Tích Hợp VIP Banner & Quick Radar
*   **Loại**: User Story
*   **Phân hệ**: Toàn hệ thống (All Personas)
*   **File nguồn**: `src/app/index.tsx`, `src/components/home/*`
*   **Mô tả**:
    *   *Là một*: Người dùng mở ứng dụng,
    *   *Tôi muốn*: Tiếp cận ngay trang chủ tương thích với vai trò của mình kèm thông tin định vị GPS hiện tại,
    *   *Để*: Nhanh chóng tìm kiếm dịch vụ (Khách) hoặc theo dõi trạng thái trực ca (Thợ MUA/Staff).
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [x] **AC-01**: Thanh Header hiển thị vị trí hiện tại (Reverse Geocoding ví dụ: *"Quận 1, TP. Hồ Chí Minh"*), chuông thông báo có badge đỏ và avatar người dùng.
    *   [x] **AC-02**: Banner Carousel giới thiệu các gói khuyến mãi VIP (Ưu đãi mùa cưới, Giảm 20% đặt nhóm).
    *   [x] **AC-03**: Nút kích hoạt Radar khẩn cấp: Thẻ nổi bật màu Rose Ruby *"Cần Thợ Gấp Trong 30 Phút? Bấm Kích Hoạt Ngay"*.
    *   [x] **AC-04**: Danh sách Top Thợ MUA Xuất Sắc hiển thị dạng lưới ngang gồm: Ảnh đại diện, tên thợ, đánh giá sao (⭐ 4.9), số lượt phục vụ và khoảng cách km.
    *   [x] **AC-05**: Thanh điều hướng đáy (Bottom Navigation Bar) chuẩn: `Trang chủ`, `Khám phá`, `Lịch hẹn`, `Hồ sơ`.

---

## 3.2 SPRINT M-1: KHÁM PHÁ DỊCH VỤ & HỒ SƠ THỢ MUA (`ROLE_CUSTOMER`)

### 🎯 APP-CUST-01: Màn hình Khám Phá & Bộ Lọc Đa Tiêu Chí
*   **Loại**: User Story
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/app/explore.tsx`, `src/components/customer/CategoryFilterBar.tsx`, `src/components/customer/ServicePackageCard.tsx`
*   **Mô tả**:
    *   *Là một*: Khách hàng có nhu cầu làm đẹp,
    *   *Tôi muốn*: Tìm kiếm dịch vụ theo từ khóa, lọc theo danh mục, phong cách make-up, bán kính GPS và khoảng giá,
    *   *Để*: Nhanh chóng lựa chọn được gói dịch vụ hoặc thợ trang điểm phù hợp nhất với sự kiện của tôi.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria - Gherkin)**:
    ```gherkin
    Scenario: Khách hàng lọc dịch vụ theo danh mục và bán kính GPS
      Given Khách hàng đang ở màn hình Khám Phá
      When Khách hàng chọn danh mục "Trang Điểm Cô Dâu" và chọn bán kính "Dưới 5km"
      Then Danh sách kết quả được tải lại hiển thị các gói dịch vụ thuộc danh mục Cô dâu của các thợ trong vòng 5km
      And Mỗi thẻ hiển thị: Ảnh bìa, Tên gói, Tên thợ/Studio, Khoảng cách (ví dụ "1.8 km"), Giá niêm yết (VNĐ)

    Scenario: Khách hàng tìm kiếm theo tên phong cách
      Given Khách hàng nhập từ khóa "Tone Hàn Quốc Tự Nhiên" vào ô tìm kiếm
      When Hệ thống thực hiện tìm kiếm (debounce 400ms)
      Then Danh sách trả về đúng các gói dịch vụ có gắn phong cách Hàn Quốc
      And Hỗ trợ cuộn vô hạn (Infinite Scroll) khi lướt xuống cuối danh sách
    ```
*   **Hợp đồng API**:
    *   *Endpoint*: `GET /api/v1/catalog/packages/search?categoryId={id}&styleId={id}&maxDistanceKm=5&keyword=co+dau&page=0&size=10`
    *   *Response (200 OK)*: Trả về danh sách `PageResponse<ServicePackageResponse>`.

---

### 🎯 APP-CUST-02: Màn hình Chi Tiết Hồ Sơ Thợ MUA & Dịch Vụ Đi Kèm Ảnh Mẫu
*   **Loại**: User Story
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/app/mua-detail/[id].tsx`, `src/components/customer/MuaProfileHeader.tsx`, `src/components/customer/PackageSelectorList.tsx`, `src/components/customer/ServiceSampleGallery.tsx`
*   **Mô tả**:
    *   *Là một*: Khách hàng đang xem hồ sơ thợ/studio để đặt lịch,
    *   *Tôi muốn*: Bấm chọn vào từng dịch vụ cụ thể (Ví dụ: "Make-up Cô Dâu Ngày Cưới", "Make-up Dự Tiệc Ban Đêm") để xem giá tiền niêm yết, thời lượng và **ngay lập tức thấy bộ sưu tập các hình ảnh mẫu đã make thực tế của chính dịch vụ đó**,
    *   *Để*: Đánh giá chính xác tay nghề của thợ đối với dịch vụ tôi đang quan tâm mà không bị lẫn lộn giữa các phong cách khác.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria - Gherkin)**:
    ```gherkin
    Scenario: Khách hàng chọn xem gói dịch vụ Make Cô Dâu
      Given Khách hàng đang ở màn hình Chi Tiết Hồ Sơ Thợ MUA
      When Khách hàng bấm chọn thẻ dịch vụ "Make-up Cô Dâu Ngày Cưới"
      Then Thẻ dịch vụ mở rộng hiển thị giá tiền niêm yết (ví dụ: "1.800.000 VNĐ"), thời lượng (90 phút) và các bước thực hiện
      And Phía dưới hiển thị ngay danh sách các ảnh mẫu thực tế đã make tương ứng theo đúng gói dịch vụ Cô Dâu này
      And Khách hàng có thể bấm vào từng ảnh mẫu để xem phóng to chi tiết góc mặt, lớp nền và tóc

    Scenario: Khách hàng chuyển sang xem dịch vụ khác
      Given Khách hàng chuyển sang chọn thẻ "Make-up Dự Tiệc Sang Trọng"
      When Giao diện cập nhật
      Then Giá tiền đổi sang mức giá của gói Dự Tiệc (ví dụ: "600.000 VNĐ")
      And Danh mục ảnh mẫu tự động lọc lại chỉ hiển thị các tác phẩm make-up đã làm cho gói Dự Tiệc
    ```

---

### 🎯 APP-CUST-03: Trình Xem Bộ Sưu Tập Tác Phẩm & Ảnh Mẫu Dịch Vụ (Showcase Viewer & Photo Zoom)
*   **Loại**: Task Trải Nghiệm Người Dùng (UI/UX Task)
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: Medium
*   **File dự kiến**: `src/components/customer/ShowcaseGalleryModal.tsx`, `src/components/customer/PhotoZoomViewer.tsx`
*   **Mô tả**: Xây dựng trình xem album ảnh mẫu tác phẩm thực tế của gói dịch vụ đang được khách chọn. Khách hàng có thể duyệt album ảnh hoàn thiện chất lượng cao của đúng dịch vụ đó, xem cận cảnh các góc chụp chi tiết (lớp nền căng bóng, màu mắt, tạo khối và kiểu tóc) kèm tính năng phóng to thu nhỏ mượt mà.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Thư viện ảnh mẫu được lọc chính xác theo `package_id` của gói dịch vụ khách đang xem.
    *   [ ] **AC-02**: Chạm vào ảnh mở Modal phóng to toàn màn hình hỗ trợ Pinch-to-zoom 2 ngón tay mượt mà.
    *   [ ] **AC-03**: Hỗ trợ vuốt ngang (horizontal carousel swipe) để xem trọn bộ các góc chụp cận cảnh hoàn thiện của tác phẩm thuộc gói đó.

---

### 🎯 APP-CUST-04: Màn hình Cập Nhật Hồ Sơ Cá Nhân & Quản Lý Địa Chỉ Đặt Lịch
*   **Loại**: User Story
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: Low
*   **File dự kiến**: `src/app/profile/edit.tsx`, `src/components/customer/SavedAddressModal.tsx`
*   **Mô tả**:
    *   *Là một*: Khách hàng,
    *   *Tôi muốn*: Cập nhật ảnh đại diện, số điện thoại, họ tên và quản lý danh sách địa chỉ nhà riêng/cơ quan,
    *   *Để*: Tiết kiệm thời gian gõ địa chỉ mỗi lần đặt lịch làm đẹp tận nơi.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Tích hợp `expo-image-picker` cho phép chọn ảnh từ thư viện hoặc chụp ảnh đại diện mới.
    *   [ ] **AC-02**: Quản lý danh sách "Sổ Địa Chỉ": Thêm địa chỉ mới (chọn trên bản đồ Google Map / OpenStreetMap), gán nhãn Nhà riêng / Công ty / Khách sạn tiệc cưới.
    *   [ ] **AC-03**: Thiết lập địa chỉ mặc định để tự động điền vào màn hình thanh toán.

---

## 3.3 SPRINT M-2: ĐẶT LỊCH, BÁO GIÁ ĐỘNG & QUẢN LÝ ĐƠN HÀNG (`ROLE_CUSTOMER`)

### 🎯 APP-BOOK-01: Màn hình Đặt Lịch & Chọn Bước Dịch Vụ Mua Thêm (Package Items)
*   **Loại**: User Story
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: Critical
*   **File dự kiến**: `src/app/booking/create.tsx`, `src/components/booking/PackageItemPicker.tsx`, `src/components/booking/DateTimeSelector.tsx`
*   **Mô tả**:
    *   *Là một*: Khách hàng đặt lịch làm đẹp,
    *   *Tôi muốn*: Chọn ngày giờ thực hiện, địa điểm tận nơi và tích chọn thêm các bước làm đẹp bổ sung (đính đá cao cấp, dán mi 3D, làm tóc phức tạp),
    *   *Để*: Tùy biến dịch vụ trang điểm theo đúng nhu cầu sự kiện của tôi.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria - Gherkin)**:
    ```gherkin
    Scenario: Khách hàng chọn ngày giờ và thêm hạng mục phụ
      Given Khách hàng đang ở màn hình Đặt Lịch
      When Khách hàng chọn ngày "20/10/2026" và khung giờ "06:30 Sáng"
      And Tích chọn thêm hạng mục "Đính đá nghệ thuật (+100.000 VNĐ)" và "Làm tóc sóng nước (+200.000 VNĐ)"
      Then Tổng thời lượng dự kiến tự động tăng thêm 45 phút
      And Dữ liệu được chuyển sang bước Báo giá động Realtime
    ```

---

### 🎯 APP-BOOK-02: Tích Hợp Báo Giá Động Realtime (Dynamic Pricing & Surcharges)
*   **Loại**: User Story
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: Critical
*   **File dự kiến**: `src/components/booking/InvoiceSummaryCard.tsx`, `src/services/pricing.service.ts`
*   **Mô tả**:
    *   *Là một*: Khách hàng chuẩn bị xác nhận đơn,
    *   *Tôi muốn*: Xem bảng phân tích chi phí minh bạch bao gồm giá gốc, phụ phí di chuyển theo km, phụ phí làm sớm (trước 5h sáng) hoặc phụ phí ngày lễ tết,
    *   *Để*: Hiểu rõ các khoản tiền cần thanh toán và không bị phát sinh chi phí bất ngờ.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Gọi API `POST /api/v1/pricing/calculate-quote` gửi kèm: tọa độ thợ, tọa độ khách, giờ hẹn, danh sách package item.
    *   [ ] **AC-02**: Hiển thị bảng chi tiết hóa đơn (Invoice Breakdown):
        *   Giá gói gốc: `1.200.000 VNĐ`
        *   Hạng mục mua thêm: `+300.000 VNĐ`
        *   Phụ phí di chuyển (8.5 km): `+85.000 VNĐ`
        *   Phụ phí sáng sớm (04:30): `+150.000 VNĐ`
        *   **Tổng cộng**: `1.735.000 VNĐ`
    *   [ ] **AC-03**: Lựa chọn phương thức cọc Escrow: Thanh toán đặt cọc 30% qua Ví Makeup Platform hoặc Thanh toán toàn bộ.
    *   [ ] **AC-04**: Bấm *"Xác Nhận Đặt Lịch"* gửi yêu cầu tạo đơn hẹn tới thợ.

---

### 🎯 APP-BOOK-03: Màn hình Quản Lý Lịch Hẹn Đa Trạng Thái
*   **Loại**: User Story
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/app/(tabs)/bookings.tsx`, `src/components/booking/BookingHistoryCard.tsx`
*   **Mô tả**:
    *   *Là một*: Khách hàng,
    *   *Tôi muốn*: Quản lý tất cả các đơn đặt lịch theo hai tab "Sắp Tới" và "Lịch Sử",
    *   *Để*: Nắm bắt trạng thái xử lý đơn hàng, theo dõi thợ đang di chuyển hoặc hủy đơn khi có việc đột xuất.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Tab "Sắp Tới" hiển thị các đơn có trạng thái: `PENDING_CONFIRMATION` (Chờ xác nhận), `CONFIRMED` (Đã nhận đơn), `ON_THE_WAY` (Thợ đang tới), `IN_PROGRESS` (Đang trang điểm).
    *   [ ] **AC-02**: Mỗi thẻ đơn hàng có huy hiệu màu sắc tương ứng:
        *   `CONFIRMED`: Màu xanh dương kèm nút *"Xem Lộ Trình Thợ"* dẫn sang màn hình GPS.
        *   `IN_PROGRESS`: Màu Rose Ruby đang phát sáng.
    *   [ ] **AC-03**: Tab "Lịch Sử" hiển thị các đơn `COMPLETED` (kèm nút *"Đánh Giá Dịch Vụ"*) và `CANCELLED`.
    *   [ ] **AC-04**: Cho phép hủy đơn hẹn nếu còn trước giờ hẹn tối thiểu 24 giờ mà không mất phí phạt cọc.

---

### 🎯 APP-BOOK-04: Kích Hoạt Radar Tìm Thợ Khẩn Cấp 30s (Instant Emergency Booking)
*   **Loại**: User Story
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/components/booking/InstantRadarModal.tsx`, `src/services/booking.service.ts`
*   **Mô tả**:
    *   *Là một*: Khách hàng cần thợ trang điểm khẩn cấp trong vòng 30 - 60 phút,
    *   *Tôi muốn*: Kích hoạt chế độ tìm thợ cấp tốc bằng 1 chạm từ trang chủ,
    *   *Để*: Hệ thống phát sóng radar quét tất cả thợ rảnh quanh bán kính 5km và điều thợ tới ngay lập tức.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria - Gherkin)**:
    ```gherkin
    Scenario: Khách hàng phát lệnh tìm thợ khẩn cấp
      Given Khách hàng nhấn nút "Cần Thợ Gấp Trong 30 Phút"
      When Khách hàng xác nhận địa chỉ hiện tại và gói dịch vụ mong muốn
      Then Modal Radar toàn màn hình mở ra với hiệu ứng sóng âm lan tỏa
      And Hệ thống bắt đầu đồng hồ đếm ngược 45 giây phát sóng đơn tới các thợ MUA xung quanh
      And Khi có thợ đầu tiên bấm nhận ca, chuông báo thành công vang lên
      And Modal tự động chuyển sang Màn hình Bám Đuổi Live GPS của thợ vừa nhận ca
    ```

---

## 3.4 SPRINT M-3: BÀN LÀM VIỆC, RADAR NHẬN CA & PORTFOLIO (`ROLE_FREELANCE_MUA`)

### 🎯 APP-MUA-01: Màn hình Bàn Làm Việc Thợ MUA (Workstation Dashboard)
*   **Loại**: User Story
*   **Phân hệ**: Thợ tự do (`ROLE_FREELANCE_MUA`)
*   **Mức độ ưu tiên**: Critical
*   **File dự kiến**: `src/app/mua/workstation.tsx`, `src/components/mua/WorkstationHeader.tsx`
*   **Mô tả**:
    *   *Là một*: Thợ trang điểm tự do,
    *   *Tôi muốn*: Truy cập bảng điều khiển trung tâm tác nghiệp, bật/tắt chế độ trực tuyến nhận ca, xem thu nhập trong ngày và danh sách các ca sắp diễn ra,
    *   *Để*: Chủ động điều phối công việc hàng ngày và nhận diện các đơn hàng mới phát sóng.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Công tắc trạng thái Trực Tuyến (`Online Toggle`):
        *   Khi BẬT: Trạng thái đổi sang `Sẵn Sàng Nhận Ca (Màu xanh Emerald)`, kích hoạt phát sóng tọa độ GPS ngầm qua WebSocket.
        *   Khi TẮT: Trạng thái chuyển sang `Tạm Nghỉ`, ngừng lắng nghe broadcast đơn khẩn cấp.
    *   [ ] **AC-02**: Thống kê tài chính tóm tắt: Doanh thu ca hôm nay (VNĐ), Số ca đã hoàn thành, Điểm đánh giá chất lượng (⭐ 4.98).
    *   [ ] **AC-03**: Danh sách "Lịch Trình Hôm Nay": Liệt kê các ca hẹn theo thứ tự thời gian kèm tên khách, địa chỉ, giờ hẹn và nút mở ứng dụng Google Maps dẫn đường.

---

### 🎯 APP-MUA-02: Modal Đĩa Quay Đếm Ngược 30s Nhận Ca Cấp Tốc
*   **Loại**: User Story
*   **Phân hệ**: Thợ tự do (`ROLE_FREELANCE_MUA`)
*   **Mức độ ưu tiên**: Critical
*   **File dự kiến**: `src/components/mua/CountdownAcceptModal.tsx`, `src/services/booking.service.ts`
*   **Mô tả**:
    *   *Là một*: Thợ MUA đang trực tuyến,
    *   *Tôi muốn*: Nhận được thông báo khẩn cấp toàn màn hình kèm chuông báo và đồng hồ đếm ngược 30 giây khi có khách hàng cần thợ gấp gần vị trí của tôi,
    *   *Để*: Nhanh chóng xem khoảng cách, thù lao và bấm nhận ca trước khi thợ khác nhận.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria - Gherkin)**:
    ```gherkin
    Scenario: Thợ MUA nhận broadcast đơn khẩn cấp
      Given Thợ MUA đang bật trạng thái Online và ở trong bán kính phục vụ của khách
      When Server Spring Boot broadcast sự kiện vào STOMP topic "/topic/booking-broadcast"
      Then Ứng dụng kích hoạt rung Haptic liên tục và phát chuông báo âm thanh ưu tiên cao
      And Modal đếm ngược 30s hiện lên hiển thị: Tên gói, Khoảng cách tới khách (ví dụ: "2.3 km"), Thu nhập thực nhận (ví dụ: "450.000 VNĐ")
      
    Scenario: Thợ MUA nhấn nhận ca nhanh nhất
      Given Đồng hồ đếm ngược vẫn còn thời gian (> 0 giây)
      When Thợ MUA nhấn nút lớn màu Rose Ruby "Chấp Nhận Nhận Ca Ngay"
      Then Ứng dụng gọi API "POST /api/v1/booking/{id}/accept"
      And Nếu giành được ca (Redisson Lock thành công): Hiển thị thông báo thành công và chuyển sang màn hình Điều hành ca làm
      And Nếu ca đã bị thợ khác nhận trước: Hiển thị thông báo "Ca làm đã được thợ khác tiếp nhận!" và đóng modal
    ```

---

### 🎯 APP-MUA-03: Tiến Trình Thực Hiện Ca Làm 4 Giai Đoạn & Chụp Ảnh Nghiệm Thu
*   **Loại**: User Story
*   **Phân hệ**: Thợ tự do & Nhân viên Studio (`ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/app/job-execution/[id].tsx`, `src/components/mua/ProofCameraModal.tsx`
*   **Mô tả**:
    *   *Là một*: Thợ trang điểm (Thợ MUA tự do hoặc Nhân viên Agency Staff được điều phối),
    *   *Tôi muốn*: Cập nhật trạng thái làm việc qua 4 bước tuần tự và chụp ảnh khuôn mặt khách hàng sau khi make-up hoàn tất để nghiệm thu,
    *   *Để*: Minh bạch tiến độ với khách hàng và làm bằng chứng hoàn tất dịch vụ (kích hoạt giải ngân tiền cọc Escrow cho Thợ tự do hoặc ghi nhận công suất hoàn thành ca cho Nhân viên Agency).
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Giao diện hiển thị thanh tiến trình 4 giai đoạn rõ ràng:
        1.  `Bắt Đầu Di Chuyển` (Bật phát sóng stream GPS tốc độ cao 5s/lần tới khách hàng)
        2.  `Đã Tới Điểm Hẹn` (Hệ thống kiểm tra tọa độ thợ cách khách < 100m)
        3.  `Bắt Đầu Trang Điểm` (Bắt đầu bấm giờ thao tác làm đẹp)
        4.  `Hoàn Thành Ca Làm` (Mở camera chụp ảnh nghiệm thu khuôn mặt khách)
    *   [ ] **AC-02**: Modal Camera Nghiệm Thu: Yêu cầu người thực hiện (Thợ tự do hoặc Staff Agency) chụp rõ khuôn mặt khách sau khi make-up xong. Ảnh được nén và tải lên server lưu trữ bằng chứng hoàn tất hợp đồng.
    *   [ ] **AC-03**: Phân luồng sau khi bấm hoàn tất ca làm:
        *   Đối với `ROLE_FREELANCE_MUA`: Hệ thống kích hoạt sự kiện Spring Boot DoubleEntryLedger tự động giải ngân tiền từ quỹ cọc Escrow vào Ví thợ.
        *   Đối với `ROLE_AGENCY_STAFF`: Cập nhật trạng thái hoàn thành đơn hàng cho Agency và ghi nhận KPI ca trực cho nhân viên.

---

### 🎯 APP-MUA-04: Quản Lý Album Ảnh Mẫu Theo Từng Dịch Vụ (Service-Linked Showcase)
*   **Loại**: User Story
*   **Phân hệ**: Thợ tự do (`ROLE_FREELANCE_MUA`)
*   **Mức độ ưu tiên**: Medium
*   **File dự kiến**: `src/app/mua/portfolio-manager.tsx`, `src/app/mua/showcase-create.tsx`
*   **Mô tả**:
    *   *Là một*: Thợ trang điểm tự do,
    *   *Tôi muốn*: Quản lý album ảnh mẫu tác phẩm gắn chặt chẽ theo từng Gói Dịch Vụ cụ thể (ví dụ: Cô dâu, Dự tiệc, Kỷ yếu) thay vì gộp chung lộn xộn,
    *   *Để*: Khách hàng khi bấm vào dịch vụ nào sẽ xem được ngay các tác phẩm đã make thực tế tương ứng của đúng dịch vụ đó.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Danh sách Showcase được phân nhóm theo từng Gói Dịch Vụ (`package_id`).
    *   [ ] **AC-02**: Form tải ảnh mẫu theo dịch vụ:
        *   Chọn Gói dịch vụ áp dụng (`package_id` bắt buộc: ví dụ Gói Cô dâu).
        *   Nhập Tiêu đề look make-up (ví dụ: *"Cô dâu tiệc tối tone Nude trong veo"*).
        *   Tải lên Ảnh chính hoàn thiện (`image_file`) và tối đa 5 ảnh góc chụp cận cảnh hoàn thiện (`additional_files`).
        *   Mô tả điểm nhấn kỹ thuật (che khuyết điểm mụn, tạo khối mũi cao, tone da căng bóng).
    *   [ ] **AC-03**: Thao tác Ghim ảnh mẫu tiêu biểu (`featured`) lên đầu của gói dịch vụ đó và Xóa ảnh khi không còn phù hợp.

---

### 🎯 APP-MUA-05: Cài Đặt Hồ Sơ Tay Nghề & Bán Kính Hoạt Động
*   **Loại**: User Story
*   **Phân hệ**: Thợ tự do (`ROLE_FREELANCE_MUA`)
*   **Mức độ ưu tiên**: Medium
*   **File dự kiến**: `src/app/mua/profile-settings.tsx`, `src/components/mua/RadiusSliderPicker.tsx`
*   **Mô tả**:
    *   *Là một*: Thợ trang điểm tự do,
    *   *Tôi muốn*: Điều chỉnh bán kính di chuyển tối đa nhận khách và đăng ký danh mục phong cách sở trường,
    *   *Để*: Hệ thống chỉ gợi ý và phát sóng những đơn hàng nằm trong khả năng di chuyển và đúng thế mạnh chuyên môn của tôi.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Thanh trượt chọn Bán Kính Hoạt Động (`Radius Slider`): Cho phép kéo chọn từ `1 km` đến `50 km` (bước nhảy 1km). Giá trị hiển thị trực quan cùng vòng tròn bán kính trên bản đồ minh họa.
    *   [ ] **AC-02**: Danh sách Checkbox chọn các Phong cách làm đẹp sở trường (Tone Hàn, Tone Tây, Douyin, Cosplay, Chụp Kỷ Yếu...).
    *   [ ] **AC-03**: Chỉnh sửa Bio giới thiệu bản thân và số năm kinh nghiệm thực tế.

---

### 🎯 APP-MUA-06: Quản Lý Gói Dịch Vụ & Bộ Ảnh Mẫu Đi Kèm (Package & Media Manager)
*   **Loại**: User Story
*   **Phân hệ**: Thợ tự do (`ROLE_FREELANCE_MUA`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/app/mua/packages.tsx`, `src/app/mua/package-create.tsx`
*   **Mô tả**:
    *   *Là một*: Thợ trang điểm tự do,
    *   *Tôi muốn*: Tạo mới, chỉnh sửa các gói dịch vụ làm đẹp cá nhân, đặt giá niêm yết, thời lượng làm việc và trực tiếp quản lý bộ sưu tập ảnh mẫu đã make thực tế của gói đó,
    *   *Để*: Công khai bảng giá và các tác phẩm thực tế đã làm cho đúng dịch vụ đó cho khách hàng tham khảo.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Danh sách các gói dịch vụ hiện tại của thợ kèm trạng thái: Đang nhận khách / Tạm ngưng.
    *   [ ] **AC-02**: Form Tạo/Sửa gói dịch vụ tích hợp bộ sưu tập ảnh mẫu:
        *   Chọn Danh mục gốc (Cô dâu, Dự tiệc, Kỷ yếu, Sự kiện...).
        *   Nhập Tên gói dịch vụ (ví dụ: *"Trang Điểm Cô Dâu Đãi Tiệc Tối"*).
        *   Nhập Giá niêm yết (tối thiểu 50.000 VNĐ) và Thời lượng dự kiến (tối thiểu 30 phút).
        *   Tải lên **Ảnh đại diện chính** của gói và danh sách các **Ảnh mẫu đã make thực tế** cho gói này.
        *   Tùy chọn thêm các bước làm đẹp (Package Items: Đính đá, dán mi cao cấp, làm tóc...).
    *   [ ] **AC-03**: Gọi API Backend: `POST /api/v1/packages` (tạo mới) và `PUT /api/v1/packages/{id}` (cập nhật).

---

## 3.5 SPRINT M-4: QUẢN LÝ CA TRỰC & ĐƠN ĐIỀU PHỐI (`ROLE_AGENCY_STAFF`)

### 🎯 APP-STAFF-01: Lịch Ca Trực Tuần & Điểm Danh GPS Tại Chi Nhánh Studio
*   **Loại**: User Story
*   **Phân hệ**: Nhân viên Studio (`ROLE_AGENCY_STAFF`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/app/staff/shifts.tsx`, `src/components/staff/WeeklyShiftView.tsx`
*   **Mô tả**:
    *   *Là một*: Nhân viên trang điểm của Studio/Agency,
    *   *Tôi muốn*: Xem bảng phân ca làm việc từ Thứ 2 đến Chủ Nhật và thực hiện bấm nút Check-in / Check-out ca trực bằng định vị GPS khi có mặt tại cơ sở,
    *   *Để*: Ghi nhận chuyên cần đi làm minh bạch và làm cơ sở chấm công tính lương.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria - Gherkin)**:
    ```gherkin
    Scenario: Nhân viên điểm danh Check-in đầu ca làm
      Given Nhân viên đang có mặt tại địa chỉ Studio của Agency
      When Nhân viên nhấn nút "Điểm Danh Check-in Ca Sáng"
      Then Hệ thống trích xuất tọa độ GPS hiện tại và so sánh với tọa độ cơ sở của Studio
      And Nếu khoảng cách <= 100 mét: Điểm danh thành công, trạng thái ca chuyển thành "ĐÚNG GIỜ"
      And Nếu khoảng cách > 100 mét: Báo lỗi "Bạn chưa có mặt tại studio (Cách 350m). Vui lòng di chuyển tới cơ sở để điểm danh!"
    ```

---

### 🎯 APP-STAFF-02: Đăng Ký & Quản Lý Giờ Làm Thêm (Overtime)
*   **Loại**: User Story
*   **Phân hệ**: Nhân viên Studio (`ROLE_AGENCY_STAFF`)
*   **Mức độ ưu tiên**: Medium
*   **File dự kiến**: `src/app/staff/overtime.tsx`, `src/components/staff/OvertimeApplyModal.tsx`
*   **Mô tả**:
    *   *Là một*: Nhân viên Studio,
    *   *Tôi muốn*: Xem các suất ca làm thêm do Agency mở đăng ký vào các ngày cao điểm (Mùa cưới, Lễ tết) và nộp đơn giải trình làm thêm giờ,
    *   *Để*: Gia tăng thu nhập và được phê duyệt hệ số phụ cấp ngoài giờ.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Danh sách các suất Overtime cần người: Ngày, Giờ bắt đầu - Giờ kết thúc, Hệ số thù lao (1.5x, 2.0x).
    *   [ ] **AC-02**: Nút bấm *"Đăng Ký Nhận Ca"* gửi yêu cầu trực tiếp tới Agency Admin.
    *   [ ] **AC-03**: Theo dõi trạng thái phê duyệt đơn làm thêm giờ: `CHỜ DUYỆT`, `ĐÃ CHẤP THUẬN`, `TỪ CHỐI`.

---

### 🎯 APP-STAFF-03: Tiếp Nhận & Thực Hiện Đơn Điều Phối Từ Đại Lý (Dispatched Jobs)
*   **Loại**: User Story
*   **Phân hệ**: Nhân viên Studio (`ROLE_AGENCY_STAFF`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/app/staff/dispatched-jobs.tsx`, `src/components/staff/DispatchedJobCard.tsx`
*   **Mô tả**:
    *   *Là một*: Nhân viên trang điểm của Studio,
    *   *Tôi muốn*: Nhận danh sách các ca trang điểm do quản lý Agency Admin phân công chỉ định cho tôi thực hiện và bấm nút tiến hành ca làm,
    *   *Để*: Nắm bắt lịch phục vụ khách hàng, địa chỉ cần tới và trực tiếp cập nhật quy trình 4 giai đoạn & chụp ảnh nghiệm thu (đồng bộ với APP-MUA-03).
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Thẻ đơn điều phối hiển thị: Mã đơn, Khách hàng, Địa chỉ thực hiện (Tại Studio hoặc Tận nơi của khách), Thời gian hẹn, Gói dịch vụ chỉ định.
    *   [ ] **AC-02**: Nút *"Xác Nhận Tiếp Nhận Ca"* để báo cho Agency Admin biết nhân viên đã sẵn sàng.
    *   [ ] **AC-03**: Nút *"Bắt Đầu Thực Hiện Ca Làm"*: Điều hướng sang màn hình Tiến trình thực hiện ca làm (`src/app/job-execution/[id].tsx` - APP-MUA-03) để nhân viên bấm Bắt đầu di chuyển, Đã tới, Bắt đầu trang điểm và mở camera chụp ảnh nghiệm thu khách hàng.

---

### 🎯 APP-STAFF-04: Quản Lý Ảnh Mẫu Tay Nghề Theo Từng Dịch Vụ Của Staff (Staff Service Showcase)
*   **Loại**: User Story
*   **Phân hệ**: Nhân viên Studio (`ROLE_AGENCY_STAFF`)
*   **Mức độ ưu tiên**: Medium
*   **File dự kiến**: `src/app/staff/portfolio.tsx`, `src/app/staff/showcase-upload.tsx`
*   **Mô tả**:
    *   *Là một*: Nhân viên trang điểm của Studio/Agency,
    *   *Tôi muốn*: Tải lên các hình ảnh mẫu tác phẩm trang điểm thực tế do chính mình thực hiện, **phân loại cụ thể theo từng dịch vụ/phong cách** được Studio giao phụ trách,
    *   *Để*: Khi khách hàng chọn dịch vụ tương ứng của Studio (ví dụ Make Cô Dâu), khách hàng có thể bấm xem album ảnh mẫu do chính tay tôi make để an tâm chất lượng.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Danh sách tác phẩm mẫu của nhân viên được phân chia theo từng Dịch Vụ được Studio phân công (`AgencyStaffService`).
    *   [ ] **AC-02**: Form tải lên ảnh mẫu: Chọn Dịch vụ Studio giao, tải lên ảnh tác phẩm chính và các góc chụp chi tiết.
    *   [ ] **AC-03**: Khi khách hàng duyệt danh sách thợ theo dịch vụ của Studio, ảnh mẫu của nhân viên hiển thị tương ứng theo đúng dịch vụ khách đang quan tâm.

---

## 3.6 SPRINT M-5: LIVE GPS STREAMING, WEBSOCKET STOMP & TIỆN ÍCH CHUNG

### 🎯 APP-CORE-01: Bộ Thu / Phát WebSocket STOMP Nhúng Trực Tiếp
*   **Loại**: Task Hạ Tầng Realtime (Realtime Infrastructure)
*   **Phân hệ**: Toàn hệ thống (Core Mobile)
*   **Mức độ ưu tiên**: Critical
*   **File dự kiến**: `src/services/stomp.service.ts`, `src/hooks/useWebSocket.ts`
*   **Mô tả**: Xây dựng service quản lý kết nối WebSocket STOMP nhúng trực tiếp tới Spring Boot Core API endpoint `/ws-makeup`. Hỗ trợ xác thực bằng Access Token qua CONNECT headers, tự động duy trì nhịp tim (Heartbeat 10s), tái kết nối thông minh với thuật toán Exponential Backoff và phân phối tin nhắn vào các subscribers.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Kết nối thành công tới `ws://192.168.0.229:8080/ws-makeup` kèm header `Authorization: Bearer <token>`.
    *   [ ] **AC-02**: Cung cấp hàm `subscribeTopic(topic, callback)` để lắng nghe:
        *   `/topic/booking-broadcast`: Nhận thông báo đơn khẩn cấp 30s.
        *   `/topic/gps-stream/{bookingId}`: Nhận luồng tọa độ GPS thợ di chuyển.
    *   [ ] **AC-03**: Tự động phục hồi kết nối trong vòng 3 giây nếu mạng bị ngắt đột ngột mà không gây crash ứng dụng.

---

### 🎯 APP-CORE-02: Dịch Vụ Phát Sóng Tọa Độ Chạy Ngầm (Background Location Task)
*   **Loại**: Task Hệ Thống (Background Native Task)
*   **Phân hệ**: Thợ MUA & Staff (`ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`)
*   **Mức độ ưu tiên**: Critical
*   **File dự kiến**: `src/services/location-task.service.ts`, `src/hooks/useGpsTracker.ts`
*   **Mô tả**: Hiện thực tác vụ chạy ngầm định vị GPS sử dụng `expo-location` và `expo-task-manager`. Khi thợ bật chế độ Trực Tuyến hoặc đang trên đường di chuyển tới chỗ khách hàng, thiết bị tự động gửi tọa độ (kinh độ, vĩ độ, tốc độ, góc quay hướng) về Backend mỗi 5 - 10 giây ngay cả khi tắt màn hình điện thoại hoặc chuyển sang ứng dụng khác.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Xin cấp quyền định vị `LOCATION_FOREGROUND` và `LOCATION_BACKGROUND` với lý do giải thích minh bạch theo tiêu chuẩn Apple App Store / Google Play Store.
    *   [ ] **AC-02**: Tác vụ chạy ngầm gửi dữ liệu qua WebSocket STOMP `/app/telemetry/stream` (hoặc REST fallback `POST /api/v1/telemetry/stream`) định kỳ 5 giây/lần.
    *   [ ] **AC-03**: Tích hợp thuật toán lọc nhiễu Kalman Filter và thuật toán tiết kiệm pin: Chỉ phát sóng khi thiết bị di chuyển quá 5 mét. Tự động dừng tác vụ ngầm khi thợ tắt trạng thái Online hoặc khi ca làm kết thúc.

---

### 🎯 APP-CORE-03: Màn Hình Bản Đồ Bám Đuổi Thợ Di Chuyển Thời Gian Thực
*   **Loại**: User Story
*   **Phân hệ**: Khách hàng (`ROLE_CUSTOMER`)
*   **Mức độ ưu tiên**: High
*   **File dự kiến**: `src/app/booking/tracking/[id].tsx`, `src/components/booking/LiveTrackingMap.tsx`
*   **Mô tả**:
    *   *Là một*: Khách hàng đang chờ thợ trang điểm tới nhà,
    *   *Tôi muốn*: Xem bản đồ tương tác hiển thị vị trí của tôi, vị trí biểu tượng thợ trang điểm đang di chuyển trên đường và thời gian dự kiến đến nơi (ETA),
    *   *Để*: Chủ động sắp xếp không gian make-up và an tâm về thời gian thợ có mặt.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria - Gherkin)**:
    ```gherkin
    Scenario: Khách hàng theo dõi vị trí thợ đang di chuyển
      Given Khách hàng mở màn hình "Theo Dõi Lộ Trình" của đơn hàng đang ở trạng thái ON_THE_WAY
      When Bản đồ hiển thị vị trí ghim Nhà khách hàng và Marker biểu tượng Cốp trang điểm của Thợ MUA
      And Thợ MUA di chuyển trên đường và phát sóng tọa độ GPS
      Then Marker của thợ trượt mượt mà theo thời gian thực (smooth animation interpolation)
      And Thẻ đáy cập nhật thời gian dự kiến: "Thợ còn cách bạn 1.5 km - Dự kiến đến trong 7 phút"
      And Khách hàng có thể bấm nút "Gọi Điện" hoặc "Nhắn Tin" trực tiếp cho thợ
    ```

---

### 🎯 APP-CORE-04: Màn Hình Đổi Mật Khẩu & Cài Đặt Ngôn Ngữ Tức Thời
*   **Loại**: User Story
*   **Phân hệ**: Toàn hệ thống (All Personas)
*   **Mức độ ưu tiên**: Medium
*   **File dự kiến**: `src/app/(auth)/change-password.tsx`, `src/components/LanguageToggleModal.tsx`
*   **Mô tả**:
    *   *Là một*: Người dùng ứng dụng,
    *   *Tôi muốn*: Đổi mật khẩu định kỳ để bảo vệ tài khoản và chuyển đổi ngôn ngữ hiển thị giữa Tiếng Việt và Tiếng Anh tức thời,
    *   *Để*: Bảo mật tài khoản cá nhân và sử dụng ứng dụng bằng ngôn ngữ thuận tiện nhất.
*   **Tiêu chí Chấp Nhận (Acceptance Criteria)**:
    *   [ ] **AC-01**: Màn hình Đổi mật khẩu gồm 3 ô: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới.
    *   [ ] **AC-02**: Kiểm tra Bean Validation: Mật khẩu mới không được trùng mật khẩu cũ và phải thỏa mãn biểu thức chính quy bảo mật.
    *   [ ] **AC-03**: Nút chuyển đổi ngôn ngữ (Tiếng Việt `vi` / Tiếng Anh `en`): Khi chọn, toàn bộ nhãn văn bản trên giao diện lập tức đổi ngôn ngữ mà không cần tải lại ứng dụng (Instant Re-render qua Zustand Store).
    *   [ ] **AC-04**: Tự động lưu ngôn ngữ đã chọn vào SecureStore và gắn header `Accept-Language: vi` (hoặc `en`) vào mọi HTTP request gửi lên Spring Boot.

---

# 4. MA TRẬN ÁNH XẠ API BACKEND & WEBSOCKET TOPICS

Bảng tổng hợp đối chiếu 28 Task Issues với các Endpoints điều khiển tại tầng Backend Spring Boot Core API:

| Mã Issue | Tên Phân Hệ / Tính Năng | Phương Thức | Endpoint Backend / STOMP Topic | Lớp Controller Backend |
| :--- | :--- | :---: | :--- | :--- |
| **APP-AUTH-03** | Đăng nhập hệ thống | `POST` | `/api/v1/auth/login` | `AuthController` |
| **APP-AUTH-04** | Đăng ký Khách / Thợ MUA | `POST` | `/api/v1/auth/register` | `AuthController` |
| **APP-AUTH-05** | Bóc tách lỗi validation | - | Áp dụng trên toàn bộ payload phản hồi | `GlobalExceptionHandler` |
| **APP-CUST-01** | Tìm kiếm & Lọc dịch vụ | `GET` | `/api/v1/catalog/packages/search` | `ServicePackageController` |
| **APP-CUST-02** | Xem chi tiết hồ sơ MUA | `GET` | `/api/v1/mua/profiles/{id}` | `MuaProfileController` |
| **APP-CUST-03** | Thư viện Portfolio & Ảnh Mẫu | `GET` | `/api/v1/mua/portfolios/by-mua/{muaId}` | `MuaPortfolioController` |
| **APP-CUST-04** | Cập nhật hồ sơ & Địa chỉ | `PUT`<br>`POST` | `/api/v1/customer/profile`<br>`/api/v1/customer/addresses` | `CustomerProfileController` |
| **APP-BOOK-01** | Tạo đơn đặt lịch hẹn | `POST` | `/api/v1/customer/bookings` | `CustomerBookingController` |
| **APP-BOOK-02** | Tính toán biểu phí động | `POST` | `/api/v1/pricing/calculate-quote` | `DynamicPricingController` |
| **APP-BOOK-03** | Danh sách lịch hẹn đa trạng thái | `GET` | `/api/v1/customer/bookings/my-bookings` | `BookingHistoryController` |
| **APP-BOOK-04** | Phát lệnh radar tìm thợ 30s | `POST` | `/api/v1/customer/bookings/instant` | `CustomerInstantBookingController` |
| **APP-MUA-01** | Bật/tắt trạng thái trực tuyến | `PATCH` | `/api/v1/mua/status/availability` | `MuaProfileController` |
| **APP-MUA-02** | Thợ MUA tranh chấp nhận ca | `POST` | `/api/v1/booking/{id}/accept` | `BookingAcceptanceController` |
| **APP-MUA-03** | Chuyển 4 bước tiến độ & Nghiệm thu | `POST`<br>`POST` | `/api/v1/booking/{id}/state-transition`<br>`/api/v1/booking/{id}/proof-upload` | `BookingStateController` |
| **APP-MUA-04** | Quản lý Showcase Portfolio | `POST`<br>`DELETE` | `/api/v1/mua/portfolios`<br>`/api/v1/mua/portfolios/{id}` | `MuaPortfolioController` |
| **APP-MUA-05** | Cài đặt bán kính km & Bio | `PUT` | `/api/v1/mua/profile/settings` | `MuaProfileController` |
| **APP-MUA-06** | Quản lý Gói Dịch Vụ & Ảnh Mẫu | `POST`<br>`PUT` | `/api/v1/packages`<br>`/api/v1/packages/{id}` | `ServicePackageController` |
| **APP-STAFF-01**| Xem ca trực & Điểm danh GPS | `GET`<br>`POST` | `/api/v1/agency/shifts/my-shifts`<br>`/api/v1/agency/shifts/check-in` | `AgencyShiftController` |
| **APP-STAFF-02**| Đăng ký giờ làm thêm (OT) | `POST` | `/api/v1/agency/overtime/apply` | `AgencyOvertimeController` |
| **APP-STAFF-03**| Danh sách đơn điều phối từ Studio| `GET` | `/api/v1/agency/staff/dispatched-jobs` | `AgencyBookingController` |
| **APP-STAFF-04**| Album ảnh mẫu tay nghề Staff | `POST`<br>`GET` | `/api/v1/muas/my-profile/portfolios` | `MuaPortfolioController` |
| **APP-CORE-01**| Handshake STOMP WebSocket | `WSS` | `ws://192.168.0.229:8080/ws-makeup` | `WebSocketConfig` |
| **APP-CORE-01**| Broadcast đơn khẩn cấp 30s | `SUB` | `/topic/booking-broadcast` | `InstantBookingBroadcast` |
| **APP-CORE-02**| Stream tọa độ GPS ngầm | `SEND`<br>`POST` | `/app/telemetry/stream`<br>`/api/v1/telemetry/stream` | `LocationStreamController` |
| **APP-CORE-03**| Lắng nghe tọa độ bám đuổi live | `SUB` | `/topic/gps-stream/{bookingId}` | `TelemetryQueryController` |
| **APP-CORE-04**| Đổi mật khẩu tài khoản | `POST` | `/api/v1/auth/change-password` | `AuthController` |

---

# 5. YÊU CẦU PHI CHỨC NĂNG & AN TOÀN HỆ THỐNG (NON-FUNCTIONAL REQUIREMENTS)

### 5.1 Hiệu Năng Ứng Dụng (Performance & Battery Efficiency)
1.  **Thời gian Khởi Động (App Launch Time)**:
    *   Cold start (khởi động nguội): Dưới `1.8 giây` để hiển thị khung giao diện đầu tiên.
    *   Warm start (mở lại từ chế độ nền): Dưới `0.4 giây`.
2.  **Tối Ưu Hóa Tiêu Hao Pin Khi Định Vị Ngầm (GPS Battery Optimization)**:
    *   Tác vụ chạy ngầm `expo-location` sử dụng thuật toán `DistanceInterval: 5m` và `Accuracy: Balanced`.
    *   Tuyệt đối không duy trì định vị chính xác cao liên tục khi thiết bị đứng yên một chỗ quá 3 phút, giúp giảm tiêu hao pin dưới 3% pin mỗi giờ hoạt động trực tuyến.
3.  **Độ Trễ Mạng & Bám Đuổi Realtime**:
    *   Độ trễ cập nhật tọa độ từ thợ MUA sang màn hình bản đồ khách hàng thông qua STOMP WebSocket không vượt quá `500ms`.

### 5.2 Bảo Mật Phần Cứng & Quản Lý Phiên (Hardware Security & Session Lifecycle)
1.  **Lưu Trữ Mã Hóa Bằng Phần Cứng**:
    *   Mọi thông tin nhạy cảm (`accessToken`, `refreshToken`, `userId`, `role`) BẮT BUỘC lưu trữ qua `expo-secure-store`.
    *   Tuyệt đối KHÔNG lưu trữ thông tin xác thực trong `AsyncStorage` dạng plain-text.
2.  **Cơ Chế Silent Token Refresh (Tự Động Làm Mới Phiên)**:
    *   Khi Access Token hết hạn (Backend trả về mã lỗi `401 Unauthorized`), tầng Axios Interceptor tự động tạm dừng các request khác, gọi ngầm endpoint `POST /api/v1/auth/refresh-token` bằng Refresh Token lưu trong SecureStore.
    *   Nếu làm mới thành công: Cập nhật Access Token mới và gửi lại request bị gián đoạn mà người dùng không hề hay biết.
    *   Nếu Refresh Token hết hạn hoặc bị thu hồi (Blacklist trên Redis): Xóa sạch phiên làm việc trong SecureStore và đẩy người dùng về màn hình Đăng nhập.

### 5.3 Chống Tranh Chấp Nhận Ca Realtime (Concurrency & Redlock)
*   Tại thời điểm broadcast đơn khẩn cấp 30 giây, nhiều thợ MUA có thể cùng nhấn nút nhận ca trong tích tắc.
*   Backend sử dụng **Redisson Distributed Lock (`redlock:booking:{id}`)** với thời gian TTL 5 giây.
*   Chỉ duy nhất 1 thợ đầu tiên chiếm được khóa Redis mới được xác nhận nhận ca thành công. Ứng dụng di động của các thợ đến sau sẽ nhận mã lỗi `ERR_BOOKING_ALREADY_ACCEPTED` và tự động hiển thị thông báo dịu nhẹ giải thích đơn đã có người nhận.

### 5.4 Chuẩn Đa Ngôn Ngữ Tức Thời (Instant Internationalization - i18n)
*   Toàn bộ chuỗi văn bản trên giao diện (nhãn form, tiêu đề, nút bấm, thông báo trạng thái) được lưu trữ song ngữ tại `src/constants/i18n.constant.js`.
*   Khi người dùng bấm chuyển đổi giữa `Tiếng Việt` và `English`, giao diện re-render tức thì mà không cần khởi động lại ứng dụng.
*   Mọi yêu cầu gửi lên Backend đều mang theo header `Accept-Language: vi` (hoặc `en`) để Backend trả về các thông điệp nghiệp vụ bản địa hóa tương thích.

---
*Tài liệu được lập theo quy chuẩn kỹ thuật ISO/IEC/IEEE 29148 và đồng bộ 100% với kiến trúc Spring Boot Core API cùng Design System Figma của dự án.*
