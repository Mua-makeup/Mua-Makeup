# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ BACK-END CHI TIẾT
## PHÂN HỆ: QUẢN LÝ GÓI DỊCH VỤ (SERVICE CATALOG) & ĐỘNG CƠ PHỤ PHÍ (SURCHARGES)
### (Spring Boot Layered Monolith `core-api` - Schema: `catalog_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Service Package Catalog & Surcharge Engine`
* **Mã Jira Issues phụ trách (Sprint 1):**
  * `ISSUE-13.1`: Quản lý Danh mục Dịch vụ Gốc (`master_service_categories`) & Phong cách Make-up chuẩn sàn (`makeup_styles`).
  * `ISSUE-13.2`: CRUD Gói Dịch vụ Agency Catalog vs Freelancer Catalog (`service_packages`, `package_styles`).
  * `ISSUE-13.3`: Chi tiết các bước thực hiện mặc định & Tuỳ chọn mua thêm Add-on (`package_items`).
  * `ISSUE-13.4`: Gán Kỹ năng Gói Dịch vụ Studio cho thợ trực thuộc phụ trách (`agency_staff_services`).
  * `ISSUE-13.5`: Cấu hình Phụ phí linh hoạt (`surcharges`): Làm sớm (3h-5h sáng), di chuyển ngoài bán kính & ngày Lễ/Tết.
* **Mô hình Kiến trúc:** Spring Boot 3.3.x Layered Architecture Monolith (`core-api: 8080`).
* **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`makeup_platform_db`, schema: `catalog_schema` & bảng liên kết `agency_schema.agency_staff_services`).
* **Đối tượng Sử dụng (Personas):**
  1. **Agency Owner / Studio Admin (Chủ Studio / Đại lý):** Tạo, quản lý và niêm yết bảng giá các Gói dịch vụ của Studio (`agency_id` NOT NULL, `mua_id` = NULL), thiết lập các bước quy trình, phân quyền gói dịch vụ cho thợ trực thuộc phụ trách (`agency_staff_services`), cấu hình chính sách phụ phí làm sớm/đi tỉnh của Studio.
  2. **Freelance MUA (Thợ trang điểm tự do):** Tạo và quản lý Gói dịch vụ cá nhân (`mua_id` NOT NULL, `agency_id` = NULL), tùy biến add-on mua thêm, cấu hình phụ phí di chuyển theo km và phụ phí làm sớm.
  3. **Super Admin (Quản trị viên Hệ thống):** Quản lý Danh mục Gốc (Cưới hỏi, Tiệc, Kỷ yếu...) và gắn cờ kiểm duyệt gói dịch vụ vi phạm.
  4. **Customer (Khách hàng):** Xem danh mục gói dịch vụ, lọc theo mức giá/phong cách, chọn add-on mua thêm và xem bảng tính phụ phí tự động (Preview Hóa đơn) minh bạch trước khi bấm đặt lịch.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Mã nguồn tại `code/backend/core-api/` được tổ chức chặt chẽ theo chuẩn Layered Monolith cho phân hệ Catalog & Surcharge:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # Base Entity chứa id, created_at, updated_at
│   │   ├── BaseController.java                # Helper response chuẩn (ok, created, error)
│   │   ├── ApiResponse.java                   # JSON envelope: {success, code, message, data, timestamp}
│   │   ├── PageResponse.java                  # Envelope phân trang chuẩn
│   │   ├── BaseService.java
│   │   └── BaseServiceImpl.java
│   ├── constants/
│   │   ├── ErrorCodes.java                    # Bộ hằng số mã lỗi nghiệp vụ
│   │   └── SurchargeType.java                 # Enum: EARLY_MORNING, OUT_OF_RADIUS, HOLIDAY, CUSTOM
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Lỗi nghiệp vụ có mã lỗi ErrorCodes
│   │   ├── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (404)
│   │   └── AccessDeniedException.java         # Lỗi vi phạm phân quyền/IDOR (403)
│   ├── i18n/
│   │   ├── CustomLocaleResolver.java          # Đa ngôn ngữ Accept-Language
│   │   └── JsonMessageSource.java             # Nạp file i18n JSON
│   └── utils/
│       ├── SecurityContextUtils.java          # Tiện ích lấy user_id, agency_id, mua_id từ JWT
│       └── HolidayUtils.java                  # Tra cứu danh sách ngày Lễ/Tết Việt Nam theo năm
│
├── config/
│   └── SecurityConfig.java                    # Phân quyền URL & Method Security (@PreAuthorize)
│
├── controller/
│   └── catalog/
│       ├── MasterCategoryController.java      # /api/v1/master/categories (Danh mục gốc Admin)
│       ├── ServicePackageController.java      # /api/v1/packages (CRUD gói Agency vs Freelancer)
│       ├── PackageItemController.java         # /api/v1/packages/{packageId}/items (Add-ons & quy trình)
│       ├── AgencyStaffPackageController.java  # /api/v1/packages/staff-assignments (Gán gói dịch vụ cho thợ Studio)
│       └── SurchargeController.java           # /api/v1/surcharges (Cấu hình & Calculate phụ phí)
│
├── dto/
│   ├── request/catalog/
│   │   ├── CreatePackageReq.java              # @NotBlank name, @DecimalMin price, duration, styleIds
│   │   ├── UpdatePackageReq.java              # Cập nhật thông tin gói
│   │   ├── CreatePackageItemReq.java          # @NotBlank itemName, @NotNull itemType, itemPrice
│   │   ├── AssignStaffPackagesReq.java        # staffId, packageAssignments (packageId, proficiencyLevel)
│   │   ├── ConfigureSurchargeReq.java         # @NotNull surchargeType, @DecimalMin amount
│   │   └── CalculateSurchargeReq.java         # providerType, providerId, bookingTime, customerLat, customerLng
│   └── response/catalog/
│       ├── PackageDetailRes.java              # Chi tiết gói, danh sách styles, danh sách items add-on
│       ├── PackageSummaryRes.java             # Dùng trong danh sách tìm kiếm (gọn nhẹ, tối ưu)
│       ├── StaffPackageAssignmentRes.java     # Danh sách các gói Studio giao cho thợ phụ trách
│       ├── SurchargeDetailRes.java            # Chi tiết cấu hình phụ phí của Thợ / Studio
│       └── SurchargeCalculationRes.java       # Bóc tách từng loại phụ phí tính cho đơn hàng
│
├── entity/
│   └── catalog/
│       ├── MasterCategoryEntity.java          # table: master_service_categories
│       ├── ServicePackageEntity.java          # table: service_packages (CHECK constraint owner)
│       ├── PackageItemEntity.java             # table: package_items (COMPONENT / ADD_ON)
│       ├── PackageStyleEntity.java            # table: package_styles (Composite Key)
│       ├── AgencyStaffServiceEntity.java      # table: agency_schema.agency_staff_services (Composite PK)
│       └── SurchargeEntity.java               # table: surcharges
│
├── mapper/
│   └── catalog/
│       ├── MasterTaxonomyMapper.java          # MapStruct: MasterCategoryEntity <-> DTOs
│       ├── ServicePackageMapper.java          # MapStruct: ServicePackageEntity <-> DTOs
│       ├── PackageItemMapper.java             # MapStruct: PackageItemEntity <-> DTOs
│       └── SurchargeMapper.java               # MapStruct: SurchargeEntity <-> DTOs
│
├── repository/
│   └── catalog/
│       ├── MasterCategoryRepository.java
│       ├── ServicePackageRepository.java      # findByAgencyId, findByMuaId, findActiveById
│       ├── PackageItemRepository.java         # findByPackageIdOrderByStepOrderAsc
│       ├── PackageStyleRepository.java
│       ├── AgencyStaffServiceRepository.java  # findByStaffId, findByPackageId, deleteByStaffId
│       └── SurchargeRepository.java           # findByAgencyId, findByMuaId, findActiveByType
│
└── service/
    └── catalog/
        ├── MasterTaxonomyService.java
        ├── ServicePackageService.java         # Logic CRUD gói, kiểm tra sở hữu, validate giá
        ├── PackageItemService.java            # Logic thêm/sửa add-on, bước quy trình
        ├── SurchargeService.java              # Cấu hình phụ phí & Engine tính toán phụ phí realtime
        ├── helper/
        │   └── CatalogOwnerHelper.java        # Phân giải danh tính Studio vs MUA, ngăn chặn IDOR
        └── impl/
            ├── MasterTaxonomyServiceImpl.java
            ├── ServicePackageServiceImpl.java
            ├── PackageItemServiceImpl.java
            └── SurchargeServiceImpl.java
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD

---

### **US-CAT-01: Quản lý Gói Dịch vụ Studio vs Freelancer (Agency Catalog vs Freelancer Catalog)**
> **As a** Chủ Studio (Agency Owner) hoặc Thợ Trang điểm Tự do (Freelance MUA),  
> **I want to** tạo mới, chỉnh sửa, xem danh sách và bật/tắt trạng thái nhận khách cho các Gói Dịch vụ của mình,  
> **So that** khách hàng nắm được bảng giá niêm yết, thời gian thực hiện ước tính và các phong cách make-up mà gói đó hỗ trợ.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Chủ Studio tạo mới Gói Dịch vụ Studio thành công (Happy Path)**
  * **Given** Chủ Studio đã đăng nhập với quyền `ROLE_AGENCY_ADMIN` (`agency_id = 105`).
  * **When** Gửi request `POST /api/v1/packages` với thông tin:
    ```json
    {
      "master_category_id": 1,
      "package_name": "Gói Trang điểm Cô Dâu Luxury 2026",
      "description": "Bao gồm làm tóc cô dâu cao cấp, dán mi gẩy sợi kiềm dầu 24h",
      "price": 2500000.00,
      "estimated_duration_minutes": 90,
      "style_ids": [2, 4]
    }
    ```
  * **Then** Service kiểm tra `price >= 50000` và `estimated_duration_minutes >= 30`.
  * **And** Hệ thống khởi tạo bản ghi `service_packages` với `agency_id = 105`, `mua_id = NULL` (thỏa mãn constraint `check_package_owner`).
  * **And** Tự động lưu 2 bản ghi liên kết vào bảng trung gian `package_styles` (`style_id` = 2, 4).
  * **And** Trả về HTTP `201 Created` kèm toàn bộ dữ liệu gói dịch vụ.

* **Scenario 02: Thợ Tự do tạo Gói Dịch vụ cá nhân thành công**
  * **Given** Thợ tự do có vai trò `ROLE_FREELANCE_MUA` (`mua_id = 89`).
  * **When** Gửi request tạo gói `package_name = "Make-up Tiệc Tone Hàn Douyin"`, `price = 600000.00`.
  * **Then** Hệ thống tạo bản ghi với `agency_id = NULL`, `mua_id = 89`.
  * **And** Trả về HTTP `201 Created`.

* **Scenario 03: Chặn sửa/xóa Gói Dịch vụ của người khác (IDOR Prevention)**
  * **Given** Thợ A (`mua_id = 89`) sở hữu gói `package_id = 45`.
  * **When** Thợ B (`mua_id = 99`) cố tình gửi request `PUT /api/v1/packages/45` hoặc `DELETE /api/v1/packages/45`.
  * **Then** Backend đối chiếu quyền sở hữu và phát hiện `package.getMuaId() != 99`.
  * **And** Ném ra `AccessDeniedException` với mã lỗi `PACKAGE_ACCESS_DENIED`, trả về HTTP `403 Forbidden`.

* **Scenario 04: Thất bại do vi phạm validation giá hoặc thời gian**
  * **When** Người dùng gửi request tạo gói với `price = 0` hoặc `estimated_duration_minutes = 10`.
  * **Then** Tầng DTO kích hoạt Bean Validation ném lỗi `MethodArgumentNotValidException`.
  * **And** `GlobalExceptionHandler` trả về HTTP `400 Bad Request` với mã `VALIDATION_FAILED`.

* **Scenario 05: Bật / Tắt trạng thái hoạt động của Gói Dịch vụ**
  * **When** Chủ sở hữu gửi `PATCH /api/v1/packages/{id}/toggle-availability`.
  * **Then** Hệ thống đảo cờ `is_available` (`true` $\leftrightarrow$ `false`).
  * **And** Trả về HTTP `200 OK`. Khi `is_available = false`, khách hàng không thể chọn gói này khi đặt lịch.

---

### **US-CAT-02: Chi tiết Quy trình Thực hiện & Tùy chọn Mua thêm (Package Items & Add-ons)**
> **As a** Chủ Studio hoặc Thợ Tự do,  
> **I want to** định nghĩa các bước thực hiện mặc định trong gói và tạo danh mục các option mua thêm (Add-ons),  
> **So that** khách hàng hiểu rõ quy trình làm việc và có thể chọn mua thêm các dịch vụ bổ trợ khi đặt đơn.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Thêm bước quy trình mặc định (`COMPONENT`)**
  * **Given** Gói dịch vụ `package_id = 45` đã tồn tại và thuộc sở hữu của người tạo.
  * **When** Người dùng thêm item: `item_name = "Đánh nền mỏng nhẹ kiềm dầu chuẩn HD"`, `item_type = "COMPONENT"`, `is_required = true`, `step_order = 1`, `item_price = 0.00`.
  * **Then** Hệ thống lưu vào `package_items` với giá 0 VND và cờ `is_required = true`.
  * **And** Trả về HTTP `201 Created`.

* **Scenario 02: Thêm Option mua thêm tùy chọn (`ADD_ON`)**
  * **When** Thêm option: `item_name = "Tạo kiểu tóc uốn sóng Hàn Quốc kèm phụ kiện"`, `item_type = "ADD_ON"`, `is_required = false`, `item_price = 150000.00`.
  * **Then** Hệ thống lưu vào `package_items` với giá `150,000 VND` và cờ `is_required = false`.
  * **And** Khi Khách hàng chọn option này lúc đặt đơn, tổng tiền sẽ tự động cộng thêm 150,000 VND.

* **Scenario 03: Thất bại do Add-on có giá âm**
  * **When** Người dùng nhập `item_price = -50000.00`.
  * **Then** Bean Validation chặn lại và trả về HTTP `400 Bad Request` với mã lỗi `INVALID_ITEM_PRICE`.

---

### **US-CAT-03: Gán Kỹ năng Gói Dịch vụ cho Thợ Studio (`ISSUE-13.4`)**
> **As a** Chủ Studio / Đại lý (`ROLE_AGENCY_ADMIN`),  
> **I want to** phân công danh sách các Gói Dịch vụ của Studio cho từng thợ trực thuộc phụ trách và thiết lập vai trò (Thợ chính `PRIMARY_MUA` / Thợ phụ `ASSISTANT_MUA`),  
> **So that** thuật toán điều phối đơn hàng chỉ phân công các ca make-up cho thợ có đủ năng lực thực hiện gói đó, đảm bảo chất lượng dịch vụ cho khách hàng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Gán danh sách Gói dịch vụ cho thợ thành công (Happy Path)**
  * **Given** Chủ Studio (`agency_id = 1`) đã đăng nhập.
  * **And** Thợ `staff_id = 101` là nhân viên đang hoạt động (`is_active = true`) của Studio 1.
  * **When** Gửi request `PUT /api/v1/packages/staff-assignments`:
    ```json
    {
      "staff_id": 101,
      "package_assignments": [
        { "package_id": 1, "proficiency_level": "PRIMARY_MUA", "is_qualified": true },
        { "package_id": 2, "proficiency_level": "PRIMARY_MUA", "is_qualified": true },
        { "package_id": 5, "proficiency_level": "ASSISTANT_MUA", "is_qualified": true }
      ]
    }
    ```
  * **Then** Backend xác thực gói 1, 2, 5 đều thuộc sở hữu của Studio 1 (`agency_id = 1`).
  * **And** Xóa mapping cũ của `staff_id = 101` và lưu danh sách mới vào bảng `agency_schema.agency_staff_services`.
  * **And** Trả về HTTP `200 OK` kèm danh sách chi tiết các gói vừa được phân công.

* **Scenario 02: Chặn gán Gói dịch vụ không thuộc sở hữu của Studio**
  * **Given** Gói `package_id = 99` thuộc sở hữu của Studio khác (`agency_id = 2`) hoặc thuộc Thợ tự do (`mua_id = 45`).
  * **When** Chủ Studio 1 gửi gán `package_id = 99` cho thợ của mình.
  * **Then** Backend phát hiện gói 99 không thuộc Studio 1.
  * **And** Ném `CustomBusinessException` với mã lỗi `ERR_PACKAGE_NOT_OWNED_BY_AGENCY`, HTTP `400 BAD_REQUEST`.

* **Scenario 03: Chặn gán gói cho thợ không thuộc Studio hiện tại (IDOR Protection)**
  * **Given** Thợ `staff_id = 205` thuộc Studio khác (`agency_id = 3`).
  * **When** Chủ Studio 1 gửi gán gói cho `staff_id = 205`.
  * **Then** Backend kiểm tra thấy `staff.agency_id != current_agency_id`.
  * **And** Ném `AccessDeniedException` với mã lỗi `ERR_STAFF_NOT_IN_AGENCY`, HTTP `403 FORBIDDEN`.

---

### **US-SUR-01: Cấu hình Phụ phí Linh hoạt (Flexible Surcharge Configuration)**
> **As a** Chủ Studio hoặc Thợ Tự do,  
> **I want to** thiết lập mức phụ phí làm sớm (3h - 5h sáng), phụ phí di chuyển ngoài bán kính và phụ phí ngày Lễ/Tết,  
> **So that** hệ thống tự động tính chính xác chi phí phát sinh theo đúng chính sách của tôi mà không cần thương lượng thủ công.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Cấu hình Phụ phí Làm sớm (Early Morning Slot 3h - 5h sáng)**
  * **Given** Thợ tự do (`mua_id = 89`) thiết lập phụ phí khung giờ làm sớm.
  * **When** Gửi request `POST /api/v1/surcharges`:
    ```json
    {
      "surcharge_name": "Phụ phí làm sớm (03:00 - 05:00 sáng)",
      "surcharge_type": "EARLY_MORNING",
      "amount": 150000.00,
      "is_active": true
    }
    ```
  * **Then** Hệ thống lưu vào bảng `surcharges` gắn với `mua_id = 89`.
  * **And** Trả về HTTP `201 Created`.

* **Scenario 02: Cấu hình Phụ phí Di chuyển Vượt Bán kính (Distance Travel per Km)**
  * **Given** Thợ quy định giá di chuyển phát sinh: `surcharge_type = "DISTANCE_PER_KM"`, `amount = 15000.00` (15,000 VND/km).
  * **When** Gửi request cấu hình.
  * **Then** Bản ghi được lưu kích hoạt. Khi khách hàng đặt đơn cách thợ vượt bán kính miễn phí, hệ thống sẽ nhân số km vượt với mức giá này.

* **Scenario 03: Cấu hình Phụ phí ngày Lễ / Tết (Holiday Surcharge)**
  * **When** Cấu hình `surcharge_type = "HOLIDAY"`, `amount = 200000.00`.
  * **Then** Hệ thống tự động nhận diện các ngày nghỉ lễ quốc gia theo lịch pháp lý Việt Nam để áp dụng phụ phí này.

---

### **US-SUR-02: Động cơ Tính toán Phụ phí Tự động & Preview Hóa đơn (Realtime Surcharge Engine)**
> **As a** Khách hàng (Customer),  
> **I want** hệ thống tự động bóc tách và tính toán chính xác tổng phụ phí phát sinh dựa trên thời gian và địa điểm trang điểm,  
> **So that** tôi thấy rõ từng khoản tiền minh bạch trên hóa đơn trước khi xác nhận đặt đơn.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Tính toán tự động cộng dồn nhiều loại Phụ phí hợp lệ (Happy Path)**
  * **Given** Thợ có cấu hình:
    - Bán kính phục vụ miễn phí: `10.0 km`.
    - Phụ phí km vượt bán kính: `15,000 VND / km`.
    - Phụ phí làm sớm (3h - 5h sáng): `150,000 VND`.
    - Phụ phí ngày Lễ/Tết: `200,000 VND`.
  * **When** Khách hàng chọn lịch làm lúc **04:15 sáng** ngày **01/01/2027** (Tết Dương Lịch), địa điểm cách thợ **14.5 km** (vượt 4.5 km).
  * **And** Gọi API `POST /api/v1/surcharges/calculate`.
  * **Then** Engine tính toán bóc tách chi tiết:
    - `EARLY_MORNING`: 150,000 VND (do rơi vào khung 04:15).
    - `OUT_OF_RADIUS`: 4.5 km $\times$ 15,000 VND = 67,500 VND.
    - `HOLIDAY`: 200,000 VND (ngày Tết Dương Lịch).
  * **And** Tổng phụ phí trả về: `417,500 VND`.
  * **And** Trả về HTTP `200 OK` kèm mảng `surcharge_breakdown` rõ ràng từng mục.

* **Scenario 02: Không phát sinh phụ phí khi trong khung giờ và bán kính chuẩn**
  * **When** Khách đặt lúc 09:00 sáng ngày thường, khoảng cách 5.0 km (trong bán kính 10km).
  * **Then** `total_surcharge_amount = 0.00` và mảng `surcharge_breakdown` rỗng `[]`.

---

### **US-UI-01: Trải nghiệm Khách hàng Chọn Gói & Phụ phí trên Ứng dụng (Customer Selection Flow)**
> **As a** Khách hàng (Customer),  
> **I want to** xem danh sách gói dịch vụ, tích chọn các option add-on và xem hóa đơn tạm tính kèm phụ phí nhảy realtime,  
> **So that** tôi chủ động ngân sách và nắm rõ 100% chi phí trước khi bấm Đặt ca.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **AC-01**: Khách bấm vào Profile Thợ/Studio $\rightarrow$ Màn hình hiển thị Tab "Gói Dịch Vụ".
* **AC-02**: Khi nhấp vào 1 Gói $\rightarrow$ Mở rộng danh sách "Bước thực hiện (Đã bao gồm)" và danh sách checkbox "Dịch vụ mua thêm (Add-on)".
* **AC-03**: Khi khách tích/bỏ tích Add-on $\rightarrow$ Tổng tiền tạm tính ở góc dưới màn hình tự động cập nhật mượt mà (<16ms).
* **AC-04**: Khi chọn giờ đặt lịch (VD: 4h sáng) hoặc nhập địa chỉ $\rightarrow$ Khung "Chi tiết Phụ phí" tự động hiển thị dòng: `Phụ phí làm sớm: +150,000đ`, `Phụ phí di chuyển (4.5km): +67,500đ`.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI BACK-END

Tất cả các lỗi nghiệp vụ và lỗi xác thực dữ liệu đều được bắt qua `GlobalExceptionHandler.java`, trả về JSON chuẩn mực:

```json
{
  "success": false,
  "code": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Thông điệp lỗi thân thiện cho người dùng",
  "errors": [],
  "timestamp": "2026-09-10T11:35:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Chi tiết Phân hệ Catalog & Surcharge

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `VALIDATION_FAILED` | Dữ liệu vi phạm Bean Validation (`package_name` rỗng, `price < 50000`, `duration < 30`). | Trả về danh sách từng field vi phạm trong mảng `errors`. |
| **`400 BAD_REQUEST`** | `INVALID_PACKAGE_PRICE` | Giá gói dịch vụ nhỏ hơn mức sàn tối thiểu của hệ thống (50,000 VND). | Báo lỗi yêu cầu nhập giá gói hợp lệ. |
| **`400 BAD_REQUEST`** | `INVALID_ITEM_PRICE` | Giá Add-on âm (`item_price < 0`). | Ném ngoại lệ validation, chặn ghi database. |
| **`400 BAD_REQUEST`** | `INVALID_SURCHARGE_AMOUNT` | Mức phụ phí cấu hình nhỏ hơn 0 hoặc vượt quá mức trần quy định. | Báo lỗi giá trị phụ phí không hợp lệ. |
| **`400 BAD_REQUEST`** | `ERR_PACKAGE_NOT_OWNED_BY_AGENCY` | Gán gói dịch vụ cho thợ nhưng gói đó không thuộc quyền sở hữu của Studio. | Kiểm tra `package.agency_id == current_agency_id`. |
| **`401 UNAUTHORIZED`** | `UNAUTHORIZED` | Token JWT thiếu, hết hạn hoặc không hợp lệ khi gọi các API quản trị gói. | Spring Security chặn ở tầng Filter trước khi vào Controller. |
| **`403 FORBIDDEN`** | `PACKAGE_ACCESS_DENIED` | Thợ A cố tình sửa hoặc xóa gói dịch vụ của Thợ B hoặc Studio khác (Lỗ hổng IDOR). | Đối chiếu quyền sở hữu: `current_user.mua_id != package.mua_id`. |
| **`403 FORBIDDEN`** | `ERR_STAFF_NOT_IN_AGENCY` | Studio cố tình gán gói cho nhân sự không thuộc quyền quản lý của mình. | Đối chiếu `staff.agency_id == current_agency_id`. |
| **`403 FORBIDDEN`** | `SURCHARGE_ACCESS_DENIED` | Người dùng cố tình sửa cấu hình phụ phí của đơn vị khác. | Kiểm tra quyền sở hữu bản ghi phụ phí trong bảng `surcharges`. |
| **`404 NOT_FOUND`** | `PACKAGE_NOT_FOUND` | `package_id` không tồn tại trong DB hoặc đã bị xóa mềm. | Ném `ResourceNotFoundException("Gói dịch vụ không tồn tại")`. |
| **`404 NOT_FOUND`** | `ERR_STAFF_NOT_FOUND` | `staff_id` truyền vào không tìm thấy trong hệ thống nhân sự Studio. | Ném `ResourceNotFoundException("Nhân viên không tồn tại trong Studio")`. |
| **`404 NOT_FOUND`** | `PACKAGE_ITEM_NOT_FOUND` | `item_id` của bước thực hiện/add-on không tìm thấy trong gói. | Ném `ResourceNotFoundException("Dịch vụ bổ trợ không tồn tại")`. |
| **`404 NOT_FOUND`** | `MASTER_CATEGORY_NOT_FOUND` | `master_category_id` truyền vào không có trong danh mục gốc sàn. | Ném `ResourceNotFoundException("Danh mục dịch vụ gốc không tồn tại")`. |
| **`404 NOT_FOUND`** | `SURCHARGE_NOT_FOUND` | `surcharge_id` không tồn tại trong hệ thống. | Ném `ResourceNotFoundException("Cấu hình phụ phí không tồn tại")`. |
| **`409 CONFLICT`** | `CATEGORY_CODE_ALREADY_EXISTS` | Tạo mới Master Category nhưng mã `category_code` đã bị trùng. | Ném `CustomBusinessException` mã `409 Conflict`. |

---

### 4.2. Mã nguồn Validation DTO Mẫu (Bean Validation)

```java
package com.makeup.platform.dto.request.catalog;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class CreatePackageReq {

    @NotNull(message = "Danh mục gốc (master_category_id) không được để trống")
    private Integer masterCategoryId;

    @NotBlank(message = "Tên gói dịch vụ không được để trống")
    @Size(min = 5, max = 150, message = "Tên gói phải từ 5 đến 150 ký tự")
    private String packageName;

    @Size(max = 2000, message = "Mô tả gói tối đa 2000 ký tự")
    private String description;

    @NotNull(message = "Giá gói dịch vụ không được để trống")
    @DecimalMin(value = "50000.00", message = "Giá gói dịch vụ tối thiểu là 50,000 VND")
    @Digits(integer = 10, fraction = 2, message = "Định dạng giá tiền không hợp lệ")
    private BigDecimal price;

    @NotNull(message = "Thời gian ước tính không được để trống")
    @Min(value = 30, message = "Thời gian thực hiện tối thiểu 30 phút")
    @Max(value = 480, message = "Thời gian thực hiện tối đa 480 phút (8 tiếng)")
    private Integer estimatedDurationMinutes;

    @NotEmpty(message = "Gói dịch vụ phải hỗ trợ ít nhất 1 phong cách (style_ids)")
    private List<Integer> styleIds;
}
```

---

## 💻 5. ĐẶC TẢ REST API ENDPOINTS

---

### 5.1. `POST /api/v1/packages` (Tạo mới Gói Dịch vụ)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_FREELANCE_MUA`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "master_category_id": 1,
  "package_name": "Gói Trang điểm Cô Dâu Luxury 2026",
  "description": "Bao gồm làm tóc cô dâu cao cấp, dán mi gẩy sợi kiềm dầu 24h",
  "price": 2500000.00,
  "estimated_duration_minutes": 90,
  "style_ids": [2, 4]
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "code": "PACKAGE_CREATED",
  "message": "Tạo mới gói dịch vụ thành công!",
  "data": {
    "id": 45,
    "package_name": "Gói Trang điểm Cô Dâu Luxury 2026",
    "price": 2500000.00,
    "estimated_duration_minutes": 90,
    "is_available": true,
    "agency_id": 105,
    "mua_id": null,
    "styles": [
      { "id": 2, "code": "TONE_THAI", "name": "Tone Thái Sang Trọng" },
      { "id": 4, "code": "TONE_TAY", "name": "Tone Tây Sắc Sảo" }
    ],
    "created_at": "2026-09-10T11:40:00Z"
  },
  "timestamp": "2026-09-10T11:40:00Z"
}
```

---

### 5.2. `POST /api/v1/packages/{packageId}/items` (Thêm Add-on / Bước quy trình)
* **Quyền hạn:** Chủ sở hữu gói (`ROLE_AGENCY_ADMIN` hoặc `ROLE_FREELANCE_MUA`).
* **Request Body:**
```json
{
  "item_name": "Tạo kiểu tóc uốn sóng Hàn Quốc kèm hoa cài",
  "item_type": "ADD_ON", // Enum: COMPONENT | ADD_ON
  "step_order": 2,
  "item_price": 150000.00,
  "is_required": false
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "code": "PACKAGE_ITEM_CREATED",
  "message": "Thêm dịch vụ bổ trợ thành công!",
  "data": {
    "id": 112,
    "package_id": 45,
    "item_name": "Tạo kiểu tóc uốn sóng Hàn Quốc kèm hoa cài",
    "item_type": "ADD_ON",
    "item_price": 150000.00,
    "is_required": false,
    "is_active": true
  },
  "timestamp": "2026-09-10T11:41:00Z"
}
```

---

### 5.3. `POST /api/v1/surcharges` (Cấu hình Phụ phí Thợ / Studio)
* **Quyền hạn:** `ROLE_AGENCY_ADMIN` hoặc `ROLE_FREELANCE_MUA`.
* **Request Body:**
```json
{
  "surcharge_name": "Phụ phí làm sớm (03:00 - 05:00 sáng)",
  "surcharge_type": "EARLY_MORNING",
  "amount": 150000.00,
  "is_active": true
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "code": "SURCHARGE_CONFIGURED",
  "message": "Thiết lập phụ phí thành công!",
  "data": {
    "id": 18,
    "surcharge_name": "Phụ phí làm sớm (03:00 - 05:00 sáng)",
    "surcharge_type": "EARLY_MORNING",
    "amount": 150000.00,
    "is_active": true
  },
  "timestamp": "2026-09-10T11:42:00Z"
}
```

---

### 5.4. `POST /api/v1/surcharges/calculate` (Động cơ Tính toán Phụ phí Tự động - Preview Hóa đơn)
* **Quyền truy cập:** Công khai hoặc Khách hàng đã đăng nhập (`permitAll` / `hasAuthority('booking:preview')`).
* **Request Body:**
```json
{
  "provider_type": "FREELANCER", // FREELANCER hoặc AGENCY
  "provider_id": 89,
  "booking_time": "2027-01-01T04:15:00Z",
  "customer_latitude": 21.028511,
  "customer_longitude": 105.804817
}
```
* **Response `200 OK` (Bóc tách chi tiết):**
```json
{
  "success": true,
  "code": "SURCHARGE_CALCULATED",
  "message": "Tính toán phụ phí thành công",
  "data": {
    "distance_km": 14.5,
    "free_radius_km": 10.0,
    "excess_distance_km": 4.5,
    "surcharge_breakdown": [
      {
        "type": "EARLY_MORNING",
        "description": "Phụ phí làm sớm (04:15 sáng)",
        "amount": 150000.00
      },
      {
        "type": "OUT_OF_RADIUS",
        "description": "Phụ phí di chuyển vượt bán kính (4.5 km x 15,000 VND)",
        "amount": 67500.00
      },
      {
        "type": "HOLIDAY",
        "description": "Phụ phí ngày Lễ Tết (Tết Dương Lịch 01/01)",
        "amount": 200000.00
      }
    ],
    "total_surcharge_amount": 417500.00
  },
  "timestamp": "2026-09-10T11:43:00Z"
}
```

---

### 5.5. `PUT /api/v1/packages/staff-assignments` (Gán Gói Dịch Vụ Cho Thợ Studio - ISSUE-13.4)
* **Quyền truy cập:** `ROLE_AGENCY_ADMIN`.
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "staff_id": 101,
  "package_assignments": [
    {
      "package_id": 1,
      "proficiency_level": "PRIMARY_MUA",
      "is_qualified": true
    },
    {
      "package_id": 2,
      "proficiency_level": "PRIMARY_MUA",
      "is_qualified": true
    },
    {
      "package_id": 5,
      "proficiency_level": "ASSISTANT_MUA",
      "is_qualified": true
    }
  ]
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "STAFF_PACKAGES_ASSIGNED",
  "message": "Phân công gói dịch vụ cho thợ thành công!",
  "data": {
    "staff_id": 101,
    "assigned_packages": [
      {
        "package_id": 1,
        "package_name": "Gói Trang điểm Cô Dâu VIP",
        "proficiency_level": "PRIMARY_MUA",
        "is_qualified": true
      },
      {
        "package_id": 2,
        "package_name": "Gói Make-up Tiệc Luxury",
        "proficiency_level": "PRIMARY_MUA",
        "is_qualified": true
      },
      {
        "package_id": 5,
        "package_name": "Gói Chụp Ảnh Kỷ Yếu",
        "proficiency_level": "ASSISTANT_MUA",
        "is_qualified": true
      }
    ]
  },
  "timestamp": "2026-09-11T15:42:00Z"
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16)

```sql
-- 1. DANH MỤC DỊCH VỤ GỐC TOÀN SÀN
CREATE TABLE IF NOT EXISTS catalog_schema.master_service_categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,       -- MAKE_CO_DAU, MAKE_TIEC, MAKE_KY_YEU...
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. GÓI DỊCH VỤ (AGENCY VS FREELANCER)
CREATE TABLE IF NOT EXISTS catalog_schema.service_packages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    master_category_id INT NOT NULL REFERENCES catalog_schema.master_service_categories(id),
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    package_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 50000.00),
    estimated_duration_minutes INT DEFAULT 60 CHECK (estimated_duration_minutes >= 30),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_package_owner CHECK (
        (agency_id IS NOT NULL AND mua_id IS NULL) OR 
        (agency_id IS NULL AND mua_id IS NOT NULL)
    )
);

-- 3. BƯỚC QUY TRÌNH & DỊCH VỤ MUA THÊM (ADD-ONS)
CREATE TABLE IF NOT EXISTS catalog_schema.package_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES catalog_schema.service_packages(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('COMPONENT', 'ADD_ON')),
    item_name VARCHAR(150) NOT NULL,
    step_order INT DEFAULT 1,
    item_price DECIMAL(12, 2) DEFAULT 0.00 CHECK (item_price >= 0),
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG TRUNG GIAN GÓI - PHONG CÁCH
CREATE TABLE IF NOT EXISTS catalog_schema.package_styles (
    package_id BIGINT REFERENCES catalog_schema.service_packages(id) ON DELETE CASCADE,
    style_id INT REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, style_id)
);

-- 5. BẢNG CẤU HÌNH PHỤ PHÍ STUDIO & FREELANCER
CREATE TABLE IF NOT EXISTS catalog_schema.surcharges (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    surcharge_name VARCHAR(100) NOT NULL,
    surcharge_type VARCHAR(30) NOT NULL CHECK (surcharge_type IN ('EARLY_MORNING', 'OUT_OF_RADIUS', 'HOLIDAY', 'CUSTOM')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_surcharge_owner CHECK (
        (agency_id IS NOT NULL AND mua_id IS NULL) OR 
        (agency_id IS NULL AND mua_id IS NOT NULL)
    )
);

-- 6. BẢNG GÁN KỸ NĂNG GÓI DỊCH VỤ CỦA STUDIO CHO THỢ (AGENCY STAFF SERVICES - ISSUE-13.4)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_services (
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL REFERENCES catalog_schema.service_packages(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(30) DEFAULT 'PRIMARY_MUA' NOT NULL, -- PRIMARY_MUA, ASSISTANT_MUA
    is_qualified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (staff_id, package_id)
);

-- CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_packages_agency ON catalog_schema.service_packages(agency_id, is_available);
CREATE INDEX IF NOT EXISTS idx_packages_mua ON catalog_schema.service_packages(mua_id, is_available);
CREATE INDEX IF NOT EXISTS idx_package_items ON catalog_schema.package_items(package_id, is_active, step_order);
CREATE INDEX IF NOT EXISTS idx_surcharges_owner ON catalog_schema.surcharges(agency_id, mua_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_staff_services_pkg ON agency_schema.agency_staff_services(package_id);
```

---

## 🛡️ 7. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Hiệu năng Tính toán (Calculation Latency)**:
   - API tính toán phụ phí (`POST /api/v1/surcharges/calculate`) phải có thời gian phản hồi **< 30ms** để phục vụ việc cập nhật tức thì (realtime update) trên giao diện chọn giờ/chọn địa điểm của khách hàng mà không gây giật lag.
2. **Tính Toàn vẹn Dữ liệu Sở hữu (Integrity Constraints)**:
   - Đảm bảo 100% bản ghi gói dịch vụ và phụ phí tuân thủ ràng buộc XOR giữa `agency_id` và `mua_id` (`check_package_owner` và `check_surcharge_owner`). Không bao giờ có bản ghi mồ côi hoặc thuộc về cả 2 cùng lúc.
3. **Bảo mật & Kiểm soát IDOR (IDOR Prevention)**:
   - Mọi thao tác chỉnh sửa/xóa gói hoặc phụ phí đều được kiểm tra quyền sở hữu đối chiếu trực tiếp từ Principal Token JWT (`current_user`), ngăn chặn triệt để tấn công đổi giá hoặc xóa gói của đối thủ cạnh tranh.
