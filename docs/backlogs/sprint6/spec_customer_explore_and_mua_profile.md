# ĐẶC TẢ TÍNH NĂNG ỨNG DỤNG DI ĐỘNG (MOBILE APP SPECIFICATION)
## Phân hệ: Khám Phá Dịch Vụ & Hồ Sơ Chi Tiết Thợ MUA (`ROLE_CUSTOMER`)
### Sprint: M-1 | Công nghệ: React Native 0.86 + Expo SDK 57 + Expo Router + TypeScript | Backend: Spring Boot 3.3 Core API (Port 8080)

---

## 📱 1. PHẠM VI & ĐỐI TƯỢNG TRÊN ỨNG DỤNG DI ĐỘNG
* **Phân hệ sử dụng:** Áp dụng **100% trên ứng dụng di động Mobile App (`code/app`)** cho người dùng đóng vai trò **Khách Hàng (`ROLE_CUSTOMER`)**.
* *(Lưu ý: Tài khoản Quản trị `ROLE_SUPER_ADMIN` và `ROLE_AGENCY_ADMIN` bị chặn đăng nhập trên mobile app theo quy chuẩn kiến trúc).*
* **4 Tính năng trọng tâm của Sprint M-1:**
  1. **`APP-CUST-01` (Khám Phá & Bộ Lọc Đa Tiêu Chí):** Tìm kiếm dịch vụ theo từ khóa, lọc phân cấp theo Danh mục gốc (Cô dâu, Dự tiệc, Kỷ yếu...) $\rightarrow$ Phong cách make-up, lọc theo bán kính GPS (1km, 3km, 5km, 10km) và khoảng giá; hỗ trợ phân trang cuộn vô tận (Infinite Scroll).
  2. **`APP-CUST-02` (Hồ Sơ Thợ MUA & Dịch Vụ Kèm Ảnh Mẫu Thực Tế):** Xem trang cá nhân thợ MUA, chứng chỉ xác thực, số sao uy tín; danh sách các gói dịch vụ. Khi khách bấm chọn gói nào, giao diện hiển thị ngay giá tiền, thời lượng, các bước chi tiết và **Album ảnh tác phẩm thực tế thợ đã make riêng cho đúng gói dịch vụ đó**.
  3. **`APP-CUST-03` (Trình Xem Ảnh Cận Cảnh Của Dịch Vụ Đang Chọn):** Lightbox xem toàn màn hình các góc chụp hoàn thiện của gói đang chọn (góc chính diện, góc nghiêng 45°, cận cảnh mắt/mi, nền da, kiểu tóc); cử chỉ thu phóng 2 ngón tay (Pinch-to-Zoom).
  4. **`APP-CUST-04` (Cập Nhật Hồ Sơ Khách Hàng & Địa Chỉ Quen Thuộc):** Đổi ảnh đại diện (avatar), cập nhật họ tên, giới tính, số điện thoại và quản lý danh sách địa chỉ trang điểm quen thuộc.

---

## 🛠️ 2. TECH STACK & THƯ VIỆN MOBILE BẮT BUỘC
* **Nền tảng:** React Native 0.86, Expo SDK 57, TypeScript.
* **Điều hướng màn hình:** `expo-router` (File-based routing: `src/app/(tabs)/explore.tsx`, `src/app/mua-detail/[id].tsx`, `src/app/profile/edit.tsx`).
* **Safe Area & Cuộn trang:** `react-native-safe-area-context`, `KeyboardAvoidingView`, `ScrollView` với `keyboardShouldPersistTaps="handled"`.
* **Form & Validation:** React Hook Form + Zod Schema (thông báo lỗi tiếng Việt chuẩn xác, map trực tiếp vào form helper error viền đỏ).
* **Quản lý danh sách hiệu năng cao:** `FlatList` tối ưu bộ nhớ `initialNumToRender={8}`, `maxToRenderPerBatch={8}`, `windowSize={5}`, `removeClippedSubviews={true}`.
* **Xử lý ảnh & Cache:** `expo-image` (tự động cache, placeholder blurhash màu pastel hồng) & `expo-image-picker` (chọn avatar từ thư viện / camera).
* **Phóng to ảnh (Pinch-to-zoom):** `react-native-gesture-handler` + `react-native-reanimated` (hoặc modal zoom gesture 2 ngón tay).
* **Phản hồi xúc giác (Haptics):** `expo-haptics` (rung nhẹ `selectionAsync()` khi chọn gói, chuyển tab bộ lọc).
* **Icon:** `lucide-react-native` (Stroke width 2.0).
* **Design Tokens:** Theme Rose Ruby (`#E11D48`), Slate (`#0F172A`), Muted (`#64748B`), Border (`#E2E8F0`), Background (`#F8FAFC`).

---

## 🔍 3. TÍNH NĂNG 1: MÀN HÌNH KHÁM PHÁ & BỘ LỌC ĐA TIÊU CHÍ (`APP-CUST-01`)

### 3.1. Luồng Thao Tác Trên Mobile (Mobile User Flow)
1. **Thanh tìm kiếm & Quick Filter Header:**
   - Ô nhập tìm kiếm (Search bar) có icon kính lúp, placeholder: *"Tìm dịch vụ, phong cách makeup, thợ MUA..."*. Có nút `[X]` xóa nhanh khi đã nhập từ khóa.
   - Nút icon `[Lọc]` bên phải mở **Filter Bottom Sheet**.
2. **Thanh cuộn ngang Danh Mục Gốc (Category Horizontal Bar):**
   - Dãy tab bo tròn cuộn ngang hiển thị các danh mục: *Tất cả*, *Cô Dâu*, *Dự Tiệc*, *Kỷ Yếu*, *Douyin*, *Chụp Ảnh / Concept*, *Sự Kiện / Sân Khấu*.
   - Tab đang chọn có nền hồng Rose Ruby (`#E11D48`), chữ trắng; tab chưa chọn nền trắng viền xám nhạt.
3. **Filter Bottom Sheet (Bộ Lọc Chuyên Sâu):**
   - **Khoảng cách GPS:** Dãy chip chọn nhanh: `1 km`, `3 km`, `5 km`, `10 km`, `Toàn thành phố` (tự động lấy tọa độ hiện tại của khách từ thiết bị).
   - **Phong cách sở trường (`styleId`):** Multi-select chips theo taxonomy: *Hàn Quốc Trong Trẻo*, *Tone Tây Sắc Sảo*, *Douyin Trend*, *Tone Thái Lan*, *Cổ Điển Vintage*...
   - **Khoảng giá (Price Range):** 2 ô nhập hoặc slider: Giá tối thiểu - Giá tối đa (VD: 300.000 đ – 2.500.000 đ).
   - **Sắp xếp theo:** *Gần tôi nhất*, *Đánh giá cao nhất (⭐ 4.5+)*, *Giá tăng dần*, *Giá giảm dần*.
   - Nút hành động: `[Thiết Lập Lại]` (Reset) và `[Áp Dụng Bộ Lọc (X kết quả)]`.
4. **Danh Sách Gói Dịch Vụ (Service Package Feed):**
   - Hiển thị danh sách dạng Card (thẻ lớn 1 cột) cuộn mượt:
     + Ảnh đại diện gói tỉ lệ 16:9 sắc nét, gắn nhãn danh mục góc trái.
     + Badge khoảng cách: `📍 1.8 km` (tính theo GPS thực tế).
     + Tên gói dịch vụ (chữ đậm, 2 dòng tối đa).
     + Thông tin thợ/studio: Avatar tròn nhỏ, tên thợ MUA, huy hiệu tích xanh xác thực.
     + Đánh giá sao: `⭐ 4.9 (128 đánh giá)`.
     + Giá niêm yết: Màu hồng Rose Ruby nổi bật (VD: `850.000 đ`) & Thời lượng (`⏳ 60 phút`).
   - Chạm vào Card $\rightarrow$ Chuyển tiếp ngay sang **Màn hình Chi tiết Hồ sơ Thợ MUA (`APP-CUST-02`)**.
   - Kéo từ trên xuống (Pull-to-refresh) để làm mới danh sách; cuộn xuống đáy để tự động tải trang tiếp theo (Infinite Scroll).

### 3.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
├── app/
│   └── (tabs)/
│       └── explore.tsx                       # Màn hình Khám phá chính (Search + Feed + Infinite Scroll)
├── components/customer/
│   ├── CategoryFilterBar.tsx                 # Thanh cuộn ngang chọn Category gốc
│   ├── FilterBottomSheet.tsx                 # Modal trượt đáy lọc GPS, Style, Khoảng giá, Sắp xếp
│   ├── ServicePackageCard.tsx                # Thẻ hiển thị gói dịch vụ với ảnh cover, MUA, giá, rating
│   └── EmptyPackageState.tsx                 # Giao diện khi không tìm thấy kết quả phù hợp
├── schemas/
│   └── package-search.schema.ts              # Zod validation query parameters
└── services/
    ├── package.service.ts                    # Axios client gọi API /api/v1/packages
    └── taxonomy.service.ts                   # Axios client lấy danh mục & phong cách makeup
```

### 3.3. API Contract Backend Cho Màn Khám Phá

| Tác vụ trên App | Method | Endpoint | Query Parameters | Response Data |
| :--- | :---: | :--- | :--- | :--- |
| **Lấy danh mục gốc** | `GET` | `/api/v1/master-categories` | Không | `List<MasterCategoryRes>` (`id`, `name`, `code`, `iconUrl`) |
| **Lấy danh sách phong cách** | `GET` | `/api/v1/makeup-styles` | `categoryId` (optional) | `List<MakeupStyleRes>` (`id`, `name`, `code`) |
| **Tìm kiếm & lọc gói dịch vụ** | `GET` | `/api/v1/packages` | `categoryId`, `styleId`, `minPrice`, `maxPrice`, `availableOnly=true`, `page=0`, `size=10` | `List<PackageSummaryRes>` (kèm thông tin thợ `muaId`, `muaName`, `ratingAvg`, `coverImageUrl`, `price`) |
| **Quét thợ theo GPS** | `GET` | `/api/v1/telemetry/nearby` | `latitude`, `longitude`, `radiusKm=10` | `List<NearbyProviderRes>` (khoảng cách thực tế từ vị trí khách) |

---

## 💄 4. TÍNH NĂNG 2: HỒ SƠ CHI TIẾT THỢ MUA & ẢNH MẪU THEO TỪNG DỊCH VỤ (`APP-CUST-02`)

### 4.1. Luồng Thao Tác Trên Mobile (Mobile User Flow)
1. **Header Hồ Sơ Thợ (MUA Profile Header):**
   - Ảnh bìa Cover phía trên, nút quay lại tròn mờ (Back button).
   - Avatar lớn viền trắng, tên Thợ MUA, huy hiệu tích xanh xác thực hành nghề.
   - Thống kê uy tín: Điểm đánh giá (VD: `⭐ 4.96 / 5.0`), Số đơn đã làm thành công (`142 đơn`), Số năm kinh nghiệm (`5 năm kinh nghiệm`).
   - Giới thiệu ngắn (Bio) và khu vực phục vụ (Bán kính km & Quận/Huyện hoạt động).
   - Dãy Chip các phong cách trang điểm sở trường (`mua_styles`): *Douyin*, *Hàn Quốc*, *Tone Tây*...
2. **Danh Sách Dịch Vụ Của Thợ (Service Package Selector):**
   - Danh sách các gói trang điểm do thợ này cung cấp (Ví dụ: 1. *Trang Điểm Cô Dâu Đãi Tiệc*, 2. *Trang Điểm Dự Tiệc Ban Đêm*, 3. *Trang Điểm Chụp Kỷ Yếu*).
   - Khi khách **CHẠM CHỌN MỘT GÓI DỊCH VỤ**:
     + Gói được chọn có viền hồng Rose Ruby nổi bật, icon tích chọn.
     + Hiển thị chi tiết: Giá tiền niêm yết, thời lượng ước tính.
     + **Danh sách các bước thực hiện (`package_items`):** 
       * Các bước mặc định có sẵn trong gói: Rửa mặt cấp ẩm, Lót nền kiềm dầu, Che khuyết điểm, Đánh nền, Kẻ mắt tạo khối, Kiểu tóc...
       * Các bước tùy chọn làm thêm (Add-on): Dán mi giả 3D (+70k), Đính đá nghệ thuật (+100k)...
3. **Bộ Sưu Tập Tác Phẩm Thực Tế GẮN LIỀN VỚI GÓI ĐANG CHỌN (Service Sample Gallery):**
   - ⚠️ **Quy tắc vàng:** Ảnh mẫu **KHÔNG HIỂN THỊ CHUNG CHUNG**, mà **thay đổi theo đúng gói dịch vụ khách đang bấm chọn ở trên**.
   - Khách chọn gói *Cô Dâu* $\rightarrow$ Lập tức tải và hiển thị album các khách hàng cô dâu thợ đã từng make thực tế.
   - Khách chuyển sang gói *Dự Tiệc* $\rightarrow$ Lập tức chuyển sang album ảnh các khách đi tiệc.
   - Layout hiển thị: Lưới 2 cột (Grid 2 columns) các tác phẩm:
     + Ảnh đại diện hoàn thiện góc chính diện.
     + Badge góc ảnh hiển thị số góc chụp chi tiết đi kèm (VD: `📷 4 góc chụp`).
     + Tiêu đề tác phẩm (VD: *"Tone Cam Đào Căng Bóng"*).
   - Chạm vào một tác phẩm $\rightarrow$ Kích hoạt **Trình xem ảnh cận cảnh toàn màn hình (`APP-CUST-03`)**.
4. **Bottom Bar Cố Định (Sticky Booking CTA):**
   - Thanh bar cố định dưới chân màn hình:
     + Cột trái: Tên gói đang chọn & Tổng tiền niêm yết (chữ to đậm màu hồng).
     + Nút bấm bên phải: `[Đặt Lịch Gói Này]` (Button Rose Ruby). Bấm vào chuyển sang màn hình Chọn ngày giờ & Đặt lịch (Sprint M-2).

### 4.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
├── app/
│   └── mua-detail/
│       └── [id].tsx                          # Màn hình chi tiết thợ MUA (Header + Gói + Album)
├── components/customer/
│   ├── MuaProfileHeader.tsx                  # Header avatar, bio, badge xác thực, rating, styles
│   ├── PackageSelectorList.tsx               # Danh sách gói dịch vụ dạng radio card chọn 1 gói
│   ├── PackageIncludedSteps.tsx              # Danh sách các bước làm đẹp mặc định & addon của gói
│   ├── ServiceSampleGallery.tsx              # Grid 2 cột album ảnh mẫu thực tế gắn với gói đang chọn
│   └── StickyBookingBar.tsx                  # Thanh bar chân màn hình hiển thị giá & nút [Đặt Lịch]
└── services/
    ├── mua-profile.service.ts                # Axios client lấy thông tin profile thợ MUA
    └── portfolio.service.ts                  # Axios client lấy album ảnh theo muaId & packageId
```

### 4.3. API Contract Backend Dành Cho Màn Chi Tiết Thợ

| Tác vụ trên App | Method | Endpoint | Query / Path Params | Response Data |
| :--- | :---: | :--- | :--- | :--- |
| **Lấy hồ sơ thợ MUA** | `GET` | `/api/v1/muas/{id}` | Path: `id` (MUA ID) | `MuaProfileEntity` DTO (Avatar, bio, ratingAvg, totalBookings, yearsExperience, certificates, styles) |
| **Lấy danh sách gói của thợ** | `GET` | `/api/v1/packages` | `muaId={id}&availableOnly=true` | `List<PackageSummaryRes>` (Danh sách toàn bộ gói thợ đang mở nhận ca) |
| **Lấy chi tiết 1 gói & các bước** | `GET` | `/api/v1/packages/{packageId}` | Path: `packageId` | `PackageDetailRes` (kèm danh sách `package_items`: tên bước, `itemType`, phụ phí) |
| **Lấy album ảnh mẫu theo gói** | `GET` | `/api/v1/muas/{muaId}/portfolios` | `page=0&size=20` (hoặc lọc theo `packageId`) | `PageResponse<PortfolioSummaryRes>` (danh sách tác phẩm có `coverImageUrl`, `title`, `additionalImageUrls`) |

---

## 🔎 5. TÍNH NĂNG 3: TRÌNH XEM ẢNH MẪU CẬN CẢNH TOÀN MÀN HÌNH (`APP-CUST-03`)

### 5.1. Luồng Thao Tác Trên Mobile (Mobile User Flow)
1. **Kích hoạt Lightbox toàn màn hình:**
   - Khách hàng chạm vào bất kỳ tác phẩm nào trong Grid ảnh mẫu của thợ.
   - Màn hình chuyển sang chế độ nền đen trong suốt mờ ảo (Immersive Fullscreen Modal, che kín StatusBar).
2. **Trải nghiệm soi cận cảnh tay nghề (Macro Detailing):**
   - **Cử chỉ Pinch-to-zoom:** Dùng 2 ngón tay kéo dãn để phóng to tối đa 300% (3x), thả tay hoặc double-tap để trở về tỉ lệ ban đầu.
   - Cho phép khách soi cực rõ: Độ mịn của lớp nền da (foundation/cushion), đường mí mắt và mi gân trong, nhũ mắt, hiệu ứng bắt sáng (highlighter) và độ bóng của môi.
3. **Thanh trượt chuyển góc chụp chi tiết (Angle Thumbnails Strip):**
   - Phía đáy modal hiển thị thanh thumbnail cuộn ngang các góc chụp của tác phẩm:
     + *Góc 1:* Ảnh chính diện khuôn mặt.
     + *Góc 2:* Góc nghiêng 45° tôn đường sống mũi và gò má.
     + *Góc 3:* Cận cảnh chi tiết mắt và chân mày.
     + *Góc 4:* Cận cảnh kiểu tóc phía sau hoặc hoa cài tóc.
   - Bấm vào thumbnail nào $\rightarrow$ Ảnh lớn ở giữa lướt chuyển mượt mà sang góc chụp đó.
4. **Header phụ & Đóng modal:**
   - Nút `[X]` tròn mờ góc trên phải để đóng modal; cử chỉ vuốt xuống (Swipe down to dismiss) để tắt nhanh.
   - Hiển thị tiêu đề tác phẩm và ghi chú kỹ thuật của thợ (VD: *"Sử dụng kem nền NARS kiềm dầu 12h"*).

### 5.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
└── components/customer/
    ├── ShowcaseGalleryModal.tsx              # Modal toàn màn hình quản lý trạng thái mở/đóng album
    ├── PhotoZoomViewer.tsx                   # Component render ảnh với cử chỉ Pinch-to-zoom & Pan
    └── AngleThumbnailBar.tsx                 # Thanh thumbnail cuộn ngang chuyển góc chụp chi tiết
```

---

## 👤 6. TÍNH NĂNG 4: CẬP NHẬT HỒ SƠ KHÁCH HÀNG & ĐỊA CHỈ QUEN THUỘC (`APP-CUST-04`)

### 6.1. Luồng Thao Tác Trên Mobile (Mobile User Flow)
1. **Truy cập:** Khách vào Tab *Cá nhân* (`src/app/(tabs)/profile/index.tsx`) $\rightarrow$ Bấm nút `[Chỉnh sửa hồ sơ]` $\rightarrow$ Điều hướng sang `src/app/profile/edit.tsx`.
2. **Cập nhật Ảnh Đại Diện (Avatar Picker):**
   - Khung avatar tròn ở giữa màn hình có icon máy ảnh nhỏ màu hồng.
   - Chạm vào $\rightarrow$ Bật ActionSheet Native của hệ điều hành:
     + 📷 *Chụp ảnh mới bằng Camera*
     + 🖼️ *Chọn ảnh từ Thư viện thiết bị*
     + ❌ *Hủy*
   - Sau khi chọn ảnh $\rightarrow$ Tự động crop vuông và nén ảnh (JPEG quality 0.8, max width 800px) $\rightarrow$ Tải lên Cloudinary qua API.
3. **Form Thông Tin Cá Nhân:**
   - Họ và tên (Bắt buộc, từ 2 đến 100 ký tự).
   - Số điện thoại (Chỉ đọc hoặc xác thực OTP khi đổi).
   - Email (Chỉ đọc theo tài khoản đăng nhập).
   - Giới tính (Segmented Control: *Nữ* / *Nam* / *Khác*).
   - Địa chỉ nhà mặc định (Ô input gõ địa chỉ kèm nút định vị GPS hiện tại).
4. **Quản Lý Địa Chỉ Trang Điểm Quen Thuộc (Saved Addresses):**
   - Danh sách các địa chỉ khách hay đặt thợ tới (VD: *Nhà riêng*, *Cơ quan*, *Studio chụp ảnh*, *Khách sạn tiệc cưới*).
   - Nút `[+ Thêm địa chỉ mới]` mở Modal nhập: Nhãn địa chỉ (Nhà riêng/Cơ quan), Địa chỉ chi tiết, Tọa độ GPS ghim trên bản đồ.
5. **Nút Lưu Thay Đổi:** Nút `[Lưu Hồ Sơ]` viền hồng chữ trắng, rung nhẹ Haptic và hiển thị Toast thông báo thành công.

### 6.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
├── app/
│   └── profile/
│       ├── index.tsx                         # Màn hình Menu cá nhân (Avatar, tên, nút chuyển trang)
│       └── edit.tsx                          # Form cập nhật thông tin cá nhân & danh sách địa chỉ
├── components/customer/
│   ├── AvatarPicker.tsx                      # Khung tròn chọn avatar kèm ActionSheet Camera/Gallery
│   ├── SavedAddressCard.tsx                  # Thẻ hiển thị địa chỉ đã lưu kèm nút Sửa/Xóa
│   └── AddAddressModal.tsx                   # Modal thêm mới địa chỉ quen thuộc
├── schemas/
│   └── customer-profile.schema.ts            # Zod validation thông tin cá nhân
└── services/
    └── customer-profile.service.ts           # Axios client gọi /api/v1/customer/profile
```

### 6.3. API Contract Backend Cho Hồ Sơ Khách Hàng

| Tác vụ trên App | Method | Endpoint | Payload Format |
| :--- | :---: | :--- | :--- |
| **Lấy hồ sơ cá nhân** | `GET` | `/api/v1/customer/profile` | Không |
| **Cập nhật thông tin** | `PUT` | `/api/v1/customer/profile` | JSON: `fullName`, `gender`, `defaultAddress`, `defaultLatitude`, `defaultLongitude` |
| **Tải lên ảnh đại diện** | `POST` | `/api/v1/customer/profile/avatar` | `multipart/form-data`: `file` (ảnh avatar) |

---

## 📐 7. ĐẶC TẢ ZOD VALIDATION SCHEMAS (`src/schemas/`)

Mọi form nhập liệu trên Mobile bắt buộc phải validate bằng Zod trước khi gửi request:

```typescript
// src/schemas/customer-profile.schema.ts
import { z } from 'zod';

export const customerProfileSchema = z.object({
  fullName: z
    .string({ required_error: 'Vui lòng nhập họ và tên.' })
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
  gender: z.enum(['FEMALE', 'MALE', 'OTHER'], {
    required_error: 'Vui lòng chọn giới tính.',
  }),
  defaultAddress: z
    .string()
    .max(255, 'Địa chỉ không được vượt quá 255 ký tự.')
    .optional(),
  defaultLatitude: z.number().min(-90).max(90).optional(),
  defaultLongitude: z.number().min(-180).max(180).optional(),
});

export type CustomerProfileFormValues = z.infer<typeof customerProfileSchema>;
```

---

## 💎 8. BẢNG CHECKLIST NGHIỆM THU TÍNH NĂNG (ACCEPTANCE CRITERIA - AC)

| Mã Issue | Tiêu Chí Nghiệm Thu (Definition of Done) |
| :--- | :--- |
| **APP-CUST-01** | ✅ Thanh tìm kiếm lọc được theo tên dịch vụ trong 300ms (Debounce).<br>✅ Chọn Category nào thì feed chỉ hiển thị các gói thuộc Category đó.<br>✅ Lọc GPS 1km, 3km, 5km chỉ hiển thị thợ nằm trong bán kính tương ứng.<br>✅ FlatList cuộn mượt mà 60fps, hỗ trợ Pull-to-refresh và Infinite Scroll không giật lag. |
| **APP-CUST-02** | ✅ Header hiển thị đầy đủ avatar, số sao đánh giá, số đơn hoàn thành, các chip phong cách makeup.<br>✅ **Bấm chuyển đổi giữa các gói dịch vụ $\rightarrow$ Album ảnh mẫu bên dưới lập tức đổi tương ứng theo đúng gói dịch vụ đó (100% khớp quy tắc Per-Service Showcase).**<br>✅ Hiển thị rõ danh sách các bước mặc định trong gói và các tùy chọn mua thêm (Add-on).<br>✅ Nút bấm `[Đặt Lịch Gói Này]` luôn ghim cố định ở đáy màn hình. |
| **APP-CUST-03** | ✅ Chạm vào ảnh mẫu mở Lightbox toàn màn hình mượt mà.<br>✅ Dùng 2 ngón tay Pinch-to-zoom phóng to thu nhỏ ảnh rõ nét không vỡ hạt.<br>✅ Có thanh thumbnail cuộn ngang hiển thị các góc chụp chi tiết (chính diện, mắt, nền da, tóc).<br>✅ Vuốt xuống hoặc bấm nút `[X]` đóng modal ngay lập tức. |
| **APP-CUST-04** | ✅ Chọn avatar từ thư viện ảnh hoặc chụp trực tiếp bằng camera thiết bị, tự động nén ảnh trước khi tải lên.<br>✅ Form validate đầy đủ theo Zod, nếu backend trả lỗi `ERR_VALIDATION` thì map viền đỏ vào đúng ô nhập liệu.<br>✅ Quản lý và lưu được danh sách địa chỉ quen thuộc của khách hàng. |
