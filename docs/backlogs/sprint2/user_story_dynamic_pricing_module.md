# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐỘNG CƠ TÍNH GIÁ ĐỘNG, PHỤ PHÍ & PREVIEW HÓA ĐƠN (DYNAMIC PRICING & INVOICE ENGINE)
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schema: `catalog_schema` & `booking_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Dynamic Pricing & Realtime Invoice Preview Engine`
* **Mã Jira Issues phụ trách (Sprint 2):**
  * `ISSUE-15.1`: **User Story** - Dynamic Pricing Module - Xây dựng Module Tính giá động & Phụ phí trong Monolith (`core-api: 8080`).
  * `ISSUE-15.2`: **Task** - Tích hợp Maps API (Goong Maps / Google Maps Distance Matrix) đo khoảng cách thực tế (km) và thời gian di chuyển.
  * `ISSUE-15.3`: **Task** - Thuật toán tính Phí di chuyển theo km (Distance Fee Calculator: miễn phí bán kính $R_{free}$, phụ thu km vượt).
  * `ISSUE-15.4`: **Task** - Thuật toán Surge Pricing tự động tăng giá theo khung giờ cao điểm và tỷ lệ Cung/Cầu ($1.1\times - 1.5\times$).
  * `ISSUE-15.5`: **Task** - Tự động tính toán và tổng hợp Phụ phí làm sớm/đêm (3h-5h sáng), phụ phí ngày Lễ/Tết quốc gia vào tổng tiền.
  * `ISSUE-15.6`: **Task** - API Preview Hóa đơn Chi tiết Realtime trước khi Khách bấm Đặt đơn (`/api/v1/pricing/preview-invoice`).
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Bộ nhớ đệm tính toán (In-Memory Pricing & Distance Cache):** Redis 7.x (`pricing:distance_cache:{geohash_pair}`, `pricing:surge:zone:{district_id}`, `pricing:holidays:{year}`).
  * **Tích hợp Bản đồ Ngoại vi (External Maps API):** Goong Maps API (ưu tiên tại Việt Nam) / Google Maps Distance Matrix API kết hợp **Circuit Breaker (Resilience4j)** và Fallback Haversine / PostGIS `ST_DistanceSphere`.
  * **Cơ sở Dữ liệu Phụ trách:** PostgreSQL 16 (`catalog_schema.surcharges`, `booking_schema.bookings`, `pricing_schema.surge_pricing_rules`).
* **Đối tượng Sử dụng (User Personas):**
  1. **Customer (Khách hàng đặt lịch):**
     * Nhận được bảng báo giá minh bạch, bóc tách 100% từng dòng tiền chi tiết (Tiền dịch vụ gốc, Add-ons, Phí di chuyển km, Phụ phí làm sớm, Phụ phí Lễ Tết, Hệ số Surge, Voucher giảm giá, Tiền cọc Escrow 30%) trong vòng **$< 30\text{ms}$** ngay khi thay đổi giờ hẹn hoặc địa chỉ.
  2. **Freelance MUA & Agency Owner (Thợ tự do & Chủ Studio):**
     * Thiết lập chính sách phụ phí riêng (Bán kính miễn phí 5km, giá 15k/km phát sinh, phụ phí làm sớm 150k cho ca 4h sáng).
     * Được bù đắp xứng đáng hao mòn xăng xe, thời gian di chuyển và công sức làm việc ngoài giờ chuẩn.
  3. **Super Admin / Platform Revenue Manager (Quản trị Sàn):**
     * Cấu hình biên độ Surge Pricing ($1.0\times - 1.5\times$) theo mùa cao điểm (mùa cưới Tháng 10–12, mùa kỷ yếu), bảo vệ sàn khỏi hiện tượng tăng giá quá đà gây phản cảm cho người tiêu dùng.
  4. **Booking Engine & Escrow Wallet (Hệ thống Đặt đơn & Ví Tiền):**
     * Cung cấp số liệu chính xác để khóa đơn, phát sinh giao dịch đặt cọc giữ tiền (Escrow) và chia sẻ hoa hồng sàn khi ca hoàn tất.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Mã nguồn phân hệ Dynamic Pricing được tổ chức chuẩn hóa tại `code/backend/core-api/src/main/java/com/makeup/platform/`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # ok, created, error
│   │   ├── ApiResponse.java                   # Envelope: {success, code, message, data, timestamp}
│   │   ├── PageResponse.java                  # Envelope phân trang chuẩn
│   │   ├── BaseService.java
│   │   └── BaseServiceImpl.java
│   ├── constants/
│   │   ├── PricingConstants.java              # DEFAULT_FREE_RADIUS_KM, MAX_SURGE_MULTIPLIER, ESCROW_DEPOSIT_RATIO
│   │   └── ErrorCodes.java                    # ERR_DISTANCE_EXCEEDS_MAX, ERR_SURGE_RULE_INVALID, ERR_MAPS_TIMEOUT
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Lỗi nghiệp vụ có mã lỗi ErrorCodes
│   │   ├── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (404)
│   │   └── AccessDeniedException.java         # Lỗi vi phạm phân quyền/IDOR (403)
│   ├── i18n/
│   │   ├── CustomLocaleResolver.java          # Đa ngôn ngữ Accept-Language
│   │   └── JsonMessageSource.java             # Nạp file i18n JSON
│   └── utils/
│       ├── HolidayCalendarUtils.java          # Tra cứu lịch Lễ/Tết Việt Nam (Âm lịch & Dương lịch)
│       ├── HaversineDistanceUtils.java        # Tính khoảng cách đường chim bay dự phòng (Fallback)
│       └── SecurityContextUtils.java          # Trích xuất userId từ SecurityContext
│
├── config/
│   ├── MapsApiConfig.java                     # RestClient cấu hình Goong / Google Maps API Key, Timeout 800ms
│   └── ResilienceConfig.java                  # Resilience4j CircuitBreaker & Retry cho Maps API
│
├── controller/
│   └── pricing/
│       ├── DynamicPricingController.java      # REST: /api/v1/pricing/preview-invoice, /calculate-distance
│       └── SurgeRuleAdminController.java      # REST: /api/v1/admin/pricing/surge-rules (CRUD quy tắc surge)
│
├── dto/
│   ├── request/pricing/
│   │   ├── PreviewInvoiceReq.java             # packageId, addOnItemIds, bookingTime, customerLat, customerLng, providerId
│   │   ├── CalculateDistanceReq.java          # originLat, originLng, destinationLat, destinationLng
│   │   └── ConfigureSurgeRuleReq.java         # zoneCode, peakStartTime, peakEndTime, multiplier, minDemandRatio
│   └── response/pricing/
│       ├── InvoicePreviewRes.java             # Chi tiết hóa đơn: subtotal, distanceFee, surcharges, surge, total, deposit
│       ├── SurchargeBreakdownItemRes.java     # Từng dòng phụ phí (Loại, tên hiển thị, số tiền)
│       └── DistanceMatrixRes.java             # distanceKm, durationMinutes, isCached, sourceProvider (GOONG/FALLBACK)
│
├── entity/
│   └── pricing/
│       ├── SurgePricingRuleEntity.java        # table: pricing_schema.surge_pricing_rules
│       └── DistanceTierConfigEntity.java      # table: pricing_schema.distance_fee_tiers
│
├── mapper/
│   └── pricing/
│       ├── SurgePricingRuleMapper.java        # MapStruct: SurgePricingRuleEntity <-> DTOs
│       └── InvoicePreviewMapper.java          # Mapper tổng hợp hóa đơn DTO
│
├── repository/
│   └── pricing/
│       └── SurgePricingRuleRepository.java    # findActiveRulesByTimeAndZone
│
└── service/
    └── pricing/
        ├── DynamicPricingService.java         # Orchestrator: Tổng hợp mọi thành phần giá thành Hóa đơn hoàn chỉnh
        ├── MapsClientService.java             # Gọi API Goong/Google Maps + Redis Cache 24h + CircuitBreaker
        ├── DistanceFeeService.java            # Thuật toán tính phí di chuyển km (miễn phí & lũy tiến)
        ├── SurgePricingService.java           # Thuật toán tính hệ số cao điểm theo giờ & tỷ lệ Cung/Cầu
        ├── SurchargeCalculatorService.java    # Bóc tách phụ phí làm sớm (3h-5h) và ngày Lễ/Tết
        └── impl/
            ├── DynamicPricingServiceImpl.java
            ├── MapsClientServiceImpl.java
            ├── DistanceFeeServiceImpl.java
            ├── SurgePricingServiceImpl.java
            └── SurchargeCalculatorServiceImpl.java
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-PRC-01: Tích hợp Maps API & Động cơ Đo Khoảng cách Tối ưu (`ISSUE-15.2`)**
> **As a** Động cơ Tính giá (Pricing Engine),  
> **I want to** đo chính xác khoảng cách di chuyển thực tế theo đường bộ (Driving Route km) giữa vị trí thợ và nhà khách,  
> **So that** hệ thống tính toán phí di chuyển công bằng cho thợ, có cache 24h và tự động chuyển sang thuật toán dự phòng nếu Maps API gặp sự cố.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Gọi Maps API tính khoảng cách thành công và ghi nhận vào Redis Cache (Happy Path)**
  * **Given** Thợ ở vị trí $A$ (`10.776889, 106.700806`) và Khách ở vị trí $B$ (`10.823099, 106.629664`).
  * **When** Service gọi đo khoảng cách qua `MapsClientService.getDistance(A, B)`.
  * **And** Trong Redis Cache chưa có dữ liệu cho cặp Geohash này (`Cache Miss`).
  * **Then** Service gọi REST API Goong Maps Distance Matrix với timeout là `800ms`.
  * **And** Nhận về kết quả: `distance_meters = 12450` ($12.45\text{ km}$), `duration_seconds = 1800` ($30\text{ phút}$).
  * **And** Tự động lưu kết quả vào Redis Key `pricing:distance:{geohashA}:{geohashB}` với `TTL = 24 hours`.
  * **And** Trả về kết quả cho luồng tính giá với `source = "GOONG_MAPS"`.

* **Scenario 02: Trả về kết quả tức thì từ Redis Cache (Cache Hit)**
  * **Given** Cặp tọa độ tương tự đã được truy vấn trước đó trong vòng 24 giờ.
  * **When** Khách hàng khác hoặc cùng khách hàng thay đổi giờ hẹn tại cùng địa chỉ.
  * **Then** Service lấy trực tiếp từ Redis trong vòng **$< 2\text{ms}$** mà không gọi ra bên ngoài.
  * **And** Tiết kiệm 100% chi phí gọi Maps API bên ngoài (Cost Optimization).

* **Scenario 03: Circuit Breaker kích hoạt Fallback Haversine khi Maps API bị lỗi hoặc timeout**
  * **Given** Goong Maps hoặc Google Maps API gặp sự cố mạng hoặc phản hồi quá `800ms`.
  * **When** Circuit Breaker mở (OPEN) hoặc ném `SocketTimeoutException`.
  * **Then** Service tự động kích hoạt phương thức Fallback: tính khoảng cách bằng công thức **Haversine** kết hợp hệ số uốn khúc đường sá đô thị Việt Nam:
    $$\text{EstimatedRouteDistance} = \text{Haversine}(A, B) \times 1.35$$
  * **And** Ghi log `WARN` để đội ngũ vận hành theo dõi.
  * **And** Toàn bộ tiến trình tạo đơn của khách hàng diễn ra liền mạch không hề bị gián đoạn hay báo lỗi màn hình.

---

### **US-PRC-02: Thuật toán Tính Phí Di chuyển theo km (Distance Fee Calculator) (`ISSUE-15.3`)**
> **As a** Thợ Trang điểm hoặc Chủ Studio,  
> **I want** hệ thống tự động tính phí di chuyển dựa trên số km vượt quá bán kính miễn phí theo mức giá tôi cấu hình,  
> **So that** tôi không phải tự đo đường hay trao đổi mặc cả chi phí xăng xe với khách hàng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Khách hàng nằm trong Bán kính Miễn phí (Free Radius)**
  * **Given** Thợ có cấu hình: Bán kính phục vụ miễn phí $R_{free} = 5.0\text{ km}$, Đơn giá km vượt = $15,000\text{ đ/km}$.
  * **When** Khách đặt địa điểm cách thợ $3.8\text{ km}$ ($3.8 \le 5.0$).
  * **Then** Phí di chuyển trả về: $\text{distance\_fee} = 0.00\text{ VND}$.
  * **And** Dòng phụ phí hiển thị: `"Miễn phí di chuyển trong bán kính 5km"`.

* **Scenario 02: Khách hàng vượt Bán kính Miễn phí (Excess Distance Surcharge)**
  * **Given** Thợ có $R_{free} = 5.0\text{ km}$, Đơn giá km vượt = $15,000\text{ đ/km}$.
  * **When** Khoảng cách thực tế là $12.4\text{ km}$.
  * **Then** Số km vượt bán kính = $12.4 - 5.0 = 7.4\text{ km}$.
  * **And** Phí di chuyển được tính:
    $$\text{distance\_fee} = 7.4 \times 15,000 = 111,000\text{ VND}$$
  * **And** Bóc tách trên hóa đơn: `"Phí di chuyển phát sinh (7.4 km x 15,000đ): 111,000đ"`.

* **Scenario 03: Vượt quá Bán kính Phục vụ Tối đa (Max Service Radius)**
  * **Given** Thợ cài đặt bán kính phục vụ tối đa $R_{max} = 25.0\text{ km}$.
  * **When** Khách hàng chọn địa điểm cách thợ $32.0\text{ km}$.
  * **Then** Hệ thống từ chối tính giá và trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_DISTANCE_EXCEEDS_MAX_RADIUS`.
  * **And** Gợi ý khách hàng chọn các Thợ hoặc Studio khác ở khu vực lân cận hơn.

---

### **US-PRC-03: Thuật toán Tăng giá Động (Surge Pricing Engine) theo Cao điểm & Cung/Cầu (`ISSUE-15.4`)**
> **As a** Quản trị viên Sàn & Thợ Trang điểm,  
> **I want** hệ thống tự động áp dụng hệ số nhân giá ($1.1\times - 1.5\times$) trong các khung giờ cao điểm và khi lượng thợ rảnh khan hiếm,  
> **So that** khuyến khích thêm nhiều thợ bật online nhận việc và tối ưu doanh thu cho các bên.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Áp dụng Surge Pricing giờ cao điểm rước dâu cuối tuần**
  * **Given** Khung giờ 05:00 – 07:00 sáng Thứ Bảy và Chủ Nhật được cấu hình hệ số Surge mặc định là $1.20\times$.
  * **When** Khách hàng đặt ca make-up cô dâu lúc 05:30 sáng Chủ Nhật.
  * **Then** Hệ số Surge áp dụng là $M_{surge} = 1.20$.
  * **And** Tiền dịch vụ gốc ($1,000,000\text{ đ}$) $\times 1.20 = 1,200,000\text{ đ}$ (phụ trội cao điểm: $+200,000\text{ đ}$).
  * **And** Màn hình hiển thị nhãn nổi bật: `"⚡ Khung giờ cao điểm cuối tuần (+20%)"`.

* **Scenario 02: Surge Pricing tự động theo Tỷ lệ Cung/Cầu Realtime (Dynamic D/S Ratio)**
  * **Given** Tại Quận 1 lúc 18:00 tối có 50 khách đang tạo đơn khẩn cấp nhưng chỉ có 10 thợ rảnh trong Redis GEO (`Demand / Supply Ratio = 5.0 > 3.0`).
  * **When** Thuật toán đánh giá tỷ lệ Cung/Cầu vượt ngưỡng $3.0$.
  * **Then** Tự động kích hoạt hệ số Surge khu vực $M_{surge} = 1.35\times$.
  * **And** Giới hạn trần tối đa (Max Surge Cap) không bao giờ vượt quá $1.50\times$ để tránh tình trạng ép giá quá mức.

* **Scenario 03: Khung giờ bình thường không tăng giá**
  * **When** Khách đặt ca vào 10:00 sáng ngày Thứ Ba thường.
  * **Then** Hệ số Surge $M_{surge} = 1.00\times$ (không phát sinh phụ trội).

---

### **US-PRC-04: Tự động Tính toán & Bóc tách Phụ phí Sớm/Đêm & Lễ Tết (`ISSUE-15.5`)**
> **As a** Khách hàng,  
> **I want** hệ thống tự động bóc tách riêng từng khoản phụ phí làm sớm (3h-5h sáng) và phụ phí ngày Lễ Tết theo quy định,  
> **So that** tôi thấy rõ ràng vì sao có các khoản phụ phí này mà không cảm thấy mập mờ về giá.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Đặt lịch vào khung giờ làm sớm (03:00 - 05:00 sáng)**
  * **Given** Thợ có cấu hình phụ phí ca làm sớm: $150,000\text{ VND}$.
  * **When** Khách hàng chọn giờ bắt đầu làm lúc `04:15 AM`.
  * **Then** Hệ thống tự động thêm dòng:
    - Loại: `EARLY_MORNING`
    - Tên hiển thị: `"Phụ phí làm sớm (03:00 - 05:00 sáng)"`
    - Số tiền: $150,000\text{ VND}$.

* **Scenario 02: Đặt lịch vào ngày Lễ/Tết quốc gia Việt Nam**
  * **Given** Thợ có cấu hình phụ phí ngày Lễ/Tết: $200,000\text{ VND}$.
  * **When** Khách đặt lịch vào ngày `01/01/2027` (Tết Dương Lịch) hoặc `30/04/2027` (Ngày Thống Nhất).
  * **Then** `HolidayCalendarUtils` nhận diện ngày đặt là Ngày Nghỉ Lễ theo Luật Lao động Việt Nam.
  * **And** Tự động thêm dòng phụ phí `HOLIDAY`: $200,000\text{ VND}$.

* **Scenario 03: Cộng dồn nhiều khoản phụ phí hợp lệ mà không trùng lặp**
  * **When** Khách đặt lịch lúc `04:00 AM` ngày `01/01/2027` (Vừa làm sớm vừa ngày Tết Dương Lịch).
  * **Then** Cả 2 khoản phụ phí được bóc tách riêng biệt và cộng dồn:
    - `EARLY_MORNING`: $150,000\text{ đ}$
    - `HOLIDAY`: $200,000\text{ đ}$
    - Tổng phụ phí: $350,000\text{ đ}$.

---

### **US-PRC-05: API Preview Hóa đơn Chi tiết Realtime trước khi Đặt đơn (`ISSUE-15.6`)**
> **As a** Khách hàng đang ở màn hình Đặt Lịch,  
> **I want** xem hóa đơn tạm tính cập nhật tức thì (< 30ms) mỗi khi tôi đổi địa điểm, đổi giờ hẹn hoặc chọn thêm phụ kiện tóc (add-on),  
> **So that** tôi kiểm soát chính xác ngân sách và biết rõ số tiền cọc cần thanh toán trước khi bấm xác nhận.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Khách hàng gọi API Preview Hóa đơn thành công (Happy Path)**
  * **Given** Khách hàng chọn:
    - Gói dịch vụ `package_id = 45` (Giá niêm yết: $2,500,000\text{ đ}$).
    - Chọn 2 Add-ons: Dán mi gẩy sợi ($80,000\text{ đ}$) + Làm tóc cô dâu ($150,000\text{ đ}$).
    - Thời gian hẹn: 04:30 sáng ngày 01/01/2027.
    - Địa điểm cách thợ $14.5\text{ km}$ (Vượt bán kính $4.5\text{ km} \times 15,000\text{ đ} = 67,500\text{ đ}$).
    - Khung giờ áp dụng Surge $1.10\times$.
  * **When** Client gửi `POST /api/v1/pricing/preview-invoice`.
  * **Then** Backend tính toán theo công thức chuẩn:
    1. $\text{service\_subtotal} = 2,500,000 + 80,000 + 150,000 = 2,730,000\text{ đ}$.
    2. $\text{surge\_extra} = 2,730,000 \times (1.10 - 1.00) = 273,000\text{ đ}$.
    3. $\text{distance\_fee} = 67,500\text{ đ}$.
    4. $\text{surcharges} = 150,000\text{ (Sớm)} + 200,000\text{ (Lễ)} = 350,000\text{ đ}$.
    5. $\text{total\_amount} = 2,730,000 + 273,000 + 67,500 + 350,000 = 3,420,500\text{ đ}$.
    6. $\text{deposit\_amount (30\%)} = 3,420,500 \times 0.30 = 1,026,150\text{ đ}$.
  * **And** Toàn bộ quá trình tính toán và trả về phản hồi hoàn tất trong vòng **$< 25\text{ms}$**.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI BACK-END

Tất cả các lỗi tính toán và kiểm tra tính hợp lệ đều được đóng gói qua `GlobalExceptionHandler.java`:

```json
{
  "success": false,
  "code": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Thông điệp mô tả lỗi chi tiết cho client",
  "errors": [],
  "timestamp": "2026-09-14T08:55:00Z"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Phân hệ Dynamic Pricing

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_DISTANCE_EXCEEDS_MAX_RADIUS` | Khoảng cách từ thợ đến nhà khách vượt quá bán kính nhận việc tối đa của thợ/Studio (ví dụ $> 30\text{ km}$). | Chặn tạo đơn, thông báo người dùng chọn thợ khác gần hơn. |
| **`400 BAD_REQUEST`** | `ERR_INVALID_BOOKING_TIME` | Thời gian hẹn đặt trong quá khứ hoặc không đúng định dạng ISO-8601 chuẩn UTC. | Bean Validation chặn lại ngay tại tầng Controller DTO. |
| **`400 BAD_REQUEST`** | `ERR_PACKAGE_NOT_AVAILABLE` | Gói dịch vụ đã bị chủ thợ tắt trạng thái hoạt động (`is_available = false`). | Báo lỗi gói không còn khả dụng để đặt lịch. |
| **`400 BAD_REQUEST`** | `ERR_ADDON_NOT_IN_PACKAGE` | Danh sách `add_on_ids` chứa dịch vụ bổ trợ không thuộc về gói dịch vụ chỉ định. | Kiểm tra ràng buộc sở hữu trong bảng `package_items`. |
| **`404 NOT_FOUND`** | `ERR_PACKAGE_NOT_FOUND` | `package_id` truyền lên không tồn tại trong cơ sở dữ liệu. | Ném `ResourceNotFoundException("Gói dịch vụ không tồn tại")`. |
| **`404 NOT_FOUND`** | `ERR_PROVIDER_NOT_FOUND` | `provider_id` của Thợ hoặc Studio không tìm thấy. | Ném `ResourceNotFoundException("Đơn vị cung cấp không tồn tại")`. |
| **`500 INTERNAL_ERROR`** | `ERR_PRICING_CALCULATION_FAILED` | Lỗi chia cho 0 hoặc lỗi tràn số thập phân khi tính toán tiền tệ. | Bắt ngoại lệ toán học, fallback về giá cơ bản an toàn. |

---

### 4.2. Mã nguồn Validation DTO Mẫu (Bean Validation)

#### DTO Yêu cầu Preview Hóa đơn: `PreviewInvoiceReq.java`
```java
package com.makeup.platform.dto.request.pricing;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreviewInvoiceReq {

    @NotNull(message = "{pricing.package_id.required}")
    private Long packageId;

    private List<Long> addOnItemIds; // Danh sách ID các dịch vụ bổ trợ mua thêm

    @NotNull(message = "{pricing.booking_time.required}")
    @Future(message = "{pricing.booking_time.must_be_future}")
    private OffsetDateTime bookingTime;

    @NotNull(message = "{pricing.latitude.required}")
    @DecimalMin(value = "-90.0", message = "{pricing.latitude.invalid}")
    @DecimalMax(value = "90.0", message = "{pricing.latitude.invalid}")
    private BigDecimal customerLatitude;

    @NotNull(message = "{pricing.longitude.required}")
    @DecimalMin(value = "-180.0", message = "{pricing.longitude.invalid}")
    @DecimalMax(value = "180.0", message = "{pricing.longitude.invalid}")
    private BigDecimal customerLongitude;

    @NotNull(message = "{pricing.provider_type.required}")
    @Pattern(regexp = "^(FREELANCER|AGENCY)$", message = "Loại đối tác phải là FREELANCER hoặc AGENCY")
    private String providerType;

    @NotNull(message = "{pricing.provider_id.required}")
    private Long providerId;

    private String voucherCode; // Mã giảm giá nếu có
}
```

---

## 💻 5. ĐẶC TẢ REST API CONTRACTS

---

### 5.1. `POST /api/v1/pricing/preview-invoice` (Preview Hóa đơn Chi tiết Realtime)
* **Mục đích:** Client gọi mỗi khi khách thay đổi tùy chọn trên giao diện Đặt lịch để cập nhật bảng tính tiền.
* **Quyền truy cập:** Công khai hoặc Khách hàng đã đăng nhập (`permitAll` / `hasAuthority('booking:preview')`).
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "package_id": 45,
  "add_on_item_ids": [112, 115],
  "booking_time": "2027-01-01T04:30:00Z",
  "customer_latitude": 10.823099,
  "customer_longitude": 106.629664,
  "provider_type": "FREELANCER",
  "provider_id": 89,
  "voucher_code": "NEWYEAR2027"
}
```
* **Response `200 OK` (Bóc tách minh bạch 100%):**
```json
{
  "success": true,
  "code": "INVOICE_PREVIEW_GENERATED",
  "message": "Tính toán hóa đơn tạm tính thành công",
  "data": {
    "package_info": {
      "package_id": 45,
      "package_name": "Gói Trang điểm Cô Dâu Luxury 2026",
      "base_price": 2500000.00
    },
    "add_ons": [
      { "item_id": 112, "name": "Dán mi gẩy sợi kiềm dầu 24h", "price": 80000.00 },
      { "item_id": 115, "name": "Tạo kiểu tóc uốn sóng cao cấp", "price": 150000.00 }
    ],
    "service_subtotal": 2730000.00,
    "distance_info": {
      "distance_km": 14.5,
      "free_radius_km": 5.0,
      "excess_distance_km": 9.5,
      "price_per_km": 15000.00,
      "distance_fee": 142500.00,
      "estimated_travel_minutes": 35
    },
    "surge_pricing": {
      "is_surge_applied": true,
      "multiplier": 1.10,
      "surge_reason": "Khung giờ cao điểm buổi sáng sớm (04:00 - 06:00)",
      "surge_amount": 273000.00
    },
    "surcharges_breakdown": [
      {
        "type": "EARLY_MORNING",
        "description": "Phụ phí làm sớm (04:30 sáng)",
        "amount": 150000.00
      },
      {
        "type": "HOLIDAY",
        "description": "Phụ phí ngày Lễ Tết (Tết Dương Lịch 01/01)",
        "amount": 200000.00
      }
    ],
    "total_surcharges_amount": 350000.00,
    "discount": {
      "voucher_code": "NEWYEAR2027",
      "discount_amount": 100000.00,
      "description": "Ưu đãi đón xuân 2027 (-100,000đ)"
    },
    "financial_summary": {
      "total_amount": 3395500.00,
      "deposit_ratio": 0.30,
      "deposit_required_amount": 1018650.00,
      "remaining_payable_amount": 2376850.00,
      "currency": "VND"
    }
  },
  "timestamp": "2026-09-14T08:55:00Z"
}
```

---

### 5.2. `POST /api/v1/pricing/calculate-distance` (Kiểm tra Khoảng cách & Tuyến đường Di chuyển)
* **Mục đích:** Trả về khoảng cách km và thời gian dự kiến giữa 2 điểm tọa độ.
* **Request Body:**
```json
{
  "origin_latitude": 10.776889,
  "origin_longitude": 106.700806,
  "destination_latitude": 10.823099,
  "destination_longitude": 106.629664
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "DISTANCE_CALCULATED",
  "message": "Tính toán khoảng cách thành công",
  "data": {
    "distance_km": 12.45,
    "duration_minutes": 30,
    "is_cached": true,
    "routing_provider": "GOONG_MAPS"
  },
  "timestamp": "2026-09-14T08:55:01Z"
}
```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16 & REDIS CACHE DESIGN)

### 6.1. DDL PostgreSQL 16 (`pricing_schema` & `booking_schema`)

```sql
-- 1. TẠO SCHEMA QUẢN LÝ TÍNH GIÁ ĐỘNG
CREATE SCHEMA IF NOT EXISTS pricing_schema;

-- 2. BẢNG CẤU HÌNH QUY TẮC SURGE PRICING (CAO ĐIỂM / MÙA CƯỚI)
CREATE TABLE IF NOT EXISTS pricing_schema.surge_pricing_rules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_name VARCHAR(150) NOT NULL,
    zone_code VARCHAR(50) DEFAULT 'ALL',          -- 'VN_ALL', 'HCM_D1', 'HN_HK'...
    start_time TIME,                              -- Khung giờ: 05:00:00
    end_time TIME,                                -- Khung giờ: 07:00:00
    applicable_days_of_week VARCHAR(50),          -- 'SATURDAY,SUNDAY'
    surge_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00 CHECK (surge_multiplier BETWEEN 1.00 AND 1.50),
    min_demand_ratio DECIMAL(4, 2) DEFAULT 1.00,  -- Kích hoạt khi Demand/Supply > 2.0
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG BẬC THANG PHÍ DI CHUYỂN CHUẨN SÀN (FALLBACK DISTANCE TIERS)
CREATE TABLE IF NOT EXISTS pricing_schema.distance_fee_tiers (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    min_distance_km DECIMAL(6, 2) NOT NULL,
    max_distance_km DECIMAL(6, 2) NOT NULL,
    price_per_km DECIMAL(12, 2) NOT NULL CHECK (price_per_km >= 0),
    is_active BOOLEAN DEFAULT TRUE
);

-- CHÈN DỮ LIỆU MẪU QUY TẮC CAO ĐIỂM
INSERT INTO pricing_schema.surge_pricing_rules 
(rule_name, zone_code, start_time, end_time, applicable_days_of_week, surge_multiplier, is_active)
VALUES 
('Giờ Sáng Rước Dâu Cuối Tuần', 'VN_ALL', '05:00:00', '07:00:00', 'SATURDAY,SUNDAY', 1.20, TRUE),
('Giờ Tiệc Tối Khẩn Cấp', 'VN_ALL', '17:30:00', '19:30:00', 'FRIDAY,SATURDAY,SUNDAY', 1.15, TRUE)
ON CONFLICT DO NOTHING;
```

---

### 6.2. Cấu trúc Khóa Redis In-Memory

| Tên Khóa (Key Pattern) | Kiểu Dữ liệu | Mục đích | Thời gian Sống (TTL) |
| :--- | :--- | :--- | :--- |
| `pricing:distance:{hashA}:{hashB}` | `String (JSON)` | Cache khoảng cách km và thời gian lái xe từ Maps API. | `86400s (24h)` |
| `pricing:surge:zone:{zone_code}` | `Hash` | Cache hệ số Surge hiện tại của khu vực theo tỷ lệ cung cầu. | `300s (5 phút)` |
| `pricing:holidays:vn:{year}` | `Set` | Danh sách các ngày nghỉ Lễ/Tết quốc gia của Việt Nam theo định dạng `yyyy-MM-dd`. | `30 days` |

---

## ⚡ 7. CÔNG THỨC TOÁN HỌC & THUẬT TOÁN ĐỘNG CƠ GIÁ

```text
                               [ Khách Chọn Gói & Add-ons ]
                                            │
                                            ▼
                        BaseService = PackagePrice + ∑ AddOnPrice
                                            │
               ┌────────────────────────────┴───────────────────────────┐
               ▼                                                        ▼
    [ Thuật toán Đo km (Maps) ]                              [ Surge Pricing Engine ]
   Distance = Route(Origin, Dest)                           M_surge = f(Time, Day, D/S Ratio)
   DistanceFee = max(0, Distance - R_free) * Rate           SurgeAmount = BaseService * (M_surge - 1.0)
               │                                                        │
               └────────────────────────────┬───────────────────────────┘
                                            │
                                            ▼
                        [ Surcharge Engine (Early / Holiday) ]
                        Surcharges = Surcharge_Early + Surcharge_Holiday
                                            │
                                            ▼
           TotalAmount = BaseService + SurgeAmount + DistanceFee + Surcharges - Discount
                                            │
                                            ▼
                    DepositAmount = TotalAmount * 0.30 (Escrow cọc giữ trước)
```

1. **Công thức Tổng tiền Đơn hàng Hoàn chỉnh:**
   $$\text{BaseService} = \text{Price}_{\text{package}} + \sum_{i=1}^{n} \text{Price}_{\text{addon}_i}$$
   $$\text{TotalAmount} = \text{BaseService} \times M_{\text{surge}} + \text{DistanceFee} + \text{Surcharges} - \text{DiscountAmount}$$

2. **Công thức Phí Di chuyển (Distance Fee):**
   $$\text{DistanceFee} = \max(0, \text{Distance}_{\text{km}} - R_{\text{free}}) \times \text{PricePerKm}$$

3. **Công thức Tiền Đặt cọc Escrow (Deposit Required):**
   $$\text{DepositAmount} = \text{round}(\text{TotalAmount} \times 0.30, -3)$$
   *(Làm tròn đến hàng nghìn đồng để thân thiện với cổng thanh toán Việt Nam).*

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Thời gian Phản hồi Preview Hóa đơn (Calculation Latency):**
   - API `POST /api/v1/pricing/preview-invoice` phải hoàn thành tính toán trong vòng **$< 30\text{ms}$** đối với 99% request (p99 latency) khi có Redis Cache.
2. **Độ Chính xác Số học Tài chính (Financial Precision):**
   - 100% các phép tính tiền tệ phải sử dụng đối tượng `java.math.BigDecimal` với chế độ làm tròn `RoundingMode.HALF_UP`. Tuyệt đối không dùng `float` hoặc `double` để tránh sai số dấu phẩy động.
3. **Độ Tin cậy Ngoại vi (External Resilience):**
   - Tích hợp **Resilience4j Circuit Breaker** cho các cuộc gọi Maps API: Nếu tỷ lệ lỗi $> 30\%$ hoặc thời gian chờ $> 800\text{ms}$, tự động ngắt mạch chuyển sang thuật toán Fallback Haversine nội bộ để bảo vệ trải nghiệm của khách hàng.
4. **Bảo mật & Tính Toàn vẹn (Anti-Tampering):**
   - Phía Frontend chỉ gửi các định danh (`packageId`, `addOnItemIds`, tọa độ). Mọi đơn giá, tỷ lệ cọc và công thức phụ phí đều được tính toán và kiểm soát **$100\%$ tại Back-end**, ngăn chặn triệt để hành vi can thiệp sửa giá từ Client.
