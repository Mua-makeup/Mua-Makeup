# BẢNG PHÂN RÃ TÁC VỤ ỨNG DỤNG DI ĐỘNG (MOBILE APP JIRA ISSUES / WBS)
## DỰ ÁN: NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
**Mã phân hệ:** `APP-MOBILE` | **Nền tảng:** React Native 0.86 + Expo SDK 57 (Expo Router) + TypeScript  
**Đối tượng mục tiêu (Chỉ 3 Mobile Roles):** `ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`  
> ⚠️ **GIỚI HẠN PHẠM VI NGHIÊM NGẶT**: Ứng dụng di động **CHỈ DÀNH RIÊNG CHO 3 VAI TRÒ TRÊN**. Cổng Quản trị Super Admin & Agency Admin triển khai riêng trên Web Portal (`code/frontend`). Tài khoản Admin sẽ bị chặn đăng nhập trên mobile.  
**Tài liệu đặc tả chi tiết SRS & User Stories:** [docs/mobile_app_user_stories_srs.md](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/mobile_app_user_stories_srs.md)  
**Hạ tầng tích hợp:** Spring Boot Core API (`http://192.168.0.229:8080/api/v1`) & Embedded WebSocket STOMP (`ws://192.168.0.229:8080/ws-makeup`)

---

## 📊 MA TRẬN TỔNG QUAN TIẾN ĐỘ THEO SPRINT

| Sprint | Tên Giai Đoạn / Phân Hệ | Tổng Issues | Hoàn Thành (Done) | Đang Làm (In Progress) | Chưa Làm (To Do) |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **M-0** | Khởi Tạo Nền Tảng, Auth & Trang Chủ Hoàn Chỉnh | 6 | 6 | 0 | 0 |
| **M-1** | Khám Phá Dịch Vụ & Hồ Sơ Chi Tiết Thợ MUA (Customer) | 4 | 0 | 0 | 4 |
| **M-2** | Đặt Lịch, Báo Giá Realtime & Quản Lý Đơn (Customer) | 4 | 0 | 0 | 4 |
| **M-3** | Bàn Làm Việc, Radar 30s & Quản Lý Dịch Vụ/Portfolio (MUA) | 6 | 0 | 0 | 6 |
| **M-4** | Ca Trực Tuần, Đơn Điều Phối & Ảnh Mẫu Tay Nghề (Agency Staff) | 4 | 0 | 0 | 4 |
| **M-5** | Live GPS Streaming, WebSocket STOMP & Tiện Ích | 4 | 0 | 0 | 4 |
| **TỔNG** | **Toàn Bộ Phân Hệ Ứng Dụng Di Động** | **28** | **6 (21%)** | **0 (0%)** | **22 (79%)** |

---

## 📌 SPRINT M-0: NỀN TẢNG HỆ THỐNG, AUTHENTICATION & TRANG CHỦ (ĐÃ HOÀN THÀNH ✅)

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn | Trạng Thái | Backend Mapping |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-AUTH-01** | Task | Thiết lập Expo SDK 57, Root Layout, Theme Figma Rose Ruby (`#E11D48`) & Bộ lưu trữ phần cứng `expo-secure-store` | Core | `src/app/_layout.tsx`<br>`src/constants/theme.ts`<br>`src/utils/storage.ts` | **Done** | Core Infrastructure |
| **APP-AUTH-02** | Story | Xây dựng Màn hình Onboarding 3 Slides Carousel giới thiệu giá trị nền tảng | Core | `src/app/(auth)/onboarding.tsx` | **Done** | - |
| **APP-AUTH-03** | Story | Màn hình Đăng nhập chuẩn 100% Figma, phím tắt tài khoản test nhanh 3 vai trò mobile. Chặn tài khoản Quản trị (Admin) truy cập mobile app | Core | `src/app/(auth)/login.tsx`<br>`src/components/auth/BrandLogo.tsx`<br>`src/components/auth/QuickTestAccounts.tsx` | **Done** | `AuthController`<br>`/api/v1/auth/login` |
| **APP-AUTH-04** | Story | Màn hình Đăng ký đa phân hệ (Khách vs Thợ MUA có thêm kinh nghiệm, bán kính km, bio) | Core | `src/app/(auth)/register.tsx`<br>`src/components/auth/RoleSegmentedControl.tsx` | **Done** | `AuthController`<br>`/api/v1/auth/register` |
| **APP-AUTH-05** | Task | Module bóc tách lỗi API chuẩn hóa `parseApiError`, map trực tiếp `data` vào form helper error | Core | `src/utils/error.ts`<br>`src/components/base/BaseInput.tsx` | **Done** | `GlobalExceptionHandler`<br>`ERR_VALIDATION` |
| **APP-HOME-01** | Story | Trang chủ hoàn chỉnh đa vai trò: Header định vị GPS, VIP Banner cưới, Radar 30s, Top MUA, Bottom Tabs | All | `src/app/index.tsx` | **Done** | Dynamic Feed Adapter |

---

## 📌 SPRINT M-1: KHÁM PHÁ DỊCH VỤ & HỒ SƠ CHI TIẾT THỢ MUA (`ROLE_CUSTOMER`)

### Mục tiêu Sprint:
Cung cấp trải nghiệm tìm kiếm, duyệt danh mục dịch vụ làm đẹp, xem chi tiết tay nghề và các bộ sưu tập tác phẩm thực tế của thợ MUA xung quanh.

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn Dự Kiến | Ưu Tiên | Backend Controller |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-CUST-01** | Story | **Màn hình Khám Phá & Bộ Lọc Đa Tiêu Chí**<br>• Thanh tìm kiếm theo tên dịch vụ, phong cách make-up.<br>• Bộ lọc phân cấp: Danh mục gốc (Cô dâu, Dự tiệc, Kỷ yếu, Douyin) $\rightarrow$ Phong cách sở trường.<br>• Lọc theo bán kính GPS (1km, 3km, 5km, 10km) và khoảng giá.<br>• Phân trang danh sách gói dịch vụ (Infinite Scroll). | Customer | `src/app/explore.tsx`<br>`src/components/customer/CategoryFilterBar.tsx`<br>`src/components/customer/ServicePackageCard.tsx` | **High** | `MasterTaxonomyController`<br>`ServicePackageController`<br>`PackageItemController` |
| **APP-CUST-02** | Story | **Màn hình Chi Tiết Hồ Sơ Thợ MUA & Dịch Vụ Đi Kèm Ảnh Mẫu**<br>• Header Cover, Avatar, Huy hiệu xác thực, Thống kê uy tín (⭐ 4.95, số đơn hoàn thành).<br>• Danh sách Gói Dịch Vụ: Khi khách bấm chọn dịch vụ nào (VD: Make Cô Dâu), giao diện hiển thị ngay **Giá tiền niêm yết, thời lượng** và **Bộ sưu tập các ảnh mẫu thực tế đã make tương ứng theo đúng dịch vụ đó**.<br>• Nút *"Đặt Lịch Gói Này"*. | Customer | `src/app/mua-detail/[id].tsx`<br>`src/components/customer/MuaProfileHeader.tsx`<br>`src/components/customer/PackageSelectorList.tsx`<br>`src/components/customer/ServiceSampleGallery.tsx` | **High** | `MuaProfileController`<br>`ServicePackageController`<br>`MuaPortfolioController` |
| **APP-CUST-03** | Task | **Trình Xem Ảnh Mẫu Cận Cảnh Của Dịch Vụ Đang Chọn**<br>• Mở xem toàn màn hình các ảnh mẫu của gói dịch vụ vừa chọn.<br>• Xem cận cảnh các góc chụp chi tiết (lớp nền, màu mắt, tạo khối, kiểu tóc của dịch vụ đó).<br>• Phóng to thu nhỏ ảnh chất lượng cao (Pinch-to-zoom). | Customer | `src/components/customer/ShowcaseGalleryModal.tsx`<br>`src/components/customer/PhotoZoomViewer.tsx` | **Medium** | `MuaPortfolioController`<br>`/api/v1/mua/portfolios` |
| **APP-CUST-04** | Story | **Màn hình Cập Nhật Hồ Sơ Cá Nhân Khách Hàng**<br>• Đổi ảnh đại diện (chọn từ thư viện thiết bị / chụp mới).<br>• Cập nhật Họ và tên, Giới tính, Địa chỉ nhà mặc định.<br>• Quản lý danh sách địa chỉ trang điểm quen thuộc (Ghim vị trí trên bản đồ). | Customer | `src/app/profile/edit.tsx`<br>`src/components/customer/SavedAddressModal.tsx` | **Low** | `CustomerProfileController`<br>`/api/v1/customer/profile` |

---

## 📌 SPRINT M-2: ĐẶT LỊCH, BÁO GIÁ REALTIME & QUẢN LÝ ĐƠN HÀNG (`ROLE_CUSTOMER`)

### Mục tiêu Sprint:
Xây dựng trọn vẹn luồng đặt lịch trang điểm từ chọn gói, tính phụ phí thông minh, áp dụng voucher đến quản lý lịch sử đơn hàng.

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn Dự Kiến | Ưu Tiên | Backend Controller |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-BOOK-01** | Story | **Màn hình Đặt Lịch & Chọn Bước Dịch Vụ Mua Thêm**<br>• Lựa chọn ngày và khung giờ trang điểm.<br>• Danh sách các bước làm đẹp mặc định trong gói & tùy chọn mua thêm (Package Items: Đính đá, dán mi cao cấp, làm tóc...).<br>• Nhập địa chỉ trang điểm tận nơi (tự động lấy GPS hiện tại hoặc gõ địa chỉ).<br>• Ô ghi chú yêu cầu riêng cho thợ MUA. | Customer | `src/app/booking/create.tsx`<br>`src/components/booking/PackageItemPicker.tsx`<br>`src/components/booking/DateTimeSelector.tsx` | **Critical** | `ServicePackageController`<br>`PackageItemController`<br>`CustomerInstantBookingController` |
| **APP-BOOK-02** | Story | **Tích Hợp Báo Giá Động Realtime (Dynamic Pricing Quote)**<br>• Gọi API tính toán tổng tiền chi tiết: Giá gói + Phụ phí di chuyển theo km + Phụ phí làm sớm (trước 5h sáng) / Ngày lễ.<br>• Hiển thị bảng chi tiết hóa đơn minh bạch (Breakdown Invoice).<br>• Chọn phương thức thanh toán (Cọc Escrow qua Ví hoặc Thanh toán khi hoàn tất). | Customer | `src/components/booking/InvoiceSummaryCard.tsx`<br>`src/services/pricing.service.ts` | **Critical** | `DynamicPricingController`<br>`SurchargeController` |
| **APP-BOOK-03** | Story | **Màn hình Quản Lý Lịch Hẹn Đa Trạng Thái**<br>• Tab *Sắp tới* (Chờ xác nhận, Đã nhận đơn, Thợ đang di chuyển, Đang trang điểm).<br>• Tab *Lịch sử* (Đã hoàn thành, Đã hủy).<br>• Thẻ đơn hàng hiển thị: Mã đơn, tên thợ MUA, ngày giờ, địa chỉ, tổng tiền, thẻ trạng thái màu sắc.<br>• Hành động: Xem vị trí thợ, Hủy đơn hẹn, Gọi thợ MUA. | Customer | `src/app/(tabs)/bookings.tsx`<br>`src/components/booking/BookingHistoryCard.tsx` | **High** | `BookingHistoryController`<br>`BookingStateController` |
| **APP-BOOK-04** | Story | **Kích Hoạt Radar Tìm Thợ Khẩn Cấp 30s (Instant Booking Flow)**<br>• Modal kích hoạt nhanh từ Trang chủ khi cần thợ trong 30-60 phút.<br>• Hiển thị radar quét thợ rảnh quanh bán kính 5km.<br>• Đếm ngược chờ thợ nhận ca với hiệu ứng Animation sóng âm.<br>• Tự động chuyển tiếp sang màn hình bám đuổi khi có thợ nhấn nhận ca. | Customer | `src/components/booking/InstantRadarModal.tsx`<br>`src/services/booking.service.ts` | **High** | `CustomerInstantBookingController`<br>`/api/v1/customer/bookings/instant` |

---

## 📌 SPRINT M-3: BÀN LÀM VIỆC, RADAR NHẬN CA & PORTFOLIO (`ROLE_FREELANCE_MUA`)

### Mục tiêu Sprint:
Trang bị đầy đủ công cụ tác nghiệp cho Thợ trang điểm tự do: Bật/tắt phát sóng GPS nhận ca, chuông báo đơn khẩn cấp 30s, quản lý gói dịch vụ và album ảnh mẫu gắn liền theo từng dịch vụ.

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn Dự Kiến | Ưu Tiên | Backend Controller |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-MUA-01** | Story | **Màn hình Bàn Làm Việc Thợ (Workstation Dashboard)**<br>• Công tắc Trực tuyến: *Sẵn sàng nhận ca (GPS ON)* / *Tạm nghỉ*.<br>• Thống kê nhanh: Ca đã hoàn thành, Điểm đánh giá (⭐), Thu nhập trong ngày.<br>• Danh sách các ca hẹn sắp tới trong ngày có nút dẫn đường bản đồ. | MUA | `src/app/mua/workstation.tsx`<br>`src/components/mua/WorkstationHeader.tsx` | **Critical** | `LocationStreamController`<br>`TelemetryQueryController` |
| **APP-MUA-02** | Story | **Modal Đĩa Quay Đếm Ngược 30s Nhận Ca Cấp Tốc**<br>• Modal toàn màn hình bật lên khi nhận broadcast đơn khẩn cấp từ WebSocket.<br>• Đồng hồ đếm ngược 30 giây kèm âm thanh chuông báo và rung haptic.<br>• Thông tin ca: Dịch vụ, địa chỉ khách, khoảng cách km, thu nhập thợ nhận được.<br>• Nút *"Chấp Nhận Nhận Ca"* (gọi API nhận ca kèm Redisson Distributed Lock). | MUA | `src/components/mua/CountdownAcceptModal.tsx`<br>`src/services/booking.service.ts` | **Critical** | `BookingAcceptanceController`<br>`/api/v1/booking/{id}/accept` |
| **APP-MUA-03** | Story | **Tiến Trình Thực Hiện Ca Làm & Nghiệm Thu Ảnh (MUA & Staff)**<br>• 4 Nút chuyển trạng thái làm việc tuần tự: *Bắt đầu di chuyển* $\rightarrow$ *Đã tới nơi* $\rightarrow$ *Bắt đầu trang điểm* $\rightarrow$ *Hoàn thành ca*.<br>• Áp dụng cho cả Thợ MUA tự do và Nhân viên Agency Staff khi thực hiện ca làm.<br>• Bước nghiệm thu: Camera chụp ảnh khuôn mặt khách sau khi make-up xong.<br>• Gửi thông báo hoàn thành để giải ngân quỹ cọc (Thợ MUA) hoặc ghi nhận KPI (Staff). | MUA / Staff | `src/app/job-execution/[id].tsx`<br>`src/components/mua/ProofCameraModal.tsx` | **High** | `BookingStateController`<br>`/api/v1/booking/state/*` |
| **APP-MUA-04** | Story | **Quản Lý Album Ảnh Mẫu Theo Từng Dịch Vụ (Service-Linked Showcase)**<br>• Ảnh mẫu được gắn chặt chẽ theo từng Gói Dịch Vụ (`package_id`), không gộp chung lộn xộn.<br>• Thợ vào từng dịch vụ (Cô dâu, Dự tiệc, Kỷ yếu) để tải lên, sắp xếp, xóa ảnh tác phẩm đã make thực tế cho dịch vụ đó.<br>• Tải ảnh tác phẩm chính và các ảnh góc chụp hoàn thiện chi tiết. | MUA | `src/app/mua/portfolio-manager.tsx`<br>`src/app/mua/showcase-create.tsx` | **Medium** | `MuaPortfolioController`<br>`/api/v1/muas/my-profile/portfolios` |
| **APP-MUA-05** | Story | **Hồ Sơ Tay Nghề, Chọn Phong Cách Make-up Sở Trường & Bán Kính Hoạt Động**<br>• Chỉnh sửa Bio giới thiệu bản thân, số năm thâm niên trong nghề, tải chứng chỉ bằng cấp (`mua_certificates`).<br>• **Chọn danh sách Phong Cách Make-up sở trường** (`mua_styles`: Douyin, Tone Hàn Trong Trẻo, Tone Thái Sắc Sảo, Tone Tây Âu, Cổ Điển...), đánh dấu phong cách chính (`isPrimary`).<br>• Cài đặt Bán kính hoạt động nhận khách (1km – 50km) & địa chỉ làm việc cơ sở (`baseAddressText`). | MUA | `src/app/profile/mua-profile.tsx`<br>`src/components/mua/StylePickerModal.tsx` | **High** | `MuaProfileController`<br>`MuaStyleController`<br>`/api/v1/muas/my-profile/styles` |
| **APP-MUA-06** | Story | **Tạo Mới & Cấu Hình Gói Dịch Vụ Thợ Tự Do (Freelancer Service Package Builder)**<br>• **Thêm mới / Chỉnh sửa gói dịch vụ cá nhân** (`service_packages`):<br>  - Chọn Danh mục gốc (`categoryId`: Cô dâu, Dự tiệc, Kỷ yếu, Đi chơi...).<br>  - **Chọn các Phong cách make-up hỗ trợ cho gói** (`package_styles`: gán danh sách style tương thích).<br>  - **Cấu hình các bước thực hiện mặc định & Tùy chọn làm thêm** (`package_items`: dán mi giả, uốn tóc, đánh nền body, đính đá...).<br>  - Thiết lập giá niêm yết trọn gói, thời lượng dự kiến (phút), tải ảnh đại diện gói dịch vụ.<br>  - Bật / Tắt trạng thái mở nhận ca của gói dịch vụ (`is_active`). | MUA | `src/app/mua/packages/index.tsx`<br>`src/app/mua/packages/create.tsx`<br>`src/components/mua/PackageItemBuilder.tsx` | **High** | `ServicePackageController`<br>`PackageItemController`<br>`/api/v1/packages` |

---

## 📌 SPRINT M-4: LỊCH TRỰC CA, ĐƠN ĐIỀU PHỐI & ẢNH MẪU TAY NGHỀ (`ROLE_AGENCY_STAFF`)

### Mục tiêu Sprint:
Hỗ trợ nhân viên trang điểm của Studio/Agency quản lý lịch ca làm việc theo tuần, điểm danh bằng GPS, nhận đơn do Agency Admin phân công và đăng tải album ảnh mẫu tác phẩm gắn theo từng dịch vụ được phân công.

| Mã Issue         | Loại  | Tên Tính Năng / Task Kỹ Thuật                                                                                                                                                                                                                                                                                                                                                                       | Phân Hệ      | File Mã Nguồn Dự Kiến                                                               | Ưu Tiên    | Backend Controller                                           |
| :-----------------| :-----:| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| :------------:| :------------------------------------------------------------------------------------| :----------:| :-------------------------------------------------------------|
| **APP-STAFF-01** | Story | **Lịch Ca Trực Tuần & Điểm Danh GPS Tại Studio**<br>• Xem ma trận ca trực theo tuần (Thứ 2 đến Chủ Nhật: Ca Sáng, Chiều, Tối).<br>• Nút Check-in / Check-out ca làm việc bằng định vị GPS trong bán kính studio.<br>• Xem trạng thái đi làm (Đúng giờ, Đi muộn, Vắng mặt).                                                                                                                          | Agency Staff | `src/app/staff/shifts.tsx`<br>`src/components/staff/WeeklyShiftView.tsx`            | **High**   | `AgencyShiftController`<br>`/api/v1/agency/shifts/my-shifts` |
| **APP-STAFF-02** | Story | **Đăng Ký & Quản Lý Giờ Làm Thêm (Overtime)**<br>• Xem danh sách các suất ca làm thêm ngoài giờ do Agency mở.<br>• Đăng ký nhận ca Overtime, gửi giải trình làm quá giờ.<br>• Theo dõi phụ cấp làm thêm giờ đã được đại lý phê duyệt.                                                                                                                                                               | Agency Staff | `src/app/staff/overtime.tsx`<br>`src/components/staff/OvertimeApplyModal.tsx`       | **Medium** | `AgencyOvertimeController`<br>`/api/v1/agency/overtime/*`    |
| **APP-STAFF-03** | Story | **Tiếp Nhận & Thực Hiện Ca Điều Phối Từ Đại Lý**<br>• Danh sách đơn hàng được Agency Admin phân công chỉ định cho staff.<br>• Xem địa chỉ khách hàng, gói dịch vụ cần thực hiện.<br>• Nút *"Bắt Đầu Ca Làm"* điều hướng sang màn hình Tiến trình 4 bước & Chụp ảnh nghiệm thu (`src/app/job-execution/[id].tsx` - APP-MUA-03).                                                                      | Agency Staff | `src/app/staff/dispatched-jobs.tsx`<br>`src/components/staff/DispatchedJobCard.tsx` | **High**   | `AgencyBookingController`<br>`AgencyStaffPackageController`  |
| **APP-STAFF-04** | Story | **Quản Lý Ảnh Mẫu Tay Nghề Theo Từng Dịch Vụ Của Staff (Staff Service Showcase)**<br>• Nhân viên Studio tải lên ảnh các tác phẩm make-up thực tế do mình thực hiện, **phân loại cụ thể theo từng dịch vụ/phong cách** được Studio giao (`AgencyStaffService`).<br>• Khi khách chọn dịch vụ của Studio và xem danh sách nhân viên, ảnh mẫu của nhân viên sẽ hiển thị tương ứng theo đúng dịch vụ đó. | Agency Staff | `src/app/staff/portfolio.tsx`<br>`src/app/staff/showcase-upload.tsx`                | **Medium** | `MuaPortfolioController`<br>`AgencyStaffServiceController`   |

---

## 📌 SPRINT M-5: LIVE GPS STREAMING, WEBSOCKET STOMP & TIỆN ÍCH CHUNG

### Mục tiêu Sprint:
Tích hợp toàn diện hạ tầng Realtime truyền nhận tọa độ bám đuổi thợ di chuyển, kết nối WebSocket và module bảo mật tài khoản.

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn Dự Kiến | Ưu Tiên | Backend Controller |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-CORE-01** | Task | **Bộ Thu / Phát WebSocket STOMP Nhúng**<br>• Kết nối client STOMP trực tiếp tới `ws://192.168.0.229:8080/ws-makeup`.<br>• Tự động đính kèm Token JWT khi handshake.<br>• Quản lý đăng ký kênh (Topic subscriptions: `/topic/booking-broadcast`, `/topic/gps-stream/{bookingId}`).<br>• Cơ chế tự động kết nối lại (Auto Reconnect with exponential backoff). | Core | `src/services/stomp.service.ts`<br>`src/hooks/useWebSocket.ts` | **Critical** | `WebSocketTelemetryHandler`<br>`WebSocketConfig` |
| **APP-CORE-02** | Task | **Dịch Vụ Phát Sóng Tọa Độ Chạy Ngầm (Background Location Task)**<br>• Sử dụng `expo-location` kết hợp `expo-task-manager`.<br>• Khi thợ MUA hoặc nhân viên Agency Staff bật trực tuyến hoặc đang di chuyển tới khách, app tự động gửi tọa độ (lat, lng) về backend mỗi 5-10 giây ngay cả khi tắt màn hình.<br>• Thuật toán lọc nhiễu GPS và tối ưu tiêu hao pin. | Core | `src/services/location-task.service.ts`<br>`src/hooks/useGpsTracker.ts` | **Critical** | `LocationStreamController`<br>`/api/v1/telemetry/stream` |
| **APP-CORE-03** | Story | **Màn Hình Bản Đồ Bám Đuổi Thợ Di Chuyển Realtime**<br>• Bản đồ tương tác hiển thị vị trí khách hàng và biểu tượng thợ MUA di chuyển.<br>• Vẽ tuyến đường di chuyển tối ưu và hiển thị thời gian dự kiến đến nơi (ETA).<br>• Nút gọi điện khẩn cấp và nút chat với thợ. | Customer | `src/app/booking/tracking/[id].tsx`<br>`src/components/booking/LiveTrackingMap.tsx` | **High** | `TelemetryQueryController`<br>`WebSocketTelemetryHandler` |
| **APP-CORE-04** | Story | **Màn Hình Đổi Mật Khẩu & Cài Đặt Ngôn Ngữ Tức Thời**<br>• Đổi mật khẩu tài khoản (Mật khẩu cũ $\rightarrow$ Mật khẩu mới chuẩn regex).<br>• Chuyển đổi ngôn ngữ Tiếng Việt (`vi`) / Tiếng Anh (`en`) tức thời không reload.<br>• Đồng bộ header `Accept-Language` tự động trong `api.ts`. | Core | `src/app/(auth)/change-password.tsx`<br>`src/components/LanguageToggleModal.tsx` | **Medium** | `AuthController`<br>`/api/v1/auth/change-password`<br>`/api/v1/auth/language` |

---

## 🎯 THỨ TỰ THỰC THI KHUYẾN NGHỊ (ROADMAP EXECUTION)

```text
[SPRINT M-0] (Xong 100%) -> [SPRINT M-1] (Khám phá & MUA Detail) -> [SPRINT M-2] (Đặt lịch & Báo giá)
                                                                                  |
                                                                                  v
[SPRINT M-5] (Live GPS & STOMP) <-- [SPRINT M-3] (Bàn làm việc MUA & Radar 30s) <--+
        |
        v
[SPRINT M-4] (Agency Staff Shifts & Dispatched Jobs)
```

1. **Bước 1**: Triển khai **Sprint M-1** (Màn hình Khám phá `explore.tsx` & Chi tiết Thợ MUA `mua-detail/[id].tsx`) để khách hàng có thể duyệt xem đầy đủ dữ liệu thực tế từ backend.
2. **Bước 2**: Triển khai **Sprint M-2** (Luồng Đặt lịch `booking/create.tsx` & Báo giá Dynamic Pricing).
3. **Bước 3**: Triển khai **Sprint M-5** (Hạ tầng WebSocket STOMP) làm nền tảng cho **Sprint M-3** (Radar đếm ngược 30s nhận đơn của Thợ MUA).
4. **Bước 4**: Triển khai **Sprint M-4** (Phân hệ Nhân viên Agency trực ca và nhận đơn điều phối).
