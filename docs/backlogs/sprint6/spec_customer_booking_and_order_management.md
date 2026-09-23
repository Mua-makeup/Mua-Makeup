# ĐẶC TẢ TÍNH NĂNG ỨNG DỤNG DI ĐỘNG (MOBILE APP SPECIFICATION)
## Phân hệ: Đặt Lịch, Báo Giá Realtime & Quản Lý Đơn Hàng (`ROLE_CUSTOMER`)
### Sprint: M-2 | Công nghệ: React Native 0.86 + Expo SDK 57 + Expo Router + TypeScript | Backend: Spring Boot 3.3 Core API (Port 8080)

---

## 📱 1. PHẠM VI & ĐỐI TƯỢNG TRÊN ỨNG DỤNG DI ĐỘNG
* **Phân hệ sử dụng:** Áp dụng **100% trên ứng dụng di động Mobile App (`code/app`)** dành riêng cho vai trò **Khách Hàng (`ROLE_CUSTOMER`)**.
* *(Lưu ý: Tài khoản Quản trị `ROLE_SUPER_ADMIN` và `ROLE_AGENCY_ADMIN` bị chặn đăng nhập trên mobile app theo quy chuẩn kiến trúc).*
* **4 Tính năng trọng tâm của Sprint M-2:**
  1. **`APP-BOOK-01` (Màn Hình Đặt Lịch & Chọn Bước Làm Đẹp Mua Thêm):**
     - Khách hàng chọn ngày và khung giờ hẹn (Time Slots: 06:00, 07:30, 09:00, 14:00, 18:00...).
     - Hiển thị danh sách các bước mặc định trong gói (Included Steps) và cho phép tích chọn mua thêm các bước nâng cao (Add-on Items: Dán mi 3D, đính đá, uốn tóc...).
     - Chọn địa chỉ trang điểm tận nơi (Định vị GPS tự động hoặc chọn từ danh sách địa chỉ quen thuộc đã lưu).
     - **Tích hợp Bản đồ Backend:** Tự động gọi API Bản đồ `POST /api/v1/pricing/calculate-distance` (sử dụng Goong Maps API đã tích hợp sẵn ở Backend qua `MapsClientService`) để đo khoảng cách đường bộ và thời gian thợ di chuyển thực tế.
     - Ô ghi chú yêu cầu cá nhân (Loại da, tone mong muốn, phong cách trang phục).
  2. **`APP-BOOK-02` (Báo Giá Động Realtime & Bảng Chi Tiết Hóa Đơn Minh Bạch):**
     - Gọi API Dynamic Pricing Engine tính toán hóa đơn theo thời gian thực (Breakdown Invoice).
     - Minh bạch các khoản: Giá gói gốc + Các bước mua thêm + Phụ phí di chuyển theo km (`distanceFee` lấy từ Goong Maps Backend) + Phụ phí giờ cao điểm/lễ tết (`surgePricing`) - Giảm giá voucher (`voucherDiscount`).
     - Hiển thị rõ số tiền cọc Escrow bắt buộc (Deposit) và số tiền còn lại cần thanh toán sau khi hoàn thành ca trang điểm.
  3. **`APP-BOOK-03` (Màn Hình Quản Lý Lịch Hẹn Đa Trạng Thái & Live Tracking Thợ):**
     - Tab phân tách rõ ràng: *Sắp tới* (Chờ xác nhận, Đã nhận đơn, Thợ đang di chuyển, Đang trang điểm) và *Lịch sử* (Đã hoàn thành, Đã hủy, Khiếu nại).
     - Thẻ đơn hàng hiển thị mã đơn, tên thợ/studio, ngày giờ, địa chỉ, tổng tiền, thẻ trạng thái màu sắc chuẩn Figma.
     - **Tích hợp Bản đồ Theo dõi Thợ:** Khi thợ chuyển trạng thái `ON_THE_WAY`, khách hàng bấm `[🗺️ Xem Vị Trí Thợ]` để gọi API `GET /api/v1/telemetry/bookings/{id}/track` và kết nối WebSocket `/topic/gps-stream/{bookingId}` xem vị trí thợ đang di chuyển thời gian thực (tọa độ, tốc độ, góc quay heading, ETA phút đến nơi).
     - Cụm hành động tương tác ngữ cảnh: Gọi điện trực tiếp cho thợ, Hủy đơn hẹn có giải trình lý do, Đánh giá ⭐ sau khi hoàn thành.
  4. **`APP-BOOK-04` (Radar Tìm Thợ Khẩn Cấp 30s - Instant Booking Flow):**
     - Modal kích hoạt tìm thợ làm đẹp cấp tốc trong 30-60 phút.
     - Hiệu ứng Animation sóng âm Radar phát tín hiệu tìm thợ rảnh trong bán kính 5km.
     - Đồng hồ đếm ngược 30 giây thời gian thực.
     - Lắng nghe STOMP WebSocket, tự động bắt sự kiện khi có thợ nhấn nhận ca (bảo vệ chống race-condition bởi Redisson Distributed Lock) và chuyển tiếp sang màn hình bám đuổi hành trình.

---

## 🛠️ 2. TECH STACK & THƯ VIỆN MOBILE BẮT BUỘC
* **Nền tảng:** React Native 0.86, Expo SDK 57, Expo Router (File-based routing), TypeScript.
* **Điều hướng màn hình (Navigation):** 
  - `src/app/booking/create.tsx`: Form tạo đơn đặt lịch và xem báo giá.
  - `src/app/(tabs)/bookings.tsx`: Màn hình danh sách quản lý lịch hẹn (Tab Bar).
  - `src/app/booking/[id].tsx`: Chi tiết đơn hàng và lịch sử cập nhật trạng thái.
* **Định vị & Bản đồ:** `expo-location` (lấy tọa độ GPS thiết bị chính xác $\pm 5m$).
* **Realtime Communication:** `@stomp/stompjs` + `sockjs-client` kết nối Embedded WebSocket Spring Boot (`ws://192.168.0.229:8080/ws-makeup`).
* **Hiệu ứng & Animation:** 
  - `react-native-reanimated` (hiệu ứng sóng radar tỏa tròn liên tục, chuyển tab mượt mà).
  - `expo-haptics` (rung xúc giác khi chọn khung giờ, khi đếm ngược 30s và khi tìm thấy thợ).
* **Form & Validation:** React Hook Form + Zod Schema (kiểm tra ngày hẹn tương lai, địa chỉ hợp lệ, tọa độ GPS).
* **Xử lý lỗi chuẩn hóa:** Hàm tiện ích `parseApiError(err)` bóc tách lỗi chi tiết từ Spring Boot Backend (`ERR_VALIDATION`, `ERR_BOOKING_ALREADY_EXISTS`, `ERR_INSUFFICIENT_BALANCE`).
* **Design Tokens:** Theme Rose Ruby (`#E11D48`), Slate Heading (`#0F172A`), Muted (`#64748B`), Border (`#E2E8F0`), Background (`#F8FAFC`), Success (`#10B981`), Warning (`#F59E0B`), Danger (`#EF4444`).

---

## 📅 3. TÍNH NĂNG 1: MÀN HÌNH ĐẶT LỊCH & CHỌN BƯỚC MUA THÊM (`APP-BOOK-01`)

### 3.1. Luồng Thao Tác Trên Mobile (Mobile User Flow)
1. **Tiếp nhận tham số điều hướng:**
   - Khách hàng từ màn hình chi tiết thợ (`src/app/mua-detail/[id].tsx`) nhấn nút `[Đặt Lịch Gói Này]` $\rightarrow$ Expo Router điều hướng sang:
     `/booking/create?packageId=12&muaId=5&providerType=FREELANCER`
2. **Khung tóm tắt Dịch vụ & Thợ MUA (Header Provider Card):**
   - Hiển thị thẻ tóm tắt trên cùng: Ảnh cover gói, Tên gói make-up, Tên thợ/Studio, Badge sao uy tín (⭐ 4.95), Giá gốc niêm yết.
3. **Lựa chọn Ngày & Khung Giờ Trang Điểm (`DateTimeSelector.tsx`):**
   - **Chọn Ngày (Date Slider):** Dãy thẻ cuộn ngang 14 ngày tới. Mỗi thẻ gồm: Thứ trong tuần, Ngày trong tháng (VD: `T.Bảy / 26 Th9`). Thẻ đang chọn có nền hồng viền Rose Ruby.
   - **Chọn Giờ Hẹn (Time Slot Grid):** Lưới các nút khung giờ sẵn có:
     - Ca sớm: `05:00`, `06:00`, `07:30` (Có nhãn nhỏ cảnh báo: *Phụ phí làm sớm trước 6h*).
     - Ca sáng: `09:00`, `10:30`.
     - Ca chiều/tối: `13:30`, `15:00`, `17:00`, `19:00`.
     - Khung giờ bị trùng lịch hoặc thợ bận sẽ bị mờ (Disabled, gạch chéo).
4. **Danh Sách Bước Mặc Định & Bước Tùy Chọn Mua Thêm (`PackageItemPicker.tsx`):**
   - Dựa trên dữ liệu `package_items` của gói dịch vụ:
     + **Bước mặc định (Included):** Dấu tích xanh cố định, kèm mô tả (VD: *Cấp ẩm da chuyên sâu, Lót nền kiềm dầu, Che khuyết điểm, Đánh nền, Kẻ mắt tạo khối, Son môi dưỡng ẩm*).
     + **Bước tùy chọn mua thêm (Add-on Items):** Ô checkbox cho phép tích chọn thêm:
       * 👁️ *Dán mi giả 3D gân trong tự nhiên* (+70.000 đ)
       * ✨ *Đính đá pha lê nghệ thuật* (+100.000 đ)
       * 💇 *Uốn sấy tạo kiểu tóc dự tiệc* (+150.000 đ)
       * 🌸 *Đánh phấn nền nhũ bắt sáng vùng cổ/body* (+120.000 đ)
     + Khi khách tích chọn hoặc bỏ chọn bất kỳ addon nào $\rightarrow$ Kích hoạt debounce (300ms) tự động gọi lại API Dynamic Pricing để cập nhật tổng tiền.
5. **Chọn Địa Chỉ Trang Điểm Tận Nơi (`DestinationAddressPicker.tsx`):**
   - Ô nhập địa chỉ chi tiết (Số nhà, tên đường, Phường/Xã, Quận/Huyện).
   - Nút `[📍 Vị Trí Hiện Tại]`: Sử dụng `expo-location` lấy tọa độ GPS của khách hàng và tự động Reverse Geocoding điền vào ô địa chỉ.
   - Nút `[🏠 Địa Chỉ Quen Thuộc]`: Mở ActionSheet chọn nhanh từ danh bạ địa chỉ đã lưu (Nhà riêng, Cơ quan, Studio...).
6. **Ghi chú yêu cầu riêng (Special Notes):**
   - Ô Textarea nhập yêu cầu thêm (Tối đa 500 ký tự): *"Khách có da nhạy cảm dễ kích ứng, trang phục dạ hội màu đỏ đô, cần kiểu tóc bới cao thanh lịch"*.

### 3.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
├── app/
│   └── booking/
│       ├── create.tsx                        # Màn hình chính đặt lịch & tính giá
│       └── [id].tsx                          # Màn hình chi tiết đơn đặt lịch
├── components/booking/
│   ├── BookingHeaderCard.tsx                 # Card tóm tắt thợ MUA và gói dịch vụ đã chọn
│   ├── DateTimeSelector.tsx                  # Bộ chọn ngày cuộn ngang & lưới khung giờ hẹn
│   ├── PackageItemPicker.tsx                 # Danh sách các bước mặc định & checkbox mua thêm
│   ├── DestinationAddressPicker.tsx          # Nhập địa chỉ, lấy GPS hiện tại hoặc chọn từ sổ địa chỉ
│   └── BookingNoteInput.tsx                  # Ô ghi chú yêu cầu riêng cho thợ make-up
├── schemas/
│   └── booking-create.schema.ts              # Zod validation schema cho payload đặt lịch
└── services/
    ├── booking.service.ts                    # Axios client gọi API đặt lịch & quản lý trạng thái
    └── pricing.service.ts                    # Axios client gọi tính giá hóa đơn realtime
```

---

## 💰 4. TÍNH NĂNG 2: BÁO GIÁ ĐỘNG REALTIME & HÓA ĐƠN MINH BẠCH (`APP-BOOK-02`)

### 4.1. Luồng Thao Tác & Bóc Tách Hóa Đơn (Breakdown Invoice)
1. **Cơ chế Báo Giá Động Tự Động (Auto-Quote Engine):**
   - Mỗi khi khách hàng thay đổi:
     + Danh sách bước mua thêm (`addOnItemIds`).
     + Ngày & giờ trang điểm (`bookingTime`).
     + Địa chỉ / tọa độ GPS điểm hẹn (`customerLatitude`, `customerLongitude`).
     + Nhập mã khuyến mãi (`voucherCode`).
   - Ứng dụng tự động gửi request `POST /api/v1/pricing/preview-invoice` với cơ chế Debounce 300ms.
2. **Thành phần Card Hóa Đơn Minh Bạch (`InvoiceSummaryCard.tsx`):**
   - **Giá gói dịch vụ gốc (`packageInfo.basePrice`):** VD: `650.000 đ`.
   - **Các bước mua thêm (`addOns`):** Liệt kê chi tiết tên từng bước và số tiền tương ứng (VD: *Uốn tóc dạ hội: +150.000 đ*).
   - **Phụ phí di chuyển theo khoảng cách GPS (`distanceInfo`):**
     * Hiển thị khoảng cách tính từ vị trí thợ/studio đến điểm hẹn của khách: `📍 Khoảng cách: 6.8 km`.
     * Miễn phí di chuyển trong bán kính: `3.0 km`.
     * Số km vượt định mức: `3.8 km` $\times$ Đơn giá `15.000 đ/km` = Phụ phí di chuyển: `+57.000 đ`.
     * Thời gian thợ di chuyển ước tính: `⏳ ~18 phút`.
   - **Phụ phí Giờ Cao Điểm / Lễ Tết (`surgePricing`):**
     * Nếu khung giờ đặt rơi vào sáng sớm (trước 06:00) hoặc đêm muộn:
       Badge màu cam cảnh báo: `⚡ Khung giờ cao điểm sáng sớm (Hệ số x1.2)`.
       Phụ phí cao điểm: `+130.000 đ`.
   - **Khuyến mãi / Giảm giá (`discount`):**
     * Ô nhập mã Voucher + Nút `[Áp Dụng]`.
     * Trừ tiền khuyến mãi (VD: *Mã CƯOI2026: -100.000 đ*).
   - **Tổng tiền thanh toán (`financialSummary`):**
     * **Tổng chi phí toàn bộ ca làm:** `totalAmount` (VD: `887.000 đ`).
     * **Tiền cọc Escrow giữ chỗ bắt buộc (`depositRequiredAmount`):** `30%` = `266.100 đ`.
     * **Số tiền còn lại thanh toán sau khi hoàn tất:** `remainingPayableAmount` = `620.900 đ`.
3. **Lựa Chọn Phương Thức Thanh Toán Tiền Cọc:**
   - **Phương án 1 - Ví Nền Tảng (Platform Wallet):** Khấu trừ tức thì từ số dư khả dụng trong ví của khách hàng (`ROLE_CUSTOMER`).
   - **Phương án 2 - Chuyển Khoản Ngân Hàng VietQR:** Sinh mã QR thanh toán tức thời với nội dung tự động map mã đơn hàng.

---

## 📋 5. TÍNH NĂNG 3: MÀN HÌNH QUẢN LÝ LỊCH HẸN ĐA TRẠNG THÁI (`APP-BOOK-03`)

### 5.1. Luồng Thao Tác Trên Mobile (Mobile User Flow)
1. **Truy cập:** Khách hàng chạm vào Tab *Lịch Hẹn* trên Bottom Bar (`src/app/(tabs)/bookings.tsx`).
2. **Thanh Segmented Control phân chia 2 Nhóm Tab:**
   - **Tab 1: Sắp Tới (Upcoming):**
     * `REQUESTED`: Đang chờ xác nhận / Đang tìm thợ.
     * `AGENCY_ASSIGNED` / `ACCEPTED`: Đã có thợ MUA / Agency xác nhận ca.
     * `ON_THE_WAY`: Thợ đang di chuyển tới địa chỉ khách (Hiển thị nút `[🗺️ Xem Thợ Đang Tới Đâu]`).
     * `ARRIVED`: Thợ đã có mặt tại địa chỉ khách hàng.
     * `IN_PROGRESS`: Thợ đang thực hiện trang điểm.
   - **Tab 2: Lịch Sử (History):**
     * `COMPLETED` / `PAID_OUT`: Ca làm đã hoàn thành tốt đẹp.
     * `CANCELLED`: Ca hẹn đã bị hủy (hiển thị lý do hủy của khách hoặc của thợ).
     * `DISPUTED`: Đơn có phát sinh khiếu nại (Đang chờ Quản trị viên xử lý).
3. **Thành phần Thẻ Lịch Hẹn (`BookingHistoryCard.tsx`):**
   - **Header Thẻ:**
     * Mã đơn hàng: `#BK-2026-9812` (Có nút chạm để sao chép).
     * Badge trạng thái màu sắc:
       - Vàng cam: `Chờ xác nhận` (`REQUESTED`)
       - Xanh dương: `Đã xác nhận` (`ACCEPTED`)
       - Tím: `Thợ đang tới` (`ON_THE_WAY`)
       - Xanh lá cây: `Hoàn thành` (`COMPLETED`)
       - Xám/Đỏ: `Đã hủy` (`CANCELLED`)
   - **Thân Thẻ:**
     * Thông tin Thợ / Studio: Avatar tròn, tên thợ, số điện thoại liên hệ.
     * Tên gói dịch vụ đã đặt & danh sách các bước mua thêm.
     * Thời gian hẹn: `📅 08:30 - Thứ Bảy, 26/09/2026`.
     * Địa chỉ thực hiện: `📍 142 Nguyễn Trãi, Thanh Xuân, Hà Nội`.
     * Tài chính: Đã cọc: `266.000 đ` / Tổng tiền: `887.000 đ`.
   - **Footer Thao Tác Ngữ Cảnh (Contextual Actions):**
     * Khi đơn ở trạng thái `REQUESTED` hoặc `ACCEPTED`:
       - Nút `[Hủy Lịch Hẹn]`: Mở Modal chọn lý do hủy (Thay đổi kế hoạch, tìm được thợ khác...).
     * Khi đơn ở trạng thái `ON_THE_WAY`:
       - Nút `[🗺️ Theo Dõi Vị Trí]`: Mở bản đồ xem định vị GPS trực tiếp của thợ.
       - Nút `[📞 Gọi Điện]`: Mở cuộc gọi trực tiếp tới số điện thoại của thợ.
     * Khi đơn ở trạng thái `COMPLETED`:
       - Nút `[⭐ Đánh Giá & Tip]`: Đánh giá số sao (1-5 sao), viết nhận xét và tip tiền cho thợ.
       - Nút `[🔁 Đặt Lại Gói Này]`: Điền nhanh lại thông tin gói vào màn hình đặt lịch mới.
4. **Kéo để làm mới (Pull-to-refresh) & Trạng thái trống (Empty State):**
   - Danh sách hỗ trợ Pull-to-refresh cập nhật trạng thái mới nhất từ server.
   - Khi chưa có đơn nào: Hiển thị hình minh họa lịch rỗng kèm nút `[Khám Phá Dịch Vụ Ngay]` điều hướng sang trang Explore.

### 5.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
├── app/
│   └── (tabs)/
│       └── bookings.tsx                      # Màn hình quản lý danh sách lịch hẹn của khách
├── components/booking/
│   ├── BookingTabSegment.tsx                 # Thanh chuyển đổi 2 Tab: Sắp Tới vs Lịch Sử
│   ├── BookingHistoryCard.tsx                # Thẻ hiển thị chi tiết 1 đơn hàng kèm nút hành động
│   ├── CancelBookingModal.tsx                # Modal chọn lý do & xác nhận hủy lịch hẹn
│   └── EmptyBookingState.tsx                 # Giao diện khi danh sách lịch hẹn trống
└── store/
    └── booking.store.ts                      # Zustand quản lý state danh sách đơn và polling
```

---

## 🚨 6. TÍNH NĂNG 4: RADAR TÌM THỢ KHẨN CẤP 30S (INSTANT BOOKING FLOW) (`APP-BOOK-04`)

### 6.1. Luồng Nghiệp Vụ & Animation Sóng Radar Realtime
1. **Mục đích sử dụng:**
   - Phục vụ khách hàng có nhu cầu trang điểm gấp trong vòng **30 - 60 phút** (Đi tiệc đột xuất, chụp ảnh gấp, hoặc bị thợ hẹn trước bùng ca).
2. **Kích hoạt Radar Khẩn Cấp:**
   - Khách hàng bấm vào Widget *"Cần Thợ Trang Điểm Gấp 30 Phút"* trên Trang Chủ (`src/app/index.tsx`).
   - Mở **Modal Tìm Thợ Khẩn Cấp (`InstantRadarModal.tsx`)**:
     * Chọn nhanh loại hình làm đẹp: *Đi Tiệc/Sự Kiện*, *Đi Làm/Hẹn Hò*, *Cô Dâu Khẩn Cấp*.
     * Xác nhận địa chỉ và tọa độ GPS hiện tại.
     * Hiển thị giá tạm tính tức thì (Đã bao gồm hệ số Surge nhu cầu khẩn cấp).
     * Bấm nút `[Phát Tín Hiệu Quét Thợ Ngay]`.
3. **Gửi Yêu Cầu Đến Backend:**
   - Ứng dụng gọi API `POST /api/v1/customer/bookings/instant`:
     ```json
     {
       "packageId": 12,
       "destinationAddress": "227 Nguyễn Văn Cừ, Quận 5, TP.HCM",
       "destinationLatitude": 10.762622,
       "destinationLongitude": 106.682338,
       "note": "Cần trang điểm tone Hàn nhẹ nhàng dự tiệc gấp"
     }
     ```
   - Backend quét các thợ rảnh trong bán kính 5km qua Redis GEO, tạo bản ghi đơn hàng ở trạng thái `REQUESTED`, và broadcast qua STOMP WebSocket tới tất cả thợ rảnh xung quanh.
4. **Giao Diện Đếm Ngược Radar 30 Giây (Live Sonar Animation):**
   - Modal chuyển sang giao diện toàn màn hình:
     * **Hiệu ứng sóng radar:** 3 vòng tròn sóng màu hồng tỏa rộng ra liên tục bằng `react-native-reanimated`.
     * **Đồng hồ đếm ngược:** Đếm lùi từ `30` về `0` giây.
     * **Phản hồi xúc giác:** Rung nhẹ haptic mỗi 5 giây (`selectionAsync`).
     * **Thống kê phát sóng:** *"Đang phát tín hiệu tới 8 thợ MUA đang rảnh xung quanh bạn..."*.
     * Nút `[Hủy Tìm Kiếm]`: Bấm vào gọi `POST /api/v1/customer/bookings/{bookingId}/cancel` để dừng phát sóng.
5. **Xử Lý Sự Kiện Nhận Ca Thành Công (Match Found):**
   - Thiết bị của khách hàng subscribe STOMP topic cá nhân: `/user/queue/instant-booking` hoặc lắng nghe cập nhật trạng thái đơn.
   - Khi có 1 thợ nhấn nhận ca thành công (Backend đã sử dụng Redisson Lock chống race-condition):
     * Đồng hồ đếm ngược dừng lại ngay lập tức.
     * Rung haptic mạnh thông báo (`notificationAsync(NotificationFeedbackType.Success)`).
     * Phát âm thanh chuông báo vui tươi.
     * Hiển thị Card Thợ Nhận Ca: Ảnh đại diện thợ, Tên thợ, Số điện thoại, Khoảng cách (VD: *Thợ Lan Anh cách bạn 1.2 km, dự kiến đến sau 8 phút*).
     * Tự động đóng Modal sau 2 giây và điều hướng sang **Màn hình Theo dõi trực tiếp GPS (Sprint M-5)**.
6. **Xử Lý Khi Hết 30 Giây Không Có Thợ Nhận (Timeout Fallback):**
   - Nếu sau 30 giây không có thợ nào nhận đơn:
     * Hiển thị thông báo thân thiện: *"Hiện các chuyên viên trang điểm quanh khu vực này đều đang bận ca"*.
     * Đưa ra 2 nút lựa chọn:
       - `[Quét Lại Bán Kính 10km]`: Tăng bán kính tìm kiếm.
       - `[Đặt Lịch Hẹn Trước]`: Chuyển sang form đặt lịch hẹn thông thường (`APP-BOOK-01`).

### 6.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
├── components/booking/
│   ├── InstantRadarModal.tsx                 # Modal toàn màn hình quét radar tìm thợ khẩn cấp
│   ├── RadarWavesAnimation.tsx               # Hiệu ứng sóng âm lan tỏa bằng Reanimated
│   ├── InstantCountdownTimer.tsx             # Đồng hồ đếm lùi 30 giây kèm âm thanh & haptic
│   └── ProviderMatchedCard.tsx               # Thẻ pop-up chúc mừng khi có thợ nhấn nhận ca
└── hooks/
    └── useInstantBookingRadar.ts             # Custom hook quản lý countdown, socket STOMP & hủy ca
```

---

## 📐 7. ĐẶC TẢ ZOD VALIDATION SCHEMAS (`src/schemas/`)

Mọi dữ liệu gửi lên Backend từ các form của Sprint M-2 đều phải vượt qua kiểm tra của Zod:

### 7.1. Schema Đặt Lịch Hẹn Thông Thường (`booking-create.schema.ts`)
```typescript
import { z } from 'zod';

export const createBookingSchema = z.object({
  packageId: z.number({ required_error: 'Vui lòng chọn gói dịch vụ cần đặt.' }),
  providerId: z.number({ required_error: 'Vui lòng chọn thợ hoặc studio trang điểm.' }),
  providerType: z.enum(['FREELANCER', 'AGENCY'], {
    required_error: 'Loại nhà cung cấp không hợp lệ.',
  }),
  bookingTime: z
    .string({ required_error: 'Vui lòng chọn thời gian hẹn làm đẹp.' })
    .refine((val) => new Date(val) > new Date(), {
      message: 'Thời gian hẹn phải ở thời điểm tương lai.',
    }),
  destinationAddress: z
    .string({ required_error: 'Vui lòng nhập địa chỉ trang điểm tận nơi.' })
    .min(5, 'Địa chỉ phải có ít nhất 5 ký tự.')
    .max(500, 'Địa chỉ không được vượt quá 500 ký tự.'),
  destinationLatitude: z
    .number({ required_error: 'Tọa độ vĩ độ không được để trống.' })
    .min(-90)
    .max(90),
  destinationLongitude: z
    .number({ required_error: 'Tọa độ kinh độ không được để trống.' })
    .min(-180)
    .max(180),
  addOnItemIds: z.array(z.number()).default([]),
  note: z.string().max(500, 'Ghi chú không được dài quá 500 ký tự.').optional(),
  voucherCode: z.string().optional(),
});

export type CreateBookingFormValues = z.infer<typeof createBookingSchema>;
```

### 7.2. Schema Báo Giá Động Hóa Đơn (`pricing-preview.schema.ts`)
```typescript
import { z } from 'zod';

export const previewInvoiceSchema = z.object({
  packageId: z.number(),
  providerId: z.number(),
  providerType: z.enum(['FREELANCER', 'AGENCY']),
  bookingTime: z.string(),
  customerLatitude: z.number().min(-90).max(90),
  customerLongitude: z.number().min(-180).max(180),
  addOnItemIds: z.array(z.number()).optional(),
  voucherCode: z.string().optional(),
});

export type PreviewInvoicePayload = z.infer<typeof previewInvoiceSchema>;
```

### 7.3. Schema Đơn Khẩn Cấp 30s (`instant-booking.schema.ts`)
```typescript
import { z } from 'zod';

export const createInstantBookingSchema = z.object({
  packageId: z.number().optional(),
  destinationAddress: z
    .string({ required_error: 'Vui lòng nhập địa chỉ đón thợ.' })
    .min(5, 'Địa chỉ quá ngắn.')
    .max(500, 'Địa chỉ không được vượt quá 500 ký tự.'),
  destinationLatitude: z.number().min(-90).max(90),
  destinationLongitude: z.number().min(-180).max(180),
  note: z.string().max(500).optional(),
});

export type CreateInstantBookingPayload = z.infer<typeof createInstantBookingSchema>;
```

---

## 🔌 8. TỔNG HỢP API CONTRACTS & DTO SPECIFICATION

| Tính Năng | Method | Endpoint Backend | Request Body / Query Params | Response DTO Chi Tiết |
| :--- | :---: | :--- | :--- | :--- |
| **Đo Khoảng Cách Bản Đồ (Goong Maps)** | `POST` | `/api/v1/pricing/calculate-distance` | `CalculateDistanceReq` (Tọa độ điểm đón & điểm đến) | `DistanceMatrixRes` (`distanceKm`, `durationMinutes`, `routingProvider: GOONG_MAPS`) |
| **Tính toán Báo giá Động** | `POST` | `/api/v1/pricing/preview-invoice` | `PreviewInvoiceReq` (Package, Addons, GPS, Time, Voucher) | `InvoicePreviewRes` (Breakdown tiền gói, addons, km di chuyển, surge, cọc Escrow) |
| **Tạo Đơn Khẩn Cấp 30s** | `POST` | `/api/v1/customer/bookings/instant` | `CreateInstantBookingReq` (Địa chỉ, Tọa độ GPS, Ghi chú) | `InstantBookingCreatedRes` (`bookingId`, `bookingCode`, `status: REQUESTED`, `searchTimeoutSeconds: 30`) |
| **Hủy Đơn Khẩn Cấp** | `POST` | `/api/v1/customer/bookings/{bookingId}/cancel` | Path: `bookingId` | `ApiResponse<Void>` |
| **Lấy Danh Sách Đơn Khách** | `GET` | `/api/v1/customer/bookings` | `page=0&size=20&statusGroup=UPCOMING` | `List<CustomerBookingSummaryRes>` (Mã đơn, thợ, dịch vụ, ngày giờ, trạng thái) |
| **Xem Chi Tiết 1 Đơn Hàng** | `GET` | `/api/v1/bookings/{bookingId}/status` | Path: `bookingId` | `BookingStatusDetailRes` (Trạng thái hiện tại, ảnh nghiệm thu, thông tin thợ) |
| **Xem Lịch Sử Tiến Trình** | `GET` | `/api/v1/bookings/{bookingId}/history` | Path: `bookingId` | `BookingHistoryRes` (Dòng thời gian các bước chuyển trạng thái) |
| **Theo Dõi Vị Trí Thợ (Live Tracking)** | `GET` | `/api/v1/telemetry/bookings/{id}/track` | Path: `id` (bookingId) | `LiveTrackingRes` (`currentLat`, `currentLng`, `speed`, `heading`, `etaMinutes`, `distanceRemainingMeters`) |
| **Chuyển Trạng Thái / Hủy** | `POST` | `/api/v1/bookings/{bookingId}/transition` | `TransitionBookingStateReq` (`targetStatus: CANCELLED`, `reasonText`) | `BookingStateTransitionRes` |

---

## 💎 9. BẢNG CHECKLIST NGHIỆM THU TÍNH NĂNG (ACCEPTANCE CRITERIA - AC)

| Mã Issue | Tiêu Chí Nghiệm Thu (Definition of Done) |
| :--- | :--- |
| **APP-BOOK-01** | ✅ Khách hàng chọn ngày và giờ hẹn mượt mà, tự động cảnh báo nếu chọn khung giờ sáng sớm.<br>✅ Tích chọn mua thêm các bước làm đẹp (Add-on Items) tự động cập nhật tổng tiền tương ứng.<br>✅ Lấy được tọa độ GPS hiện tại của thiết bị qua `expo-location` và tự động điền địa chỉ.<br>✅ Form validate 100% bằng Zod, nếu backend trả `ERR_VALIDATION` thì map viền đỏ vào đúng ô nhập liệu. |
| **APP-BOOK-02** | ✅ Gọi API Dynamic Pricing Engine bóc tách minh bạch từng khoản chi phí (Gói gốc, Addons, Km di chuyển, Surge giờ cao điểm).<br>✅ Hiển thị rõ số tiền cọc Escrow giữ chỗ (VD: 30%) và số tiền còn lại phải thanh toán sau khi hoàn tất.<br>✅ Nhập mã Voucher hợp lệ thì giảm giá trừ trực tiếp vào hóa đơn; nếu mã sai hiển thị thông báo lỗi rõ ràng. |
| **APP-BOOK-03** | ✅ Phân chia rõ ràng 2 tab: *Sắp tới* (Upcoming) và *Lịch sử* (History) với số lượng badge tương ứng.<br>✅ Thẻ đơn hàng hiển thị đầy đủ avatar thợ, mã đơn, ngày giờ hẹn, tổng tiền và thẻ trạng thái chuẩn màu.<br>✅ Khi đơn ở trạng thái `ON_THE_WAY`, hiển thị nút gọi điện thoại và nút mở bản đồ vị trí thợ.<br>✅ Hỗ trợ hủy đơn có modal nhập lý do hủy; danh sách hỗ trợ Pull-to-refresh mượt mà. |
| **APP-BOOK-04** | ✅ Modal Radar quét sóng phát hiệu ứng tỏa tròn mượt mà bằng `react-native-reanimated` (60fps).<br>✅ Đồng hồ đếm lùi 30 giây thời gian thực, có rung haptic chu kỳ.<br>✅ Bắt sự kiện có thợ nhận đơn qua STOMP WebSocket tức thời, rung haptic và chúc mừng pop-up.<br>✅ Khi hết 30s không có thợ nhận, hiển thị giao diện fallback cho phép quét lại hoặc chuyển sang đặt lịch hẹn. |
