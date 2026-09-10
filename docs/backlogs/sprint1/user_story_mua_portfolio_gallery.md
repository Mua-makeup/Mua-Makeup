# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ BACK-END CHI TIẾT
## PHÂN HỆ: HỒ SƠ THỢ (MUA PROFILE) & BỘ SƯU TẬP TÁC PHẨM (PORTFOLIO GALLERY)
### (Spring Boot Layered Monolith `core-api` - Schemas: `mua_schema`, `catalog_schema`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Tính năng:** `MUA Profile & Portfolio Showcase Gallery`
* **Mã Jira Issues phụ trách (Sprint 1):**
  * `ISSUE-11.1`: Hồ sơ Thợ Make-up (`mua_profiles`), Bio, kinh nghiệm, phong cách & Chứng chỉ bằng cấp.
  * `ISSUE-11.2`: Tích hợp Upload Media CDN (Cloudinary / AWS S3) nén ảnh chất lượng cao (Before / After / Look hoàn thiện).
  * `ISSUE-11.3`: Quản lý Album Ảnh sản phẩm hoàn thiện của khách trước đó (`portfolio_showcases`) trên App & Web.
* **Mô hình Kiến trúc:** Spring Boot 3.3.x Layered Architecture Monolith (`core-api`, Port `8080`).
* **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`makeup_platform_db`)
  * `mua_schema`: Quản lý hồ sơ thợ (`mua_profiles`), phong cách trang điểm thế mạnh của thợ (`mua_styles`).
  * `catalog_schema`: Bảng lưu trữ tác phẩm thực tế (`portfolio_showcases`).
* **Dịch vụ Lưu trữ Media & Caching:**
  * **Cloud Media CDN:** Cloudinary SDK / AWS S3 (Nén định dạng WebP, tự động tạo `thumbnail_url` 400x400 và `image_url` tối đa 1920x1080).
  * **In-Memory Cache:** Redis 7.2 (Cache danh sách Gallery công khai theo MUA ID và Style ID, TTL 15 phút, tự hủy khi có thay đổi).
* **Đối tượng Người dùng (Personas):**
  1. **Freelance MUA (Thợ trang điểm tự do):** Cập nhật Bio, kinh nghiệm, bán kính làm việc, tải bằng cấp chứng chỉ, đăng ký phong cách trang điểm sở trường (`mua_styles`), đăng album ảnh tác phẩm thực tế hoàn thiện cho khách (`portfolio_showcases`), chọn tối đa 6 ảnh tiêu biểu ghim đầu hồ sơ.
  2. **Customer (Khách hàng):** Xem hồ sơ năng lực thợ, xem album ảnh thực tế Before/After và phong cách trang điểm để đánh giá tay nghề trước khi đặt lịch.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Các thành phần mã nguồn tại `code/backend/core-api/` được tổ chức theo chuẩn Layered Monolith cho phân hệ Profile & Portfolio:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # ok, created, error response helper
│   │   └── ApiResponse.java                   # JSON envelope: {success, code, message, data, timestamp}
│   ├── constants/
│   │   ├── ErrorCode.java                     # Bộ hằng số mã lỗi chuẩn hóa
│   │   └── MediaConstants.java                # Giới hạn dung lượng (10MB/5MB), định dạng cho phép
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Lỗi nghiệp vụ có mã lỗi ErrorCode
│   │   ├── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (404)
│   │   ├── AccessDeniedException.java         # Lỗi vi phạm phân quyền/IDOR (403)
│   │   └── MediaUploadException.java          # Lỗi upload CDN Cloudinary/S3 (400/502)
│   └── utils/
│       ├── FileValidationUtils.java           # Kiểm tra Magic Bytes nhị phân (chặn file độc hại)
│       └── SecurityContextUtils.java          # Lấy user_id, mua_id từ JWT SecurityContext
│
├── config/
│   ├── CloudinaryConfig.java                  # Bean cấu hình Cloudinary SDK
│   └── RedisConfig.java                       # Cấu hình CacheManager và RedisTemplate
│
├── controller/
│   └── mua/
│       ├── MuaProfileController.java          # /api/v1/muas (Profile, bio, bằng cấp chứng chỉ)
│       ├── MuaStyleController.java            # /api/v1/muas/my-profile/styles (Chọn phong cách sở trường)
│       └── MuaPortfolioController.java        # /api/v1/muas/my-profile/portfolios (Upload, ghim, xóa tác phẩm)
│
├── dto/
│   ├── request/mua/
│   │   ├── UpdateMuaProfileReq.java           # @NotBlank bio, @Min(0) experience_years, radius_km
│   │   ├── AssignMuaStylesReq.java            # @NotEmpty Set<Integer> styleIds
│   │   ├── CreatePortfolioReq.java            # Multipart: title, style_id, package_id, is_featured
│   │   └── UpdatePortfolioReq.java            # title, description, style_id, package_id
│   └── response/mua/
│       ├── MuaProfileRes.java                 # Thông tin thợ, bio, kinh nghiệm, rating, certificates
│       ├── MuaStyleRes.java                   # Danh sách phong cách thợ làm được
│       ├── PortfolioDetailRes.java            # Chi tiết ảnh chính, thumbnail, additional_images
│       └── PortfolioSummaryRes.java           # Tối ưu cho hiển thị danh sách Gallery trên App
│
├── entity/
│   ├── mua/
│   │   ├── MuaProfileEntity.java              # schema = "mua_schema", table = "mua_profiles"
│   │   └── MuaStyleEntity.java                # schema = "mua_schema", table = "mua_styles" (Composite Key)
│   └── catalog/
│       └── PortfolioShowcaseEntity.java       # schema = "catalog_schema", table = "portfolio_showcases"
│
├── repository/
│   ├── mua/
│   │   ├── MuaProfileRepository.java          # findByUserId, findByMuaCode
│   │   └── MuaStyleRepository.java            # findByMuaId, deleteByMuaId
│   └── catalog/
│       └── PortfolioShowcaseRepository.java   # findByMuaId, countByMuaIdAndIsFeaturedTrue
│
└── service/
    ├── MuaProfileService.java                 # Cập nhật Bio, kinh nghiệm, upload chứng chỉ
    ├── MuaStyleService.java                   # Đăng ký phong cách sở trường
    ├── PortfolioService.java                  # Đăng tải showcase, nén ảnh, ghim tiêu biểu, xóa ảnh
    ├── MediaStorageService.java               # Interface kết nối CDN Cloudinary/S3
    └── impl/
        ├── MuaProfileServiceImpl.java
        ├── MuaStyleServiceImpl.java
        ├── PortfolioServiceImpl.java
        └── CloudinaryMediaServiceImpl.java
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT (CHUẨN BDD)

---

### **US-11.1: Quản lý Hồ sơ Năng lực Thợ, Bio & Bằng cấp Chứng chỉ (MUA Profile & Credentials)**
> **As a** Thợ Trang điểm Tự do (Freelance MUA),  
> **I want to** cập nhật thông tin giới thiệu bản thân (Bio), số năm kinh nghiệm, bán kính nhận khách tối đa, phong cách sở trường và tải lên các chứng chỉ bằng cấp nghề nghiệp,  
> **So that** hồ sơ của tôi thể hiện rõ độ uy tín, tay nghề chuyên môn và hệ thống quét đúng vị trí nhận ca.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Cập nhật Bio và thông số nghề nghiệp thành công (Happy Path)**
  * **Given** Thợ đã đăng nhập thành công với vai trò `ROLE_FREELANCE_MUA` (`mua_id = 89`).
  * **When** Thợ gửi request `PUT /api/v1/muas/my-profile` với dữ liệu:
    ```json
    {
      "bio": "Chuyên gia trang điểm cô dâu tone Thái & Douyin hơn 6 năm kinh nghiệm, từng tu nghiệp tại Hàn Quốc",
      "experience_years": 6,
      "max_service_radius_km": 15.0
    }
    ```
  * **Then** Tầng Service kiểm tra hợp lệ: `experience_years >= 0` và `1.0 <= max_service_radius_km <= 50.0`.
  * **And** Cập nhật vào bảng `mua_schema.mua_profiles`.
  * **And** Trả về HTTP `200 OK` kèm dữ liệu hồ sơ mới và xóa cache Redis tương ứng.

* **Scenario 02: Tải lên Chứng chỉ / Bằng cấp nghề nghiệp (Certificates Upload)**
  * **Given** Thợ tải lên file chứng chỉ hoàn thành khóa đào tạo (`chung_chi_pro.jpg`).
  * **When** Gửi request Multipart `POST /api/v1/muas/my-profile/certificates`.
  * **Then** Service kiểm tra định dạng và nén tải lên Cloudinary vào thư mục `mua_credentials/`.
  * **And** Thêm URL mới vào mảng JSONB `certificates` trong `mua_profiles` với trạng thái `is_verified = false`.
  * **And** Trả về HTTP `201 Created` chứa URL chứng chỉ vừa tạo.

* **Scenario 03: Khai báo Danh sách Phong cách Trang điểm Sở trường**
  * **Given** Thợ muốn chọn 3 phong cách thế mạnh: `style_ids = [1, 2, 4]` (Douyin, Thái, Tây).
  * **When** Thợ gửi request `PUT /api/v1/muas/my-profile/styles`.
  * **Then** Service kiểm tra tính hợp lệ của các `style_id` trong danh mục hệ thống.
  * **And** Đồng bộ dữ liệu vào bảng `mua_schema.mua_styles` trong 1 `@Transactional` duy nhất.
  * **And** Trả về HTTP `200 OK` kèm danh sách styles hiện tại của thợ.

* **Scenario 04: Thất bại do dữ liệu Bio / Bán kính không hợp lệ**
  * **When** Thợ nhập `experience_years = -2` hoặc `max_service_radius_km = 80.0` (vượt ngưỡng 50km).
  * **Then** Tầng Controller ném lỗi `MethodArgumentNotValidException`.
  * **And** `GlobalExceptionHandler` trả về HTTP `400 Bad Request` với mã `VALIDATION_FAILED`.

---

### **US-11.2: Tích hợp Upload Media CDN Nén ảnh Chất lượng cao (Media CDN Processing)**
> **As a** Hệ thống Backend (System Service),  
> **I want to** tiếp nhận các file ảnh tải lên từ thợ, xác thực tính an toàn nhị phân (Magic Bytes), nén định dạng WebP và sinh thumbnail kích thước chuẩn qua CDN Cloudinary/S3,  
> **So that** hình ảnh tải nhanh, tiết kiệm 60% băng thông người dùng và tuyệt đối ngăn chặn các file độc hại tấn công máy chủ.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Nén và tạo ảnh Thumbnail tự động thành công (Happy Path)**
  * **Given** File ảnh tải lên là định dạng JPEG/PNG/WebP hợp lệ, dung lượng 5.5MB (dưới ngưỡng 10MB).
  * **When** `MediaStorageService.uploadAndCompress()` thực thi.
  * **Then** Dịch vụ đẩy ảnh lên Cloudinary với cờ `format: "webp"`, `quality: "auto:good"`.
  * **And** Tự động sinh 2 đường dẫn CDN:
    - `image_url`: Ảnh chất lượng cao chuẩn HD (tối đa 1920x1080).
    - `thumbnail_url`: Ảnh vuông crop chuẩn (`c_fill,w_400,h_400,q_auto,f_auto`).
  * **And** Trả về đối tượng `CloudMediaUploadResult` chứa URLs và `public_id`.

* **Scenario 02: Từ chối file đổi đuôi giả mạo (Magic Bytes Check)**
  * **Given** File shell script `hack.sh` bị đổi tên thành `anh_mau.jpg`.
  * **When** Server gọi `FileValidationUtils.validateImageFile()`.
  * **Then** Hệ thống đọc 12 byte đầu tiên và nhận diện header không khớp với chữ ký nhị phân của JPEG, PNG hay WebP.
  * **And** Ngắt luồng xử lý ngay lập tức, ném `CustomBusinessException` với mã lỗi `INVALID_FILE_MAGIC_BYTES`.
  * **And** Trả về HTTP `400 Bad Request`. Không có dữ liệu nào được đẩy lên CDN.

* **Scenario 03: Từ chối file vượt quá dung lượng tối đa**
  * **When** Người dùng chọn ảnh dung lượng 15MB (> 10MB).
  * **Then** Hệ thống chặn và trả về HTTP `400 Bad Request` với mã `FILE_SIZE_EXCEEDED`.

---

### **US-11.3: Quản lý Album Ảnh Tác phẩm Thực tế & Bộ sưu tập (Portfolio Showcase Gallery)**
> **As a** Thợ Make-up Tự do (Freelance MUA),  
> **I want to** đăng các tác phẩm thực tế hoàn thiện của khách hàng trước đó lên bộ sưu tập, đính kèm góc chụp Before/After hoặc cận cảnh, và ghim tối đa 6 tác phẩm đẹp nhất lên đầu hồ sơ,  
> **So that** khách hàng có bằng chứng thực tế rõ ràng để tin tưởng đặt lịch.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Đăng tải tác phẩm hoàn thiện thành công (Happy Path)**
  * **Given** Thợ đã đăng nhập sở hữu `mua_id = 89`.
  * **When** Gửi request Multipart `POST /api/v1/muas/my-profile/portfolios`:
    - `image_file`: Ảnh sản phẩm hoàn thiện chính (bắt buộc).
    - `additional_files`: Tối đa 5 ảnh phụ góc chụp Before/After, cận cảnh mắt, tóc (tùy chọn).
    - `title`: "Cô dâu Tone Thái đón dâu - Make tiệc ngày cưới".
    - `description`: "Kỹ thuật nền mỏng che phủ tốt, dán mi gẩy sợi tự nhiên 24h".
    - `style_id`: 2 (Tone Thái).
    - `is_featured`: `false`.
  * **Then** Backend lưu bản ghi vào `catalog_schema.portfolio_showcases` với `mua_id = 89`.
  * **And** Lưu mảng URL ảnh phụ dạng JSONB vào cột `additional_images`.
  * **And** Trả về HTTP `201 Created` kèm thông tin chi tiết tác phẩm.

* **Scenario 02: Ghim tác phẩm tiêu biểu thành công (`is_featured = true`)**
  * **Given** Thợ hiện tại đang có 3 tác phẩm được ghim (`is_featured = true`).
  * **When** Thợ gửi request `PATCH /api/v1/muas/my-profile/portfolios/502/featured` với `{"is_featured": true}`.
  * **Then** Service đếm số tác phẩm ghim hiện tại (3 < 6).
  * **And** Cập nhật `is_featured = true` cho tác phẩm ID `502`.
  * **And** Trả về HTTP `200 OK`.

* **Scenario 03: Thất bại do vượt quá hạn mức 6 tác phẩm ghim tiêu biểu**
  * **Given** Thợ đã có đủ 6 tác phẩm có cờ `is_featured = true`.
  * **When** Thợ cố tình bấm ghim thêm tác phẩm thứ 7.
  * **Then** Service kiểm tra số lượng hiện tại `>= 6` bằng khóa dòng `FOR UPDATE`.
  * **And** Ném ra `CustomBusinessException` với mã lỗi `PORTFOLIO_FEATURED_LIMIT_EXCEEDED` và thông điệp: *"Bạn chỉ được ghim tối đa 6 tác phẩm tiêu biểu. Vui lòng bỏ ghim bớt tác phẩm cũ trước."*.
  * **And** Trả về HTTP `400 Bad Request`.

* **Scenario 04: Chặn truy cập trái phép sửa/xóa tác phẩm của người khác (IDOR Prevention)**
  * **Given** Thợ B (`mua_id = 99`) cố tình gọi API xóa tác phẩm ID `502` (thuộc về Thợ A `mua_id = 89`).
  * **When** Gửi request `DELETE /api/v1/muas/my-profile/portfolios/502`.
  * **Then** Backend kiểm tra `showcase.getMuaId() != current_user.mua_id`.
  * **And** Ném ra `AccessDeniedException` với mã `PORTFOLIO_ACCESS_DENIED`, trả về HTTP `403 Forbidden`.

* **Scenario 05: Xóa tác phẩm và tự động dọn dẹp file rác trên CDN**
  * **Given** Thợ A xóa tác phẩm ID `502` của mình.
  * **When** Gửi `DELETE /api/v1/muas/my-profile/portfolios/502`.
  * **Then** Bản ghi trong DB bị xóa và hệ thống kích hoạt xóa các file ảnh tương ứng trên Cloudinary.
  * **And** Trả về HTTP `200 OK`.

---

## ⚠️ 4. CHI TIẾT XỬ LÝ NGOẠI LỆ & BẢNG MÃ LỖI BACK-END (ERROR & EXCEPTION HANDLING)

Toàn bộ các trường hợp ngoại lệ được chặn và xử lý qua `GlobalExceptionHandler.java`, trả về JSON envelope đồng nhất theo tiêu chuẩn dự án:

```json
{
  "success": false,
  "code": "MÃ_LỖI_CHUẨN_HÓA",
  "message": "Thông điệp lỗi chi tiết cho người dùng",
  "errors": [],
  "timestamp": "2026-09-10T11:20:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Chi tiết Phân hệ MUA Profile & Portfolio

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Cách Xử Lý Chi Tiết Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `VALIDATION_FAILED` | Dữ liệu đầu vào vi phạm Bean Validation (`bio` quá dài, `experience_years < 0`, `radius < 1km`). | Trả về chi tiết từng trường bị lỗi trong mảng `errors`. |
| **`400 BAD_REQUEST`** | `EMPTY_FILE_UPLOADED` | Client gửi request upload nhưng file không có nội dung (`file.isEmpty()`). | Chặn ngay tại Controller, yêu cầu đính kèm file hợp lệ. |
| **`400 BAD_REQUEST`** | `INVALID_FILE_FORMAT` | Đuôi mở rộng của file không nằm trong danh sách: `.jpg`, `.jpeg`, `.png`, `.webp`. | Kiểm tra phần mở rộng tên file trước khi xử lý. |
| **`400 BAD_REQUEST`** | `INVALID_FILE_MAGIC_BYTES` | File giả mạo đuôi ảnh (file script shell, file thực thi nhị phân đổi tên thành `.jpg`). | Đọc 12 bytes nhị phân đầu tiên của file qua InputStream để đối chiếu chữ ký Magic Bytes. Hủy request nếu không khớp. |
| **`400 BAD_REQUEST`** | `FILE_SIZE_EXCEEDED` | File ảnh chính > 10MB hoặc ảnh phụ Before/After > 5MB. | Kiểm tra kích thước file trước khi nạp vào bộ nhớ RAM. |
| **`400 BAD_REQUEST`** | `TOO_MANY_ADDITIONAL_IMAGES` | Số lượng ảnh góc chụp phụ trong `additional_files` vượt quá 5 ảnh. | Từ chối tiếp nhận, yêu cầu chọn tối đa 5 ảnh góc chụp Before/After. |
| **`400 BAD_REQUEST`** | `PORTFOLIO_FEATURED_LIMIT_EXCEEDED` | Thợ cố tình ghim ảnh thứ 7 khi đã có đủ 6 ảnh tiêu biểu (`is_featured = true`). | Đếm số lượng ảnh tiêu biểu bằng truy vấn khóa `SELECT COUNT(*) ... FOR UPDATE`. Ném lỗi nếu `>= 6`. |
| **`401 UNAUTHORIZED`** | `UNAUTHORIZED` | Request thiếu Header `Authorization` hoặc JWT Access Token đã hết hạn / không hợp lệ. | Bị chặn bởi `JwtAuthenticationEntryPoint` của Spring Security trước khi vào Controller. |
| **`403 FORBIDDEN`** | `PORTFOLIO_ACCESS_DENIED` | Thợ A cố tình cập nhật, ghim hoặc xóa tác phẩm của Thợ B (Lỗ hổng IDOR). | Đối chiếu `current_user.getMuaId()` với `showcase.getMuaId()`. Ném `AccessDeniedException` nếu không khớp. |
| **`403 FORBIDDEN`** | `PACKAGE_NOT_OWNED` | Thợ chọn liên kết gói dịch vụ (`package_id`) nhưng gói đó không thuộc sở hữu của thợ. | Truy vấn kiểm tra bảng `service_packages` xem `mua_id` có khớp không. |
| **`404 NOT_FOUND`** | `MUA_PROFILE_NOT_FOUND` | `mua_id` không tồn tại trong bảng `mua_profiles`. | Ném `ResourceNotFoundException("Không tìm thấy hồ sơ thợ")`. |
| **`404 NOT_FOUND`** | `PORTFOLIO_NOT_FOUND` | `showcase_id` không tồn tại hoặc đã bị xóa trước đó. | Ném `ResourceNotFoundException("Tác phẩm không tồn tại trong bộ sưu tập")`. |
| **`404 NOT_FOUND`** | `STYLE_NOT_FOUND` | `style_id` truyền vào không có trong danh mục phong cách hệ thống. | Ném `ResourceNotFoundException("Phong cách trang điểm không tồn tại")`. |
| **`502 BAD_GATEWAY`** | `MEDIA_STORAGE_FAILED` | Lỗi kết nối timeout, sai API Credentials hoặc Cloudinary/S3 gặp sự cố. | Rollback giao dịch Database và ném `MediaUploadException`. |

---

### 4.2. Cơ chế Xử lý Bù trừ khi Upload Lỗi (Compensating Transaction)

Để ngăn chặn triệt để tình trạng **rò rỉ file rác mồ côi (Orphaned Media)** trên Cloudinary khi thao tác Database thất bại:

```java
@Transactional(rollbackFor = Exception.class)
public PortfolioDetailRes createPortfolioShowcase(Long muaId, CreatePortfolioReq req) {
    // 1. Kiểm tra Magic Bytes và Validation
    FileValidationUtils.validateImageFile(req.getImageFile(), MediaConstants.MAX_MAIN_IMAGE_SIZE);
    
    // Danh sách lưu lại các public_id đã upload để xóa bù trừ nếu gặp lỗi
    List<String> uploadedCloudIds = new ArrayList<>();
    
    try {
        // 2. Upload ảnh chính lên Cloudinary
        CloudMediaUploadResult mainResult = mediaStorageService.uploadImage(req.getImageFile(), "portfolios");
        uploadedCloudIds.add(mainResult.getPublicId());
        
        // 3. Upload ảnh phụ (nếu có)
        List<String> additionalUrls = new ArrayList<>();
        if (req.getAdditionalFiles() != null) {
            for (MultipartFile file : req.getAdditionalFiles()) {
                FileValidationUtils.validateImageFile(file, MediaConstants.MAX_ADDITIONAL_IMAGE_SIZE);
                CloudMediaUploadResult subResult = mediaStorageService.uploadImage(file, "portfolios/additional");
                uploadedCloudIds.add(subResult.getPublicId());
                additionalUrls.add(subResult.getImageUrl());
            }
        }
        
        // 4. Lưu Entity vào Database
        PortfolioShowcaseEntity entity = PortfolioShowcaseEntity.builder()
                .muaId(muaId)
                .title(req.getTitle())
                .description(req.getDescription())
                .imageUrl(mainResult.getImageUrl())
                .thumbnailUrl(mainResult.getThumbnailUrl())
                .additionalImages(additionalUrls)
                .styleId(req.getStyleId())
                .packageId(req.getPackageId())
                .isFeatured(false)
                .build();
                
        PortfolioShowcaseEntity saved = portfolioRepository.save(entity);
        return mapToDetailRes(saved);
        
    } catch (Exception ex) {
        // NẾU CÓ BẤT KỲ LỖI NÀO PHÁT SINH Ở TẦNG DB HOẶC VALIDATION:
        // Gọi hàm bù trừ xóa sạch các ảnh vừa upload lên Cloudinary
        mediaStorageService.deleteMediaBatchAsync(uploadedCloudIds);
        throw ex; // Ném lại để Spring thực hiện rollback DB
    }
}
```

---

## 💻 5. ĐẶC TẢ CHI TIẾT REST API ENDPOINTS

---

### 5.1. `GET /api/v1/muas/{muaId}/profile` (Xem Hồ sơ Thợ công khai)
* **Quyền truy cập:** Công khai (`permitAll`).
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Lấy thông tin hồ sơ thợ thành công",
  "data": {
    "mua_id": 89,
    "mua_code": "MUA-2026-001024",
    "full_name": "Nguyễn Thị Hương Ly",
    "avatar_url": "https://res.cloudinary.com/makeup/image/upload/v1/avatars/huongly.webp",
    "bio": "Chuyên gia trang điểm cô dâu tone Thái & Douyin hơn 6 năm kinh nghiệm",
    "experience_years": 6,
    "max_service_radius_km": 15.0,
    "rating_average": 4.95,
    "total_reviews": 128,
    "total_completed_jobs": 154,
    "certificates": [
      {
        "cert_name": "Chứng chỉ Nghệ nhân Trang điểm Quốc tế",
        "image_url": "https://res.cloudinary.com/makeup/image/upload/v1/certs/cert_01.webp",
        "is_verified": true
      }
    ],
    "styles": [
      { "id": 1, "code": "TONE_DOUYIN", "name": "Tone Hàn Douyin" },
      { "id": 2, "code": "TONE_THAI", "name": "Tone Thái Sang Trọng" }
    ]
  },
  "timestamp": "2026-09-10T11:25:00Z"
}
```

---

### 5.2. `PUT /api/v1/muas/my-profile` (Thợ tự cập nhật Bio & Bán kính)
* **Quyền hạn:** `ROLE_FREELANCE_MUA`.
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "bio": "Chuyên gia trang điểm cô dâu tone Thái & Douyin hơn 6 năm kinh nghiệm",
  "experience_years": 6,
  "max_service_radius_km": 15.0
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "PROFILE_UPDATED",
  "message": "Cập nhật hồ sơ thợ thành công!",
  "data": {
    "mua_id": 89,
    "bio": "Chuyên gia trang điểm cô dâu tone Thái & Douyin hơn 6 năm kinh nghiệm",
    "experience_years": 6,
    "max_service_radius_km": 15.0,
    "updated_at": "2026-09-10T11:26:00Z"
  },
  "timestamp": "2026-09-10T11:26:00Z"
}
```

---

### 5.3. `PUT /api/v1/muas/my-profile/styles` (Thợ chọn Phong cách Trang điểm Sở trường)
* **Quyền hạn:** `ROLE_FREELANCE_MUA`.
* **Request Body:**
```json
{
  "style_ids": [1, 2, 4]
}
```
* **Response `200 OK`:**
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
  "timestamp": "2026-09-10T11:27:00Z"
}
```

---

### 5.4. `POST /api/v1/muas/my-profile/portfolios` (Thợ đăng tác phẩm mới lên Album)
* **Quyền hạn:** `ROLE_FREELANCE_MUA` (Cần permission `portfolio:upload`).
* **Content-Type:** `multipart/form-data`
* **Form Parameters:**
  * `image_file` (File, Bắt buộc): Ảnh sản phẩm hoàn thiện chính (< 10MB).
  * `additional_files` (Mảng File, Tùy chọn): Tối đa 5 ảnh góc chụp Before/After, cận cảnh (< 5MB/ảnh).
  * `title` (String, Bắt buộc): Tiêu đề tác phẩm (2 - 150 ký tự).
  * `description` (String, Tùy chọn): Mô tả kỹ thuật thực hiện.
  * `style_id` (Integer, Tùy chọn): ID phong cách trang điểm.
  * `package_id` (Long, Tùy chọn): ID gói dịch vụ của thợ.
* **Response `201 Created`:**
```json
{
  "success": true,
  "code": "PORTFOLIO_CREATED",
  "message": "Đăng tác phẩm lên bộ sưu tập thành công!",
  "data": {
    "id": 502,
    "mua_id": 89,
    "title": "Make tiệc tối Tone Thái Glowy chuẩn HD",
    "description": "Kỹ thuật đánh nền mỏng nhẹ che phủ 24h, dán mi gẩy sợi tự nhiên",
    "image_url": "https://res.cloudinary.com/makeup/image/upload/v1/portfolios/showcase_502.webp",
    "thumbnail_url": "https://res.cloudinary.com/makeup/image/upload/c_fill,w_400,h_400,q_auto,f_auto/v1/portfolios/showcase_502.webp",
    "additional_images": [
      "https://res.cloudinary.com/makeup/image/upload/v1/portfolios/showcase_502_before.webp",
      "https://res.cloudinary.com/makeup/image/upload/v1/portfolios/showcase_502_after.webp"
    ],
    "style_id": 2,
    "style_name": "Tone Thái Sang Trọng",
    "is_featured": false,
    "created_at": "2026-09-10T11:28:00Z"
  },
  "timestamp": "2026-09-10T11:28:00Z"
}
```

---

### 5.5. `PATCH /api/v1/muas/my-profile/portfolios/{id}/featured` (Ghim / Bỏ ghim Tác phẩm Tiêu biểu)
* **Quyền hạn:** `ROLE_FREELANCE_MUA` (Chủ sở hữu tác phẩm).
* **Request Body:**
```json
{
  "is_featured": true
}
```
* **Response `200 OK` (Thành công):**
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
  "timestamp": "2026-09-10T11:29:00Z"
}
```
* **Response `400 Bad Request` (Vượt quá 6 ảnh):**
```json
{
  "success": false,
  "code": "PORTFOLIO_FEATURED_LIMIT_EXCEEDED",
  "message": "Bạn chỉ được ghim tối đa 6 tác phẩm tiêu biểu. Vui lòng bỏ ghim bớt tác phẩm cũ trước.",
  "errors": [],
  "timestamp": "2026-09-10T11:29:00Z"
}
```

---

### 5.6. `GET /api/v1/muas/{muaId}/portfolios` (Lấy Album Tác phẩm của Thợ cho Khách xem)
* **Quyền truy cập:** Công khai (`permitAll`).
* **Query Parameters:** `style_id`, `is_featured`, `page=0`, `size=12`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Lấy danh sách tác phẩm thành công",
  "data": {
    "content": [
      {
        "id": 502,
        "title": "Make tiệc tối Tone Thái Glowy chuẩn HD",
        "thumbnail_url": "https://res.cloudinary.com/makeup/image/upload/c_fill,w_400,h_400/v1/portfolios/showcase_502.webp",
        "style_name": "Tone Thái Sang Trọng",
        "is_featured": true,
        "created_at": "2026-09-10T11:28:00Z"
      }
    ],
    "page": 0,
    "size": 12,
    "total_elements": 18,
    "total_pages": 2,
    "last": false
  },
  "timestamp": "2026-09-10T11:30:00Z"
}
```

---

### 5.7. `DELETE /api/v1/muas/my-profile/portfolios/{id}` (Thợ xóa tác phẩm)
* **Quyền hạn:** `ROLE_FREELANCE_MUA` (Chủ sở hữu tác phẩm).
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "PORTFOLIO_DELETED",
  "message": "Đã xóa tác phẩm khỏi bộ sưu tập và dọn dẹp file lưu trữ"
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (POSTGRESQL DDL)

Đồng bộ chính xác với `schema.sql` của dự án cho phân hệ MUA Profile & Portfolio:

```sql
-- 1. BẢNG HỒ SƠ THỢ (SCHEMA: mua_schema)
CREATE TABLE IF NOT EXISTS mua_schema.mua_profiles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    mua_code VARCHAR(30) UNIQUE NOT NULL,            -- MUA-2026-001024
    bio TEXT,                                       -- Tiểu sử nghề nghiệp
    experience_years INT DEFAULT 0 CHECK (experience_years >= 0),
    max_service_radius_km DECIMAL(4, 1) DEFAULT 10.0 CHECK (max_service_radius_km BETWEEN 1.0 AND 50.0),
    certificates JSONB DEFAULT '[]'::jsonb,         -- Mảng URL chứng chỉ & bằng cấp kiểm duyệt
    rating_average DECIMAL(3, 2) DEFAULT 5.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG GÁN PHONG CÁCH CHO THỢ (SCHEMA: mua_schema)
CREATE TABLE IF NOT EXISTS mua_schema.mua_styles (
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    style_id INT REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (mua_id, style_id)
);

-- 3. BẢNG ALBUM TÁC PHẨM THỰC TẾ (SCHEMA: catalog_schema)
CREATE TABLE IF NOT EXISTS catalog_schema.portfolio_showcases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mua_id BIGINT NOT NULL REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    package_id BIGINT REFERENCES catalog_schema.service_packages(id) ON DELETE SET NULL,
    style_id INT REFERENCES catalog_schema.makeup_styles(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,                         -- Ảnh hoàn thiện chính (HD)
    thumbnail_url TEXT,                              -- Ảnh thu nhỏ tối ưu CDN (400x400)
    additional_images JSONB DEFAULT '[]'::jsonb,        -- Mảng JSONB chứa ảnh góc chụp Before/After, cận cảnh
    is_featured BOOLEAN DEFAULT FALSE,               -- Cờ ghim tiêu biểu (Tối đa 6 ảnh)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CHỈ MỤC TỐI ƯU TRUY VẤN GALLERY
CREATE INDEX IF NOT EXISTS idx_portfolio_mua_featured ON catalog_schema.portfolio_showcases(mua_id, is_featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_style ON catalog_schema.portfolio_showcases(style_id);
CREATE INDEX IF NOT EXISTS idx_mua_styles_lookup ON mua_schema.mua_styles(style_id, mua_id);
```

---

## 🛡️ 7. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Hiệu năng & Tối ưu CDN (Performance)**:
   - Tốc độ phản hồi danh sách Portfolio Gallery (`GET /api/v1/muas/{muaId}/portfolios`) đạt **< 50ms** khi Cache Hit và **< 100ms** khi Cache Miss nhờ Index tối ưu và trả về `thumbnail_url`.
   - Nén ảnh tự động sang định dạng WebP giúp giảm 60% dung lượng tải cho ứng dụng Mobile.
2. **Khả năng Chịu tải & Xóa Cache Thông minh**:
   - Sử dụng Redis Cache cho danh sách tác phẩm của thợ. Khi thợ thêm, sửa, ghim hoặc xóa ảnh, hệ thống tự động kích hoạt Evict cache: `@CacheEvict(value = "mua_portfolios", key = "#muaId")`.
3. **An toàn Dữ liệu & Chống Tranh chấp Ghim ảnh (Concurrency Lock)**:
   - Dùng truy vấn `SELECT COUNT(*) FROM portfolio_showcases WHERE mua_id = ? AND is_featured = true FOR UPDATE` để chống race-condition khi người dùng bấm ghim liên tiếp, đảm bảo không bao giờ vượt quá 6 ảnh tiêu biểu.
4. **Bảo mật & Phòng chống Gian lận (Security)**:
   - Kiểm tra Magic Bytes nhị phân bắt buộc đối với 100% file tải lên để ngăn chặn tấn công Remote Code Execution (RCE).
   - Kiểm tra quyền sở hữu IDOR trên mọi thao tác `PUT`, `PATCH`, `DELETE`: Thợ chỉ được phép chỉnh sửa hoặc xóa tác phẩm do chính mình tạo ra.
