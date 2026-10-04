# Kế Hoạch Triển Khai Kỹ Thuật (Technical Implementation Plan)
## Tối Ưu Hóa Tìm Thợ Theo Danh Mục, Phong Cách, Giá Động & Bán Kính Quét

**Ngày tạo:** 28/09/2026  
**Mục tiêu:** Khắc phục triệt để 4 vấn đề nghiệp vụ về tìm kiếm thợ theo gói dịch vụ khẩn cấp, loại bỏ hoàn toàn hardcoded phía client, đồng bộ dữ liệu thật với Backend Spring Boot Core API và PostgreSQL/Redis GEO.

---

## 🔍 I. KẾT QUẢ KIỂM TRA HIỆN TRẠNG BACKEND (`core-api`)

Sau khi rà soát toàn diện mã nguồn tại `code/backend/core-api`:

| Hạng Mục Nghiệp Vụ | Trạng Thái Backend Hiện Tại | Đánh Giá Đáp Ứng | Khoảng Trống Kỹ Thuật Cần Bổ Sung |
| :--- | :---: | :---: | :--- |
| **1. Ẩn giá trước khi tìm thợ & Giá riêng từng thợ** | **Chưa đáp ứng đầy đủ** | ⚠️ Đang gán giá mặc định 500k + 150k phụ phí vào `BookingEntity` ngay khi tạo đơn trước khi có thợ. Payload gửi tới thợ (`createOfferPayload`) thiếu tên gói, phụ phí, thời lượng. | • Cần gán giá động theo đúng `ServicePackageEntity` của thợ candidate khi gửi offer.<br>• Khi thợ nhận đơn qua Redlock (`DistributedLockServiceImpl`), cập nhật lại giá `serviceSubtotal`, `totalAmount`, `depositAmount` theo gói của thợ này. |
| **2. Lọc thợ theo Danh mục & Phong cách** | **Chưa đáp ứng** | ❌ `findAvailableCandidates` chỉ quét Redis GEO và kiểm tra Online/Busy. Hoàn toàn không lọc theo danh mục hay phong cách. Thợ MUA 3 chỉ làm cô dâu vẫn bị match vào đơn dự tiệc/đi làm. | • `CreateInstantBookingReq`: Thêm `masterCategoryId` (@NotNull) và `styleId`.<br>• `ServicePackageRepository`: Thêm query lọc thợ có gói active thuộc `masterCategoryId` (và `styleId`).<br>• Lọc candidate trong `findAvailableCandidates`. |
| **3. Bóc tách Dịch vụ mua thêm (Add-ons)** | **Chưa đáp ứng** | ⚠️ Add-ons đang bị đưa vào ghi chú thô sơ ở bước tìm kiếm với giá hardcode, chưa có bước cho khách chọn thêm add-ons sau khi đã tìm thấy thợ. | • Ẩn toàn bộ add-ons ở bước quét thợ ban đầu.<br>• Sau khi thợ accept (`BOOKING_MATCHED`), khách chọn thêm Add-ons tại màn hình Chi Tiết Đặt Cọc. |
| **4. Bán kính mặc định 10km & Gợi ý mở rộng** | **Chưa đáp ứng linh hoạt** | ⚠️ Backend đang fix cứng `MAX_RADIUS_KM = 30.0` km; Client lúc 5km lúc 30km, thiếu banner gợi ý mở rộng. | • Cho phép nhận `radiusKm` (mặc định `10.0` km) từ client.<br>• Client hiển thị banner thông minh gợi ý mở rộng lên 15km / 30km khi 0 thợ. |

---

## 📋 II. CÁC GIAI ĐOẠN TRIỂN KHAI CHI TIẾT (PHASED ACTION PLAN)

### 📌 Giai Đoạn 1: Nâng Cấp Backend Core API (`core-api`)

1. **Cập nhật DTO `CreateInstantBookingReq.java`:**
   - Thêm trường `private Integer masterCategoryId;` (với `@NotNull(message = "{validation.master_category_required}")`).
   - Thêm trường `private Integer styleId;` (tùy chọn).
   - Thêm trường `private Double radiusKm;` (mặc định `10.0`).
2. **Cập nhật `ServicePackageRepository.java`:**
   - Thêm query tìm các `muaId` có gói dịch vụ active theo category và style:
     ```java
     @Query("""
         SELECT DISTINCT p.mua.id FROM ServicePackageEntity p
         LEFT JOIN p.styles s
         WHERE p.mua.id IN :muaIds
           AND p.masterCategory.id = :categoryId
           AND p.isAvailable = TRUE
           AND (:styleId IS NULL OR s.id = :styleId)
     """)
     List<Long> findMuaIdsProvidingCategoryAndStyle(@Param("muaIds") Collection<Long> muaIds,
                                                    @Param("categoryId") Integer categoryId,
                                                    @Param("styleId") Integer styleId);
     ```
3. **Cải tiến `CustomerInstantBookingServiceImpl.java`:**
   - Sử dụng bán kính `req.getRadiusKm() != null ? req.getRadiusKm() : 10.0` khi gọi Redis GEO.
   - Trong `findAvailableCandidates`: Sau khi lọc online/busy/verified, gọi `ServicePackageRepository` để lọc chính xác các thợ có gói dịch vụ thuộc Category/Style khách đã chọn.
   - Khi tạo payload `createOfferPayload(booking, targetMuaId)`: Lấy đúng gói dịch vụ của thợ đó để gán giá thật (`basePrice`, `earningsAmount`, `serviceName`, `estimatedDurationMinutes`, `emergencySurchargeFee = 150000`, `totalAmount`).
4. **Cập nhật `DistributedLockServiceImpl.java` (`acceptBookingWithLock`):**
   - Khi thợ nhận ca thành công: Lấy `ServicePackageEntity` của thợ đó gắn vào `booking.setServicePackage(pkg)`.
   - Cập nhật `booking.setServiceSubtotal(pkg.getPrice())`, `booking.setTotalAmount(...)`, `booking.setDepositAmount(...)`.
5. **Cập nhật `InstantBookingEventListener.java`:**
   - Bắn WebSocket `/topic/booking-matched/{bookingId}` với thông tin gói thật, giá gốc, phụ phí, tổng tiền và tiền cọc để hiển thị cho khách.

---

### 📌 Giai Đoạn 2: Tối Ưu Mobile App Khách Hàng (`InstantRadarModal.tsx`)

1. **Xóa bỏ 100% dữ liệu hardcode:**
   - Xóa bỏ các hằng số tĩnh `INSTANT_PACKAGES`, `STYLES`, `EMERGENCY_SURCHARGE`.
   - Tạo Service fetch danh mục thật từ `GET /api/v1/master-categories` và phong cách từ `GET /api/v1/makeup-styles`.
2. **Thiết kế lại Giao diện Bước 1 (Tìm kiếm thợ):**
   - **Ẩn toàn bộ phần hóa đơn dự tính và tiền cọc** (vì giá phụ thuộc vào thợ được ghép).
   - **Ẩn phần chọn Dịch vụ mua thêm (Add-ons)** (chuyển sang bước sau).
   - Chỉ cho phép khách chọn:
     - Danh mục làm đẹp (Category Chips/Cards: Make-up Dự tiệc, Đi làm, Cô dâu...) lấy từ DB.
     - Phong cách make-up (Style Chips) lấy từ DB.
     - Bán kính quét (mặc định 10km).
     - Địa chỉ và ghi chú.
3. **Cơ chế gợi ý mở rộng bán kính thông minh (Smart Expansion Banner):**
   - Thiết lập mặc định `searchRadius = 10` km.
   - Khi `nearbyProviders.length === 0`:
     - Hiển thị banner màu cam thân thiện: *"Chưa tìm thấy chuyên viên trong bán kính 10km. Bạn hãy mở rộng bán kính để tìm được nhiều thợ hơn nhé!"*.
     - 2 nút bấm tiện lợi: **[Mở rộng 15 km]** và **[Mở rộng 30 km]** một chạm.

---

### 📌 Giai Đoạn 3: Chuẩn Hóa Màn Hình Nhận Ca Của Thợ (`CountdownAcceptModal.tsx`)

1. **Loại bỏ dữ liệu mặc định fallback hardcode:**
   - Nhận 100% thông tin gói và giá từ payload WebSocket `/topic/mua-offer/{muaId}`:
     - Tên gói dịch vụ thật của thợ (`serviceName`).
     - Giá gói gốc của thợ (`basePrice`).
     - Phụ phí khẩn cấp (`emergencySurchargeFee`).
     - Thu nhập thực nhận của thợ (`earningsAmount`).
     - Thời lượng dự kiến (`estimatedDurationMinutes`).
     - Phong cách khách yêu cầu (`styleNames`).
     - Khoảng cách di chuyển (`distanceKm`).
2. **Đảm bảo tính minh bạch tài chính tuyệt đối:**
   - Số tiền hiển thị trên nút [CHẤP NHẬN CA (+...)] trùng khớp 100% với thu nhập thực nhận được tính toán từ backend.

---

### 📌 Giai Đoạn 4: Màn Hình Chi Tiết Đặt Cọc Sau Khi Ghép Thợ Thành Công

1. Khi nhận sự kiện WebSocket `BOOKING_MATCHED`:
   - Chuyển Modal/Màn hình sang trạng thái **Chi Tiết Đơn Hàng & Đặt Cọc (Matched / Deposit Step)**.
   - Hiển thị thông tin thợ đã nhận (Avatar, Tên, Đánh giá ⭐).
   - Hiển thị giá gói thực tế của thợ đó + Phụ phí ca khẩn cấp.
   - Hiển thị danh sách **Dịch vụ mua thêm (Add-ons)** để khách tích chọn nếu có nhu cầu (uốn tóc, dán mi 3D...).
   - Hiển thị số tiền cọc Escrow 30% được tính toán lại theo thời gian thực.
   - Nút **[Xác Nhận & Đặt Cọc 30%]** đưa khách vào luồng cọc ví an toàn.

---

### 📌 Giai Đoạn 5: Biên Dịch & Kiểm Thử Chất Lượng (Verification)

1. **Kiểm tra biên dịch Backend:**
   - Chạy `./gradlew compileJava` để đảm bảo toàn bộ mã nguồn Java không có lỗi cú pháp hay kiểu dữ liệu.
2. **Kiểm tra TypeScript & Expo:**
   - Chạy `npx tsc --noEmit` tại `code/app` để đảm bảo hợp đồng kiểu dữ liệu và props không có lỗi type.
3. **Kiểm thử luồng End-to-End:**
   - Khách chọn Category Dự Tiệc $\rightarrow$ Thợ MUA 3 (chỉ có gói Cô Dâu) không nhận được đơn.
   - Thợ MUA có gói Dự Tiệc nhận được đơn với đúng giá gói niêm yết của thợ đó.
   - Khách nhận thông tin giá thật ở màn hình xác nhận cọc.
