# BẢNG PHÂN RÃ TÁC VỤ ỨNG DỤNG DI ĐỘNG (MOBILE APP JIRA ISSUES / WBS)
## DỰ ÁN: NỀN TẢNG ĐẶT LỊCH MAKE-UP (MAKEUP BOOKING PLATFORM)
**Mã phân hệ:** `APP-MOBILE` | **Nền tảng:** React Native 0.86 + Expo SDK 57 (Expo Router) + TypeScript  
**Đối tượng mục tiêu (Chỉ 3 Mobile Roles):** `ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`  
> ⚠️ **GIỚI HẠN PHẠM VI NGHIÊM NGẶT**: Ứng dụng di động **CHỈ DÀNH RIÊNG CHO 3 VAI TRÒ TRÊN**. Cổng Quản trị Super Admin & Agency Admin triển khai riêng trên Web Portal (`code/frontend`). Tài khoản Admin sẽ bị chặn đăng nhập trên mobile.  
**Tài liệu đặc tả chi tiết SRS & User Stories:** [docs/mobile_app_user_stories_srs.md](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/mobile_app_user_stories_srs.md)  
**Hạ tầng tích hợp:** Spring Boot Core API (`http://192.168.0.229:8080/api/v1`) & Embedded WebSocket STOMP (`ws://192.168.0.229:8080/ws-makeup`)

---

## 📊 MA TRẬN TỔNG QUAN TIẾN ĐỘ THEO SPRINT (ĐÃ TÁI CẤU TRÚC CHUẨN HÓA)

| Sprint   | Tên Giai Đoạn / Phân Hệ                                  | Mục Tiêu Cốt Lõi                                                                                                                                                 | Tổng Issues | Hoàn Thành (Done) | Chưa Làm (To Do) |
| :--------:| :---------------------------------------------------------| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------| :-----------:| :-----------------:| :----------------:|
| **M-0**  | Khởi Tạo Nền Tảng, Auth & Trang Chủ Hoàn Chỉnh           | Thiết lập Expo SDK 57, Dark/Light theme, Login/Register 3 roles, Base components                                                                                 | 6           | 6 (100%)          | 0 (0%)           |
| **M-1**  | Khám Phá Dịch Vụ & Hồ Sơ Chi Tiết Thợ MUA                | Bộ lọc danh mục/bán kính, Chi tiết thợ, Album ảnh mẫu gắn theo dịch vụ                                                                                           | 4           | 0 (0%)            | 4 (100%)         |
| **M-2**  | Đặt Lịch Hẹn Trước, Báo Giá Động & Quản Lý Đơn           | Luồng Scheduled Booking, Dynamic Pricing Quote, Breakdown phụ phí, Lịch hẹn đa trạng thái                                                                        | 3           | 0 (0%)            | 3 (100%)         |
| **M-3**  | Điều Phối Khẩn Cấp Realtime, Radar Thợ, STOMP & Live GPS | **Trọn vẹn luồng Realtime End-to-End**: Radar thợ thật quanh vị trí, Đơn gấp 30s, Đĩa quay thợ nhận ca, Live GPS Tracking xe chạy & Stepper tiến trình WebSocket | 9           | 0 (0%)            | 9 (100%)         |
| **M-4**  | Ca Trực Tuần, Đơn Điều Phối & Ảnh Mẫu Tay Nghề           | Phân hệ Agency Staff: Lịch trực tuần, Điểm danh GPS tại Studio, Tiếp nhận ca phân công                                                                           | 4           | 0 (0%)            | 4 (100%)         |
| **M-5**  | Gói Dịch Vụ, Portfolio Thợ MUA & Tiện Ích Chung          | Cấu hình gói dịch vụ thợ, Quản lý album ảnh mẫu, Bán kính/Style thợ, Đổi mật khẩu & i18n                                                                         | 4           | 0 (0%)            | 4 (100%)         |
| **TỔNG** | **Toàn Bộ Phân Hệ Ứng Dụng Di Động**                     | **Hệ thống di động hoàn chỉnh 3 vai trò**                                                                                                                        | **30**      | **6 (20%)**       | **24 (80%)**     |

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
| **APP-CUST-03** | Task | **Trình Xem Ảnh Mẫu Cận Cảnh Của Dịch Vụ Đang Chọn**<br>• Mở xem toàn màn hình các ảnh mẫu của gói dịch vụ vừa chọn.<br>• Xem cận cảnh các góc chụp chi tiết (lớp nền, màu mắt, tạo khối, kiểu tóc của dịch vụ đó).<br>• Phóng to thu nhỏ ảnh chất lượng cao (Pinch-to-zoom). | Customer | `src/components/customer/ShowcaseGalleryModal.tsx`<br>`src/components/customer/PhotoZoomViewer.tsx` | **Medium** | `MuaPortfolioController`<br>`/api/v1/muas/my-profile/portfolios` |
| **APP-CUST-04** | Story | **Màn hình Cập Nhật Hồ Sơ Cá Nhân Khách Hàng**<br>• Đổi ảnh đại diện (chọn từ thư viện thiết bị / chụp mới).<br>• Cập nhật Họ và tên, Giới tính, Địa chỉ nhà mặc định.<br>• Quản lý danh sách địa chỉ trang điểm quen thuộc (Ghim vị trí trên bản đồ). | Customer | `src/app/profile/edit.tsx`<br>`src/components/customer/SavedAddressModal.tsx` | **Low** | `CustomerProfileController`<br>`/api/v1/customer/profile` |

---

## 📌 SPRINT M-2: ĐẶT LỊCH HẸN TRƯỚC, BÁO GIÁ ĐỘNG & QUẢN LÝ LỊCH HẸN (`ROLE_CUSTOMER`)

### Mục tiêu Sprint:
Tập trung vào nghiệp vụ **Đặt Lịch Hẹn Trước (Scheduled Booking Flow)** cho ngày giờ trong tương lai, tính phụ phí tự động (Dynamic Pricing), áp dụng voucher và quản lý danh sách đơn hẹn đa trạng thái.  
*(Ghi chú: Toàn bộ nghiệp vụ Đặt Lịch Khẩn Cấp Realtime 30s được gom tập trung vào Sprint M-3 để đảm bảo tính đồng bộ kiến trúc).*  
**Tài liệu đặc tả chi tiết:** [docs/backlogs/sprint6/spec_customer_booking_and_order_management.md](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/backlogs/sprint6/spec_customer_booking_and_order_management.md)

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn Dự Kiến | Ưu Tiên | Backend Controller |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-BOOK-01** | Story | **Màn hình Đặt Lịch Hẹn Trước & Chọn Bước Dịch Vụ Mua Thêm**<br>• Lựa chọn ngày và khung giờ trang điểm trong tương lai.<br>• Danh sách các bước làm đẹp mặc định trong gói & tùy chọn mua thêm (Package Items: Đính đá, dán mi cao cấp, uốn tóc...).<br>• Nhập địa chỉ trang điểm tận nơi (tự động lấy GPS hiện tại hoặc gõ địa chỉ thủ công).<br>• Ô ghi chú yêu cầu riêng cho thợ MUA. | Customer | `src/app/booking/create.tsx`<br>`src/components/booking/PackageItemPicker.tsx`<br>`src/components/booking/DateTimeSelector.tsx` | **Critical** | `ServicePackageController`<br>`PackageItemController`<br>`CustomerScheduledBookingController` |
| **APP-BOOK-02** | Story | **Tích Hợp Báo Giá Động Realtime (Dynamic Pricing Quote)**<br>• Gọi API tính toán tổng tiền chi tiết: Giá gói gốc + Phụ phí di chuyển theo km + Phụ phí làm sớm (trước 5h sáng) / Ngày lễ / Giờ cao điểm.<br>• Hiển thị bảng chi tiết hóa đơn minh bạch (Breakdown Invoice).<br>• Chọn phương thức thanh toán (Cọc Escrow qua Ví hoặc Thanh toán khi hoàn tất). | Customer | `src/components/booking/InvoiceSummaryCard.tsx`<br>`src/services/pricing.service.ts` | **Critical** | `DynamicPricingController`<br>`SurchargeController` |
| **APP-BOOK-03** | Story | **Màn hình Quản Lý Lịch Hẹn Đa Trạng Thái (Tab Bookings)**<br>• Tab *Sắp tới* (Chờ xác nhận, Đã nhận đơn, Thợ đang di chuyển, Đang trang điểm).<br>• Tab *Lịch sử* (Đã hoàn thành, Đã hủy).<br>• Thẻ đơn hàng hiển thị: Mã đơn, tên thợ MUA, ngày giờ hẹn, địa chỉ, tổng tiền, thẻ trạng thái màu sắc.<br>• Hành động: Hủy lịch hẹn trước (kèm lý do và chính sách phạt cọc), Gọi thợ MUA, Xem chi tiết hóa đơn. | Customer | `src/app/(tabs)/bookings.tsx`<br>`src/components/booking/BookingHistoryCard.tsx` | **High** | `BookingHistoryController`<br>`BookingStateController` |

---

## 📌 SPRINT M-3: ĐIỀU PHỐI KHẨN CẤP REALTIME, RADAR THỢ, WEBSOCKET STOMP & LIVE GPS TRACKING (CUSTOMER & MUA)

### Mục tiêu Sprint:
Xây dựng **Trọn Vẹn Luồng Nghiệp Vụ Realtime End-to-End** theo đúng kiến trúc của Backend Sprint 3: Khách quét radar thợ thật $\rightarrow$ Khách đặt đơn khẩn cấp $\rightarrow$ Hệ thống Waterfall Broadcast $\rightarrow$ Thợ nhận chuông đếm ngược 20s-30s và Chấp nhận qua Redlock $\rightarrow$ Thợ bật di chuyển và phát sóng GPS ngầm $\rightarrow$ Khách theo dõi xe thợ di chuyển trực tiếp trên bản đồ Live Tracking $\rightarrow$ Stepper tiến trình tự động nhảy qua WebSocket STOMP.  
**Tài liệu đặc tả backend tương ứng:** [docs/backlogs/sprint3/user_story_instant_booking_realtime_flow.md](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/backlogs/sprint3/user_story_instant_booking_realtime_flow.md)

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn Dự Kiến | Ưu Tiên | Backend Controller / WebSocket Topic |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-REALTIME-01** | Task | **Hạ Tầng Kết Nối WebSocket STOMP Nhúng**<br>• Kết nối client STOMP trực tiếp tới `ws://192.168.0.229:8080/ws-makeup`.<br>• Tự động đính kèm Token JWT khi handshake.<br>• Quản lý đăng ký kênh động (Topic subscriptions: `/topic/mua-offer/{muaId}`, `/topic/gps-stream/{bookingId}`, `/topic/booking-status/{bookingId}`, `/topic/booking-matched/{bookingId}`).<br>• Cơ chế Auto-Reconnect với exponential backoff khi mất sóng 4G/Wifi. | Core | `src/services/stomp.service.ts`<br>`src/hooks/useWebSocket.ts` | **Critical** | `WebSocketTelemetryHandler`<br>`WebSocketConfig` |
| **APP-REALTIME-02** | Task | **Dịch Vụ Phát Sóng Tọa Độ GPS Chạy Ngầm Của Thợ (Background Tracking)**<br>• Sử dụng `expo-location` kết hợp `expo-task-manager`.<br>• Khi thợ MUA hoặc Staff bấm bắt đầu di chuyển (`ON_THE_WAY`), app tự động phát sóng tọa độ (lat, lng) ngầm về backend mỗi 5-10 giây qua `POST /telemetry/stream` ngay cả khi khóa màn hình.<br>• Thuật toán lọc nhiễu GPS và tối ưu pin. | MUA / Core | `src/services/location-task.service.ts`<br>`src/hooks/useGpsTracker.ts` | **Critical** | `LocationStreamController`<br>`/api/v1/telemetry/stream` |
| **APP-CUST-RT-01** | Story | **Radar Quét Thợ Thật Theo Bán Kính & Danh Mục (`GET /telemetry/nearby`)**<br>• Cải tiến `InstantRadarModal.tsx`: **Bán kính mặc định 10km** (các mốc 5, 10, 15, 30km).<br>• **Gợi ý mở rộng thông minh**: Khi không có thợ online trong 10km (`nearbyProviders.length === 0`), hiển thị banner gợi ý mở rộng lên 15km / 30km kèm nút bấm chuyển nhanh.<br>• Khi mở modal, tự động lấy GPS hiện tại và gọi `GET /api/v1/telemetry/nearby?radiusKm=10&limit=10` lấy danh sách thợ thật trong Redis GEO.<br>• Hiển thị các avatar thợ thật di chuyển trên đĩa quét radar kèm khoảng cách thực tế, không dùng dữ liệu giả lập. | Customer | `src/components/booking/InstantRadarModal.tsx`<br>`src/services/telemetry.service.ts` | **Critical** | `TelemetryQueryController`<br>`GET /api/v1/telemetry/nearby`<br>`RedisGeoService` |
| **APP-CUST-RT-02** | Story | **Tạo Đơn Khẩn Cấp Theo Danh Mục & Phong Cách (Ẩn Giá Trước - Lọc Thợ Backend)**<br>• **Loại bỏ 100% hardcode**: Tải danh mục thực tế từ `GET /api/v1/master-categories` và phong cách từ `GET /api/v1/makeup-styles`.<br>• **Ẩn hoàn toàn giá và dịch vụ mua thêm trước khi quét thợ**: Khách chỉ chọn Category, Style, Bán kính, Địa chỉ tiếp đón.<br>• Backend lọc candidate: Thợ bắt buộc phải có gói active thuộc Category và Style được chọn (tránh thợ chỉ làm cô dâu bị match vào đơn tiệc).<br>• Gửi yêu cầu `POST /api/v1/customer/bookings/instant` (kèm `masterCategoryId`, `styleId`, `radiusKm = 10.0`).<br>• Khi thợ nhận ca (`BOOKING_MATCHED`), chuyển tới màn hình Chi Tiết Hóa Đơn & Đặt Cọc: Lúc này mới hiển thị giá thật của thợ, phụ phí khẩn cấp, cho chọn thêm Dịch vụ mua thêm (Add-ons) và thanh toán cọc Escrow 30%. | Customer | `src/components/booking/InstantRadarModal.tsx`<br>`src/services/booking.service.ts` | **Critical** | `CustomerInstantBookingController`<br>`POST /api/v1/customer/bookings/instant`<br>`/topic/booking-matched/{bookingId}` |
| **APP-CUST-RT-03** | Story | **Màn Hình Bản Đồ Live GPS Tracking Theo Dõi Xe Thợ Chạy (Realtime Map)**<br>• **Khắc phục triệt để**: Thay thế hoàn toàn nút bấm chỉ hiện `Alert.alert` trong `bookings.tsx`.<br>• Xây dựng màn hình bản đồ tương tác `src/app/booking/tracking/[id].tsx` và component `LiveTrackingMap.tsx`.<br>• Gọi `GET /api/v1/telemetry/trip/{id}/live` để tải tọa độ thợ mới nhất, vị trí khách và polyline tuyến đường.<br>• Lắng nghe STOMP `/topic/gps-stream/{bookingId}`: Cập nhật icon xe thợ di chuyển mượt mà thời gian thực, tính lại khoảng cách còn lại và thời gian dự kiến đến nơi (ETA).<br>• Nút gọi điện khẩn cấp cho thợ, nút nhắn tin nhanh. | Customer | `src/app/booking/tracking/[id].tsx`<br>`src/components/booking/LiveTrackingMap.tsx`<br>`src/app/(tabs)/bookings.tsx` | **Critical** | `TelemetryQueryController`<br>`GET /api/v1/telemetry/trip/{id}/live`<br>`/topic/gps-stream/{bookingId}` |
| **APP-CUST-RT-04** | Story | **Cập Nhật Stepper Tiến Trình Dịch Vụ Tự Động (/topic/booking-status/{bookingId})**<br>• **Khắc phục lỗi thiếu**: Khách hàng lắng nghe trực tiếp WebSocket `/topic/booking-status/{bookingId}` trên cả màn hình Tracking và danh sách `bookings.tsx`.<br>• Tự động nhảy nấc tiến trình dịch vụ 4 bước theo thời gian thực mà không cần vuốt reload:<br>  1. *Thợ đang di chuyển* (`ON_THE_WAY`)<br>  2. *Thợ đã tới nơi* (`ARRIVED`)<br>  3. *Đang trang điểm* (`IN_PROGRESS`)<br>  4. *Hoàn thành ca làm* (`COMPLETED`).<br>• Kích hoạt rung haptic nhẹ và Toast thông báo nổi khi trạng thái thay đổi. | Customer | `src/components/booking/BookingProgressStepper.tsx`<br>`src/app/booking/tracking/[id].tsx`<br>`src/app/(tabs)/bookings.tsx` | **High** | `BookingStateController`<br>`/topic/booking-status/{bookingId}` |
| **APP-MUA-RT-01** | Story | **Màn hình Bàn Làm Việc Thợ & Bật/Tắt Định Vị Trực Tuyến**<br>• Công tắc Trực tuyến: *Sẵn sàng nhận ca (GPS ON)* / *Tạm nghỉ (Offline)*.<br>• Khi bật Online, lấy GPS hiện tại và đăng ký vào tập hợp Redis GEO (`mua:geo:active`) qua API backend.<br>• Bảng điều khiển tóm tắt: Đơn đang thực hiện, Điểm uy tín ⭐, Doanh thu trong ngày. | MUA | `src/app/mua/workstation.tsx`<br>`src/components/mua/WorkstationHeader.tsx` | **Critical** | `LocationStreamController`<br>`POST /api/v1/telemetry/stream`<br>`MuaProfileController` |
| **APP-MUA-RT-02** | Story | **Modal Nhận Ca Cấp Tốc Chuẩn Dữ Liệu Thực Tế Từ Thợ (Countdown 20-30s)**<br>• Tái cấu trúc `CountdownAcceptModal.tsx`: **Xóa 100% hardcode fallback**.<br>• Nhận dữ liệu thực tế từ payload WebSocket `/topic/mua-offer/{muaId}`:<br>  - Giá gói niêm yết của thợ (`basePrice`).<br>  - Phụ phí khẩn cấp (`emergencySurchargeFee` 150k).<br>  - Thu nhập thực nhận của thợ (`earningsAmount`).<br>  - Phí nền tảng (`platformFee`).<br>  - Tên dịch vụ thật của thợ (`serviceName`).<br>  - Phong cách khách yêu cầu (`styleNames`).<br>  - Cự ly và thời gian di chuyển dự kiến.<br>• Đảm bảo tính toán tài chính khớp 100% với backend. | MUA | `src/components/mua/CountdownAcceptModal.tsx`<br>`src/services/booking.service.ts` | **Critical** | `BookingAcceptanceController`<br>`/api/v1/booking/{id}/accept`<br>`/topic/mua-offer/{muaId}` |
| **APP-MUA-RT-03** | Story | **Tiến Trình Thực Hiện Ca Làm 4 Bước & Chụp Ảnh Nghiệm Thu**<br>• 4 Nút thao tác chuyển trạng thái tuần tự cho Thợ MUA và Agency Staff:<br>  *Bắt đầu di chuyển* $\rightarrow$ *Đã tới nơi* $\rightarrow$ *Bắt đầu trang điểm* $\rightarrow$ *Hoàn thành ca*.<br>• Khi bấm *Bắt đầu di chuyển*: Tự động kích hoạt Dịch vụ phát GPS ngầm (APP-REALTIME-02).<br>• Khi bấm *Hoàn thành ca*: Mở Camera chụp ảnh khuôn mặt khách sau khi make-up xong, tải lên Cloudinary qua `POST /api/v1/bookings/{id}/completion-photo` để mở khóa giải ngân cọc Escrow. | MUA / Staff | `src/app/job-execution/[id].tsx`<br>`src/components/mua/ProofCameraModal.tsx` | **High** | `BookingStateController`<br>`/api/v1/booking/state/*`<br>`BookingCompletionController` |

---

## 📌 SPRINT M-4: LỊCH TRỰC CA, ĐƠN ĐIỀU PHỐI ĐẠI LÝ & TAY NGHỀ NHÂN VIÊN (`ROLE_AGENCY_STAFF`)

### Mục tiêu Sprint:
Hỗ trợ nhân viên trang điểm của Studio/Agency quản lý lịch ca làm việc theo tuần, điểm danh bằng GPS, nhận đơn do Agency Admin phân công và đăng tải album ảnh mẫu tác phẩm gắn theo từng dịch vụ được phân công.

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn Dự Kiến | Ưu Tiên | Backend Controller |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-STAFF-01** | Story | **Lịch Ca Trực Tuần & Điểm Danh GPS Tại Studio**<br>• Xem ma trận ca trực theo tuần (Thứ 2 đến Chủ Nhật: Ca Sáng, Chiều, Tối).<br>• Nút Check-in / Check-out ca làm việc bằng định vị GPS trong bán kính studio.<br>• Xem trạng thái đi làm (Đúng giờ, Đi muộn, Vắng mặt). | Agency Staff | `src/app/staff/shifts.tsx`<br>`src/components/staff/WeeklyShiftView.tsx` | **High** | `AgencyShiftController`<br>`/api/v1/agency/shifts/my-shifts` |
| **APP-STAFF-02** | Story | **Đăng Ký & Quản Lý Giờ Làm Thêm (Overtime)**<br>• Xem danh sách các suất ca làm thêm ngoài giờ do Agency mở.<br>• Đăng ký nhận ca Overtime, gửi giải trình làm quá giờ.<br>• Theo dõi phụ cấp làm thêm giờ đã được đại lý phê duyệt. | Agency Staff | `src/app/staff/overtime.tsx`<br>`src/components/staff/OvertimeApplyModal.tsx` | **Medium** | `AgencyOvertimeController`<br>`/api/v1/agency/overtime/*` |
| **APP-STAFF-03** | Story | **Tiếp Nhận & Thực Hiện Ca Điều Phối Từ Đại Lý**<br>• Danh sách đơn hàng được Agency Admin phân công chỉ định cho staff.<br>• Xem địa chỉ khách hàng, gói dịch vụ cần thực hiện.<br>• Nút *"Bắt Đầu Ca Làm"* điều hướng sang màn hình Tiến trình 4 bước & Chụp ảnh nghiệm thu (`src/app/job-execution/[id].tsx` - APP-MUA-RT-03). | Agency Staff | `src/app/staff/dispatched-jobs.tsx`<br>`src/components/staff/DispatchedJobCard.tsx` | **High** | `AgencyBookingController`<br>`AgencyStaffPackageController` |
| **APP-STAFF-04** | Story | **Quản Lý Ảnh Mẫu Tay Nghề Theo Từng Dịch Vụ Của Staff (Staff Service Showcase)**<br>• Nhân viên Studio tải lên ảnh các tác phẩm make-up thực tế do mình thực hiện, **phân loại cụ thể theo từng dịch vụ/phong cách** được Studio giao (`AgencyStaffService`).<br>• Khi khách chọn dịch vụ của Studio và xem danh sách nhân viên, ảnh mẫu của nhân viên sẽ hiển thị tương ứng theo đúng dịch vụ đó. | Agency Staff | `src/app/staff/portfolio.tsx`<br>`src/app/staff/showcase-upload.tsx` | **Medium** | `MuaPortfolioController`<br>`AgencyStaffServiceController` |

---

## 📌 SPRINT M-5: CẤU HÌNH GÓI DỊCH VỤ, PORTFOLIO THỢ MUA & TIỆN ÍCH HỆ THỐNG

### Mục tiêu Sprint:
Tập trung xây dựng các công cụ thiết lập hồ sơ nghề nghiệp chuyên sâu cho Thợ MUA tự do (cấu hình gói dịch vụ, album ảnh mẫu tác phẩm, chứng chỉ) và các module bảo mật, đa ngôn ngữ của hệ thống di động.

| Mã Issue | Loại | Tên Tính Năng / Task Kỹ Thuật | Phân Hệ | File Mã Nguồn Dự Kiến | Ưu Tiên | Backend Controller |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **APP-MUA-PORT-01** | Story | **Quản Lý Album Ảnh Mẫu Theo Từng Dịch Vụ (Service-Linked Showcase)**<br>• Ảnh mẫu được gắn chặt chẽ theo từng Gói Dịch Vụ (`package_id`), không gộp chung lộn xộn.<br>• Thợ vào từng dịch vụ (Cô dâu, Dự tiệc, Kỷ yếu) để tải lên, sắp xếp, xóa ảnh tác phẩm đã make thực tế cho dịch vụ đó.<br>• Tải ảnh tác phẩm chính và các ảnh góc chụp hoàn thiện chi tiết (ảnh nét cao, lớp nền, mắt, tạo khối). | MUA | `src/app/mua/portfolio-manager.tsx`<br>`src/app/mua/showcase-create.tsx` | **Medium** | `MuaPortfolioController`<br>`/api/v1/muas/my-profile/portfolios` |
| **APP-MUA-PORT-02** | Story | **Hồ Sơ Tay Nghề, Chọn Phong Cách Make-up Sở Trường & Bán Kính Hoạt Động**<br>• Chỉnh sửa Bio giới thiệu bản thân, số năm thâm niên trong nghề, tải chứng chỉ bằng cấp (`mua_certificates`).<br>• **Chọn danh sách Phong Cách Make-up sở trường** (`mua_styles`: Douyin, Tone Hàn Trong Trẻo, Tone Thái Sắc Sảo, Tone Tây Âu, Cổ Điển...), đánh dấu phong cách chính (`isPrimary`).<br>• Cài đặt Bán kính hoạt động nhận khách (1km – 50km) & địa chỉ làm việc cơ sở (`baseAddressText`). | MUA | `src/app/profile/mua-profile.tsx`<br>`src/components/mua/StylePickerModal.tsx` | **High** | `MuaProfileController`<br>`MuaStyleController`<br>`/api/v1/muas/my-profile/styles` |
| **APP-MUA-PORT-03** | Story | **Tạo Mới & Cấu Hình Gói Dịch Vụ Thợ Tự Do (Freelancer Service Package Builder)**<br>• **Thêm mới / Chỉnh sửa gói dịch vụ cá nhân** (`service_packages`):<br>  - Chọn Danh mục gốc (`categoryId`: Cô dâu, Dự tiệc, Kỷ yếu, Đi chơi...).<br>  - **Chọn các Phong cách make-up hỗ trợ cho gói** (`package_styles`: gán danh sách style tương thích).<br>  - **Cấu hình các bước thực hiện mặc định & Tùy chọn làm thêm** (`package_items`: dán mi giả, uốn tóc, đánh nền body, đính đá...).<br>  - Thiết lập giá niêm yết trọn gói, thời lượng dự kiến (phút), tải ảnh đại diện gói dịch vụ.<br>  - Bật / Tắt trạng thái mở nhận ca của gói dịch vụ (`is_active`). | MUA | `src/app/mua/packages/index.tsx`<br>`src/app/mua/packages/create.tsx`<br>`src/components/mua/PackageItemBuilder.tsx` | **High** | `ServicePackageController`<br>`PackageItemController`<br>`/api/v1/packages` |
| **APP-CORE-SETTINGS** | Story | **Màn Hình Đổi Mật Khẩu & Cài Đặt Ngôn Ngữ Tức Thời**<br>• Đổi mật khẩu tài khoản (Mật khẩu cũ $\rightarrow$ Mật khẩu mới chuẩn regex 8-50 ký tự, hoa, thường, số, ký tự đặc biệt).<br>• Chuyển đổi ngôn ngữ Tiếng Việt (`vi`) / Tiếng Anh (`en`) tức thời không cần reload app.<br>• Tự động đồng bộ header `Accept-Language` trong mọi request Axios của `api.ts`. | Core | `src/app/(auth)/change-password.tsx`<br>`src/components/LanguageToggleModal.tsx` | **Medium** | `AuthController`<br>`/api/v1/auth/change-password`<br>`/api/v1/auth/language` |

---

## 🎯 THỨ TỰ THỰC THI KHUYẾN NGHỊ (ROADMAP EXECUTION)

```text
[SPRINT M-0] (Xong 100%) -> [SPRINT M-1] (Khám phá & MUA Detail) -> [SPRINT M-2] (Đặt lịch hẹn trước & Báo giá)
                                                                                  |
                                                                                  v
[SPRINT M-5] (Gói Dịch Vụ & Portfolio MUA) <-- [SPRINT M-4] (Agency Staff) <-- [SPRINT M-3] (Realtime Instant Booking & GPS)
```

1. **Bước 1**: Triển khai **Sprint M-1** (Màn hình Khám phá `explore.tsx` & Chi tiết Thợ MUA `mua-detail/[id].tsx`) để khách hàng có thể duyệt xem đầy đủ dữ liệu thực tế từ backend.
2. **Bước 2**: Triển khai **Sprint M-2** (Luồng Đặt lịch hẹn trước `booking/create.tsx` & Báo giá Dynamic Pricing Quote).
3. **Bước 3**: Triển khai **Sprint M-3** (**Cốt lõi Realtime Toàn Hệ Thống**):
   - Kích hoạt hạ tầng WebSocket STOMP (`/ws-makeup`) và Background Location Task.
   - Hoàn thiện luồng Khách hàng: Radar quét thợ thật quanh vị trí (`GET /telemetry/nearby`), tạo đơn khẩn cấp 30s, màn hình Live Tracking bám đuổi xe thợ chạy (`/topic/gps-stream/{bookingId}`) và Stepper cập nhật tiến trình tự động (`/topic/booking-status/{bookingId}`).
   - Hoàn thiện luồng Thợ MUA: Bàn làm việc, Modal đếm ngược 20s-30s nhận ca cấp tốc với Redlock, tiến trình 4 bước và chụp ảnh nghiệm thu hoàn tất dịch vụ.
4. **Bước 4**: Triển khai **Sprint M-4** (Phân hệ Nhân viên Agency trực ca tuần, điểm danh GPS và nhận đơn điều phối từ Studio).
5. **Bước 5**: Triển khai **Sprint M-5** (Cấu hình Gói dịch vụ cá nhân thợ MUA, quản lý Album ảnh mẫu tác phẩm gắn theo dịch vụ, đổi mật khẩu và đa ngôn ngữ).
