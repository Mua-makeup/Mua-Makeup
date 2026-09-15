# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: HOÀN THIỆN UI/UX FRONTEND, MOBILE APP & STUDIO WEB PORTAL
### (React Vite Web Portal + React Native Mobile App - Luxury Beauty & Clean Minimalist Standards)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Frontend & Mobile UI/UX Polish, Design System & Studio Dispatching Board`
* **Mã Jira Issues phụ trách (Sprint 6 - Nhóm 2):**
  * `ISSUE-25.1`: **User Story** - Hoàn thiện UI/UX App Khách hàng (Live Map tracking vị trí thợ xoay mượt mà, Lightbox Portfolio ảnh Full HD).
  * `ISSUE-25.2`: **Task** - Hoàn thiện UI/UX App Thợ (Công tắc On/Off phát sóng GPS kèm Haptic Feedback, Đĩa đếm ngược 30–45s nhận ca khẩn cấp).
  * `ISSUE-25.3`: **Task** - Hoàn thiện UI/UX Web Studio Portal (Dashboard Analytics số liệu tài chính trực quan, Ma trận xếp ca làm việc Drag & Drop).

* **Triết Lý Thiết Kế & Quy Chuẩn Giao Diện (Design Principles):**
  * **Cổng Web Quản Trị Studio & Admin (`code/frontend`):** Tuân thủ tuyệt đối [admin-frontend-standards.md](file:///c:/Users/Asus/Documents/Mua-Makeup/.agent/rules/admin-frontend-standards.md):
    - **Tối giản, Thực dụng, Mật độ dữ liệu cao (Data-Dense Clean UI):** Tông nền `bg-slate-50`, card trắng viền mỏng `border-slate-200`, cấm hoàn toàn hiệu ứng kính mờ (glassmorphism/blur) và gradient neon chói mắt.
    - **100% Form nhập liệu có Zod Schema:** Kèm thông báo lỗi tiếng Việt tường minh.
    - **Đủ 3 trạng thái giao diện:** Skeleton loading (không dùng spinner đơn điệu), Empty state thân thiện, Error state có nút Retry.
  * **Ứng Dụng Di Động Khách Hàng & Thợ (`code/mobile`):**
    - **Luxury Beauty & Glamour Design Tokens:** Tông màu Rose Gold, Champagne, Burgundy sang trọng.
    - **Micro-Animations & Live Telemetry:** Biểu tượng thợ trên bản đồ xoay mượt mà theo góc `heading` (0-360°) bằng thuật toán nội suy Lerp (Linear Interpolation).
    - **Rung phản hồi xúc giác (Haptic Feedback) & Âm thanh:** Kích thích phản xạ nhận ca khẩn cấp trong 30s.

---

## 🏗️ 2. CẤU TRÚC THƯ MỤC FRONTEND & MOBILE CHUẨN MỰC

Tuân thủ cấu trúc dự án chuẩn tại `code/frontend/` và `code/mobile/`:

```text
code/frontend/src/                             # WEB STUDIO & ADMIN PORTAL
├── api/
│   ├── agencyApi.js                           # Gọi /api/v1/agencies, /api/v1/packages, /api/v1/shifts
│   └── superAdminApi.js                       # Gọi /api/v1/admin/*
├── schemas/
│   ├── agencySchema.js                        # Zod: Thêm ca, gán thợ, đổi lịch trực
│   └── reviewDisputeSchema.js                 # Zod: Phán quyết khiếu nại, ghi chú hòa giải
├── store/
│   ├── useAgencyStore.js                      # Zustand: Dữ liệu ca trực, danh sách thợ studio
│   └── useSuperAdminStore.js                  # Zustand: Thống kê GMV, danh sách duyệt payout
├── components/
│   ├── base/                                  # BaseButton, BaseTable, BaseBadge, Skeleton, ConfirmDialog
│   └── features/
│       ├── agency/
│       │   ├── ShiftMatrixBoard.jsx           # Bảng ma trận ca trực tuần (7 ngày x Ca sáng/chiều/tối)
│       │   ├── StaffAssignmentModal.jsx       # Modal chọn thợ chính / thợ phụ cho ca hẹn
│       │   └── RevenueChart.jsx               # Biểu đồ doanh thu Recharts tối giản
│       └── admin/
│           └── DisputeInspectionModal.jsx     # Modal soi ảnh bằng chứng khiếu nại
└── pages/
    ├── Agency/
    │   ├── DispatchBoardPage.jsx              # Bảng điều phối ca khẩn cấp & lịch hẹn
    │   └── StaffManagementPage.jsx            # Quản lý thợ nội bộ & gán phong cách makeup
    └── SuperAdmin/
        └── DisputeResolutionPage.jsx          # Giải quyết khiếu nại & duyệt hoàn tiền

code/mobile/src/                               # MOBILE APP (CUSTOMER & FREELANCE MUA)
├── components/
│   ├── customer/
│   │   ├── LiveTrackingMap.tsx                # Bản đồ Mapbox/Google Maps di chuyển mượt mà (Lerp)
│   │   └── PortfolioLightbox.tsx              # Xem ảnh mẫu phong cách phóng to đa điểm (Pinch-to-zoom)
│   └── mua/
│       ├── ReadinessToggleSwitch.tsx          # Công tắc Online/Offline phát sóng GPS (Haptic Vibration)
│       └── UrgentOfferCountdownModal.tsx      # Đĩa quay đếm ngược 30s âm thanh chuông báo động
├── store/
│   ├── useCustomerTrackingStore.ts            # Tọa độ thợ, ETA đến nơi, bearing xe
│   └── useMuaWorkstationStore.ts              # Trạng thái rảnh việc, cự ly nhận đơn tối đa
└── screens/
    ├── customer/
    │   └── LiveTrackingScreen.tsx             # Màn hình theo dõi hành trình thợ
    └── mua/
        └── MuaWorkstationScreen.tsx           # Bàn làm việc thợ (Radar tìm việc)
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-FE-01: Hoàn Thiện UI/UX App Khách Hàng - Live Map Tracking & Lightbox Portfolio (`ISSUE-25.1`)**
> **As a** Khách hàng đang chờ thợ trang điểm đến nhà,  
> **I want** xem biểu tượng xe của thợ di chuyển liên tục, không bị giật cục trên bản đồ và có thể phóng to xem chi tiết các ảnh mẫu make-up trong Portfolio,  
> **So that** tôi có trải nghiệm sang trọng, đẳng cấp và hoàn toàn an tâm trong lúc chờ đợi.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Hiển thị bản đồ Live Tracking với chuyển động mượt mà (Smooth Interpolation)**
  * **Given** Khách hàng đang mở màn hình `LiveTrackingScreen.tsx`.
  * **When** Thiết bị nhận được gói tin STOMP chứa tọa độ mới sau mỗi 5 giây (`latitude`, `longitude`, `heading_degrees`, `speed_kmh`).
  * **Then** Marker biểu tượng xe trên bản đồ không bị nhảy giật tức thời mà di chuyển lướt mượt qua thuật toán nội suy tuyến tính (Linear Interpolation - 60 FPS) trong suốt 5 giây.
  * **And** Biểu tượng xe tự động xoay mượt theo góc di chuyển `heading_degrees` (với animation xoay góc ngắn nhất).
  * **And** Khung thẻ thông tin nổi bật:
    - Ảnh đại diện thợ, họ tên, rating sao.
    - Thời gian dự kiến có mặt: `"Khoảng 7 phút nữa (cách bạn 1.8 km)"`.
    - Nút gọi điện nhanh: **[Gọi Thợ]** & **[Nhắn Tin]**.

* **Scenario 02: Trình xem ảnh Lightbox Portfolio với cử chỉ phóng to thu nhỏ (Pinch-to-Zoom)**
  * **Given** Khách hàng nhấn vào một bức ảnh trong Portfolio của Thợ.
  * **When** Component `PortfolioLightbox.tsx` mở ra toàn màn hình.
  * **Then** Nền tối sâu `bg-black/95` làm nổi bật chi tiết lớp trang điểm.
  * **And** Người dùng có thể dùng 2 ngón tay kéo zoom tối đa $300\%$ để soi rõ độ mịn của da và màu son.
  * **And** Vuốt ngang sang trái/phải để chuyển ảnh mượt mà kèm hiệu ứng chuyển cảnh tự nhiên.

---

### **US-FE-02: Hoàn Thiện UI/UX App Thợ - Công Tắc GPS & Đĩa Đếm Ngược 30–45s (`ISSUE-25.2`)**
> **As a** Thợ trang điểm tự do (`ROLE_FREELANCE_MUA`),  
> **I want** bật công tắc "Sẵn sàng nhận việc" với phản hồi rung chắc chắn và khi có đơn khẩn cấp, màn hình mở đĩa quay đếm ngược 30s toàn phần với âm thanh chuông báo nổi bật,  
> **So that** tôi không bao giờ bỏ lỡ các ca làm giá trị cao quanh khu vực của mình.

#### **Tiêu chí Nghiệm thu UI/UX & Mobile Haptic:**

* **Scenario 01: Bật/Tắt công tắc sẵn sàng nhận việc (Readiness Toggle Switch)**
  * **Given** Thợ đang ở màn hình Bàn làm việc (`MuaWorkstationScreen.tsx`).
  * **When** Thợ gạt công tắc `ReadinessToggleSwitch`:
    * Chuyển sang trạng thái **ONLINE (Màu xanh Emerald `bg-emerald-600`)**:
      - Thiết bị rung nhẹ 1 nhịp dứt khoát qua `HapticFeedback.trigger('impactMedium')`.
      - Khởi động ngầm tiến trình phát sóng GPS định kỳ về Redis GEO.
      - Hiển thị thông báo toast: `"Bạn đã sẵn sàng nhận đơn khẩn cấp quanh bán kính 10km"`.
    * Chuyển sang trạng thái **OFFLINE (Màu xám `bg-slate-400`)**:
      - Tắt phát sóng GPS ngầm để tiết kiệm pin tối đa.

* **Scenario 02: Màn hình Popup đếm ngược 30s khi nhận được đơn khẩn cấp**
  * **Given** Thợ đang bật Online và có đơn khẩn cấp phát sóng qua STOMP `/topic/booking-broadcast`.
  * **When** Ứng dụng nhận được payload `INSTANT_BOOKING_OFFER`.
  * **Then** Màn hình lập tức bật `UrgentOfferCountdownModal`:
    * Âm thanh chuông báo động `countdown_alert.mp3` vang lên 3 hồi.
    * Đĩa quay đếm lùi tròn (Circular Progress) chạy mượt mà từ 30s về 0s:
      - Giây 30 $\rightarrow$ 15: Vòng tròn màu Xanh ngọc lục bảo.
      - Giây 14 $\rightarrow$ 6: Vòng tròn đổi sang Vàng hổ phách.
      - Giây 5 $\rightarrow$ 0: Vòng tròn đổi sang Đỏ Ruby nhấp nháy khẩn cấp.
    * Thẻ số liệu thu nhập cực to: **"THỰC NHẬN: 2,184,000 đ"**.
    * Nút trượt nhận đơn: **[Trượt sang phải để Nhận Ca]** (Slider Action chống bấm nhầm).

---

### **US-FE-03: Hoàn Thiện Web Studio Portal - Ma Trận Ca Trực & Dashboard Phân Tích (`ISSUE-25.3`)**
> **As a** Chủ Studio / Quản lý Đại lý (`ROLE_AGENCY_ADMIN`),  
> **I want** xem Dashboard phân tích doanh thu sắc nét và thao tác xếp ca thợ trực quan trên Ma trận lịch tuần bằng thao tác kéo thả (Drag & Drop),  
> **So that** việc điều phối hàng chục thợ diễn ra trơn tru mà không bị trùng giờ hoặc nhầm lẫn phong cách trang điểm.

#### **Tiêu chí Nghiệm thu Web Admin (Clean & Minimalist Standards):**

* **Scenario 01: Ma trận ca làm việc tuần (Weekly Shift Matrix Board)**
  * **Given** Quản lý Studio mở trang `DispatchBoardPage.jsx`.
  * **When** Bảng hiển thị dạng lưới: Dòng là danh sách Thợ (`Agency Staff`), Cột là 7 ngày trong tuần (Thứ 2 đến Chủ Nhật), chia làm 3 ca: Sáng (06:00-11:00), Chiều (12:00-17:00), Tối (18:00-22:00).
  * **Then** Giao diện tuân thủ tiêu chuẩn:
    - Nền thẻ ca làm việc: `bg-slate-50 border border-slate-200`.
    - Ô có thợ nhận đơn: Hiển thị Badge trạng thái `bg-emerald-50 text-emerald-700 border-emerald-200`.
    - Ô thợ báo bận / nghỉ phép: Badge `bg-rose-50 text-rose-700 border-rose-200`.
  * **And** Quản lý có thể kéo thẻ đơn hàng thả vào ô thợ phù hợp $\rightarrow$ Mở Modal xác nhận gán thợ kèm kiểm tra tự động xem thợ có đủ chứng chỉ kỹ năng (`is_qualified`) cho gói dịch vụ đó hay không.

* **Scenario 02: Dashboard số liệu phân tích tài chính (Analytics Dashboard)**
  * **Given** Trang chủ Studio Portal (`DashboardPage.jsx`).
  * **When** Tải dữ liệu từ API.
  * **Then** 4 thẻ thống kê (KPI Metric Cards) hiển thị nổi bật với cỡ chữ to rõ:
    1. **Tổng doanh thu tuần:** Số tiền định dạng VND rõ ràng (VD: `45,800,000 đ`).
    2. **Số đơn hoàn thành:** Kèm tỷ lệ tăng trưởng so với tuần trước (VD: `+12.5%`).
    3. **Tỷ lệ lấp đầy ca trực:** (VD: `88.5%`).
    4. **Đánh giá trung bình:** `4.92 ★` (124 lượt đánh giá).
  * **And** Biểu đồ doanh thu dạng đường thẳng (Line Chart) sắc nét, không dùng hiệu ứng gradient bóng bẩy gây lag.

---

## ⚠️ 4. ĐÁNH GIÁ CÁC ĐIỂM CHƯA TỐI ƯU & RỦI RO UI/UX TRÊN THỰC TẾ

> [!WARNING]
> Dưới đây là **5 điểm hạn chế giao diện và rủi ro trải nghiệm người dùng** cần lưu ý tối ưu hóa sâu hơn:

1. **Hiện Tượng Giật Khựng Trên Bản Đồ Do Tần Suất Nhận GPS Không Đều (Jitter & Network Stutter):**
   * *Thực trạng:* Mặc dù mạng 4G lý tưởng là 5s gửi 1 lần, nhưng khi thợ đi vào đường hầm hoặc sóng yếu, 3 gói tin có thể dồn lại và tới cùng một lúc trong 1 giây, sau đó lại mất sóng 15 giây. Điều này khiến marker xe bị đứng yên rồi phóng vèo một quãng đường dài phi thực tế.
   * *Giải pháp:* Tích hợp thuật toán **Dead Reckoning & Kalman Filter** trên Frontend: Khi bị mất gói tin tạm thời, xe vẫn tự động trượt đều về phía trước theo vận tốc và hướng di chuyển cuối cùng đã biết.
2. **Nguy Cơ Crash Ứng Dụng Di Động Do Tràn RAM Khi Xem Portfolio (Out-of-Memory Crash):**
   * *Thực trạng:* Ảnh chụp nghệ thuật make-up thường có dung lượng gốc rất lớn ($10\text{MB} - 20\text{MB}$, độ phân giải $4K/8K$). Nếu tải trực tiếp ảnh gốc vào Lightbox hoặc danh sách cuộn, điện thoại tầm trung sẽ bị tràn bộ nhớ Heap và văng ứng dụng lập tức.
   * *Giải pháp:* Tận dụng tối đa tham số chuyển đổi của **Cloudinary CDN**:
     - Danh sách thu nhỏ (Thumbnail): Chỉ nạp ảnh `w_400,h_400,c_fill,q_auto,f_webp`.
     - Chế độ xem chi tiết Lightbox: Chỉ nạp tối đa `w_1920,q_80,f_webp`.
3. **Hệ Điều Hành Di Động Tự Động Diệt Tiến Trình Phát Sóng GPS Ngầm (OS Battery Optimization Kill):**
   * *Thực trạng:* Cả Android (Doze Mode) và iOS đều có cơ chế ngắt các ứng dụng chạy ngầm liên tục sau 10-15 phút khóa màn hình để bảo vệ pin. Thợ tưởng mình vẫn đang Online nhưng thực chất tọa độ đã ngừng gửi về server.
   * *Giải pháp:* Cấu hình chuẩn mực Native:
     - Android: Bắt buộc chạy **Foreground Service** kèm thông báo cố định trên thanh trạng thái (*"Ứng dụng đang phát sóng vị trí để tìm đơn khẩn cấp"*).
     - iOS: Đăng ký quyền `UIBackgroundModes` với `location` và cấu hình `pausesLocationUpdatesAutomatically = false`.
4. **Giật Lag Khi Kéo Thả Trên Ma Trận Ca Trực Với Số Lượng Thợ Lớn (DOM Virtualization Gap):**
   * *Thực trạng:* Nếu một Studio lớn có 60 thợ nhân viên, bảng ma trận tuần sẽ sinh ra $60 \times 21 \text{ ca} = 1,260\text{ ô DOM}$. Việc kéo thả Drag & Drop trên hơn 1,000 phần tử DOM sẽ khiến trình duyệt bị tụt FPS xuống dưới 20 FPS.
   * *Giải pháp:* Tích hợp thư viện **TanStack Virtual / React-Window** để ảo hóa bảng (Virtual Table): Chỉ render các dòng thợ đang hiển thị trên khung nhìn màn hình của người dùng.
5. **Độ Trễ Phản Hồi Âm Thanh Chuông Báo Trên Một Số Thiết Bị (Sound Playback Latency):**
   * *Thực trạng:* File âm thanh `countdown_alert.mp3` nếu không được nạp sẵn vào bộ nhớ (Preload) từ trước thì khi nhận được STOMP packet sẽ mất 300–500ms để đọc file từ đĩa, làm giảm tính khẩn cấp của nhịp đếm lùi 30s.
   * *Giải pháp:* Preload toàn bộ âm thanh cảnh báo vào bộ nhớ RAM ngay khi ứng dụng vừa khởi động.
