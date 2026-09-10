# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ BACK-END CHI TIẾT
## PHÂN HỆ: MUA PROFILE, SKILL MATRIX & PORTFOLIO SHOWCASE GALLERY
### (Spring Boot Layered Monolith `core-api` - Schemas: `mua_schema`, `catalog_schema`, `agency_schema`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG & MỤC TIÊU NGHIỆP VỤ (FEATURE OVERVIEW)

* **Tên Phân hệ (Domain Feature):** `MUA Profile, Makeup Style Matrix & Portfolio Showcase Gallery`
* **Kiến trúc Triển khai:** Spring Boot 3.3.x Layered Architecture Monolith (`core-api`, Port `8080`).
* **Cơ sở Dữ liệu Liên kết:** PostgreSQL 16 + PostGIS (`makeup_platform_db`)
  * `mua_schema`: Quản lý hồ sơ thợ tự do (`mua_profiles`), kỹ năng phong cách (`mua_styles`), lịch cá nhân (`mua_calendars`).
  * `catalog_schema`: Danh mục phong cách trang điểm toàn sàn (`makeup_styles`), album ảnh tác phẩm mẫu (`portfolio_showcases`).
  * `agency_schema`: Quản lý nhân viên Studio (`agency_staff`), kỹ năng phong cách nhân viên Studio (`agency_staff_styles`).
* **Hệ thống Lưu trữ Media & Caching:**
  * **Cloud Storage:** Cloudinary SDK / AWS S3 (Nén WebP, sinh tự động `thumbnail_url` 400x400 và `high_res_url` 1920x1080).
  * **In-Memory Cache:** Redis 7.2 (Cache danh sách Gallery công khai, TTL 15 phút, tự động Evict khi có tác phẩm mới hoặc thay đổi).
* **Mã Jira Issues liên quan:**
  * `ISSUE-11.1`: Hồ sơ Thợ Make-up (`mua_profiles`), Bio, kinh nghiệm & Bằng cấp chứng chỉ.
  * `ISSUE-11.2`: Tích hợp CDN Media Service (Cloudinary/S3) nén ảnh WebP và kiểm duyệt file.
  * `ISSUE-11.3`: Quản lý Album Ảnh sản phẩm hoàn thiện của khách trước đó (`portfolio_showcases`).
  * `ISSUE-12.4`: Quản lý Năng lực thợ Studio theo Tone Make-up (`agency_staff_styles`).
  * `ISSUE-13.1`: Quản lý Danh mục Tone/Style Trang điểm chuẩn toàn hệ thống (`makeup_styles`).
* **Đối tượng Người dùng (User Personas):**
  1. **Freelance MUA (Thợ trang điểm tự do):** Cập nhật Profile chuyên nghiệp, tự khai báo danh sách Tone sở trường (`mua_styles`), tải album ảnh tác phẩm thực tế hoàn thiện cho khách (`portfolio_showcases`), chọn tối đa 6 ảnh tiêu biểu ghim đầu hồ sơ.
  2. **Agency Owner / Studio Admin (Chủ Đại lý):** Đăng tải tác phẩm hoàn thiện của nhân viên thuộc Studio (`staff_id`), gán kỹ năng Tone phong cách cho nhân viên (`agency_staff_styles`) phục vụ thuật toán điều phối (Dispatching).
  3. **Agency Staff (Thợ thuộc Studio):** Được chủ Studio phân quyền gán style và liên kết tác phẩm làm tại Studio vào hồ sơ nghề nghiệp.
  4. **Customer (Khách hàng):** Khám phá Gallery hình ảnh thực tế, lọc ảnh theo đúng [Gói dịch vụ + Tone Make-up] và bấm "Đặt lịch với phong cách này".
  5. **Super Admin (Quản trị viên):** Quản lý danh mục `makeup_styles` chuẩn sàn, kiểm duyệt hoặc gỡ bỏ ảnh vi phạm tiêu chuẩn cộng đồng.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Mã nguồn tại `code/backend/core-api/` tuân thủ nghiêm ngặt chuẩn mực Layered Architecture:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # @MappedSuperclass (id, created_at, updated_at)
│   │   ├── BaseController.java                # Helper response (ok, created, error)
│   │   └── ApiResponse.java                   # Chuẩn envelope JSON: <T> {success, code, message, data, timestamp}
│   ├── constants/
│   │   ├── ErrorCode.java                     # Định nghĩa hằng số mã lỗi nghiệp vụ
│   │   └── MediaConstants.java                # Giới hạn kích thước file, magic bytes, allowed extensions
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice bắt và chuẩn hóa toàn bộ lỗi
│   │   ├── CustomBusinessException.java       # Lỗi vi phạm logic nghiệp vụ kế thừa RuntimeException
│   │   ├── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (404)
│   │   ├── AccessDeniedException.java         # Lỗi vi phạm quyền sở hữu IDOR (403)
│   │   └── MediaUploadException.java          # Lỗi xử lý file, kết nối Cloudinary/S3 (400/502)
│   └── utils/
│       ├── FileValidationUtils.java           # Kiểm tra Magic Bytes chống file giả mạo đuôi
│       └── SecurityContextUtils.java          # Tiện ích trích xuất user_id, mua_id, roles từ SecurityContext
│
├── config/
│   ├── CloudinaryConfig.java                  # Bean Cloudinary SDK cấu hình từ application.yaml
│   ├── RedisConfig.java                       # RedisTemplate & CacheManager
│   └── SecurityConfig.java                    # Phân quyền URL & Method Security (@EnableMethodSecurity)
│
├── controller/
│   ├── mua/
│   │   ├── MuaProfileController.java          # /api/v1/muas (Hồ sơ thợ, bằng cấp)
│   │   └── MuaStyleController.java            # /api/v1/muas/my-profile/styles (Khai báo tone sở trường)
│   ├── catalog/
│   │   ├── PortfolioController.java           # /api/v1/portfolios (Upload showcase, toggle featured, gallery)
│   │   └── MakeupStyleController.java         # /api/v1/makeup-styles (Danh mục phong cách chuẩn sàn)
│   └── agency/
│       └── AgencyStaffStyleController.java    # /api/v1/agencies/staff/{staffId}/styles (Gán tone cho thợ studio)
│
├── dto/
│   ├── request/
│   │   ├── mua/
│   │   │   ├── UpdateMuaProfileReq.java       # @NotBlank bio, @Min(0) experience_years, radius_km
│   │   │   └── AssignMuaStylesReq.java        # @NotEmpty Set<Integer> styleIds
│   │   ├── catalog/
│   │   │   ├── CreatePortfolioReq.java        # Multipart: title, package_id, style_id, is_featured
│   │   │   ├── UpdatePortfolioReq.java        # Cập nhật thông tin mô tả, style_id, package_id
│   │   │   └── PortfolioFilterReq.java        # Query params: muaId, staffId, agencyId, styleId, isFeatured
│   │   └── agency/
│   │       └── AssignStaffStylesReq.java      # Gán style cho nhân viên studio
│   └── response/
│       ├── mua/
│       │   ├── MuaProfileDetailRes.java       # Thông tin profile thợ + danh sách styles + badges
│       │   └── MuaStyleRes.java               # id, style_code, style_name, is_qualified
│       └── catalog/
│           ├── PortfolioDetailRes.java        # Chi tiết tác phẩm, ảnh chính, thumb, additional_images
│           ├── PortfolioSummaryRes.java       # Dùng trong danh sách Gallery (nhẹ, tối ưu CDN)
│           └── MakeupStyleRes.java            # Taxonomy phong cách
│
├── entity/
│   ├── mua/
│   │   ├── MuaProfileEntity.java              # schema = "mua_schema", table = "mua_profiles"
│   │   └── MuaStyleEntity.java                # schema = "mua_schema", table = "mua_styles" (Composite Key)
│   ├── catalog/
│   │   ├── MakeupStyleEntity.java             # schema = "catalog_schema", table = "makeup_styles"
│   │   └── PortfolioShowcaseEntity.java       # schema = "catalog_schema", table = "portfolio_showcases"
│   └── agency/
│       ├── AgencyProfileEntity.java           # schema = "agency_schema", table = "agency_profiles"
│       ├── AgencyStaffEntity.java             # schema = "agency_schema", table = "agency_staff"
│       └── AgencyStaffStyleEntity.java        # schema = "agency_schema", table = "agency_staff_styles"
│
├── repository/
│   ├── mua/
│   │   ├── MuaProfileRepository.java
│   │   └── MuaStyleRepository.java
│   ├── catalog/
│   │   ├── MakeupStyleRepository.java
│   │   └── PortfolioShowcaseRepository.java   # Custom JPA Specification & Native Queries
│   └── agency/
│       ├── AgencyStaffRepository.java
│       └── AgencyStaffStyleRepository.java
│
└── service/
    ├── MuaProfileService.java
    ├── MuaStyleService.java
    ├── PortfolioService.java
    ├── MakeupStyleService.java
    ├── AgencyStaffStyleService.java
    ├── MediaStorageService.java               # Xử lý nén ảnh, upload, sinh thumbnail, dọn dẹp file cloud
    └── impl/
        ├── MuaProfileServiceImpl.java
        ├── MuaStyleServiceImpl.java
        ├── PortfolioServiceImpl.java
        ├── MakeupStyleServiceImpl.java
        ├── AgencyStaffStyleServiceImpl.java
        └── CloudinaryMediaServiceImpl.java
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ NGHIỆM THU BDD

---

### **US-PORT-01: Quản lý Hồ sơ Tay nghề & Bằng cấp Thợ (MUA Professional Profile)**
> **As a** Thợ Trang điểm Tự do (Freelance MUA),  
> **I want to** cập nhật thông tin giới thiệu bản thân (Bio), số năm kinh nghiệm, bán kính phục vụ tối đa và tải lên chứng chỉ bằng cấp nghề nghiệp,  
> **So that** khách hàng có bằng chứng xác thực về độ uy tín và hệ thống định vị quét đúng phạm vi nhận đơn của tôi.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Cập nhật thông tin Profile thành công (Happy Path)**
  * **Given** Thợ đã đăng nhập hợp lệ với vai trò `ROLE_FREELANCE_MUA`, sở hữu `mua_id = 89`.
  * **When** Thợ gửi request `PUT /api/v1/muas/my-profile` với:
    ```json
    {
      "bio": "Chuyên viên trang điểm cô dâu tone Thái & Douyin hơn 6 năm kinh nghiệm",
      "experience_years": 6,
      "max_service_radius_km": 15.0
    }
    ```
  * **Then** Tầng Service kiểm tra `experience_years >= 0` và `1.0 <= max_service_radius_km <= 50.0`.
  * **And** Cập nhật bản ghi tương ứng trong bảng `mua_profiles`.
  * **And** Hệ thống trả về HTTP `200 OK` với thông báo cập nhật thành công và xóa cache hồ sơ thợ trên Redis.

* **Scenario 02: Tải lên Chứng chỉ / Bằng cấp nghề nghiệp (Certificates Upload)**
  * **Given** Thợ tải lên file chứng chỉ (`cert_pro.jpg`) qua `POST /api/v1/muas/my-profile/certificates`.
  * **When** Server kiểm tra định dạng file (JPG/PNG/WEBP) và dung lượng (< 5MB).
  * **Then** Service tải ảnh lên Cloudinary thư mục `mua_certs/`, lưu URL vào mảng JSONB `certificates` trong `mua_profiles` với cờ `is_verified = false`.
  * **And** Trả về HTTP `201 Created` kèm danh sách chứng chỉ hiện tại.

* **Scenario 03: Thất bại do vi phạm validation dữ liệu**
  * **When** Thợ nhập `experience_years = -1` hoặc `max_service_radius_km = 120.0` (vượt quá 50km).
  * **Then** Tầng Controller kích hoạt Bean Validation và ném ra `MethodArgumentNotValidException`.
  * **And** `GlobalExceptionHandler` bắt lỗi và trả về HTTP `400 Bad Request` với mã lỗi `VALIDATION_FAILED`.

---

### **US-PORT-02: Đăng tải Tác phẩm Hoàn thiện lên Bộ sưu tập (Portfolio Showcase Upload)**
> **As a** Thợ Trang điểm Tự do (Freelance MUA) hoặc Chủ Studio (Agency Owner),  
> **I want to** tải lên hình ảnh sản phẩm trang điểm thực tế hoàn thiện của khách trước đó, gắn liên kết Gói dịch vụ và Phong cách make-up tương ứng,  
> **So that** chứng minh tay nghề thực tế cho khách hàng xem trước khi quyết định đặt lịch.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Thợ tự do đăng tác phẩm thành công (Happy Path)**
  * **Given** Thợ tự do đăng nhập sở hữu quyền `portfolio:upload` (`mua_id = 89`).
  * **When** Thợ gửi request Multipart `POST /api/v1/portfolios`:
    - `image_file`: File ảnh chính hợp lệ (4.2MB, kích thước 1920x1080).
    - `additional_files`: 2 ảnh góc chụp cận cảnh mặt & tóc (mỗi ảnh < 3MB).
    - `title`: "Trang điểm cô dâu tone Thái sang trọng đón dâu".
    - `description`: "Đánh nền mỏng nhẹ che phủ 24h, dán mi gẩy sợi tự nhiên".
    - `package_id`: 45 (Gói Cô Dâu thuộc quyền sở hữu của thợ).
    - `style_id`: 2 (Tone Thái).
    - `is_featured`: `false`.
  * **Then** Backend thực thi quy trình tuần tự:
    1. Kiểm tra Magic Bytes file ảnh chính và các file phụ.
    2. Kiểm tra `package_id = 45` có `mua_id = 89` (hợp lệ).
    3. Kiểm tra `style_id = 2` tồn tại trong bảng `makeup_styles`.
    4. Upload ảnh chính lên Cloudinary: tự động sinh `image_url` (gốc) và `thumbnail_url` (400x400 nén WebP).
    5. Upload các ảnh phụ lên Cloudinary và tổng hợp mảng URL JSONB `additional_images`.
    6. Lưu bản ghi vào bảng `portfolio_showcases` với `mua_id = 89`, `staff_id = NULL`.
    7. Xóa cache danh sách gallery liên quan trên Redis.
  * **And** Trả về HTTP `201 Created` kèm toàn bộ dữ liệu bản ghi vừa tạo.

* **Scenario 02: Chủ Studio đăng tác phẩm cho Nhân viên thuộc Studio**
  * **Given** Chủ Studio có vai trò `ROLE_AGENCY_ADMIN` (`agency_id = 105`).
  * **When** Gửi request tạo showcase kèm `staff_id = 12`.
  * **Then** Service kiểm tra `staff_id = 12` có thuộc `agency_id = 105` hay không.
  * **And** Nếu đúng: Lưu vào `portfolio_showcases` với `staff_id = 12`, `mua_id = staff.mua_id`.
  * **And** Trả về HTTP `201 Created`.

* **Scenario 03: Thất bại do tải lên file giả mạo hoặc chứa mã độc**
  * **Given** Kẻ gian đổi tên file script độc hại `malware.sh` thành `photo.jpg` và gửi upload.
  * **When** `FileValidationUtils.validateImage()` đọc mảng byte đầu file (Magic Bytes).
  * **Then** Phát hiện header không khớp với chuẩn JPEG (`FF D8 FF`), PNG (`89 50 4E 47`) hay WebP (`52 49 46 46`).
  * **And** Hệ thống ném ra `CustomBusinessException` với mã lỗi `INVALID_FILE_MAGIC_BYTES`, hủy luồng xử lý và trả về HTTP `400 Bad Request`. Không có file nào được đẩy lên Cloudinary.

* **Scenario 04: Thất bại do liên kết Gói dịch vụ không thuộc quyền sở hữu (IDOR Check)**
  * **Given** Thợ A (`mua_id = 89`) cố tình truyền `package_id = 999` (thuộc về Thợ B).
  * **When** Service truy vấn `service_packages` theo ID.
  * **Then** Hệ thống phát hiện `package.getMuaId() != 89`.
  * **And** Ném ra `AccessDeniedException` với mã lỗi `PACKAGE_NOT_OWNED`, trả về HTTP `403 Forbidden`.

* **Scenario 05: Thất bại do vượt quá số lượng ảnh phụ cho phép**
  * **Given** Người dùng đính kèm 7 ảnh phụ trong trường `additional_files`.
  * **When** Service kiểm tra `additional_files.size() > 5`.
  * **Then** Ném ra `CustomBusinessException` với mã lỗi `TOO_MANY_ADDITIONAL_IMAGES`, trả về HTTP `400 Bad Request`.

---

### **US-PORT-03: Gán & Quản lý Danh mục Tone Phong cách Sở trường (Skill & Style Assignment)**
> **As a** Thợ Tự Do (Freelance MUA) hoặc Quản lý Studio (Agency Owner),  
> **I want to** chọn và cập nhật danh sách các Tone phong cách trang điểm tay nghề làm được từ danh mục chuẩn toàn sàn,  
> **So that** hồ sơ của tôi (hoặc nhân viên Studio) hiển thị mác tay nghề minh bạch và xuất hiện chính xác khi Khách hàng tìm kiếm theo phong cách.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Thợ tự do đồng bộ Tone sở trường thành công**
  * **Given** Thợ tự do (`mua_id = 89`) gửi request `PUT /api/v1/muas/my-profile/styles`:
    ```json
    {
      "style_ids": [1, 2, 4]
    }
    ```
  * **When** Service kiểm tra toàn bộ `style_ids` tồn tại trong bảng `makeup_styles`.
  * **Then** Trong một `@Transactional`:
    1. Xóa các bản ghi trong `mua_styles` có `mua_id = 89` mà không nằm trong danh sách mới.
    2. Chèn các bản ghi mới với `is_qualified = true`, `assigned_at = CURRENT_TIMESTAMP`.
  * **And** Trả về HTTP `200 OK` kèm danh sách phong cách đã cập nhật.

* **Scenario 02: Quản lý Studio gán Tone cho Nhân viên Studio**
  * **Given** Quản lý Studio (`agency_id = 105`) muốn gán Tone Thái (`style_id = 2`) cho thợ `staff_id = 12`.
  * **When** Gửi request `POST /api/v1/agencies/staff/12/styles` với `style_ids = [2]`.
  * **Then** Service xác minh `staff_id = 12` thuộc quyền quản lý của Studio `105`.
  * **And** Cập nhật bảng `agency_staff_styles` với `is_qualified = true`.
  * **And** Thuật toán Dispatching sẽ nhận diện nhân viên này đủ điều kiện nhận ca Tone Thái của Studio.

* **Scenario 03: Thất bại khi truyền Style ID không tồn tại**
  * **When** Thợ gửi `style_ids = [1, 99999]`.
  * **Then** Service kiểm tra thấy `99999` không tồn tại trong `makeup_styles`.
  * **And** Ném ra `ResourceNotFoundException` với mã lỗi `STYLE_NOT_FOUND`, trả về HTTP `404 Not Found`.

---

### **US-PORT-04: Quản lý Ghim Tác phẩm Tiêu biểu (Toggle Featured Showcase)**
> **As a** Thợ Make-up hoặc Chủ Studio,  
> **I want to** bật/tắt cờ đánh dấu tác phẩm tiêu biểu (`is_featured = true`) cho tối đa 6 tác phẩm xuất sắc nhất,  
> **So that** những tác phẩm đẹp nhất luôn hiển thị ngay đầu hồ sơ tạo ấn tượng thị giác mạnh mẽ với khách hàng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Ghim tác phẩm thành công khi chưa vượt quá hạn mức**
  * **Given** Thợ (`mua_id = 89`) hiện có 4 tác phẩm đang đặt `is_featured = true`.
  * **When** Gửi request `PATCH /api/v1/portfolios/{id}/featured` với body `{"is_featured": true}`.
  * **Then** Service khóa dòng kiểm tra hạn mức bằng câu truy vấn `SELECT COUNT(*) FROM portfolio_showcases WHERE mua_id = 89 AND is_featured = true FOR UPDATE`.
  * **And** Số lượng hiện tại (4) < 6 $\rightarrow$ Cập nhật bản ghi `is_featured = true`.
  * **And** Trả về HTTP `200 OK` và xóa cache liên quan.

* **Scenario 02: Thất bại do vượt quá giới hạn 6 tác phẩm tiêu biểu**
  * **Given** Thợ đã có đủ 6 tác phẩm có cờ `is_featured = true`.
  * **When** Cố tình gửi request ghim thêm tác phẩm thứ 7.
  * **Then** Service kiểm tra `count >= 6`.
  * **And** Ném ra `CustomBusinessException` với mã lỗi `PORTFOLIO_FEATURED_LIMIT_EXCEEDED` và thông điệp: *"Bạn chỉ được phép ghim tối đa 6 tác phẩm tiêu biểu. Vui lòng bỏ ghim bớt tác phẩm cũ trước"*.
  * **And** Trả về HTTP `400 Bad Request`.

* **Scenario 03: Bỏ ghim tác phẩm tiêu biểu**
  * **Given** Tác phẩm đang có `is_featured = true`.
  * **When** Gửi request với `{"is_featured": false}`.
  * **Then** Hệ thống cập nhật `is_featured = false`, trả về HTTP `200 OK`.

---

### **US-PORT-05: Khám phá & Lọc Bộ sưu tập Tác phẩm Công khai (Public Showcase Gallery)**
> **As a** Khách hàng (Customer),  
> **I want to** xem danh sách tác phẩm thực tế của thợ hoặc toàn sàn và lọc theo Tone make-up (Tone Hàn, Thái, Tây...),  
> **So that** tôi đánh giá được tay nghề thực tế và chọn được thợ có phong cách phù hợp nhất với mong muốn.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Khách hàng xem Gallery tác phẩm có phân trang & lọc theo Tone**
  * **Given** Khách hàng truy cập trang Portfolio chung hoặc Profile của thợ `mua_id = 89`.
  * **When** Gọi `GET /api/v1/portfolios?mua_id=89&style_id=2&page=0&size=12`.
  * **Then** Backend kiểm tra cache Redis `portfolio:gallery:mua_89:style_2:page_0:size_12`.
  * **And** Nếu Cache Miss: Truy vấn Database sắp xếp ưu tiên `is_featured DESC, created_at DESC`, trả về DTO gọn nhẹ chứa `thumbnail_url`.
  * **And** Ghi kết quả vào Redis với TTL 15 phút.
  * **And** Trả về HTTP `200 OK` kèm thông tin phân trang chuẩn `ApiResponse<PageResponse<PortfolioSummaryRes>>`.

* **Scenario 02: Xem chi tiết một tác phẩm kèm các góc chụp bổ sung**
  * **When** Khách hàng gọi `GET /api/v1/portfolios/{id}`.
  * **Then** Trả về đầy đủ: ảnh chính chất lượng cao (`image_url`), mảng ảnh góc chụp khác (`additional_images`), tên thợ, tên gói dịch vụ và phong cách.

---

### **US-PORT-06: Chỉnh sửa Thông tin Tác phẩm Showcase (Update Portfolio)**
> **As a** Chủ sở hữu tác phẩm (Thợ tự do hoặc Quản lý Studio),  
> **I want to** cập nhật tiêu đề, mô tả hoặc thay đổi Tone/Gói dịch vụ liên kết của tác phẩm,  
> **So that** thông tin tác phẩm luôn chính xác và phù hợp với dịch vụ hiện hành.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Cập nhật thành công bởi chính chủ sở hữu**
  * **Given** Thợ tự do (`mua_id = 89`) sở hữu tác phẩm `id = 502`.
  * **When** Gửi request `PUT /api/v1/portfolios/502` với `title = "Tone Thái Luxury cập nhật"`, `style_id = 3`.
  * **Then** Service xác minh quyền sở hữu, cập nhật bản ghi trong DB.
  * **And** Trả về HTTP `200 OK` kèm dữ liệu mới.

* **Scenario 02: Từ chối khi người dùng khác cố tình chỉnh sửa (IDOR Prevention)**
  * **Given** Thợ B (`mua_id = 99`) cố tình gửi request sửa tác phẩm của Thợ A (`id = 502`).
  * **When** Backend kiểm tra `showcase.getMuaId() != 99`.
  * **Then** Ném ra `AccessDeniedException` với mã lỗi `PORTFOLIO_ACCESS_DENIED`, trả về HTTP `403 Forbidden`.

---

### **US-PORT-07: Xóa Tác phẩm khỏi Bộ sưu tập (Delete Portfolio & Cloud Asset Cleanup)**
> **As a** Chủ sở hữu tác phẩm hoặc Quản trị viên Sàn (Super Admin),  
> **I want to** xóa một tác phẩm không còn phù hợp khỏi bộ sưu tập,  
> **So that** khách hàng không nhìn thấy hình ảnh cũ và hệ thống tự động dọn dẹp file vật lý trên Cloud để tiết kiệm dung lượng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**
* **Scenario 01: Xóa tác phẩm thành công và dọn dẹp file Cloud**
  * **Given** Thợ sở hữu tác phẩm `id = 502` chứa ảnh trên Cloudinary (`public_id = "portfolios/img_502"`).
  * **When** Gửi request `DELETE /api/v1/portfolios/502`.
  * **Then** Service thực thi:
    1. Kiểm tra quyền sở hữu hoặc quyền Admin (`admin:moderate_media`).
    2. Xóa bản ghi trong database table `portfolio_showcases`.
    3. Phát sự kiện bất đồng bộ qua Spring EventBus: `applicationEventPublisher.publishEvent(new MediaCleanupEvent(publicIds))`.
    4. Task `@Async @EventListener` gọi Cloudinary API xóa vĩnh viễn các ảnh chính và ảnh phụ tương ứng.
    5. Xóa cache liên quan trên Redis.
  * **And** Trả về HTTP `200 OK` với thông báo xóa thành công.

* **Scenario 02: Thất bại khi tác phẩm không tồn tại**
  * **When** Gửi `DELETE /api/v1/portfolios/999999`.
  * **Then** Ném ra `ResourceNotFoundException` với mã lỗi `PORTFOLIO_NOT_FOUND`, trả về HTTP `404 Not Found`.

---

## ⚠️ 4. CHI TIẾT CÁC NGOẠI LỆ & XỬ LÝ LỖI PHÍA BACK-END (ERROR & EXCEPTION HANDLING)

Tầng Backend áp dụng cơ chế bắt lỗi tập trung (`@RestControllerAdvice`) thông qua `GlobalExceptionHandler.java`. Mọi lỗi phát sinh đều được đóng gói thành cấu trúc JSON chuẩn mực, không bao giờ để lộ stacktrace Java ra ngoài môi trường Production.

### 4.1. Cấu trúc JSON Lỗi Chuẩn Hóa (`ApiResponse<T>`)
```json
{
  "success": false,
  "code": "PORTFOLIO_FEATURED_LIMIT_EXCEEDED",
  "message": "Bạn chỉ được phép ghim tối đa 6 tác phẩm tiêu biểu. Vui lòng bỏ ghim bớt tác phẩm cũ trước.",
  "errors": [
    {
      "field": "is_featured",
      "rejected_value": true,
      "message": "Current featured count: 6, max allowed: 6"
    }
  ],
  "timestamp": "2026-09-10T10:45:00Z"
}
```

---

### 4.2. Bảng Ma trận Mã lỗi Nghiệp vụ Chi tiết (Business Error Codes Matrix)

| HTTP Status | Mã Lỗi (`code`) | Tình Huống Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `VALIDATION_FAILED` | Vi phạm Bean Validation (`@NotBlank`, `@Size`, `@Min`, `@NotNull`). | Trả về danh sách từng field bị lỗi trong mảng `errors`. |
| **`400 BAD_REQUEST`** | `INVALID_FILE_FORMAT` | File tải lên không có đuôi `.jpg`, `.jpeg`, `.png`, `.webp`. | Chặn ngay tại tầng Controller/Service trước khi đọc file. |
| **`400 BAD_REQUEST`** | `INVALID_FILE_MAGIC_BYTES` | File đổi đuôi giả mạo (ví dụ script shell, file exe sửa tên thành `.jpg`). | Đọc header byte: Header không khớp Magic Bytes chuẩn thì hủy bỏ ngay. |
| **`400 BAD_REQUEST`** | `FILE_SIZE_EXCEEDED` | File ảnh chính vượt quá 10MB hoặc ảnh phụ vượt quá 5MB. | Bắt `MaxUploadSizeExceededException` hoặc kiểm tra `file.getSize()`. |
| **`400 BAD_REQUEST`** | `EMPTY_FILE_UPLOADED` | Client gửi form multipart nhưng file rỗng (`file.isEmpty() = true`). | Báo lỗi yêu cầu người dùng chọn file ảnh thực tế. |
| **`400 BAD_REQUEST`** | `TOO_MANY_ADDITIONAL_IMAGES` | Danh sách ảnh phụ trong `additional_files` lớn hơn 5 ảnh. | Từ chối lưu, yêu cầu giảm bớt số lượng ảnh góc chụp phụ. |
| **`400 BAD_REQUEST`** | `PORTFOLIO_FEATURED_LIMIT_EXCEEDED` | Số lượng tác phẩm tiêu biểu hiện tại đã bằng 6 và cố tình ghim thêm. | Đếm số lượng bằng `SELECT COUNT(*) ... FOR UPDATE` và ném lỗi. |
| **`401 UNAUTHORIZED`** | `UNAUTHORIZED` | Request không gửi Header `Authorization` hoặc JWT Token hết hạn/sai chữ ký. | Spring Security `JwtAuthenticationEntryPoint` chặn trước Filter. |
| **`403 FORBIDDEN`** | `PORTFOLIO_ACCESS_DENIED` | Thợ A cố tình sửa/xóa tác phẩm của Thợ B hoặc Studio khác (Lỗ hổng IDOR). | Đối chiếu `current_user.mua_id` với `showcase.mua_id`. |
| **`403 FORBIDDEN`** | `PACKAGE_NOT_OWNED` | Thợ chọn liên kết `package_id` nhưng gói đó không thuộc sở hữu của thợ. | Đối chiếu quyền sở hữu gói dịch vụ trong `service_packages`. |
| **`403 FORBIDDEN`** | `STAFF_NOT_IN_AGENCY` | Chủ Studio thao tác trên `staff_id` không thuộc đại lý của mình. | Đối chiếu `agency_staff.agency_id` với `current_user.agency_id`. |
| **`404 NOT_FOUND`** | `PORTFOLIO_NOT_FOUND` | `showcase_id` không tồn tại trong DB hoặc đã bị xóa trước đó. | Ném `ResourceNotFoundException("Tác phẩm không tồn tại")`. |
| **`404 NOT_FOUND`** | `MUA_PROFILE_NOT_FOUND` | `mua_id` không tồn tại trong hệ thống. | Ném `ResourceNotFoundException("Không tìm thấy hồ sơ thợ")`. |
| **`404 NOT_FOUND`** | `STYLE_NOT_FOUND` | `style_id` không tồn tại trong danh mục `makeup_styles`. | Ném `ResourceNotFoundException("Phong cách trang điểm không hợp lệ")`. |
| **`409 CONFLICT`** | `STYLE_ALREADY_ASSIGNED` | Thợ cố tình gán trùng lặp một phong cách đã có trong `mua_styles`. | Xử lý Upsert hoặc bắt `DataIntegrityViolationException`. |
| **`502 BAD_GATEWAY`** | `MEDIA_STORAGE_FAILED` | Lỗi timeout mạng, sai API Secret hoặc máy chủ Cloudinary gặp sự cố. | Rollback giao dịch DB và ném `MediaUploadException`. |
| **`500 INTERNAL_SERVER_ERROR`** | `INTERNAL_SERVER_ERROR` | Lỗi ngoại lệ không dự liệu trước (NullPointer, DB Connection Pool kiệt sức). | Ghi log `ERROR` kèm request ID, trả về thông điệp thân thiện không lộ trace. |

---

### 4.3. Logic Xử lý Bù trừ Giao dịch (Compensating Transaction Pattern)
Khi người dùng đăng tải tác phẩm:
1. **Bước 1**: Đẩy ảnh lên Cloud Storage (Cloudinary/S3). Nếu lỗi $\rightarrow$ Ném lỗi `MEDIA_STORAGE_FAILED`, không ghi database.
2. **Bước 2**: Ghi bản ghi vào PostgreSQL (`portfolio_showcases`).
3. **Nếu Bước 2 thất bại** (do vi phạm ràng buộc DB, timeout DB hoặc đứt kết nối):
   - Database tự động `@Transactional` rollback.
   - Khối `catch (Exception ex)` gọi hàm xóa bù trừ: `mediaStorageService.deleteMedia(uploadedPublicIds)` để xóa ngay các file rác vừa tải lên Cloudinary.
   - Đảm bảo **không bao giờ xảy ra tình trạng rò rỉ file rác mồ côi (Orphaned Cloud Assets)** làm tăng chi phí lưu trữ.

---

### 4.4. Code Mẫu Kiểm Tra Magic Bytes (File Security Validation)

```java
package com.makeup.platform.common.utils;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.constants.ErrorCode;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

public class FileValidationUtils {

    // Magic bytes định danh chuẩn
    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC  = new byte[]{(byte) 0x89, (byte) 0x50, (byte) 0x4E, (byte) 0x47};
    private static final byte[] RIFF_MAGIC = new byte[]{(byte) 0x52, (byte) 0x49, (byte) 0x46, (byte) 0x46}; // WebP RIFF
    private static final byte[] WEBP_MAGIC = new byte[]{(byte) 0x57, (byte) 0x45, (byte) 0x42, (byte) 0x50}; // WEBP

    public static void validateImageFile(MultipartFile file, long maxSizeBytes) {
        if (file == null || file.isEmpty()) {
            throw new CustomBusinessException(ErrorCode.EMPTY_FILE_UPLOADED, "File ảnh tải lên không được để trống");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new CustomBusinessException(ErrorCode.FILE_SIZE_EXCEEDED, 
                String.format("Dung lượng file (%d MB) vượt quá giới hạn cho phép (%d MB)", 
                file.getSize() / (1024 * 1024), maxSizeBytes / (1024 * 1024)));
        }

        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[12];
            int read = is.read(header, 0, header.length);
            if (read < 4) {
                throw new CustomBusinessException(ErrorCode.INVALID_FILE_MAGIC_BYTES, "File không đủ định dạng header ảnh");
            }

            boolean isJpeg = header[0] == JPEG_MAGIC[0] && header[1] == JPEG_MAGIC[1] && header[2] == JPEG_MAGIC[2];
            boolean isPng  = header[0] == PNG_MAGIC[0]  && header[1] == PNG_MAGIC[1]  && header[2] == PNG_MAGIC[2] && header[3] == PNG_MAGIC[3];
            boolean isWebp = header[0] == RIFF_MAGIC[0] && header[1] == RIFF_MAGIC[1] && header[2] == RIFF_MAGIC[2] && header[3] == RIFF_MAGIC[3]
                          && header[8] == WEBP_MAGIC[0] && header[9] == WEBP_MAGIC[1] && header[10] == WEBP_MAGIC[2] && header[11] == WEBP_MAGIC[3];

            if (!isJpeg && !isPng && !isWebp) {
                throw new CustomBusinessException(ErrorCode.INVALID_FILE_MAGIC_BYTES, 
                    "Nội dung file không đúng định dạng ảnh hợp lệ (chỉ chấp nhận JPEG, PNG, WEBP)");
            }
        } catch (IOException e) {
            throw new CustomBusinessException(ErrorCode.INVALID_FILE_FORMAT, "Không thể đọc dữ liệu file tải lên");
        }
    }
}
```

---

## 💻 5. ĐẶC TẢ CHI TIẾT CÁC REST API ENDPOINTS

---

### 5.1. `POST /api/v1/portfolios` (Đăng tải Tác phẩm mới lên Album)
* **Phương thức & URL:** `POST /api/v1/portfolios`
* **Quyền hạn yêu cầu:** `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF` (Cần permission `portfolio:upload`).
* **Content-Type:** `multipart/form-data`
* **Tham số Form Data:**
  * `image_file` (File, Bắt buộc): Ảnh chính (Tối đa 10MB, định dạng JPG/PNG/WebP).
  * `additional_files` (Mảng File, Tùy chọn): Tối đa 5 ảnh góc chụp bổ sung (mỗi ảnh < 5MB).
  * `title` (String, Bắt buộc): Tiêu đề tác phẩm (2 - 150 ký tự).
  * `description` (String, Tùy chọn): Mô tả kỹ thuật make-up (tối đa 1000 ký tự).
  * `style_id` (Integer, Tùy chọn): ID phong cách trang điểm.
  * `package_id` (Long, Tùy chọn): ID gói dịch vụ liên kết.
  * `staff_id` (Long, Tùy chọn): ID thợ Studio (Chỉ hợp lệ khi Agency Admin tải lên).
  * `is_featured` (Boolean, Tùy chọn): Mặc định `false`.
* **Response Thành công (`201 Created`):**
```json
{
  "success": true,
  "code": "PORTFOLIO_CREATED",
  "message": "Đăng tải tác phẩm lên bộ sưu tập thành công!",
  "data": {
    "id": 502,
    "mua_id": 89,
    "staff_id": null,
    "package_id": 45,
    "package_name": "Gói Trang điểm Cô Dâu Luxury",
    "style_id": 2,
    "style_name": "Tone Thái Sang Trọng",
    "title": "Make tiệc tối Tone Thái Glowy chuẩn HD",
    "description": "Đánh nền mỏng nhẹ che phủ 24h, dán mi gẩy sợi tự nhiên",
    "image_url": "https://res.cloudinary.com/makeup/image/upload/v1/portfolios/showcase_502.webp",
    "thumbnail_url": "https://res.cloudinary.com/makeup/image/upload/c_fill,w_400,h_400,q_auto,f_auto/v1/portfolios/showcase_502.webp",
    "additional_images": [
      "https://res.cloudinary.com/makeup/image/upload/v1/portfolios/showcase_502_side.webp",
      "https://res.cloudinary.com/makeup/image/upload/v1/portfolios/showcase_502_close.webp"
    ],
    "is_featured": false,
    "created_at": "2026-09-10T10:45:00Z"
  },
  "timestamp": "2026-09-10T10:45:00Z"
}
```

---

### 5.2. `GET /api/v1/portfolios` (Lọc & Tìm kiếm Showcase Gallery)
* **Phương thức & URL:** `GET /api/v1/portfolios`
* **Quyền truy cập:** Công khai (`permitAll`).
* **Query Parameters:**
  * `mua_id` (Long, Tùy chọn): Lọc theo thợ tự do cụ thể.
  * `staff_id` (Long, Tùy chọn): Lọc theo nhân viên Studio.
  * `style_id` (Integer, Tùy chọn): Lọc theo phong cách make-up.
  * `package_id` (Long, Tùy chọn): Lọc theo gói dịch vụ.
  * `is_featured` (Boolean, Tùy chọn): `true` để lấy danh sách tiêu biểu.
  * `page` (Integer, Mặc định `0`): Chỉ số trang bắt đầu từ 0.
  * `size` (Integer, Mặc định `12`): Số bản ghi / trang (1 đến 50).
  * `sort` (String, Mặc định `is_featured,desc,created_at,desc`): Thứ tự sắp xếp.
* **Response Thành công (`200 OK`):**
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Lấy danh sách tác phẩm thành công",
  "data": {
    "content": [
      {
        "id": 502,
        "mua_id": 89,
        "mua_code": "MUA-2026-001024",
        "mua_name": "Nguyễn Thị Hương Ly",
        "title": "Make tiệc tối Tone Thái Glowy chuẩn HD",
        "thumbnail_url": "https://res.cloudinary.com/makeup/image/upload/c_fill,w_400,h_400/v1/portfolios/showcase_502.webp",
        "style_name": "Tone Thái Sang Trọng",
        "is_featured": true,
        "created_at": "2026-09-10T10:45:00Z"
      }
    ],
    "page": 0,
    "size": 12,
    "total_elements": 45,
    "total_pages": 4,
    "last": false
  },
  "timestamp": "2026-09-10T10:45:00Z"
}
```

---

### 5.3. `PATCH /api/v1/portfolios/{id}/featured` (Ghim / Bỏ ghim Tác phẩm Tiêu biểu)
* **Phương thức & URL:** `PATCH /api/v1/portfolios/{id}/featured`
* **Quyền hạn yêu cầu:** Chủ sở hữu tác phẩm (`mua_id` hoặc Studio Admin).
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "is_featured": true
}
```
* **Response Thành công (`200 OK`):**
```json
{
  "success": true,
  "code": "FEATURED_STATUS_UPDATED",
  "message": "Cập nhật trạng thái tiêu biểu thành công",
  "data": {
    "id": 502,
    "is_featured": true,
    "total_featured_count": 5
  },
  "timestamp": "2026-09-10T10:46:00Z"
}
```
* **Response Lỗi khi vượt quá 6 ảnh (`400 Bad Request`):**
```json
{
  "success": false,
  "code": "PORTFOLIO_FEATURED_LIMIT_EXCEEDED",
  "message": "Bạn chỉ được phép ghim tối đa 6 tác phẩm tiêu biểu. Vui lòng bỏ ghim bớt tác phẩm cũ trước.",
  "errors": [],
  "timestamp": "2026-09-10T10:46:00Z"
}
```

---

### 5.4. `PUT /api/v1/muas/my-profile/styles` (Thợ Tự do Khai báo Tone Sở trường)
* **Phương thức & URL:** `PUT /api/v1/muas/my-profile/styles`
* **Quyền hạn yêu cầu:** `ROLE_FREELANCE_MUA` (Permission: `mua:manage_style`).
* **Request Body:**
```json
{
  "style_ids": [1, 2, 4]
}
```
* **Response Thành công (`200 OK`):**
```json
{
  "success": true,
  "code": "STYLES_UPDATED",
  "message": "Đồng bộ danh sách phong cách sở trường thành công",
  "data": {
    "mua_id": 89,
    "total_styles": 3,
    "styles": [
      { "id": 1, "code": "TONE_DOUYIN", "name": "Tone Hàn Douyin" },
      { "id": 2, "code": "TONE_THAI", "name": "Tone Thái Sang Trọng" },
      { "id": 4, "code": "TONE_TAY", "name": "Tone Tây Sắc Sảo" }
    ]
  },
  "timestamp": "2026-09-10T10:47:00Z"
}
```

---

### 5.5. `DELETE /api/v1/portfolios/{id}` (Xóa Tác phẩm khỏi Album)
* **Phương thức & URL:** `DELETE /api/v1/portfolios/{id}`
* **Quyền hạn yêu cầu:** Chủ sở hữu tác phẩm hoặc `ROLE_SUPER_ADMIN`.
* **Response Thành công (`200 OK`):**
```json
{
  "success": true,
  "code": "PORTFOLIO_DELETED",
  "message": "Đã xóa tác phẩm khỏi bộ sưu tập và dọn dẹp tài nguyên liên quan"
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU LIÊN QUAN (DDL SCHEMAS POSTGRESQL 16)

Đồng bộ 100% với file thiết kế CSDL `schema.sql` của dự án:

```sql
-- 1. SCHEMA: catalog_schema -> DANH MỤC PHONG CÁCH CHUẨN TOÀN SÀN
CREATE TABLE IF NOT EXISTS catalog_schema.makeup_styles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    style_code VARCHAR(50) UNIQUE NOT NULL,      -- TONE_DOUYIN, TONE_THAI, TONE_HONG_BABY, TONE_TAY...
    style_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SCHEMA: mua_schema -> GÁN TONE PHONG CÁCH CHO THỢ TỰ DO
CREATE TABLE IF NOT EXISTS mua_schema.mua_styles (
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    style_id INT REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (mua_id, style_id)
);
COMMENT ON TABLE mua_schema.mua_styles IS 'Bảng gán kỹ năng Tone Make-up trực tiếp cho Thợ tự do';

-- 3. SCHEMA: agency_schema -> GÁN TONE PHONG CÁCH CHO THỢ THUỘC STUDIO
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_styles (
    staff_id BIGINT REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    style_id INT REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (staff_id, style_id)
);
COMMENT ON TABLE agency_schema.agency_staff_styles IS 'Bảng gán kỹ năng Tone cho nhân viên Studio';

-- 4. SCHEMA: catalog_schema -> BẢNG ALBUM ẢNH TÁC PHẨM HOÀN THIỆN
CREATE TABLE IF NOT EXISTS catalog_schema.portfolio_showcases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    staff_id BIGINT REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    package_id BIGINT REFERENCES catalog_schema.service_packages(id) ON DELETE SET NULL,
    style_id INT REFERENCES catalog_schema.makeup_styles(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,                         -- URL ảnh chính kích thước gốc
    thumbnail_url TEXT,                              -- URL ảnh thumbnail 400x400
    additional_images JSONB DEFAULT '[]'::jsonb,        -- Mảng JSONB chứa danh sách URL góc chụp khác
    is_featured BOOLEAN DEFAULT FALSE,               -- Cờ ghim tiêu biểu (Tối đa 6 ảnh)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_showcase_owner CHECK (
        staff_id IS NOT NULL OR mua_id IS NOT NULL
    )
);

-- INDEX TỐI ƯU HÓA HIỆU NĂNG TẢI GALLERY VÀ LỌC PHONG CÁCH
CREATE INDEX IF NOT EXISTS idx_portfolio_mua_featured ON catalog_schema.portfolio_showcases(mua_id, is_featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_staff ON catalog_schema.portfolio_showcases(staff_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_style ON catalog_schema.portfolio_showcases(style_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_package ON catalog_schema.portfolio_showcases(package_id);
CREATE INDEX IF NOT EXISTS idx_mua_styles_lookup ON mua_schema.mua_styles(style_id, mua_id);
```

---

## 🛡️ 7. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Thời gian Phản hồi (Latency SLA)**:
   - API đọc danh sách Gallery (`GET /api/v1/portfolios`) đạt thời gian phản hồi **< 50ms** khi Cache Hit trên Redis, và **< 120ms** (p95) khi Cache Miss nhờ Index tối ưu trên Database.
   - API upload ảnh (gồm kiểm tra magic bytes + đẩy CDN Cloudinary) hoàn tất trong **< 2.0 giây**.
2. **Khả năng Mở rộng & Chịu tải (High Throughput & Caching)**:
   - Sử dụng Redis Cache theo mẫu `portfolio:gallery:{hash}` với TTL 15 phút. Khi phát sinh thêm/sửa/xóa tác phẩm, hệ thống kích hoạt xóa cache thông qua `@CacheEvict(value = "portfolio_galleries", allEntries = true)`.
3. **An toàn Giao dịch & Chống Race-condition (Concurrency)**:
   - Kiểm tra hạn mức 6 ảnh tiêu biểu sử dụng khóa `FOR UPDATE` trong giao dịch database nhằm loại bỏ hoàn toàn khả năng 2 request đồng thời lách luật ghim thành công 7 ảnh.
4. **Bảo mật & Phòng chống Gian lận (Security Standards)**:
   - Kiểm tra Magic Bytes nhị phân bắt buộc đối với 100% file tải lên để ngăn chặn tấn công thực thi mã từ xa (RCE) qua file ảnh giả mạo.
   - Kiểm tra quyền sở hữu IDOR trên mọi API tác động dữ liệu (`PUT`, `DELETE`, `PATCH`). Thợ chỉ được phép thao tác trên tài nguyên của chính mình.
