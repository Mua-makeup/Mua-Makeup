# TÀI LIỆU ĐẶC TẢ USER STORIES & TIÊU CHÍ NGHIỆM THU
## MICROSERVICE: SERVICE CATALOG & SURCHARGE MANAGEMENT SERVICE (DANH MỤC GÓI DỊCH VỤ, NĂNG LỰC TONE MAKE-UP & PHỤ PHÍ)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Microservice / Sub-module:** `Service Catalog & Surcharge Management Service`
* **Phạm vi Module:** Quản lý Danh mục Gốc (Master Categories), Tone/Style Trang điểm chuẩn toàn hệ thống (Makeup Styles), Gói dịch vụ cho Studio (Agency Catalog) & Thợ tự do (Freelancer Catalog), Chi tiết bước thực hiện/Add-on mua thêm, Kỹ năng Tone trang điểm thợ tự do (`mua_styles`), Gán kỹ năng cho thợ Studio (`agency_staff_services` & `agency_staff_styles`), Album ảnh sản phẩm hoàn thiện của cả Thợ Tự Do & Thợ Studio (`portfolio_showcases`), và Engine cấu hình Phụ phí linh hoạt (Làm sớm 3h-5h sáng, đi tỉnh/ngoài bán kính, ngày Lễ/Tết).
* **Mã Jira Issue liên quan:** `ISSUE-13.1`, `ISSUE-13.2`, `ISSUE-13.3`, `ISSUE-13.4`, `ISSUE-13.5`, `ISSUE-11.3` (Sprint 1).
* **Đối tượng sử dụng (User Personas):**
  1. **Super Admin (Quản trị viên Hệ thống):** Quản lý Danh mục Dịch vụ Master & Danh sách Tone Make-up dùng chung.
  2. **Agency Owner / Studio Admin (Chủ Studio / Đại lý):** Tạo & quản lý Gói dịch vụ của Studio, phân công thợ làm gói/tone phù hợp, thiết lập chính sách phụ phí Studio.
  3. **Agency Staff (Thợ thuộc Studio):** Quản lý album ảnh sản phẩm mẫu hoàn thiện thực tế làm tại Studio.
  4. **Freelance MUA (Thợ trang điểm tự do):** Khai báo danh mục gói cá nhân, tự đăng ký danh sách Tone Make-up tay nghề làm được (`mua_styles`), đăng tải album ảnh sản phẩm mẫu hoàn thiện (`portfolio_showcases`), tự cấu hình mức phụ phí di chuyển, phụ phí làm sớm và ngày Lễ/Tết.
  5. **Customer (Khách hàng):** Xem danh mục gói minh bạch, quy trình chi tiết, album ảnh làm thực tế của thợ theo đúng [Gói + Tone], option mua thêm và tổng phụ phí trước khi tiến hành đặt đơn.

---

## 📋 2. DANH SÁCH USER STORIES CHI TIẾT

### **US-CATALOG-01: Quản lý Danh mục Gốc & Tone Make-up Hệ thống (Master Categories & Makeup Styles)**
> **As a** Super Admin (Quản trị viên Hệ thống),  
> **I want to** tạo và quản lý danh mục dịch vụ gốc (Trang điểm Cô Dâu, Trang điểm Tiệc/Sự kiện, Kỷ yếu...) và danh mục Tone trang điểm (Tone Hàn Douyin, Tone Thái, Tone Tây, Tone Baby...),  
> **So that** toàn bộ Studio và Thợ tự do có chuẩn taxonomy dùng chung để phân loại gói và tìm kiếm.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Super Admin tạo mới Danh mục Gốc thành công**
  * **Given** Admin có vai trò `ROLE_SUPER_ADMIN` và sở hữu quyền `catalog:master_manage`.
  * **When** Admin gửi request tạo Danh mục mới với `category_code = "MAKE_CO_DAU"`, `category_name = "Trang điểm Cô Dâu"`, kèm mô tả và Icon URL.
  * **Then** Hệ thống lưu bản ghi vào bảng `master_service_categories` và trả về `201 Created`.
* **Scenario 02: Ràng buộc trùng lặp Mã Danh mục hoặc Mã Tone**
  * **Given** Mã `style_code = "TONE_DOUYIN"` đã tồn tại trong hệ thống.
  * **When** Admin tạo mới một Tone Make-up trùng mã `TONE_DOUYIN`.
  * **Then** Hệ thống từ chối request và trả về lỗi `409 Conflict` với thông báo *"Makeup style code 'TONE_DOUYIN' already exists"*.

---

### **US-CATALOG-02: Quản lý Gói Dịch vụ Studio vs Freelancer (Service Package Catalog)**
> **As a** Chủ Studio (Agency Owner) hoặc Thợ tự do (Freelance MUA),  
> **I want to** khởi tạo, chỉnh sửa và quản lý danh mục Gói Dịch vụ trang điểm của tôi/Studio,  
> **So that** khách hàng xem được thông tin giá cả niêm yết, thời gian ước tính, trạng thái hoạt động và các Tone trang điểm gói đó hỗ trợ.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Chủ Studio tạo Gói Dịch vụ thành công**
  * **Given** Chủ Studio có vai trò `ROLE_AGENCY_ADMIN` (`agency_id = 105`).
  * **When** Gửi thông tin gói dịch vụ mới: `package_name = "Gói Cô Dâu Luxury 2026"`, `price = 2500000`, `estimated_duration_minutes = 90`, `master_category_id = 1`, danh sách `style_ids = [2, 4]` (Tone Thái & Tone Tây).
  * **Then** Hệ thống khởi tạo bản ghi `service_packages` với `agency_id = 105`, `mua_id = NULL` (thỏa mãn constraint `check_package_owner`).
  * **And** Thêm 2 bản ghi tương ứng vào bảng trung gian `package_styles`.
* **Scenario 02: Thợ Tự do tạo Gói Dịch vụ thành công**
  * **Given** Thợ Tự do có vai trò `ROLE_FREELANCE_MUA` (`mua_id = 89`).
  * **When** Gửi thông tin gói dịch vụ cá nhân `package_name = "Make-up Tiệc Tone Hàn"`, `price = 600000`, `estimated_duration_minutes = 60`.
  * **Then** Hệ thống tạo `service_packages` với `agency_id = NULL`, `mua_id = 89`.
* **Scenario 03: Ràng buộc tính hợp lệ về Giá và Sở hữu gói**
  * **Given** Một Thợ tự do B cố tình chỉnh sửa Gói dịch vụ thuộc sở hữu của Thợ tự do A (`mua_id = 89`).
  * **When** Thợ B gửi request `PUT /api/v1/packages/{package_id_of_A}`.
  * **Then** Hệ thống từ chối và trả về lỗi `403 Forbidden` với thông báo *"Access Denied: You do not own this service package"*.

---

### **US-CATALOG-03: Chi tiết Bước thực hiện & Option Mua thêm (Package Items & Add-ons)**
> **As a** Chủ Studio hoặc Thợ Tự do,  
> **I want to** thêm các bước quy trình mặc định (như Đánh kem nền, Dán mi giả, Tạo kiểu tóc) và các tùy chọn mua thêm (như Dán nhũ mắt kiêm đá, Sơn móng tay),  
> **So that** khách hàng hiểu rõ giá trị gói và có thể chọn mua thêm các dịch vụ đi kèm khi đặt lịch.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Thêm quy trình thực hiện mặc định (`COMPONENT`)**
  * **Given** Gói dịch vụ `package_id = 45` đã tồn tại.
  * **When** Người sở hữu thêm item `item_name = "Đánh nền kiềm dầu 24h"`, `item_type = "COMPONENT"`, `is_required = true`, `step_order = 1`, `item_price = 0`.
  * **Then** Hệ thống lưu bản ghi vào `package_items` với trạng thái `is_active = true`.
* **Scenario 02: Thêm Option mua thêm tùy chọn (`ADD_ON`)**
  * **When** Người sở hữu thêm option `item_name = "Tạo kiểu tóc uốn sóng Hàn Quốc"`, `item_type = "ADD_ON"`, `is_required = false`, `item_price = 150000`.
  * **Then** Bản ghi được lưu với `is_required = false` và giá mua thêm `150,000 VND`. Khi Khách hàng chọn option này, đơn hàng sẽ cộng thêm tiền tương ứng.

---

### **US-CATALOG-04: Gán Kỹ năng & Tone Trang điểm cho Thợ Studio (Agency Staff Capability Mapping)**
> **As a** Chủ Studio / Đại lý (Agency Owner),  
> **I want to** phân công thợ trong Studio (`agency_staff`) xem thợ nào làm được Gói dịch vụ nào (`agency_staff_services`) và thành thạo Tone trang điểm nào (`agency_staff_styles`),  
> **So that** hệ thống không điều phối nhầm thợ chưa có tay nghề cho đơn đặt lịch của khách hàng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Chủ Studio gán Kỹ năng Gói Dịch vụ cho Nhân viên Studio**
  * **Given** Studio sở hữu Nhân viên `staff_id = 12` và Gói `package_id = 45` ("Gói Cô Dâu Luxury").
  * **When** Chủ Studio gửi request gán `staff_id = 12`, `package_id = 45`, `proficiency_level = "PRIMARY_MUA"`, `is_qualified = true`.
  * **Then** Hệ thống lưu vào bảng `agency_staff_services`. Nhân viên này chính thức đủ điều kiện nhận ca Cô Dâu Luxury.
* **Scenario 02: Gán Kỹ năng Tone Trang điểm chi tiết cho Nhân viên Studio (`agency_staff_styles`)**
  * **When** Chủ Studio xác nhận Nhân viên `staff_id = 12` thành thạo `style_id = 2` (Tone Thái).
  * **Then** Hệ thống tạo bản ghi trong `agency_staff_styles` với `staff_id = 12`, `style_id = 2`, `is_qualified = true`.
  * **And** Khi khách hàng đặt ca Studio với yêu cầu Tone Thái, thuật toán dispatching sẽ lọc ra các thợ có bản ghi `is_qualified = true` trong bảng này.

---

### **US-CATALOG-05: Khai báo Kỹ năng Tone Make-up trực tiếp cho Thợ Tự do (Freelancer Tone Capability Mapping - `mua_styles`)**
> **As a** Thợ Make-up Tự do (Freelance MUA),  
> **I want to** tự chọn và đăng ký danh sách Tone/Style trang điểm thế mạnh của tay nghề cá nhân (Tone Hàn Douyin, Tone Thái, Tone Tây, Tone Baby...),  
> **So that** hồ sơ thợ của tôi tự động hiển thị mác tay nghề minh bạch và xuất hiện trong kết quả tìm kiếm theo Tone của Khách hàng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Thợ Tự do khai báo danh sách Tone Make-up thế mạnh thành công**
  * **Given** Thợ Tự do đã xác minh có tài khoản active (`mua_id = 89`).
  * **When** Thợ chọn danh sách Tone thế mạnh `style_ids = [1, 2, 4]` (Tone Douyin, Tone Thái, Tone Tây).
  * **Then** Hệ thống cập nhật bảng `mua_styles` cho `mua_id = 89` với 3 bản ghi chứa `is_qualified = true`.
* **Scenario 02: Khách hàng lọc Thợ Tự do theo Tone Make-up yêu thích**
  * **Given** Khách hàng tìm kiếm thợ tự do khu vực Quận 1 làm được "Tone Thái" (`style_id = 2`).
  * **When** Khách hàng bấm Lọc theo Tone Thái.
  * **Then** Hệ thống thực hiện JOIN giữa `mua_profiles` và `mua_styles`, chỉ trả về danh sách thợ có bản ghi `is_qualified = true` với `style_id = 2`.

---

### **US-CATALOG-06: Album Ảnh Sản phẩm Hoàn thiện thực tế cho Thợ Tự do & Thợ Studio (`portfolio_showcases`)**
> **As a** Thợ Trang điểm Tự do (Freelance MUA) hoặc Thợ thuộc Studio (Agency Staff),  
> **I want to** tải lên album các hình ảnh sản phẩm make-up đã hoàn thiện thực tế cho khách trước đó, gắn nhãn thông tin Gói dịch vụ (`package_id`) và Tone Make-up (`style_id`) tương ứng,  
> **So that** khách hàng có bằng chứng thực tế xem tay nghề của tôi trước khi tiến hành đặt đơn.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Thợ Tự do tải Album Ảnh sản phẩm hoàn thiện thành công**
  * **Given** Thợ Tự do `mua_id = 89` sở hữu bức ảnh làm cho khách hàng cũ.
  * **When** Đăng tải ảnh `image_url = "https://cdn.makeupbooking.vn/portfolio/img1.jpg"`, tiêu đề `"Cô dâu tone Thái sang trọng"`, gắn `package_id = 45` và `style_id = 2`.
  * **Then** Hệ thống tạo bản ghi trong `portfolio_showcases` với `mua_id = 89`, `staff_id = NULL`, `package_id = 45`, `style_id = 2`.
* **Scenario 02: Thợ Studio tải Album Ảnh sản phẩm hoàn thiện làm tại Studio**
  * **Given** Thợ thuộc Studio `staff_id = 12` (`mua_id = 89`).
  * **When** Đăng tải ảnh sản phẩm hoàn thiện khi phục vụ ca tại Studio.
  * **Then** Hệ thống tạo bản ghi trong `portfolio_showcases` với `mua_id = 89`, `staff_id = 12`, `package_id = 88`, `style_id = 2`.
* **Scenario 03: Khách hàng xem Album Ảnh mẫu thực tế lọc chính xác theo [Gói + Tone]**
  * **Given** Khách hàng đang xem trang chi tiết Thợ A hoặc Studio B.
  * **When** Khách hàng chọn Gói Cô Dâu và nhấp vào Tone Thái.
  * **Then** Hệ thống truy vấn `portfolio_showcases` và trả về danh sách hình ảnh góc cận cảnh mặt/tóc của khách hàng cũ tương ứng đúng 100% với [Gói Cô Dâu + Tone Thái].

---

### **US-SURCHARGE-01: Cấu hình Phụ phí & Tự động tính toán (Flexible Surcharges & Pricing Rules)**
> **As a** Chủ Studio hoặc Thợ Tự do,  
> **I want to** cấu hình các loại Phụ phí di chuyển ngoài bán kính, Phụ phí làm sớm (3h - 5h sáng), và Phụ phí ngày Lễ/Tết,  
> **So that** hệ thống tự động tính chính xác phụ phí phát sinh vào đơn hàng của khách hàng mà không cần trao đổi thủ công.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Cấu hình Phụ phí Làm sớm (Early Morning Slot)**
  * **Given** Thợ Tự do / Studio thiết lập phụ phí `surcharge_name = "Phụ phí làm sớm (3h - 5h sáng)"`, `amount = 150000`, `is_active = true`.
  * **When** Khách hàng đặt ca có thời gian bắt đầu nằm trong khoảng `03:00:00 - 05:00:00`.
  * **Then** Dynamic Pricing Engine tự động nhận diện và cộng phụ phí `150,000 VND` vào hóa đơn trước thanh toán.
* **Scenario 02: Cấu hình Phụ phí di chuyển ngoài bán kính miễn phí**
  * **Given** Thợ Tự do quy định bán kính phục vụ miễn phí `max_service_radius_km = 10.0` km và phụ phí `TRAVEL_PER_KM = 15000 VND/km`.
  * **When** Khách hàng đặt địa điểm làm cách thợ `14.5` km (vượt bán kính 4.5 km).
  * **Then** Hệ thống tính Phụ phí di chuyển: `4.5 km * 15,000 VND = 67,500 VND`.
* **Scenario 03: Tự động cộng dồn nhiều Phụ phí hợp lệ**
  * **Given** Đơn đặt rơi vào ngày 01/01 (Tết Dương Lịch) lúc 04:00 sáng + di chuyển ngoài bán kính 5 km.
  * **When** Khách hàng xem màn hình Preview Hóa đơn (Invoice Preview API).
  * **Then** Hệ thống cộng dồn chính xác 3 loại phụ phí: `Phụ phí Lễ/Tết` + `Phụ phí Khung giờ 4h sáng` + `Phụ phí Khoảng cách vượt bán kính`, hiển thị rõ ràng từng mục.

---

## 💻 3. ĐẶC TẢ REST API ENDPOINTS

### 1. `POST /api/v1/master/categories` (Admin tạo Danh mục Gốc)
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "category_code": "MAKE_KY_YEU",
  "category_name": "Trang điểm Kỷ yếu / Học sinh - Sinh viên",
  "description": "Gói trang điểm nhẹ nhàng, độ bền cao cho sinh viên chụp ảnh kỷ yếu",
  "icon_url": "https://cdn.makeupbooking.vn/icons/ky-yeu.png"
}
```

---

### 2. `POST /api/v1/packages` (Tạo mới Gói Dịch vụ Studio / Freelancer)
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "master_category_id": 1,
  "package_name": "Gói Trang điểm Cô Dâu Tone Thái / Tây Luxury",
  "description": "Bao gồm làm tóc cô dâu cao cấp, dán mi gẩy sợi kiềm dầu 24h",
  "price": 2200000.00,
  "estimated_duration_minutes": 90,
  "style_ids": [2, 4],
  "items": [
    {
      "item_name": "Đánh nền kiềm dầu chuẩn HD",
      "item_type": "COMPONENT",
      "step_order": 1,
      "item_price": 0,
      "is_required": true
    },
    {
      "item_name": "Sơn móng tay gel cô dâu tone Pastel",
      "item_type": "ADD_ON",
      "step_order": 2,
      "item_price": 150000.00,
      "is_required": false
    }
  ]
}
```

---

### 3. `POST /api/v1/mua/styles` (Thợ Tự Do Đăng ký Danh sách Tone Make-up Thế mạnh)
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "style_ids": [1, 2, 4]
}
```
* **Response Body (`200 OK`):**
```json
{
  "success": true,
  "message": "Updated MUA makeup style capabilities successfully",
  "data": {
    "mua_id": 89,
    "styles": [
      { "id": 1, "style_code": "TONE_DOUYIN", "style_name": "Tone Hàn Douyin" },
      { "id": 2, "style_code": "TONE_THAI", "style_name": "Tone Thái Sang Trọng" },
      { "id": 4, "style_code": "TONE_TAY", "style_name": "Tone Tây Sắc Sảo" }
    ]
  }
}
```

---

### 4. `POST /api/v1/portfolios/showcases` (Đăng tải Album Ảnh Sản phẩm Hoàn thiện)
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
* **Request Body (Dành cho cả Thợ Tự Do & Thợ Studio):**
```json
{
  "package_id": 45,
  "style_id": 2,
  "title": "Cô dâu Tone Thái tone trầm kiềm dầu 24h",
  "image_url": "https://cdn.makeupbooking.vn/portfolio/codau_thai_01.jpg",
  "additional_images": [
    "https://cdn.makeupbooking.vn/portfolio/codau_thai_02.jpg",
    "https://cdn.makeupbooking.vn/portfolio/codau_thai_03.jpg"
  ],
  "description": "Thực hiện trang điểm cho khách hàng đám cưới tại Quận 1. Đánh nền mỏng nhẹ HD, dán mi gẩy sợi.",
  "is_featured": true
}
```
* **Response Body (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 512,
    "mua_id": 89,
    "staff_id": null,
    "package_id": 45,
    "style_id": 2,
    "title": "Cô dâu Tone Thái tone trầm kiềm dầu 24h",
    "image_url": "https://cdn.makeupbooking.vn/portfolio/codau_thai_01.jpg",
    "is_featured": true,
    "created_at": "2026-09-09T09:45:00Z"
  }
}
```

---

### 5. `GET /api/v1/portfolios/showcases` (Lấy danh sách Album Ảnh mẫu - Public / Khách xem)
* **Query Parameters:** `mua_id`, `staff_id`, `package_id`, `style_id`, `page=1`, `limit=12`
* **Response Body (`200 OK`):**
```json
{
  "success": true,
  "pagination": {
    "page": 1,
    "limit": 12,
    "total_records": 18,
    "total_pages": 2
  },
  "data": [
    {
      "id": 512,
      "title": "Cô dâu Tone Thái tone trầm kiềm dầu 24h",
      "image_url": "https://cdn.makeupbooking.vn/portfolio/codau_thai_01.jpg",
      "additional_images": [
        "https://cdn.makeupbooking.vn/portfolio/codau_thai_02.jpg"
      ],
      "package_name": "Gói Trang điểm Cô Dâu Luxury",
      "style_name": "Tone Thái Sang Trọng",
      "is_featured": true
    }
  ]
}
```

---

### 6. `POST /api/v1/surcharges/calculate` (API Compute Engine Tính Phụ phí Realtime)
* **Request Body:**
```json
{
  "provider_type": "FREELANCER",
  "provider_id": 89,
  "booking_time": "2026-09-15T04:15:00Z",
  "customer_latitude": 21.028511,
  "customer_longitude": 105.804817
}
```
* **Response Body (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "distance_km": 14.5,
    "free_radius_km": 10.0,
    "excess_distance_km": 4.5,
    "surcharge_breakdown": [
      {
        "type": "EARLY_MORNING_SLOT",
        "description": "Phụ phí làm sớm (04:15 sáng)",
        "amount": 150000.00
      },
      {
        "type": "OUT_OF_RADIUS_TRAVEL",
        "description": "Phụ phí di chuyển vượt bán kính (4.5 km x 15,000 VND)",
        "amount": 67500.00
      }
    ],
    "total_surcharge_amount": 217500.00
  }
}
```

---

## 🔑 4. PHÂN QUYỀN RBAC & JWT CLAIMS

Chi tiết permission codes được xác thực từ JWT Payload Token:

| Method | Endpoint URI | Role Cho phép | Required Permission Code |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/master/categories` | `ROLE_SUPER_ADMIN` | `catalog:master_manage` |
| `POST` | `/api/v1/master/styles` | `ROLE_SUPER_ADMIN` | `catalog:master_manage` |
| `POST` | `/api/v1/packages` | `ROLE_AGENCY_ADMIN`, `ROLE_FREELANCE_MUA` | `package:create` |
| `PUT` | `/api/v1/packages/{id}` | `ROLE_AGENCY_ADMIN`, `ROLE_FREELANCE_MUA` | `package:update` |
| `POST` | `/api/v1/mua/styles` | `ROLE_FREELANCE_MUA` | `mua:manage_style` |
| `POST` | `/api/v1/portfolios/showcases` | `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`, `ROLE_AGENCY_ADMIN` | `portfolio:upload` |
| `DELETE`| `/api/v1/portfolios/showcases/{id}`| `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_STAFF`, `ROLE_AGENCY_ADMIN` | `portfolio:delete` |
| `POST` | `/api/v1/agency/staff/{staffId}/services` | `ROLE_AGENCY_ADMIN` | `agency:assign_staff_skill` |
| `POST` | `/api/v1/agency/staff/{staffId}/styles` | `ROLE_AGENCY_ADMIN` | `agency:assign_staff_skill` |
| `POST` | `/api/v1/surcharges` | `ROLE_AGENCY_ADMIN`, `ROLE_FREELANCE_MUA` | `surcharge:configure` |
| `GET` | `/api/v1/portfolios/showcases` | Public / Khách hàng | None (Public access) |
| `POST` | `/api/v1/surcharges/calculate` | Public / Customer Logged-in | `booking:preview` |

---

## 🗄️ 5. CƠ SỞ DỮ LIỆU LIÊN QUAN (POSTGRESQL DDL SCHEMA)

Dưới đây là cấu trúc 9 bảng PostgreSQL 16 hoàn chỉnh quản lý Catalog, Năng lực Tone & Album Sản phẩm (đồng bộ 100% với `schema.sql`):

```sql
-- 1. DANH MỤC GỐC HỆ THỐNG
CREATE TABLE master_service_categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL, -- MAKE_TIEC, MAKE_CO_DAU, MAKE_KY_YEU...
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT
);

-- 2. DANH MỤC TONE/STYLE TRANG ĐIỂM HỆ THỐNG
CREATE TABLE makeup_styles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    style_code VARCHAR(50) UNIQUE NOT NULL, -- TONE_DOUYIN, TONE_THAI, TONE_HONG_BABY, TONE_TAY...
    style_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- 3. GÓI DỊCH VỤ (AGENCY VS FREELANCER)
CREATE TABLE service_packages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    master_category_id INT NOT NULL REFERENCES master_service_categories(id),
    agency_id BIGINT REFERENCES agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT REFERENCES mua_profiles(id) ON DELETE CASCADE,
    package_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    estimated_duration_minutes INT DEFAULT 60,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_package_owner CHECK (
        (agency_id IS NOT NULL AND mua_id IS NULL) OR 
        (agency_id IS NULL AND mua_id IS NOT NULL)
    )
);

-- 4. BƯỚC QUY TRÌNH & OPTION MUA THÊM (ADD-ONS)
CREATE TABLE package_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('COMPONENT', 'ADD_ON')),
    item_name VARCHAR(150) NOT NULL,
    step_order INT DEFAULT 1,
    item_price DECIMAL(12, 2) DEFAULT 0.00 CHECK (item_price >= 0),
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG TRUNG GIÁN GÓI - TONE TRANG ĐIỂM
CREATE TABLE package_styles (
    package_id BIGINT REFERENCES service_packages(id) ON DELETE CASCADE,
    style_id INT REFERENCES makeup_styles(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, style_id)
);

-- 6. GÁN KỸ NĂNG GÓI DỊCH VỤ CHO THỢ STUDIO
CREATE TABLE agency_staff_services (
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    package_id BIGINT REFERENCES service_packages(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(30) DEFAULT 'PRIMARY_MUA',
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (staff_id, package_id)
);

-- 7. GÁN KỸ NĂNG TONE TRANG ĐIỂM CHO THỢ STUDIO & THỢ TỰ DO
CREATE TABLE agency_staff_styles (
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    style_id INT REFERENCES makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (staff_id, style_id)
);

CREATE TABLE mua_styles (
    mua_id BIGINT REFERENCES mua_profiles(id) ON DELETE CASCADE,
    style_id INT REFERENCES makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (mua_id, style_id)
);
COMMENT ON TABLE mua_styles IS 'Bảng gán kỹ năng Tone Make-up trực tiếp cho Thợ trang điểm (áp dụng cho cả Thợ tự do và Thợ Studio)';

-- 8. ALBUM ẢNH SẢN PHẦM HOÀN THIỆN CỦA KHÁCH TRƯỚC ĐÓ (FREELANCER & AGENCY STAFF)
CREATE TABLE portfolio_showcases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_profiles(id) ON DELETE CASCADE,
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    package_id BIGINT REFERENCES service_packages(id) ON DELETE SET NULL,
    style_id INT REFERENCES makeup_styles(id) ON DELETE SET NULL,
    title VARCHAR(150),
    image_url TEXT NOT NULL,                  -- Ảnh sản phẩm make-up hoàn thiện của khách trước đó
    additional_images JSONB DEFAULT '[]'::jsonb, -- Album ảnh bổ sung (các góc chụp khác)
    description TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_showcase_owner CHECK (
        staff_id IS NOT NULL OR mua_id IS NOT NULL
    )
);
COMMENT ON TABLE portfolio_showcases IS 'Bảng lưu Album ảnh sản phẩm trang điểm thực tế của cả Thợ Tự Do và Thợ Studio';

-- 9. BẢNG CẤU HÌNH PHỤ PHÍ STUDIO & FREELANCER
CREATE TABLE surcharges (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT REFERENCES agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT REFERENCES mua_profiles(id) ON DELETE CASCADE,
    surcharge_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    is_active BOOLEAN DEFAULT TRUE
);
```
