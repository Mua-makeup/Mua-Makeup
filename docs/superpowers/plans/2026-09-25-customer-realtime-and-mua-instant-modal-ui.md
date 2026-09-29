# KẾ HOẠCH TRIỂN KHAI GIAO DIỆN REALTIME & MODAL ĐƠN KHẨN CẤP (MOBILE APP)

**Mục tiêu:** Xây dựng hoàn chỉnh giao diện Realtime phía Khách Hàng (Radar thợ thật quanh vị trí, Live GPS Tracking bản đồ bám đuổi xe thợ chạy, Stepper tiến trình WebSocket tự động) và Nâng cấp giao diện Modal nhận đơn khẩn cấp chuẩn 7 khối thông tin phía Thợ MUA.

**Kiến trúc:** 
- Nền tảng: React Native 0.86 + Expo SDK 57 + Expo Router + TypeScript + Reanimated + React Native Maps.
- Kết nối dữ liệu 100% thực tế từ Spring Boot Core API (`/api/v1/telemetry/*`) và Embedded WebSocket STOMP (`/ws-makeup`).
- Tuyệt đối tuân thủ **Strict Rule 5**: ZERO MOCK DATA - Không dùng dữ liệu giả, không tự sinh timer/tọa độ ảo.

**Tài liệu đặc tả cơ sở:**
- [docs/backlogs/sprint6/spec_customer_radar_live_gps_and_service_stepper.md](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/backlogs/sprint6/spec_customer_radar_live_gps_and_service_stepper.md)
- [docs/backlogs/sprint6/spec_mua_workstation_instant_booking_and_job_execution.md](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/backlogs/sprint6/spec_mua_workstation_instant_booking_and_job_execution.md) (Chỉ sửa phần Modal thông tin đơn hàng khẩn cấp)
- [docs/mobile_app_task_issues.md](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/mobile_app_task_issues.md)

---

## 📊 BẢNG DANH MỤC FILE THAY ĐỔI & TẠO MỚI

| STT | Tên File | Loại | Nhiệm Vụ Kỹ Thuật |
| :---: | :--- | :---: | :--- |
| **1** | `code/app/src/services/telemetry.service.ts` | Sửa | Thêm hàm `getNearbyProviders` và `getLiveTripTracking` |
| **2** | `code/app/src/store/workstation.store.ts` | Sửa | Mở rộng kiểu dữ liệu `InstantBookingOffer` theo chuẩn 7 khối |
| **3** | `code/app/src/components/booking/MuaRadarMarker.tsx` | Tạo mới | Marker hiển thị avatar thợ thật trên đĩa radar, cự ly và popover |
| **4** | `code/app/src/components/booking/RadarScannerCanvas.tsx` | Tạo mới | Đĩa quay Canvas 360 độ, chuyển đổi GPS sang tọa độ cực $(r, \theta)$ |
| **5** | `code/app/src/components/booking/InstantRadarModal.tsx` | Sửa | Tích hợp gọi radar thợ thật + Khung báo giá khẩn cấp minh bạch |
| **6** | `code/app/src/components/booking/BookingProgressStepper.tsx` | Tạo mới | Stepper 4 bước subscribe STOMP `/topic/booking-status/{id}` |
| **7** | `code/app/src/components/booking/LiveTrackingMap.tsx` | Tạo mới | Bản đồ bám đuổi xe thợ di chuyển mượt mà (Lerp) + xoay góc la bàn |
| **8** | `code/app/src/app/booking/tracking/[id].tsx` | Tạo mới | Màn hình Live GPS Tracking khách hàng với Bottom Sheet |
| **9** | `code/app/src/app/bookings.tsx` | Sửa | Chuyển `handleTrack` sang điều hướng `tracking/[id]`, nhúng Stepper |
| **10** | `code/app/src/components/mua/CountdownAcceptModal.tsx` | Sửa | Nâng cấp toàn diện bố cục 7 Khối Thông Tin chi tiết đơn khẩn cấp |

---

## 🚀 CÁC TÁC VỤ TRIỂN KHAI CHI TIẾT (7 BITE-SIZED TASKS)

### Task 1: Mở Rộng Service Telemetry & Store Workstation Cho Luồng Dữ Liệu Thực

**Files:**
- Sửa: `code/app/src/services/telemetry.service.ts`
- Sửa: `code/app/src/store/workstation.store.ts`

**Mục tiêu:** Cung cấp đầy đủ interface kiểu dữ liệu và hàm gọi API từ Backend Spring Boot (`GET /api/v1/telemetry/nearby` và `GET /api/v1/telemetry/bookings/{id}/track`), đồng thời mở rộng store thợ để đón nhận các trường thông tin khẩn cấp mở rộng từ `/topic/mua-offer/{muaId}`.

- [x] **Step 1: Khai báo interface `NearbyProvidersReq` & `NearbyProviderRes` trong `telemetry.service.ts`**
- [x] **Step 2: Thêm 2 hàm gọi API trong `telemetryService`**
- [x] **Step 3: Mở rộng `InstantBookingOffer` trong `workstation.store.ts`**
- [x] **Step 4: Kiểm tra TypeScript compiling không lỗi**

---

### Task 2: Xây Dựng Component Hiển Thị Thợ Thật Trên Radar (`RadarScannerCanvas` & `MuaRadarMarker`)

**Files:**
- Tạo mới: `code/app/src/components/booking/MuaRadarMarker.tsx`
- Tạo mới: `code/app/src/components/booking/RadarScannerCanvas.tsx`

**Mục tiêu:** Thay thế hiệu ứng sóng CSS tĩnh bằng đĩa radar xoay Canvas tương tác, tính toán vị trí hiển thị avatar thợ thật dựa trên cự ly và góc phương vị GPS thực tế.

- [x] **Step 1: Viết `MuaRadarMarker.tsx`**
  - Nhận props: `provider: NearbyProviderRes`, `x: number`, `y: number`, `onSelect: (p) => void`.
  - Hiển thị avatar tròn (42x42px), viền sáng dạ quang xanh `#10B981` (Online).
  - Huy hiệu cự ly mini đính kèm dưới chân: `1.2 km`.
  - Chạm vào marker: Mở Popover tóm tắt thông tin thợ (Tên, Sao, Tags phong cách, Giá từ).
- [x] **Step 2: Viết `RadarScannerCanvas.tsx`**
  - Sử dụng SVG và Reanimated vẽ đĩa tròn nền tối sang trọng với các vòng đồng tâm (1km, 3km, 5km).
  - Kim quét xoay liên tục 360 độ (3s/vòng) với góc quét hình rẻ quạt gradient mờ.
  - Hàm toán học quy đổi tọa độ GPS sang tọa độ cực $(r, \theta)$ trên Canvas:
    - Khoảng cách $r = (\text{distanceKm} / \text{radiusKm}) \times R$.
    - Góc $\theta = \text{bearing}(\text{lat}_{\text{center}}, \text{lng}_{\text{center}}, \text{lat}_{\text{mua}}, \text{lng}_{\text{mua}})$.
    - Tọa độ phẳng $(x, y) = (\text{center} + r \cdot \sin\theta, \text{center} - r \cdot \cos\theta)$.
  - Định vị Marker khách ở chính tâm radar (Điểm hồng Rose Ruby phát sáng).

---

### Task 3: Tái Cấu Trúc Modal Đặt Ca Khẩn Cấp Khách Hàng (`InstantRadarModal.tsx`)

**Files:**
- Sửa: `code/app/src/components/booking/InstantRadarModal.tsx`

**Mục tiêu:** Xóa bỏ hoàn toàn sóng radar tĩnh; tích hợp gọi `telemetryService.getNearbyProviders()`, hiển thị danh sách thợ thật trên đĩa radar; nâng cấp Khung Thông Tin Gói Dịch Vụ Khẩn Cấp và Báo Giá Phân Rã Minh Bạch (Giá gói, Phụ phí 150k, Cọc 30% Escrow, Ghi chú phòng/tòa nhà, Cam kết 30-45p).

- [x] **Step 1: Gọi API `getNearbyProviders` khi mở modal**
  - Tự động lấy GPS khách hàng hiện tại $\rightarrow$ gọi `telemetryService.getNearbyProviders({ latitude, longitude, radiusKm: 5 })`.
  - Lưu danh sách thợ online thật vào state `nearbyMuas`.
  - Hiển thị thông báo số lượng: `[🟢 Có X chuyên viên đang trực tuyến quanh bạn 5km]`. Nếu rỗng, hiển thị cảnh báo rỗng thực tế (*"Hiện chưa có chuyên viên nào online quanh bán kính 5km"*).
- [x] **Step 2: Nhúng `RadarScannerCanvas` vào chế độ quét**
  - Truyền danh sách `nearbyMuas` vào Canvas để hiển thị avatar thợ thật chuyển động trên đĩa quét.
- [x] **Step 3: Tích hợp Khung Báo Giá & Dịch Vụ Khẩn Cấp Minh Bạch**
  - Gói dịch vụ khẩn cấp: Tên gói, giá niêm yết.
  - Phân rã giá: Giá gói + Phụ phí khẩn cấp 150k + Phụ phí thêm.
  - Tiền cọc 30% Escrow hiển thị rõ ràng.
  - Cam kết thời gian có mặt: 30-45 phút.
  - Ô nhập chi tiết địa chỉ: Tòa nhà, số tầng, căn hộ, ghi chú riêng.
- [x] **Step 4: Đồng bộ luồng tạo đơn khẩn cấp `POST /api/v1/customer/bookings/instant`**
  - Bấm tìm thợ $\rightarrow$ gửi đơn thật $\rightarrow$ lắng nghe WebSocket `/topic/booking-matched/{bookingId}`.
  - Khi có thợ nhận đơn: Rung haptic, đóng modal và chuyển hướng sang màn hình Live Tracking `tracking/[id]`.

---

### Task 4: Xây Dựng Component Stepper Tiến Trình Dịch Vụ Realtime (`BookingProgressStepper.tsx`)

**Files:**
- Tạo mới: `code/app/src/components/booking/BookingProgressStepper.tsx`

**Mục tiêu:** Hiển thị tiến trình 4 nấc dịch vụ (`ON_THE_WAY` $\rightarrow$ `ARRIVED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`) và tự động nhảy trạng thái thời gian thực qua WebSocket STOMP.

- [x] **Step 1: Thiết kế giao diện 4 nấc trực quan phong cách Luxury Beauty**
  - Nấc 1: 🛵 *Thợ đang di chuyển* (`ON_THE_WAY` - Xanh dương `#3B82F6`)
  - Nấc 2: 📍 *Thợ đã tới nơi* (`ARRIVED` - Vàng hổ phách `#F59E0B`)
  - Nấc 3: 💄 *Đang trang điểm* (`IN_PROGRESS` - Hồng Rose Ruby `#E11D48`)
  - Nấc 4: ✅ *Hoàn thành ca làm* (`COMPLETED` - Xanh lục bảo `#10B981`)
- [x] **Step 2: Lắng nghe WebSocket STOMP topic `/topic/booking-status/{bookingId}`**
  - Hook `useWebSocket` hoặc `websocketService.subscribe('/topic/booking-status/' + bookingId, callback)`.
  - Khi nhận payload `currentStatus`: Cập nhật active step tức thời.
  - Kích hoạt rung haptic nhẹ: `Haptics.notificationAsync(Success)`.
  - Hiển thị Toast thông báo nổi từ cạnh trên màn hình.
- [x] **Step 3: Cleanup khi unmount**
  - Hủy đăng ký topic khi thoát màn hình để chống rò rỉ bộ nhớ.

---

### Task 5: Xây Dựng Màn Hình Bản Đồ Live GPS Tracking Bám Đuổi Xe Thợ Chạy

**Files:**
- Tạo mới: `code/app/src/components/booking/LiveTrackingMap.tsx`
- Tạo mới: `code/app/src/app/booking/tracking/[id].tsx`

**Mục tiêu:** Màn hình bản đồ toàn diện cho khách hàng xem xe thợ di chuyển thời gian thực, tính lại ETA liên tục và cung cấp Bottom Sheet hỗ trợ gọi điện nhanh cho thợ.

- [x] **Step 1: Viết component `LiveTrackingMap.tsx`**
  - Nhúng Leaflet Engine qua WebView với marker thợ xoay mượt mà theo góc la bàn `heading` (0-360 độ).
  - Ghim vị trí nhà khách hàng (Customer Pin Rose Ruby).
  - Tuyến đường Polyline nét đứt phát sáng nối thợ và khách.
  - Giao tiếp 2 chiều WebView qua postMessage cập nhật vị trí thợ realtime không cần reload.
- [x] **Step 2: Viết màn hình `src/app/booking/tracking/[id].tsx`**
  - Khởi tạo: Gọi `telemetryService.getLiveTripTracking(bookingId)` lấy tọa độ ban đầu và ETA.
  - Lắng nghe STOMP `/topic/gps-stream/{bookingId}`: Cập nhật tọa độ di chuyển thợ realtime.
  - Nhúng `BookingProgressStepper` ở nửa trên màn hình.
  - Bottom Sheet ở nửa dưới:
    * Avatar, Họ tên thợ, Số điện thoại.
    * Nút `[📞 Gọi Điện Cho Thợ]` qua `Linking.openURL('tel:' + phone)`.
    * Nút `[💬 Nhắn Tin Nhanh]`.
    * Thẻ ETA đếm ngược: `⚡ Thợ sẽ đến sau khoảng X phút (Y km)`.

---

### Task 6: Cập Nhật Màn Hình Danh Sách Lịch Hẹn (`bookings.tsx`)

**Files:**
- Sửa: `code/app/src/app/bookings.tsx`

**Mục tiêu:** Thay thế nút bấm chỉ hiện `Alert.alert` trong hàm `handleTrack` thành điều hướng thực tế sang màn hình Live Tracking, đồng thời nhúng listener cập nhật tiến trình ca làm realtime.

- [x] **Step 1: Sửa hàm `handleTrack`**
  ```typescript
  const handleTrack = (booking: CustomerBookingItem) => {
    router.push(`/booking/tracking/${booking.id}` as any);
  };
  ```
- [x] **Step 2: Nhúng WebSocket listener cập nhật danh sách lịch hẹn**
  - Lắng nghe sự kiện chuyển trạng thái đơn để tự động cập nhật badge trạng thái của thẻ đơn hàng trong danh sách mà khách không cần vuốt reload màn hình.

---

### Task 7: Nâng Cấp Toàn Diện Modal Nhận Ca Khẩn Cấp 7 Khối Cho Thợ MUA (`CountdownAcceptModal.tsx`)

**Files:**
- Sửa: `code/app/src/components/mua/CountdownAcceptModal.tsx`

**Mục tiêu:** Xóa bỏ hoàn toàn bố cục sơ sài cũ; triển khai chuẩn **7 Khối Dữ Liệu Chuyên Nghiệp** giúp thợ MUA có đầy đủ căn cứ (Gói dịch vụ, Style, Checklist dụng cụ, Hạn chót có mặt, Thu nhập ròng minh bạch, Cọc Escrow 30%) để tự tin bấm nhận ca trong 20 giây.

- [x] **Step 1: Tái cấu trúc Layout thẻ Card theo 7 Khối Thông Tin**
  1. *Khối 1: Header Khẩn Cấp & Thứ Tự Ưu Tiên*: Badge đỏ chớp nhẹ + Mã đơn `BK-FAST-xxxxxx` + Thứ hạng Waterfall Queue (`Ưu tiên #1 của bạn • 1/4 thợ gần nhất`).
  2. *Khối 2: Đĩa Quay SVG 20s*: Vòng tròn SVG co ngắn + Pulse animation + Rung haptic nhịp tim mỗi 2s + Thanh tiến trình đổi màu cam đỏ khi <5s.
  3. *Khối 3: Thẻ Minh Bạch Tài Chính*: Số tiền thực nhận nổi bật màu xanh Emerald `+520.000 đ` + Bảng phân rã (Giá gói, Phụ phí khẩn cấp 150k, Phí sàn 20%) + Huy hiệu `🔒 Đã ký quỹ cọc Escrow 30%`.
  4. *Khối 4: Chi Tiết Gói Dịch Vụ, Style & Bước Kèm Theo*: Tên gói, Badges phong cách (`[Tone Thái]`, `[Douyin]`), Checklist bước làm thêm (`✔ Uốn tóc`, `✔ Dán mi 3D`, `✔ Đánh nền body`).
  5. *Khối 5: Địa Điểm, Cự Ly & Hạn Chót Có Mặt*: Cự ly km, thời gian đi xe máy ETA (~7 phút), Hạn chót giờ có mặt (`Trước 10:15 - Còn 38 phút`), Địa chỉ số phòng/tòa nhà chi tiết, Ghi chú riêng của khách hàng.
  6. *Khối 6: Hồ Sơ Khách Hàng*: Họ tên khách hàng + Điểm sao uy tín ⭐.
  7. *Khối 7: Cụm Nút Hành Động*: Nút `[🚀 CHẤP NHẬN NHẬN CA]` full ngang với Redlock và Nút `[Bỏ Qua Ca Này]`.
- [x] **Step 2: Đảm bảo Stylesheet gọn gàng, độ tương phản cao, tối ưu cuộn cho màn hình nhỏ**
- [x] **Step 3: Kiểm tra tích hợp âm thanh chuông báo và Redisson Distributed Lock khi bấm nhận**

---

## 🔍 KIỂM THỬ XÁC MINH TOÀN DIỆN (VERIFICATION PLAN)

1. **Kiểm tra TypeScript & Cú Pháp**:
   - Chạy lệnh kiểm tra TypeScript trong thư mục `code/app`:
     `npx tsc --noEmit`
   - Xác nhận không có lỗi kiểu dữ liệu hoặc thiếu import.
2. **Kiểm tra Giao Diện Trực Quan (UI Review)**:
   - Kiểm tra `InstantRadarModal.tsx`: Đĩa radar xoay mượt mà, hiển thị đúng avatar thợ thật và khung báo giá phân rã.
   - Kiểm tra `CountdownAcceptModal.tsx`: Hiển thị đầy đủ 7 khối thông tin, không bị tràn màn hình.
   - Kiểm tra `LiveTrackingMap.tsx` & `tracking/[id].tsx`: Bản đồ tải đúng vị trí, xe thợ xoay hướng la bàn, Stepper 4 bước nhảy realtime khi thợ chuyển trạng thái.
3. **Tuân Thủ Zero Mocking**:
   - Kiểm tra mã nguồn đảm bảo không có mảng mock data hoặc `setTimeout` sinh tọa độ/avatar ảo.
