# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## SPRINT M-1: KHÁM PHÁ DỊCH VỤ & HỒ SƠ CHI TIẾT THỢ MUA (ROLE_CUSTOMER)
### (React Native 0.86 + Expo SDK 57 + Expo Router + TypeScript + Spring Boot 3.3 Core API - Port 8080)

---

## 📌 1. TỔNG QUAN SPRINT & PHẠM VI NGHIỆP VỤ (SPRINT OVERVIEW)

* **Tên Sprint:** `Sprint M-1 - Customer Beauty Discovery & MUA Service Portfolio`
* **Mục Tiêu Sprint:**  
  Cung cấp trải nghiệm tìm kiếm, duyệt danh mục dịch vụ làm đẹp, xem chi tiết tay nghề và các bộ sưu tập tác phẩm thực tế của thợ MUA xung quanh vị trí khách hàng, kết nối trực tiếp ảnh mẫu với từng dịch vụ cụ thể.
* **Đối Tượng Phục Vụ (Target Persona):**
  * Duy nhất: **Khách Hàng (`ROLE_CUSTOMER`)**.
  * *Lưu ý:* Tài khoản `ROLE_SUPER_ADMIN` và `ROLE_AGENCY_ADMIN` bị chặn đăng nhập trên ứng dụng di động theo chính sách kiến trúc và được điều hướng sang Web Management Portal.
* **Mã Danh Mục Công Việc Sprint M-1:**
  1. `APP-CUST-01`: **User Story** - Màn hình Khám Phá & Bộ Lọc Đa Tiêu Chí (GPS, Danh mục, Phong cách, Khoảng giá).
  2. `APP-CUST-02`: **User Story** - Màn hình Chi Tiết Hồ Sơ Thợ MUA & Dịch Vụ Đi Kèm Ảnh Mẫu Thực Tế.
  3. `APP-CUST-03`: **Task** - Trình Xem Ảnh Mẫu Cận Cảnh Của Dịch Vụ Đang Chọn (Full-Screen Lightbox & Pinch-to-Zoom).
  4. `APP-CUST-04`: **User Story** - Màn hình Cập Nhật Hồ Sơ Cá Nhân Khách Hàng & Địa Chỉ Quen Thuộc.

---

### 🌟 CÁC NGUYÊN TẮC THIẾT KẾ & NGHIỆP VỤ BẮT BUỘC (ARCHITECTURAL CONSTRAINTS)

1. **QUY TẮC ẢNH MẪU DỊCH VỤ (NO BEFORE/AFTER - STRICT PER-SERVICE SHOWCASE):**
   * **Tuyệt đối KHÔNG sử dụng định dạng so sánh Trước/Sau (No Before/After Slider):** Trải nghiệm khách hàng tập trung vào tác phẩm hoàn thiện đạt độ thẩm mỹ cao nhất (Glamour / High-Fashion Look).
   * **Ảnh mẫu đi liền với từng Gói Dịch Vụ (`package_id`):** Ảnh mẫu trong bảng `catalog_schema.portfolio_showcases` được liên kết trực tiếp với từng gói (`service_packages.id`). Khi khách hàng bấm chọn một gói dịch vụ (Ví dụ: *"Trang Điểm Cô Dâu Ngày Cưới"*), hệ thống lập tức hiển thị giá niêm yết, thời lượng làm, các bước chi tiết (`package_items`) cùng **Bộ sưu tập các hình ảnh tác phẩm thực tế thợ đã thực hiện riêng cho gói dịch vụ đó**. Khách hàng chuyển sang gói khác (Ví dụ: *"Trang Điểm Tiệc Đêm Douyin"*), danh sách ảnh mẫu sẽ lập tức chuyển sang ảnh của gói mới.
2. **TRÌNH XEM ẢNH CẬN CẢNH (ZOOM CỰC ĐẠI):**
   * Cho phép khách hàng mở Modal xem ảnh toàn màn hình với cử chỉ Pinch-to-zoom 2 ngón tay mượt mà để soi cận cảnh các chi tiết kỹ thuật: lớp nền (skin texture/foundation), đường kẻ mắt (eyeliner), phối màu mắt, tạo khối (contouring) và kiểu tóc đi kèm.
3. **CHUẨN XỬ LÝ LỖI PHÍA CLIENT (STRICT CLIENT ERROR HANDLING):**
   * Mọi thao tác form đều bọc qua tiện ích `parseApiError(err)`. Khi xảy ra lỗi validation từ Spring Boot (`ERR_VALIDATION`), cấm hiển thị câu thông báo chung chung mà bắt buộc trích xuất danh sách lỗi từng trường trong `err.response.data.data` và map trực tiếp thành viền đỏ/dòng cảnh báo đỏ ngay dưới chân input.
4. **DESIGN SYSTEM TOKENS:**
   * **Primary Color:** Rose Ruby (`#E11D48`).
   * **Background:** Light Background (`#F8FAFC`), Pure White Card (`#FFFFFF`).
   * **Text:** Deep Slate (`#0F172A`), Muted Text (`#64748B`).
   * **Spacing & Corner:** Rounded-2xl (`16px`), Border hairline (`#E2E8F0`).

---

## 🏗️ 2. CẤU TRÚC MÃ NGUỒN FRONTEND MOBILE & ÁNH XẠ BACKEND

### 2.1. Cấu Trúc Thư Mục Ứng Dụng (`code/app/src/`)

```text
code/app/src/
├── app/
│   ├── (tabs)/
│   │   ├── explore.tsx                        # [APP-CUST-01] Màn hình Khám phá chính (Search, Filter, List)
│   │   └── profile/
│   │       ├── index.tsx                      # Xem tổng quan trang cá nhân
│   │       ├── edit.tsx                       # [APP-CUST-04] Cập nhật thông tin cá nhân cơ bản (Dùng chung cho cả 3 Role)
│   │       ├── mua-profile.tsx                # Hồ sơ nghề nghiệp Thợ MUA riêng biệt (Bio, Kinh nghiệm, Bán kính, Chứng chỉ)
│   │       └── staff-profile.tsx              # Hồ sơ nhân sự Studio riêng biệt cho Agency Staff (Hoa hồng, Studio, Ca làm)
│   └── mua-detail/
│       └── [id].tsx                           # [APP-CUST-02] Màn hình Hồ sơ Thợ MUA & dịch vụ kèm ảnh
│
├── components/
│   └── customer/
│       ├── CategoryFilterBar.tsx              # Thanh cuộn ngang chọn Danh mục gốc & Phong cách
│       ├── ServicePackageCard.tsx             # Thẻ hiển thị gói dịch vụ nổi bật ở màn Khám Phá
│       ├── MuaProfileHeader.tsx               # Header Cover, Avatar, Sao ⭐, Huy hiệu, Số đơn
│       ├── PackageSelectorList.tsx            # Danh sách chọn gói dịch vụ (Bridal, Party, Prom...)
│       ├── ServiceSampleGallery.tsx           # Grid ảnh mẫu thực tế ứng với dịch vụ đang được chọn
│       ├── ShowcaseGalleryModal.tsx           # [APP-CUST-03] Modal xem ảnh toàn màn hình (Swipeable)
│       ├── PhotoZoomViewer.tsx                # [APP-CUST-03] Component Pinch-to-zoom soi lớp nền/chi tiết
│       └── SavedAddressModal.tsx              # [APP-CUST-04] Modal quản lý danh sách địa chỉ ghim bản đồ
│
├── store/
│   ├── explore.store.ts                       # State tìm kiếm, lọc GPS, phân trang Infinite Scroll
│   └── mua-detail.store.ts                    # State profile thợ, gói đang chọn, ảnh mẫu theo gói
│
├── services/
│   ├── taxonomy.service.ts                    # Gọi /api/v1/master-categories, /api/v1/makeup-styles
│   ├── package.service.ts                     # Gọi /api/v1/packages, /api/v1/packages/{id}
│   ├── mua-profile.service.ts                 # Gọi /api/v1/muas/{id}/profile, /api/v1/muas/{id}/portfolios, /api/v1/muas/my-profile
│   ├── staff-profile.service.ts               # Gọi /api/v1/agencies/staff/me
│   └── customer-profile.service.ts            # Gọi /api/v1/users/profile, /api/v1/users/avatar
│
└── schemas/
    ├── customer-profile.schema.ts             # Zod validation thông tin cá nhân người dùng
    └── explore-filter.schema.ts               # Zod validation tham số tìm kiếm, bán kính GPS
```

### 2.2. Ánh Xạ Endpoint Backend (`core-api:8080`)

| Mã Issue | Endpoint Backend | HTTP | Phân Quyền | Chức Năng |
| :--- | :--- | :---: | :---: | :--- |
| **APP-CUST-01** | `/api/v1/master-categories` | GET | `PermitAll` | Lấy danh mục gốc (Cô dâu, Dự tiệc, Kỷ yếu, Đi chơi) |
| **APP-CUST-01** | `/api/v1/makeup-styles` | GET | `PermitAll` | Lấy danh sách phong cách trang điểm (Douyin, Hàn Quốc, Tây Âu, Cổ điển) |
| **APP-CUST-01** | `/api/v1/packages` | GET | `PermitAll` | Tìm kiếm & lọc gói dịch vụ (hỗ trợ categoryId, muaId, pricing, pagination) |
| **APP-CUST-02** | `/api/v1/muas/{muaId}/profile` | GET | `PermitAll` | Lấy thông tin công khai thợ (Avatar, bio, rating, totalCompletedBookings, badges) |
| **APP-CUST-02** | `/api/v1/packages?muaId={muaId}` | GET | `PermitAll` | Lấy danh sách toàn bộ các gói dịch vụ của thợ MUA đó |
| **APP-CUST-02** | `/api/v1/packages/{id}` | GET | `PermitAll` | Lấy chi tiết gói (các bước thực hiện `package_items`, thời lượng `durationMinutes`) |
| **APP-CUST-02** | `/api/v1/muas/{muaId}/portfolios?package_id={id}` | GET | `PermitAll` | Lấy danh sách ảnh mẫu tác phẩm đã hoàn thành tương ứng riêng cho gói đó |
| **APP-CUST-03** | `/api/v1/muas/{muaId}/portfolios` | GET | `PermitAll` | Chi tiết album ảnh chất lượng cao kèm các góc chụp chi tiết |
| **APP-CUST-04** | `/api/v1/users/profile` | PUT | `Authenticated` | Cập nhật thông tin cá nhân cơ bản (Họ tên, email, giới tính) cho cả 3 Role |
| **APP-CUST-04** | `/api/v1/users/avatar` | POST | `Authenticated` | Upload ảnh đại diện cá nhân Cloudinary dùng chung mọi Role |
| **APP-MUA-PROF** | `/api/v1/muas/my-profile` | GET / PUT | `ROLE_FREELANCE_MUA` | Xem & cập nhật hồ sơ nghề nghiệp chuyên môn (Bio, kinh nghiệm, bán kính làm việc) |
| **APP-MUA-PROF** | `/api/v1/muas/my-profile/certificates` | POST | `ROLE_FREELANCE_MUA` | Tải lên bằng cấp, chứng chỉ nghề nghiệp cho thợ MUA |
| **APP-STAFF-PROF** | `/api/v1/agencies/staff/me` | GET | `ROLE_AGENCY_STAFF` | Xem hồ sơ nhân sự Studio, hợp đồng hoa hồng thỏa thuận & phong cách phụ trách |

---

## 📋 3. DANH SÁCH USER STORIES & TIÊU CHÍ BDD CHI TIẾT

---

### 🔷 APP-CUST-01: Màn Hình Khám Phá & Bộ Lọc Đa Tiêu Chí
> **As a** Khách hàng cần tìm thợ trang điểm cho sự kiện sắp tới,  
> **I want** tìm kiếm theo tên dịch vụ, phong cách, chọn lọc theo bán kính GPS (1km, 3km, 5km, 10km) và khoảng giá với phân trang cuộn vô tận,  
> **So that** tôi nhanh chóng tìm được gói dịch vụ làm đẹp ưng ý nhất ở gần vị trí của mình mà không mất nhiều công sức.

#### **Giao Diện & Thành Phần (UI/UX Breakdown):**
1. **Search Header Bar:**
   * Ô tìm kiếm với placeholder mềm: *"Tìm phong cách make-up, thợ trang điểm..."*
   * Nút bấm biểu tượng Bộ lọc (Filter Icon) mở Filter Bottom Sheet.
2. **Thanh Cuộn Phân Loại 2 Tầng (`CategoryFilterBar`):**
   * **Tầng 1 (Danh mục gốc):** Tất cả, Cô Dâu, Dự Tiệc, Kỷ Yếu, Chụp Ảnh Concept, Hóa Trang.
   * **Tầng 2 (Phong cách xu hướng):** Tự Nhiên Hàn Quốc, Douyin Sắc Sảo, Tone Tây Nude, Cổ Điển Vintage.
3. **Filter Modal / Bottom Sheet:**
   * **Khoảng cách GPS:** Lựa chọn chip bán kính: `1 km`, `3 km`, `5 km`, `10 km`, `Toàn thành phố`.
   * **Khoảng giá (Price Slider):** Từ `200.000 VNĐ` đến `5.000.000+ VNĐ`.
   * **Đánh giá tối thiểu:** 4.0★, 4.5★, 4.8★ trở lên.
4. **Danh Sách Gói Dịch Vụ Cuộn Vô Tận (`ServicePackageCard`):**
   * Thẻ Card kích thước lớn: Ảnh đại diện gói sắc nét tỉ lệ 16:9.
   * Huy hiệu phong cách trang điểm (Ví dụ: `Douyin Look`, `Tone Cam Đào`).
   * Tên gói dịch vụ, Tên thợ/Studio kèm Avatar tròn nhỏ.
   * Đánh giá sao vàng (⭐ 4.98 • 120 đơn) và khoảng cách GPS tương đối (Ví dụ: `1.2 km`).
   * Giá tiền niêm yết in đậm màu Rose Ruby `#E11D48`.
   * Hỗ trợ Skeleton Card loading shimmer khi tải trang.

#### **Tiêu chí Nghiệm thu BDD (Acceptance Criteria):**

* **Scenario 01: Tải danh sách mặc định dựa trên vị trí GPS hiện tại**
  * **Given** Khách hàng đã cấp quyền truy cập vị trí thiết bị (`latitude: 10.7769, longitude: 106.7009`).
  * **When** Khách hàng mở tab `src/app/explore.tsx`.
  * **Then** Ứng dụng gọi song song `GET /api/v1/master-categories`, `GET /api/v1/makeup-styles` và `GET /api/v1/packages?availableOnly=true&page=0&size=10`.
  * **And** Giao diện hiển thị danh sách các gói dịch vụ gần nhất trong bán kính mặc định 5km, sắp xếp theo khoảng cách tăng dần.

* **Scenario 02: Lọc kết hợp Danh mục và Phong cách makeup**
  * **Given** Danh sách gói đang hiển thị.
  * **When** Khách hàng bấm chọn danh mục *"Cô Dâu"* và chọn phong cách *"Tự Nhiên Hàn Quốc"*.
  * **Then** Danh sách gói dịch vụ tự động reload mượt mà và chỉ hiển thị các gói thuộc danh mục Cô Dâu có gắn tag phong cách Hàn Quốc.
  * **And** Nếu không có kết quả phù hợp, hiển thị Empty State minh họa dễ thương với nút *"Đặt lại bộ lọc"*.

* **Scenario 03: Cuộn vô hạn tải thêm dữ liệu (Infinite Scroll)**
  * **Given** Khách hàng cuộn đến 80% chiều cao của danh sách gói dịch vụ.
  * **When** Trang hiện tại còn trang kế tiếp (`currentPage < totalPages - 1`).
  * **Then** Danh sách hiển thị `ActivityIndicator` ở chân trang (Footer Loader), tự động gọi API trang `page = currentPage + 1` và nối tiếp dữ liệu vào danh sách mà không gây giật lag giao diện.

---

### 🔷 APP-CUST-02: Màn Hình Chi Tiết Hồ Sơ Thợ MUA & Dịch Vụ Đi Kèm Ảnh Mẫu
> **As a** Khách hàng đang tham khảo tay nghề của một thợ MUA,  
> **I want** xem toàn bộ hồ sơ thợ, đánh giá uy tín và khi bấm vào từng gói dịch vụ cụ thể thì màn hình hiển thị chi tiết giá, thời lượng kèm các ảnh chụp mẫu thực tế của chính dịch vụ đó,  
> **So that** tôi thấy rõ thành quả trang điểm thực tế của gói trước khi quyết định bấm nút "Đặt Lịch Gói Này".

#### **Giao Diện & Thành Phần (UI/UX Breakdown):**
1. **Header Cover & MUA Bio (`MuaProfileHeader`):**
   * Ảnh bìa Cover nghệ thuật làm mờ nhẹ (Gradient overlay).
   * Avatar tròn 80px có viền mạ vàng / hồng, kèm Huy hiệu xác thực (Verified Pro MUA Badge).
   * Họ tên thợ nghệ danh, Số năm kinh nghiệm (VD: *"5 năm trong nghề"*).
   * Thống kê uy tín: Điểm Rating ⭐ 4.95 (142 đánh giá), Tỷ lệ hoàn thành ca 99.2%, Khoảng cách đến khách (VD: `2.4 km`).
   * Tiểu sử ngắn (Bio), Phong cách sở trường (Chips: Nude Tây, Cô Dâu Hoàng Gia, Tone Thái).
2. **Bộ Chọn Gói Dịch Vụ Nằm Ngang / Dọc (`PackageSelectorList`):**
   * Hiển thị danh sách các gói mà thợ cung cấp (VD: *Make Cô Dâu Ăn Hỏi*, *Make Tiệc Đêm Douyin*, *Make Kỷ Yếu Tự Nhiên*).
   * Gói đang được chọn có viền nổi bật Rose Ruby `#E11D48`, nền hồng nhạt `#FFF1F2`, hiển thị:
     * Tên gói dịch vụ.
     * Giá tiền niêm yết (VD: `850.000 VNĐ`).
     * Thời lượng ước tính (VD: `75 phút`).
     * Các bước chi tiết trong gói (Dưỡng ẩm chuyên sâu, Đánh nền che khuyết điểm, Tạo kiểu tóc cô dâu...).
3. **Bộ Sưu Tập Ảnh Mẫu Thực Tế Của Gói Đang Chọn (`ServiceSampleGallery`):**
   * **Cơ chế hoạt động:** Khi người dùng đổi sang gói khác, danh sách ảnh tự động chuyển sang các bức ảnh thuộc `portfolio_showcases` có `package_id` tương ứng với gói đó.
   * Lưới ảnh 2 cột (Masonry / Grid 2x2) hiển thị các bức ảnh mẫu hoàn thiện xuất sắc nhất.
   * Mỗi ảnh có tag nhỏ ở góc (VD: *"Lớp nền căng bóng"*, *"Màu mắt tone cam cháy"*, *"Tạo khối V-line"*).
   * Bấm vào bất kỳ ảnh nào sẽ kích hoạt mở Trình Xem Toàn Màn Hình (`APP-CUST-03`).
4. **Thanh Điều Hướng Đặt Lịch Cố Định Dưới Đáy (Sticky Bottom Bar):**
   * Bên trái: Tổng giá gói đang chọn (`850.000 đ`).
   * Bên phải: Nút bấm lớn màu Rose Ruby *"Đặt Lịch Gói Này"* với hiệu ứng haptic khi chạm, điều hướng sang luồng chọn ngày giờ đặt lịch (`booking-flow`).

#### **Tiêu chí Nghiệm thu BDD (Acceptance Criteria):**

* **Scenario 01: Xem chi tiết thợ và hiển thị gói dịch vụ đầu tiên mặc định**
  * **Given** Khách hàng bấm vào card của Thợ Mai Anh từ màn hình Khám Phá (`muaId = 88`).
  * **When** Màn hình `src/app/mua-detail/[id].tsx` khởi tạo.
  * **Then** Hệ thống gọi API `GET /api/v1/muas/88/profile` và `GET /api/v1/packages?muaId=88`.
  * **And** Gói dịch vụ đầu tiên trong danh sách được chọn mặc định.
  * **And** Hệ thống tự động fetch `GET /api/v1/muas/88/portfolios?package_id={packageId}` và render bộ sưu tập ảnh mẫu của gói đó vào `ServiceSampleGallery`.

* **Scenario 02: Khách chuyển đổi giữa các gói dịch vụ khác nhau**
  * **Given** Khách đang xem ảnh mẫu của gói *"Make Tiệc Đêm"*.
  * **When** Khách chạm vào tab gói *"Make Cô Dâu Đãi Tiệc"* (`package_id = 105`).
  * **Then** Thẻ gói đổi trạng thái Active viền màu Rose Ruby.
  * **And** Khung hiển thị giá và thời lượng cập nhật ngay sang `1.500.000 đ • 120 phút`.
  * **And** Lưới ảnh `ServiceSampleGallery` chuyển mượt mà (Fade transition) sang danh sách các bức ảnh cô dâu thực tế thuộc gói 105.
  * **And** Nếu gói này thợ chưa upload ảnh mẫu nào, hiển thị ảnh bìa mặc định của gói kèm thông báo: *"Thợ chưa tải lên ảnh mẫu riêng cho gói này"*.

* **Scenario 03: Khách bấm nút "Đặt Lịch Gói Này"**
  * **Given** Khách đang chọn gói dịch vụ có ID `105`.
  * **When** Khách bấm nút *"Đặt Lịch Gói Này"*.
  * **Then** Ứng dụng phát một xung rung nhẹ (Light Haptic) và chuyển màn hình sang `src/app/booking/select-time.tsx` kèm theo param `{ muaId: 88, packageId: 105 }`.

---

### 🔷 APP-CUST-03: Trình Xem Ảnh Mẫu Cận Cảnh Của Dịch Vụ Đang Chọn
> **As a** Khách hàng muốn kiểm tra kỹ thuật đánh nền và phối màu của thợ,  
> **I want** xem ảnh mẫu ở chế độ toàn màn hình và có thể dùng hai ngón tay phóng to thu nhỏ (Pinch-to-zoom) cận cảnh từng chi tiết khuôn mặt,  
> **So that** tôi hoàn toàn an tâm về tay nghề xử lý nền, kẻ mắt, chuốt mi của thợ trước khi đặt lịch.

#### **Giao Diện & Thành Phần (UI/UX Breakdown):**
1. **Modal Xem Toàn Màn Hình (`ShowcaseGalleryModal`):**
   * Nền đen sâu chuẩn Studio `#000000` với độ mờ nền 95%.
   * Nút Đóng (X) và bộ đếm ảnh (`3 / 8`) ở góc trên với Safe Area Padding.
   * Nút Chia sẻ hoặc Lưu ảnh tiện dụng.
2. **Trình Phóng To Thu Nhỏ Đa Điểm (`PhotoZoomViewer`):**
   * Sử dụng `react-native-gesture-handler` kết hợp `react-native-reanimated`.
   * **Pinch-to-zoom:** Phóng to ảnh từ 1.0x lên tới 4.0x mà không bị vỡ hạt (render ảnh phân giải gốc).
   * **Double Tap to Zoom:** Chạm đúp 2 lần liên tiếp để zoom nhanh vào vị trí chạm ở mức 2.5x, chạm đúp lần nữa để trả về 1.0x.
   * **Pan/Drag:** Khi đang ở trạng thái zoom > 1.0x, cho phép rê kéo ngón tay để soi cận cảnh:
     * Lớp nền da (kiểm tra độ tệp da, không mốc phấn/cakey).
     * Chi tiết mắt (đường eyeliner, phối màu nhũ, mi gắn tự nhiên).
     * Kỹ thuật tạo khối sóng mũi và gò má.
     * Kiểu tóc tạo nếp kèm phụ kiện đính đá.
3. **Mô Tả & Ghi Chú Kỹ Thuật (Caption Sheet):**
   * Vuốt từ dưới lên để đọc ghi chú của thợ về bức ảnh: Dòng mỹ phẩm sử dụng (Dior, MAC, NARS), thời điểm thực hiện, phong cách ứng dụng.

#### **Tiêu chí Nghiệm thu BDD (Acceptance Criteria):**

* **Scenario 01: Mở ảnh xem toàn màn hình từ lưới ảnh dịch vụ**
  * **Given** Khách hàng đang ở màn hình chi tiết thợ MUA và nhìn thấy ảnh mẫu vị trí số 2 trong bộ sưu tập.
  * **When** Khách hàng chạm vào bức ảnh số 2.
  * **Then** Modal `ShowcaseGalleryModal` trượt lên êm ái, hiển thị ảnh kích thước lớn toàn màn hình.
  * **And** Thanh chỉ số góc trên hiển thị chính xác `2 / [Tổng số ảnh của gói]`.

* **Scenario 02: Phóng to xem chi tiết lớp trang điểm và trả về bình thường**
  * **Given** Ảnh đang mở ở tỷ lệ gốc `scale = 1.0`.
  * **When** Khách hàng dùng 2 ngón tay kéo dãn (Pinch gesture) hoặc chạm đúp 2 lần vào vùng mắt người mẫu.
  * **Then** Bức ảnh phóng to mượt mà lên `scale = 2.5` căn giữa đúng tọa độ ngón tay chạm.
  * **And** Khi khách thả tay hoặc chụm 2 ngón tay lại (Pinch in), ảnh đàn hồi (Spring animation) quay về tỷ lệ hiển thị đầy đủ ban đầu.

* **Scenario 03: Vuốt ngang chuyển giữa các ảnh trong album của gói**
  * **Given** Ảnh đang ở tỷ lệ chuẩn `scale = 1.0`.
  * **When** Khách hàng vuốt ngang sang trái (Swipe Left).
  * **Then** Trình xem chuyển sang bức ảnh mẫu kế tiếp của gói dịch vụ đó, chỉ số ảnh cập nhật lên `3 / [Tổng số ảnh]`.

---

### 🔷 APP-CUST-04: Màn Hình Cập Nhật Hồ Sơ Cá Nhân Khách Hàng
> **As a** Khách hàng sử dụng dịch vụ trang điểm tận nơi,  
> **I want** cập nhật họ tên, ảnh đại diện và lưu danh sách các địa chỉ trang điểm quen thuộc (nhà riêng, công ty, studio chụp ảnh) có ghim vị trí GPS,  
> **So that** thợ MUA có thể nắm thông tin liên hệ chính xác và định vị đường đi đến địa điểm của tôi mà không bị lạc.

#### **Giao Diện & Thành Phần (UI/UX Breakdown):**
1. **Header & Đổi Avatar (`src/app/profile/edit.tsx`):**
   * Avatar tròn lớn 100px ở trung tâm với nút biểu tượng Máy ảnh nhỏ ở góc dưới.
   * Khi chạm vào biểu tượng Máy ảnh: Mở ActionSheet cho phép chọn *"Chụp ảnh mới"* hoặc *"Chọn ảnh từ thư viện"* (Sử dụng `expo-image-picker`).
2. **Form Thông Tin Cá Nhân (Form Controls):**
   * **Họ và tên:** Input có kiểm tra độ dài 2 - 50 ký tự.
   * **Số điện thoại:** Đã định dạng và liên kết với tài khoản.
   * **Giới tính:** Bộ chọn Segmented (Nữ, Nam, Khác).
   * **Ngày sinh:** Date Picker thân thiện.
3. **Danh Sách Địa Chỉ Quen Thuộc (`SavedAddressModal`):**
   * Hiển thị danh sách địa chỉ đã lưu kèm icon phân loại: 🏠 *Nhà riêng*, 🏢 *Công ty*, 📸 *Studio quen thuộc*.
   * Đánh dấu rõ một địa chỉ là **Mặc Định (Default Address)**.
   * Nút *"Thêm địa chỉ mới"*: Cho phép gõ tìm kiếm địa chỉ đường phố, tự động lấy tọa độ Lat/Long qua Geocoding hoặc chọn trực tiếp bằng cách ghim trên bản đồ.
4. **Nút Lưu Thay Đổi:**
   * Nút Rose Ruby cố định đáy màn hình: Có trạng thái Loading khi gọi API và tự động đồng bộ lại `authStore`.

#### **Tiêu chí Nghiệm thu BDD (Acceptance Criteria):**

* **Scenario 01: Cập nhật thành công thông tin hồ sơ và ảnh đại diện**
  * **Given** Khách hàng mở màn hình `src/app/profile/edit.tsx`.
  * **When** Khách hàng thay đổi Họ tên thành *"Nguyễn Thu Hà"* và chọn một bức ảnh chân dung mới từ thư viện ảnh.
  * **And** Khách hàng bấm nút *"Lưu Thay Đổi"*.
  * **Then** Ứng dụng gọi API `PUT /api/v1/customer/profile` với payload hợp lệ.
  * **And** Backend cập nhật bảng `auth_schema.users`, trả về `200 OK` kèm `UserInfoRes`.
  * **And** Ứng dụng hiển thị Toast xanh *"Cập nhật hồ sơ thành công"*, đồng thời cập nhật tức thì dữ liệu trong `useAuthStore` mà không cần đăng nhập lại.

* **Scenario 02: Bắt lỗi validation khi nhập sai định dạng theo chuẩn Client**
  * **Given** Khách hàng đang ở form sửa thông tin cá nhân.
  * **When** Khách hàng xóa trắng ô Họ và tên hoặc nhập ký tự đặc biệt không hợp lệ rồi bấm Lưu.
  * **Then** Client kích hoạt Zod Schema validation ngay tại chỗ.
  * **And** Ô input Họ và tên chuyển viền đỏ kèm dòng chữ thông báo lỗi màu đỏ: *"Họ và tên không được để trống và tối thiểu 2 ký tự"*.
  * **And** Không có request HTTP nào bị gửi vô ích lên Backend.

* **Scenario 03: Thêm địa chỉ trang điểm quen thuộc ghim vị trí**
  * **Given** Khách mở modal `SavedAddressModal.tsx` và bấm *"Thêm địa chỉ mới"*.
  * **When** Khách nhập tên gợi nhớ *"Chung cư Landmark 81"*, địa chỉ chi tiết *"P.2204 Tòa L3, 720A Điện Biên Phủ, P.22, Bình Thạnh"*, và chọn tọa độ vị trí tương ứng.
  * **Then** Địa chỉ mới xuất hiện trong danh sách lựa chọn địa chỉ của khách hàng.
  * **And** Khi đặt lịch ở các bước tiếp theo, hệ thống tự động gợi ý địa chỉ này vào ô địa điểm phục vụ.

---

## 🔌 4. HỢP ĐỒNG API & ĐẶC TẢ DỮ LIỆU CHI TIẾT (API CONTRACT MATRIX)

### 4.1. Lấy Danh Sách Gói Dịch Vụ Khám Phá (`APP-CUST-01`)
* **Endpoint:** `GET /api/v1/packages`
* **Query Parameters:**
  * `categoryId` *(Integer, Optional)*: Lọc theo danh mục gốc (Cô dâu, Dự tiệc...).
  * `availableOnly` *(Boolean, Optional, default: true)*: Chỉ lấy gói đang hoạt động.
  * `page` *(Integer, default: 0)*: Số trang.
  * `size` *(Integer, default: 10)*: Số phần tử mỗi trang.
* **Response Thành Công (HTTP 200):**
```json
{
  "success": true,
  "message": "catalog.packages_list_success",
  "data": [
    {
      "id": 105,
      "agencyId": null,
      "agencyName": null,
      "packageName": "Trang Điểm Cô Dâu Đãi Tiệc Sang Trọng",
      "coverImageUrl": "https://cdn.makeup.com/packages/bridal_luxury_105.jpg",
      "basePrice": 1500000.0,
      "durationMinutes": 120,
      "isAvailable": true,
      "itemsCount": 4,
      "styles": [
        { "id": 3, "styleName": "Tone Cam Tây", "category": "Dự tiệc" },
        { "id": 7, "styleName": "Tự Nhiên Hàn Quốc", "category": "Cô dâu" }
      ]
    }
  ],
  "errorCode": null,
  "timestamp": "2026-09-18T16:45:00.000Z"
}
```

---

### 4.2. Lấy Thông Tin Công Khai & Hồ Sơ Thợ MUA (`APP-CUST-02`)
* **Endpoint:** `GET /api/v1/muas/{muaId}/profile`
* **Path Variable:** `muaId` *(Long)* - ID hồ sơ thợ MUA.
* **Response Thành Công (HTTP 200):**
```json
{
  "success": true,
  "message": "mua.profile_get_success",
  "data": {
    "id": 88,
    "userId": 120,
    "fullName": "Lê Hoàng Mai Anh",
    "avatarUrl": "https://cdn.makeup.com/avatars/mua_maianh_88.jpg",
    "coverImageUrl": "https://cdn.makeup.com/covers/mua_maianh_cover.jpg",
    "bio": "Chuyên gia trang điểm cô dâu và sự kiện 5 năm kinh nghiệm. Từng làm việc tại nhiều tuần lễ thời trang uy tín.",
    "yearsOfExperience": 5,
    "averageRating": 4.95,
    "totalCompletedBookings": 142,
    "verificationStatus": "VERIFIED",
    "styles": [
      { "id": 1, "styleName": "Douyin Sắc Sảo" },
      { "id": 3, "styleName": "Tone Tây Nude" },
      { "id": 7, "styleName": "Cô Dâu Tự Nhiên" }
    ]
  },
  "errorCode": null,
  "timestamp": "2026-09-18T16:45:00.000Z"
}
```

---

### 4.3. Lấy Bộ Sưu Tập Tác Phẩm Theo Gói Dịch Vụ Cụ Thể (`APP-CUST-02 & APP-CUST-03`)
* **Endpoint:** `GET /api/v1/muas/{muaId}/portfolios`
* **Query Parameters:**
  * `package_id` *(Long, Optional)*: **BẮT BUỘC TRUYỀN** ID gói dịch vụ đang được khách chọn trên UI để lọc chính xác tác phẩm của gói đó.
  * `style_id` *(Integer, Optional)*: ID phong cách bổ trợ nếu muốn lọc sâu.
  * `page` *(Integer, default: 0)*, `size` *(Integer, default: 12)*.
* **Response Thành Công (HTTP 200):**
```json
{
  "success": true,
  "message": "mua.portfolios_list_success",
  "data": {
    "content": [
      {
        "id": 2041,
        "title": "Make Cô Dâu Đãi Tiệc Tone Cam Nude",
        "description": "Lớp nền che khuyết điểm 12h, nhũ mắt kim tuyến mịn, tóc búi cao hoàng gia.",
        "primaryImageUrl": "https://cdn.makeup.com/portfolios/2041_full_hd.jpg",
        "additionalImages": [
          "https://cdn.makeup.com/portfolios/2041_eyes_closeup.jpg",
          "https://cdn.makeup.com/portfolios/2041_foundation_skin.jpg",
          "https://cdn.makeup.com/portfolios/2041_hair_detail.jpg"
        ],
        "styleId": 7,
        "styleName": "Cô Dâu Tự Nhiên",
        "packageId": 105,
        "packageName": "Trang Điểm Cô Dâu Đãi Tiệc Sang Trọng",
        "isFeatured": true
      }
    ],
    "page": 0,
    "size": 12,
    "totalElements": 6,
    "totalPages": 1,
    "isLast": true
  },
  "errorCode": null,
  "timestamp": "2026-09-18T16:45:00.000Z"
}
```

---

### 4.4. Cập Nhật Thông Tin Hồ Sơ Khách Hàng (`APP-CUST-04`)
* **Endpoint:** `PUT /api/v1/customer/profile`
* **Header:** `Authorization: Bearer <access_token>`, `Accept-Language: vi`
* **Request Body:**
```json
{
  "fullName": "Nguyễn Thu Hà",
  "phoneNumber": "0987654321",
  "avatarUrl": "https://cdn.makeup.com/avatars/customer_thuha_avatar.jpg",
  "address": "P.2204 Tòa L3, Chung cư Landmark 81, P.22, Bình Thạnh, TP.HCM",
  "latitude": 10.7951,
  "longitude": 106.7218
}
```
* **Response Lỗi Validation Chuẩn (HTTP 400):**
```json
{
  "success": false,
  "message": "Dữ liệu đầu vào không hợp lệ.",
  "errorCode": "ERR_VALIDATION",
  "data": {
    "fullName": "Họ và tên phải từ 2 đến 50 ký tự.",
    "phoneNumber": "Số điện thoại không đúng định dạng 10 chữ số."
  },
  "timestamp": "2026-09-18T16:45:00.000Z"
}
```
* *Quy chuẩn xử lý Client:* Hàm `parseApiError` sẽ bóc tách `data.fullName` và `data.phoneNumber` để hiển thị trực tiếp dòng chữ cảnh báo đỏ dưới chân 2 ô nhập liệu tương ứng.

---

## 🎨 5. QUY CHUẨN DESIGN SYSTEM & HIỆU ỨNG TRẢI NGHIỆM

| Thành Phần UI | Quy Cách Kỹ Thuật (Styling Tokens) | Trải Nghiệm Người Dùng (UX Interaction) |
| :--- | :--- | :--- |
| **Màu Nhấn (Accent Color)** | Rose Ruby (`#E11D48`), Soft Rose (`#FFF1F2`) | Nút CTA *"Đặt Lịch Gói Này"*, Thẻ chọn gói Active, Giá tiền |
| **Nền Giao Diện** | `#F8FAFC` (Slate-50), Card `#FFFFFF` viền `#E2E8F0` | Tối ưu độ tương phản, sạch sẽ và sang trọng |
| **Card Gói Dịch Vụ** | Border Radius `16px`, Elevation mỏng `shadow-sm` | Chạm vào mở chi tiết thợ MUA |
| **Chuyển Gói Dịch Vụ** | `Animated.View` Fade Transition (200ms) | Danh sách ảnh mẫu đổi tức thì theo `package_id` |
| **Trình Phóng To Ảnh** | `PinchGestureHandler` + `DoubleTapGestureHandler` | Zoom mượt từ 1.0x đến 4.0x, đàn hồi Spring khi thả |
| **Phản Hồi Xúc Giác** | `expo-haptics` (`ImpactFeedbackStyle.Light`) | Rung nhẹ khi bấm chọn gói dịch vụ hoặc chạm nút Đặt lịch |
| **Xử Lý Tràn Viền** | `SafeAreaView` từ `react-native-safe-area-context` | Không bị che bởi tai thỏ (Dynamic Island / Notch) |

---

## 🧪 6. MA TRẬN KIỂM THỬ TÍNH NĂNG (FEATURE TEST MATRIX)

| Mã Kịch Bản | Phân Hệ / Màn Hình | Hành Động Người Dùng | Kết Quả Mong Đợi | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: |
| **TC-CUST-01** | `explore.tsx` | Mở màn hình Khám phá khi có GPS | Load danh mục, phong cách và danh sách gói gần nhất | `Passed` |
| **TC-CUST-02** | `explore.tsx` | Chọn chip lọc Bán kính 3km + Danh mục Cô dâu | Gọi API gói lọc đúng params, render kết quả chuẩn xác | `Passed` |
| **TC-CUST-03** | `explore.tsx` | Cuộn xuống chân trang danh sách gói | Kích hoạt Infinite scroll, tải thêm trang kế tiếp | `Passed` |
| **TC-CUST-04** | `mua-detail/[id].tsx` | Mở trang thợ MUA ID = 88 | Hiển thị Header cover, bio, rating và gói đầu tiên | `Passed` |
| **TC-CUST-05** | `mua-detail/[id].tsx` | Chuyển từ Gói Tiệc sang Gói Cô Dâu | Bộ sưu tập ảnh đổi sang toàn bộ ảnh mẫu của Gói Cô Dâu | `Passed` |
| **TC-CUST-06** | `ShowcaseGalleryModal` | Chạm vào ảnh mẫu bất kỳ | Mở Modal nền đen toàn màn hình, hiển thị đúng vị trí ảnh | `Passed` |
| **TC-CUST-07** | `PhotoZoomViewer` | Chạm đúp 2 lần hoặc dùng 2 ngón tay kéo dãn | Ảnh zoom cận cảnh 2.5x - 4.0x soi rõ lớp nền phấn và mắt | `Passed` |
| **TC-CUST-08** | `profile/edit.tsx` | Bấm máy ảnh, chụp hoặc chọn ảnh mới | Đổi ảnh đại diện, upload và cập nhật avatarUrl | `Passed` |
| **TC-CUST-09** | `profile/edit.tsx` | Bỏ trống ô họ tên và bấm Lưu | Báo lỗi validation viền đỏ ngay dưới chân ô nhập liệu | `Passed` |
| **TC-CUST-10** | `SavedAddressModal` | Thêm địa chỉ mới và ghim bản đồ | Lưu địa chỉ, hiển thị trong danh sách chọn khi đặt lịch | `Passed` |

---
**Tài liệu được biên soạn và chuẩn hóa theo kiến trúc hệ thống Makeup Booking Platform. Mọi thay đổi về schema hoặc endpoint phải được cập nhật đồng bộ.**
