# ĐẶC TẢ TÍNH NĂNG ỨNG DỤNG DI ĐỘNG (MOBILE APP SPECIFICATION)
## Phân hệ: Thợ Tự Do (`ROLE_FREELANCE_MUA`) trên Ứng Dụng Mobile App
### Công nghệ: React Native 0.86 + Expo SDK 57 + Expo Router + TypeScript | Backend: Spring Boot 3.3 Core API (Port 8080)

---

## 📱 1. PHẠM VI & ĐỐI TƯỢNG TRÊN ỨNG DỤNG DI ĐỘNG
* **Phân hệ sử dụng:** Áp dụng **100% trên ứng dụng di động Mobile App (`code/app`)** cho tài khoản **Thợ Trang Điểm Tự Do (`ROLE_FREELANCE_MUA`)**.
* *(Lưu ý: Nhân viên Studio `ROLE_AGENCY_STAFF` không có tính năng tạo gói cá nhân, chỉ nhận ca do Agency Admin điều phối).*
* **2 Tính năng trọng tâm:**
  1. **`APP-MUA-06` (Mobile Service Package Builder):** MUA tự tạo, tùy biến các bước làm đẹp, định giá và bật/tắt nhận ca các gói dịch vụ làm đẹp cá nhân ngay trên điện thoại.
  2. **`APP-MUA-04` (Service-Linked Showcase Gallery):** Chụp/chọn ảnh từ thư viện điện thoại, đăng tải album tác phẩm thực tế hoàn thiện gắn liền trực tiếp với từng gói dịch vụ (`package_id`).

---

## 🛠️ 2. TECH STACK & THƯ VIỆN MOBILE BẮT BUỘC
* **Nền tảng:** React Native 0.86, Expo SDK 57, TypeScript.
* **Điều hướng màn hình:** `expo-router` (File-based routing chuẩn Mobile).
* **Safe Area & Cuộn trang:** `react-native-safe-area-context`, `KeyboardAvoidingView`, `ScrollView` với `keyboardShouldPersistTaps="handled"`.
* **Form & Validation:** React Hook Form + Zod Schema (bắt buộc thông báo lỗi tiếng Việt, map trực tiếp vào input chân đỏ).
* **Chọn & Xử lý ảnh Mobile:** `expo-image-picker` (chọn từ Thư viện / Camera điện thoại, tự động nén WebP/JPEG trước khi gửi, giới hạn độ rộng max 1920px để tránh crash RAM).
* **Hiển thị danh sách cuộn mượt:** `FlatList` tối ưu bộ nhớ `initialNumToRender={6}` và `windowSize={5}`.
* **Phản hồi xúc giác (Haptics):** `expo-haptics` (rung nhẹ khi gạt switch nhận ca, lưu thành công hoặc xóa bước).
* **Icon:** `lucide-react-native` (Stroke width 2.0 chuẩn nét trên mobile).

---

## 📦 3. TÍNH NĂNG 1: TẠO MỚI & CẤU HÌNH GÓI DỊCH VỤ (`APP-MUA-06`)

### 3.1. Luồng Thao Tác Trên Mobile (Mobile User Flow)
1. **Màn hình danh sách gói (`src/app/mua/packages/index.tsx`):**
   - Header Mobile: Tiêu đề *"Gói Dịch Vụ Của Tôi"* kèm nút tròn `[+ Thêm Gói]` góc phải trên.
   - Thẻ hiển thị gói (Card): Ảnh cover 16:9, Tên gói, Danh mục (Cô dâu/Dự tiệc...), Giá tiền màu Rose Ruby, Thời lượng (phút).
   - **Nút gạt bật/tắt (Switch Native):** Gạt để Bật nhận ca (Xanh) hoặc Tạm tắt (Xám) kèm rung nhẹ Haptic, gọi API cập nhật ngay mà không cần reload trang.
   - Menu hành động nhanh trên Card:
     + `[Sửa Gói]` $\rightarrow$ Mở form chỉnh sửa thông tin chung.
     + `[Cấu Hình Bước]` $\rightarrow$ Mở màn hình quản lý các bước & tùy chọn làm thêm.
     + `[Album Ảnh Mẫu]` $\rightarrow$ Mở màn hình quản lý album tác phẩm của riêng gói này.
2. **Màn hình Tạo / Sửa gói (`src/app/mua/packages/create.tsx` & `[id]/edit.tsx`):**
   - **Tải ảnh đại diện gói:** Khung bấm `[+ Tải Ảnh Bìa Gói]` $\rightarrow$ Mở ActionSheet điện thoại: *"Chụp ảnh mới"* hoặc *"Chọn từ thư viện"*.
   - **Danh mục gốc (`categoryId`):** Bấm ô chọn $\rightarrow$ Bật Bottom Sheet cuộn chọn: Cô Dâu, Dự Tiệc, Kỷ Yếu, Đi Chơi, Chụp Ảnh Concept...
   - **Phong cách makeup tương thích (`styleIds`):** Dãy Chip Tag bấm chọn nhiều (Multi-select Chips): Douyin, Hàn Quốc, Tone Tây, Tone Thái, Cổ Điển... (Các chip được chọn viền hồng nền hồng nhạt).
   - **Thông tin gói:**
     + Tên gói dịch vụ (Ví dụ: *"Trang Điểm Cô Dâu Đãi Tiệc Tối"*).
     + Giá niêm yết (VNĐ) (Bàn phím `numeric`, tự động format dấu chấm hàng nghìn `1.500.000 đ`).
     + Thời lượng làm đẹp (Bàn phím `number-pad`, đơn vị: Phút, VD: `90`).
     + Mô tả chi tiết (Ô `TextInput` đa dòng `multiline` 4 hàng).
3. **Màn hình Cấu hình các bước dịch vụ (`src/app/mua/packages/[id]/items.tsx`):**
   - Danh sách bước hiển thị dạng thẻ nhỏ có nút xóa/sửa:
     + **Bước Mặc Định (`INCLUDED`):** Cung cấp sẵn trong giá gói (Làm sạch da, Dưỡng ẩm, Đánh nền che khuyết điểm, Kẻ mắt, Tạo kiểu tóc cơ bản...).
     + **Bước Mua Thêm (`OPTIONAL_ADDON`):** Tùy chọn khách có thể tick thêm khi đặt đơn (Dán mi giả cao cấp 3D +70k, Đính đá nghệ thuật +100k, Đánh nền body +150k...).
   - Nút nổi `[+ Thêm Bước / Add-on]` ở chân màn hình mở Modal nhập: Tên bước, Loại bước (Radio button Mặc định / Làm thêm), Giá phụ thu (nếu có), Số phút cộng thêm.

### 3.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
├── app/
│   └── mua/
│       └── packages/
│           ├── index.tsx                     # Màn hình danh sách gói + Switch On/Off + Nút tạo
│           ├── create.tsx                    # Màn hình Tạo mới gói dịch vụ
│           └── [id]/
│               ├── edit.tsx                  # Màn hình Chỉnh sửa thông tin gói
│               ├── items.tsx                 # Màn hình Quản lý các bước dịch vụ & Add-on
│               └── showcase.tsx              # Màn hình Quản lý album ảnh mẫu của gói này
├── components/mua/packages/
│   ├── PackageCard.tsx                       # Thẻ hiển thị gói dịch vụ với Switch & Menu hành động
│   ├── CategoryPickerModal.tsx               # Modal / BottomSheet chọn Danh mục gốc
│   ├── StyleChipSelector.tsx                 # Danh sách chọn phong cách makeup dạng chip ngang
│   └── PackageItemModal.tsx                  # Modal Bottom Sheet nhập tên bước, giá addon, số phút
├── schemas/
│   └── package-builder.schema.ts             # Zod Schema validate form gói & bước dịch vụ
└── services/
    └── mua-package.service.ts                # Axios client tương tác API gói & items
```

### 3.3. API Contract Backend Dành Cho Mobile

| Tác vụ trên App | Method | Endpoint | Ghi chú & Payload |
| :--- | :---: | :--- | :--- |
| **Lấy danh sách gói của tôi** | `GET` | `/api/v1/packages/my` | Hiển thị màn hình chính gói |
| **Lấy chi tiết 1 gói** | `GET` | `/api/v1/packages/{id}` | Nạp dữ liệu vào form edit |
| **Tạo gói mới** | `POST` | `/api/v1/packages` | Body JSON: `categoryId`, `styleIds`, `name`, `description`, `basePrice`, `durationMinutes`, `coverImageUrl`, `isAvailable` |
| **Cập nhật gói** | `PUT` | `/api/v1/packages/{id}` | Body JSON cập nhật |
| **Bật / Tắt nhận ca tức thì** | `PATCH` | `/api/v1/packages/{id}/availability?isAvailable=true` | Gạt switch trên Mobile |
| **Xóa gói** | `DELETE` | `/api/v1/packages/{id}` | Popup xác nhận Native `Alert.alert` |
| **Lấy danh sách bước của gói** | `GET` | `/api/v1/packages/{packageId}/items` | Danh sách item & addon |
| **Thêm bước / Add-on mới** | `POST` | `/api/v1/packages/{packageId}/items` | Body: `itemName`, `itemType` (`INCLUDED` / `OPTIONAL_ADDON`), `additionalPrice`, `additionalDuration`, `displayOrder` |
| **Xóa bước dịch vụ** | `DELETE` | `/api/v1/packages/{packageId}/items/{itemId}` | Xóa 1 bước |

---

## 📸 4. TÍNH NĂNG 2: QUẢN LÝ ALBUM ẢNH MẪU THEO TỪNG DỊCH VỤ (`APP-MUA-04`)

### 4.1. Luồng Thao Tác Trên Mobile (Mobile User Flow)
1. **Quy tắc gắn chặt với Dịch vụ (`package_id`):** Thợ không upload ảnh tự do bừa bãi. Thợ vào xem danh sách gói $\rightarrow$ bấm **[Album Tác Phẩm]** của gói đó $\rightarrow$ Màn hình hiển thị toàn bộ các tác phẩm thực tế thợ đã make riêng cho gói đó.
2. **Màn hình Album của gói (`src/app/mua/packages/[id]/showcase.tsx`):**
   - Lưới hiển thị 2 cột (Grid 2 cột) các tác phẩm: Ảnh bìa chính, Tiêu đề ngắn, Huy hiệu số góc chụp đi kèm (VD: `+4 ảnh chi tiết`), Nút sao ghim Nổi bật (`isFeatured`).
   - Nút bấm chân màn hình: `[+ Tải Lên Tác Phẩm Mới]`.
3. **Màn hình Tải lên tác phẩm (`src/app/mua/packages/[id]/add-showcase.tsx`):**
   - **Tải Ảnh Chính (Bắt buộc - 1 ảnh):** Khung ảnh vuông lớn 1:1 tỉ lệ vàng. Chạm để chọn từ Thư viện / Chụp trực tiếp. Đây là ảnh chụp góc chính diện hoàn thiện nhất.
   - **Tải Dãy Ảnh Góc Chụp Chi Tiết (Tùy chọn - 1 đến 5 ảnh):**
     + Dãy thumbnail cuộn ngang hiển thị các ô vuông nhỏ kèm nút `[+]`.
     + Thợ chọn thêm: Góc nghiêng 45°, Cận cảnh chi tiết mắt/mi, Cận cảnh nền da căng bóng và môi, Cận cảnh kiểu tóc phía sau.
     + Chạm vào ảnh thumbnail có nút `[X]` đỏ ở góc để gỡ bỏ.
   - **Nhập thông tin tác phẩm:**
     + Tiêu đề (VD: *"Tone Cam Đào Trong Trẻo - Khách Ăn Hỏi"*).
     + Phong cách (`styleId`): Dropdown chọn phong cách thuộc gói.
     + Ghi chú kỹ thuật (VD: *"Sử dụng nền NARS Longwear, dán mi gân trong tự nhiên"*).
     + Switch ghim: *"Đặt làm ảnh đại diện nổi bật của gói"*.
   - Nút `[Đăng Tác Phẩm]`: Tự động nén ảnh $\rightarrow$ gửi Multipart FormData $\rightarrow$ Rung Haptic báo thành công và quay lại màn hình danh sách.

### 4.2. Cấu Trúc File & Thư Mục Mobile (`code/app/src/`)
```text
code/app/src/
├── app/
│   └── mua/
│       └── packages/
│           └── [id]/
│               ├── showcase.tsx              # Grid danh sách tác phẩm thực tế của gói {id}
│               └── add-showcase.tsx          # Màn hình chọn ảnh chính + dãy góc chụp chi tiết
├── components/mua/showcase/
│   ├── ShowcaseGridCard.tsx                  # Card tác phẩm 2 cột kèm badge số ảnh chi tiết & nút ghim
│   ├── SingleImagePicker.tsx                 # Khung chọn & xem trước ảnh tác phẩm chính
│   └── MultiAnglePhotoStrip.tsx              # Thanh cuộn ngang nạp nhiều ảnh góc chụp cận cảnh
├── schemas/
│   └── showcase.schema.ts                    # Zod validation ảnh chính, tiêu đề, styleId
└── services/
    └── mua-showcase.service.ts               # Axios client upload Multipart FormData ảnh lên backend
```

### 4.3. API Contract Backend Dành Cho Mobile

| Tác vụ trên App | Method | Endpoint | Format Payload |
| :--- | :---: | :--- | :--- |
| **Lấy album ảnh của thợ** | `GET` | `/api/v1/muas/my-profile/portfolios` | Query params: `page`, `size` (Lọc theo `packageId` client-side hoặc backend param) |
| **Tải lên tác phẩm mới** | `POST` | `/api/v1/muas/my-profile/portfolios` | `multipart/form-data`: <br>• `packageId` (Long)<br>• `styleId` (Integer)<br>• `title` (String)<br>• `description` (String)<br>• `coverImage` (File ảnh chính)<br>• `additionalImages` (Danh sách file ảnh góc chụp chi tiết)<br>• `isFeatured` (Boolean) |
| **Ghim / Bỏ ghim Nổi bật** | `PATCH` | `/api/v1/muas/my-profile/portfolios/{id}/featured` | Body JSON: `{"isFeatured": true/false}` |
| **Ẩn / Hiện tác phẩm** | `PATCH` | `/api/v1/muas/my-profile/portfolios/{id}/visibility` | Body JSON: `{"isVisible": true/false}` |
| **Xóa tác phẩm** | `DELETE` | `/api/v1/muas/my-profile/portfolios/{id}` | Xóa tác phẩm khỏi gói |

---

## 💎 5. QUY CHUẨN TRẢI NGHIỆM MOBILE APP (MOBILE UX & CLEAN CODE)
1. **Chống đơ giao diện khi chọn ảnh:**
   - Dùng `ImageManipulator` từ `expo-image-manipulator` để nén ảnh JPEG chất lượng `0.8` và giới hạn `width: 1440px` trước khi nạp vào FormData, tránh lỗi đơ RAM hoặc timeout mạng 4G khi upload 5-6 ảnh cùng lúc.
2. **Xử lý bàn phím thông minh:**
   - Mọi màn hình form nhập liệu bọc trong `KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}` để không bị bàn phím che mất ô giá tiền và mô tả.
3. **Đồng bộ hóa lỗi Form (Zod + `parseApiError`):**
   - 100% submit form đều bọc trong `try-catch` với hàm tiện ích `parseApiError(err)` tại `src/utils/error.ts`. Lỗi trường nào (như thiếu ảnh bìa, giá dưới 50k) sẽ hiển thị dòng chữ đỏ ngay chân ô đó.
4. **Xác nhận an toàn trên thiết bị:**
   - Khi xóa bước dịch vụ hoặc xóa tác phẩm ảnh, sử dụng hộp thoại xác nhận gốc của hệ điều hành `Alert.alert("Xác nhận xóa", "Tác phẩm sẽ không còn hiển thị trên gói dịch vụ của bạn", [{ text: "Hủy" }, { text: "Xóa", style: "destructive", onPress: ... }])`.
