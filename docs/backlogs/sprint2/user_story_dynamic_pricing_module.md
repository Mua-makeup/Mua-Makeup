# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐỘNG CƠ TÍNH GIÁ ĐỘNG, PHỤ PHÍ & PREVIEW HÓA ĐƠN (DYNAMIC PRICING & INVOICE ENGINE)
### (Spring Boot 3.3.x Layered Monolith `core-api` - Schema: `catalog_schema` & `booking_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Dynamic Pricing & Realtime Invoice Preview Engine`
* **Mã Jira Issues phụ trách (Sprint 2):**
  * `ISSUE-15.1`: **User Story** - Dynamic Pricing Module - Xây dựng Module Tính giá động & Phụ phí trong Monolith (`core-api: 8080`).
  * `ISSUE-15.2`: **Task** - Tích hợp Maps API (Goong Maps Distance Matrix) đo khoảng cách thực tế (km) và thời gian di chuyển kèm Cache Redis 24h & Haversine Circuit Breaker Fallback.
  * `ISSUE-15.3`: **Task** - Thuật toán tính Phí di chuyển (Distance Fee Calculator) kèm mô hình Phễu 4 Tầng Phân Giải Vị Trí Đối Tác (Hierarchy of Fallback).
  * `ISSUE-15.4`: **Task** - Thuật toán Uber H3 Spatial Binning (Resolution 7 ~1.2km) và Động cơ Surge Pricing tự động theo tỷ lệ Cung/Cầu Realtime và Quy tắc Khung giờ cố định ($1.00\times - 1.50\times$).
  * `ISSUE-15.5`: **Task** - Tự động tính toán và bóc tách Phụ phí làm sớm (EARLY_MORNING), phụ phí ngày Lễ/Tết (HOLIDAY) qua `SurchargeService` vào tổng tiền.
  * `ISSUE-15.6`: **Task** - API Preview Hóa đơn Chi tiết Realtime trước khi Khách bấm Đặt đơn (`/api/v1/pricing/preview-invoice`) kèm chính sách Escrow 30% làm tròn chuẩn tiền tệ Việt Nam.
  * `ISSUE-15.7`: **Task** - Bộ API Quản trị Surge Rules và Công tắc Master Bật/Tắt H3 Realtime cho Super Admin (`/api/v1/admin/pricing/surge-rules/**`).
  * `ISSUE-15.8`: **Task** - Đấu nối Động cơ Dynamic Pricing & Surge Multiplier vào Luồng Đặt ca Khẩn cấp Realtime 30s (`CustomerInstantBookingService` & `BookingEntity`).
* **Mô hình Kiến trúc:**
  * **Spring Boot 3.3.x Layered Architecture Monolith** (`code/backend/core-api`, Port `8080`).
  * **Bộ nhớ đệm tính toán (In-Memory Pricing & Distance Cache):** Redis 7.x (`pricing:distance:{lat,lng}:{lat,lng}`, `geo:muas:active`, `surge:demand:{h3_cell}`, `pricing:settings:h3_surge_enabled`).
  * **Chỉ mục Không gian Địa lý (Spatial Indexing):** Uber H3 Core Java SDK v4.1.1 (`com.uber:h3`) phân cụm Cung - Cầu độ phân giải cấp 7.
  * **Tích hợp Bản đồ Ngoại vi (External Maps API):** Goong Maps Distance Matrix API (`vehicle=bike`) kết hợp Timeout 800ms và Circuit Breaker Fallback (Haversine $\times$ 1.35 Road Factor + 25 km/h trung bình).
  * **Cơ sở Dữ liệu Phụ trách (1 Database + 8 Schemas):** PostgreSQL 16 + PostGIS (`catalog_schema.surge_pricing_rules`, `catalog_schema.distance_fee_tiers`, `catalog_schema.surcharges`, `agency_schema.agency_profiles`, `agency_schema.agency_branches`, `mua_schema.mua_profiles`).
* **Đối tượng Sử dụng (User Personas):**
  1. **Customer (Khách hàng đặt lịch):**
     * Nhận được bảng báo giá minh bạch, bóc tách 100% từng dòng tiền chi tiết (Tiền dịch vụ gốc, Add-ons, Phí di chuyển km, Phụ phí làm sớm, Phụ phí Lễ Tết, Hệ số Surge, Voucher giảm giá, Tiền cọc Escrow 30% và Số tiền còn lại sau dịch vụ) trong vòng **$< 30\text{ms}$** ngay khi thay đổi giờ hẹn hoặc địa chỉ.
  2. **Freelance MUA & Agency Owner (Thợ tự do & Chủ Studio):**
     * Thiết lập chính sách phụ phí riêng (Bán kính miễn phí 5km, giá km phát sinh, phụ phí làm sớm).
     * Có quyền bật/tắt cờ tăng giá cao điểm (`is_surge_enabled`) để chủ động giữ giá bình ổn hoặc tăng thu nhập khi cao điểm.
  3. **Super Admin / Platform Revenue Manager (Quản trị Sàn):**
     * Cấu hình biên độ Surge Pricing ($1.00\times - 1.50\times$) theo khung giờ và khu vực; bật/tắt động cơ H3 tức thời qua API `/toggle-h3`.
  4. **Booking Engine & Escrow Wallet (Hệ thống Đặt đơn & Ví Tiền):**
     * Cung cấp số liệu chính xác để khóa đơn, phát sinh giao dịch đặt cọc giữ tiền (Escrow 30%) và chia sẻ hoa hồng sàn khi ca hoàn tất.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (LAYERED ARCHITECTURE BACKEND)

Mã nguồn phân hệ Dynamic Pricing được tổ chức chuẩn hóa tại `code/backend/core-api/src/main/java/com/makeup/platform/`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id (Long), created_at, updated_at
│   │   ├── BaseController.java                # ok, created, error
│   │   └── ApiResponse.java                   # Envelope: {success, code, message, data, timestamp}
│   ├── constants/
│   │   ├── PricingConstants.java              # DEFAULT_FREE_RADIUS_KM (5.0), DEFAULT_PRICE_PER_KM (15000),
│   │   │                                      # MAX_SURGE_MULTIPLIER (1.50), MIN_SURGE_MULTIPLIER (1.00),
│   │   │                                      # ESCROW_DEPOSIT_RATIO (0.30), HAVERSINE_ROAD_FACTOR (1.35),
│   │   │                                      # AVERAGE_DRIVING_SPEED_KMH (25.0), H3_SURGE_RESOLUTION (7),
│   │   │                                      # DEMAND_TTL_SECONDS (300), DEMAND_SURGE_STEP (0.25)
│   │   └── ErrorCodes.java                    # ERR_DISTANCE_EXCEEDS_MAX_RADIUS, ERR_SURGE_RULE_INVALID,
│   │                                          # ERR_PROVIDER_LOCATION_MISSING, ERR_PACKAGE_NOT_FOUND...
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java        # @RestControllerAdvice xử lý ngoại lệ tập trung
│   │   ├── CustomBusinessException.java       # Lỗi nghiệp vụ kèm HttpStatus và ErrorCodes
│   │   └── ResourceNotFoundException.java     # Lỗi không tìm thấy bản ghi (404)
│   └── utils/
│       ├── H3SpatialUtils.java                # Uber H3 Core 4.1.1 (latLngToCell, getSurroundingCells)
│       └── GeoDistanceUtils.java              # Haversine Distance Calculator dự phòng
│
├── config/
│   └── MapsApiConfig.java                     # RestClient cấu hình Goong Maps API Key, Timeout 800ms
│
├── controller/
│   └── pricing/
│       ├── DynamicPricingController.java      # REST: /api/v1/pricing/preview-invoice, /calculate-distance, /providers
│       └── SurgeRuleAdminController.java      # REST: /api/v1/admin/pricing/surge-rules (CRUD, /h3-status, /toggle-h3)
│
├── dto/
│   ├── request/pricing/
│   │   ├── PreviewInvoiceReq.java             # packageId, addOnItemIds, bookingTime, customerLatitude, customerLongitude, providerType, providerId, voucherCode
│   │   ├── CalculateDistanceReq.java          # originLatitude, originLongitude, destinationLatitude, destinationLongitude
│   │   └── ConfigureSurgeRuleReq.java         # ruleName, zoneCode, startTime, endTime, applicableDaysOfWeek, surgeMultiplier, minDemandRatio, isActive
│   └── response/pricing/
│       ├── InvoicePreviewRes.java             # packageInfo, addOns, serviceSubtotal, distanceInfo, surgePricing, surchargesBreakdown, totalSurchargesAmount, discount, financialSummary
│       ├── SurchargeBreakdownItemRes.java     # type, description, amount
│       ├── DistanceMatrixRes.java             # distanceKm, durationMinutes, isCached, routingProvider
│       ├── SurgeRuleRes.java                  # id, ruleName, zoneCode, startTime, endTime, applicableDaysOfWeek, surgeMultiplier, minDemandRatio, isActive
│       └── ProviderOptionRes.java             # id, type, name, address, latitude, longitude, isSurgeEnabled, ratingAvg
│
├── entity/
│   └── pricing/
│       ├── SurgePricingRuleEntity.java        # table: catalog_schema.surge_pricing_rules (kế thừa BaseEntity)
│       └── DistanceFeeTierEntity.java         # table: catalog_schema.distance_fee_tiers (kế thừa BaseEntity)
│
├── mapper/
│   └── pricing/
│       ├── SurgePricingRuleMapper.java        # Manual Mapper @Component (Entity <-> DTO)
│       └── InvoicePreviewMapper.java          # Manual Mapper @Component (Invoice Builder)
│
├── repository/
│   └── pricing/
│       ├── SurgePricingRuleRepository.java    # findMatchingRules(time, dayOfWeek, zoneCode)
│       └── DistanceFeeTierRepository.java     # findApplicableTier(distanceKm)
│
└── service/
    └── pricing/
        ├── DynamicPricingService.java         # Điều phối toàn bộ luồng báo giá hóa đơn & phân giải vị trí đối tác
        ├── MapsClientService.java             # Gọi Goong Maps Distance Matrix + Redis Cache 24h + Haversine Fallback
        ├── DistanceFeeService.java            # Thuật toán tính phí di chuyển (bán kính miễn phí, km vượt, chặn max radius)
        ├── SurgePricingService.java           # Thuật toán kết hợp Schedule Rule & Realtime H3, quản trị CRUD Surge Rules
        ├── SurgeDemandTracker.java            # Đánh giá Cung/Cầu Realtime qua Uber H3 và Redis GEO
        └── impl/
            ├── DynamicPricingServiceImpl.java
            ├── MapsClientServiceImpl.java
            ├── DistanceFeeServiceImpl.java
            ├── SurgePricingServiceImpl.java
            └── SurgeDemandTrackerImpl.java
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
  * **When** Service gọi đo khoảng cách qua `MapsClientService.getDistanceAndDuration(originLat, originLng, destLat, destLng)`.
  * **And** Trong Redis Cache chưa có dữ liệu cho tọa độ làm tròn 4 chữ số thập phân (`Cache Miss`).
  * **Then** Service gọi REST API Goong Maps Distance Matrix (`vehicle=bike`) với connect/read timeout là `800ms`.
  * **And** Nhận về kết quả: `distance_meters = 12450` ($12.45\text{ km}$), `duration_seconds = 1800` ($30\text{ phút}$).
  * **And** Tự động lưu kết quả vào Redis Key `pricing:distance:%.4f,%.4f:%.4f,%.4f` với `TTL = 86400s (24h)`.
  * **And** Trả về kết quả cho luồng tính giá với `routingProvider = "GOONG_MAPS"`, `isCached = false`.

* **Scenario 02: Trả về kết quả tức thì từ Redis Cache (Cache Hit)**
  * **Given** Cặp tọa độ tương tự đã được truy vấn trước đó trong vòng 24 giờ.
  * **When** Khách hàng khác hoặc cùng khách hàng thay đổi giờ hẹn tại cùng địa chỉ.
  * **Then** Service lấy trực tiếp từ Redis trong vòng **$< 2\text{ms}$** mà không gọi ra bên ngoài.
  * **And** Đánh dấu `isCached = true`, tiết kiệm 100% chi phí gọi Maps API bên ngoài (Cost Optimization).

* **Scenario 03: Circuit Breaker kích hoạt Fallback Haversine khi Maps API bị lỗi hoặc timeout**
  * **Given** Goong Maps API gặp sự cố mạng, hết hạn ngạch (quota) hoặc phản hồi quá `800ms`.
  * **When** Khối `try/catch` bắt lỗi timeout hoặc `RestClientException`.
  * **Then** Service tự động kích hoạt phương thức Fallback: tính khoảng cách bằng công thức **Haversine** kết hợp hệ số uốn khúc đường bộ Việt Nam ($1.35\times$):
    $$\text{RoadDistanceKm} = \text{Haversine}(A, B) \times 1.35$$
  * **And** Tính thời gian di chuyển với vận tốc trung bình xe máy đô thị $25\text{ km/h}$:
    $$\text{EstimatedMinutes} = \left\lceil \frac{\text{RoadDistanceKm}}{25} \times 60 \right\rceil$$
  * **And** Đánh dấu `routingProvider = "HAVERSINE_FALLBACK"`, ghi log `WARN`. Toàn bộ tiến trình tạo đơn của khách hàng diễn ra liền mạch không hề bị gián đoạn hay báo lỗi màn hình.

---

### **US-PRC-02: Thuật toán Tính Phí Di chuyển & Phễu 4 Tầng Phân Giải Vị Trí (`ISSUE-15.3`)**
> **As a** Thợ Trang điểm hoặc Chủ Studio,  
> **I want** hệ thống tự động xác định vị trí của tôi theo phễu ưu tiên và tính phí di chuyển dựa trên số km vượt quá bán kính miễn phí,  
> **So that** tôi không phải tự đo đường hay trao đổi mặc cả chi phí xăng xe với khách hàng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Phễu 4 Tầng Ưu Tiên Phân Giải Vị Trí Đối Tác (Hierarchy of Fallback)**
  * **Given** Khách gửi yêu cầu báo giá tới MUA hoặc Studio.
  * **When** Hệ thống phân giải vị trí đối tác:
    - **Tầng 1 (Realtime Stream):** Kiểm tra Redis GEO `geo:muas:active` theo ID của MUA $\rightarrow$ Nếu có tọa độ thì dùng ngay (`REDIS_GEO_REALTIME`).
    - **Tầng 2 (Database Last Known):** Nếu không có trong Redis, tra cứu `last_known_lat/lng` trong `mua_schema.mua_profiles` hoặc bản ghi GPS gần nhất trong `telemetry_schema.telemetry_logs` (`DB_PROFILE_LAST_KNOWN` / `DB_TELEMETRY_LOG_LAST_KNOWN`).
    - **Tầng 3 (Base Address):** Nếu không có GPS, tra cứu địa chỉ cơ sở làm việc `base_address_lat/lng` của MUA hoặc chi nhánh chính đang mở cửa `agency_schema.agency_branches` của Studio (`MUA_BASE_ADDRESS` / `AGENCY_BRANCH_BASE_ADDRESS`).
    - **Tầng 4 (Hard Reject):** Nếu hoàn toàn không có bất kỳ tọa độ nào, hệ thống ném ngoại lệ `ERR_PROVIDER_LOCATION_MISSING` (HTTP 400), **tuyệt đối không giả lập tọa độ ảo**.

* **Scenario 02: Khách hàng nằm trong Bán kính Miễn phí (Free Radius)**
  * **Given** Đối tác có cấu hình: Bán kính phục vụ miễn phí $R_{free} = 5.0\text{ km}$, Đơn giá km vượt = $15,000\text{ đ/km}$.
  * **When** Khoảng cách đo được là $3.8\text{ km}$ ($3.8 \le 5.0$).
  * **Then** Phí di chuyển trả về: $\text{distanceFee} = 0.00\text{ VND}$, $\text{excessDistanceKm} = 0.00\text{ km}$.

* **Scenario 03: Khách hàng vượt Bán kính Miễn phí (Excess Distance Surcharge)**
  * **Given** $R_{free} = 5.0\text{ km}$, Đơn giá km vượt = $15,000\text{ đ/km}$ (lấy từ bảng phụ phí `OUT_OF_RADIUS` của Studio/MUA hoặc mặc định sàn).
  * **When** Khoảng cách thực tế là $12.4\text{ km}$.
  * **Then** Số km vượt bán kính = $12.4 - 5.0 = 7.4\text{ km}$.
  * **And** Phí di chuyển được tính: $\text{distanceFee} = 7.4 \times 15,000 = 111,000.00\text{ VND}$.

* **Scenario 04: Vượt quá Bán kính Phục vụ Tối đa (Max Service Radius)**
  * **Given** Thợ cài đặt bán kính phục vụ tối đa $R_{max} = 25.0\text{ km}$ (hoặc mặc định $30.0\text{ km}$).
  * **When** Khách hàng chọn địa điểm cách thợ $32.0\text{ km}$.
  * **Then** Hệ thống từ chối tính giá và trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_DISTANCE_EXCEEDS_MAX_RADIUS`.

---

### **US-PRC-03: Động cơ Surge Pricing Uber H3 & Quy Tắc Giờ Cao Điểm (`ISSUE-15.4`)**
> **As a** Quản trị viên Sàn & Thợ Trang điểm,  
> **I want** hệ thống tự động áp dụng hệ số nhân giá ($1.00\times - 1.50\times$) theo quy tắc khung giờ hoặc khi lượng thợ rảnh khan hiếm theo cụm địa lý Uber H3,  
> **So that** điều tiết thị trường, khuyến khích thêm thợ online nhận việc và tối ưu doanh thu cho các bên.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Đánh giá Tỷ lệ Cung/Cầu Thời gian thực qua Uber H3 Spatial Binning (Resolution 7)**
  * **Given** Khách hàng ở tọa độ $(lat, lng)$.
  * **When** `SurgeDemandTracker` đánh giá cung cầu:
    1. Băm tọa độ ra mã ô lục giác H3 cấp 7 (~1.2km): `H3SpatialUtils.latLngToCell(lat, lng, 7)`.
    2. Tăng biến đếm CẦU (Demand) với TTL trượt 5 phút: `redisTemplate.opsForValue().increment("surge:demand:" + cellAddress)`.
    3. Đếm CUNG (Supply): Quét số thợ online trong bán kính 3km từ Redis GEO `geo:muas:active`.
    4. Tính tỷ lệ $Ratio = Demand / \max(Supply, 1)$.
    5. Nếu $Ratio > 1.0$, tính hệ số nhân: $\text{Multiplier} = \min(1.0 + (Ratio - 1.0) \times 0.25,\; 1.50)$.
  * **Then** Trả về `RealtimeSurgeResult` với `demandCount`, `supplyCount`, `demandRatio`, `surgeReason` và `surgeType = "REALTIME_DEMAND_SURGE"`.

* **Scenario 02: Kết hợp Hệ số Hai Tầng (Schedule Rule vs. Realtime H3) & Dynamic Cap**
  * **Given** Bảng `catalog_schema.surge_pricing_rules` có quy tắc "Giờ Sáng Rước Dâu Cuối Tuần" (05:00 - 07:00 Thứ 7/CN) với hệ số $1.20\times$.
  * **When** Khách đặt ca lúc 05:30 sáng Chủ Nhật và tại khu vực có nhu cầu cao khiến Realtime H3 đạt $1.35\times$.
  * **Then** Hệ thống chọn giá trị lớn nhất:
    $$\text{FinalMultiplier} = \max(\text{Multiplier}_{\text{schedule}}, \text{Multiplier}_{\text{realtime}}) = \max(1.20, 1.35) = 1.35\times$$
  * **And** Kẹp trần tối đa bảo vệ người dùng không bao giờ vượt quá $1.50\times$.
  * **And** Tiền phụ trội Surge: $\text{surgeAmount} = \text{serviceSubtotal} \times (\text{FinalMultiplier} - 1.00)$.

* **Scenario 03: Tôn trọng Quyền Tự Quyết của Đối tác (`is_surge_enabled = false`)**
  * **Given** MUA hoặc Agency có thiết lập `is_surge_enabled = false` trong hồ sơ.
  * **When** Khách hàng tính giá dịch vụ của đối tác này trong khung giờ cao điểm.
  * **Then** Hệ thống bỏ qua Surge, áp dụng `multiplier = 1.00x`, `surgeAmount = 0đ`, `surgeType = "DISABLED_BY_PROVIDER"`, lý do `"Nhà cung cấp không áp dụng tăng giá cao điểm"`.

* **Scenario 04: Dự phòng Sập Redis (Redis Circuit Breaker Fallback)**
  * **When** Cụm Redis gặp sự cố hoặc timeout khi đánh giá Cung/Cầu H3.
  * **Then** Khối `catch` bắt ngoại lệ, fallback an toàn về `multiplier = 1.00x`, không làm gián đoạn luồng đặt đơn của khách.

---

### **US-PRC-04: Tự động Tính toán & Bóc tách Phụ phí Sớm/Đêm & Lễ Tết (`ISSUE-15.5`)**
> **As a** Khách hàng,  
> **I want** hệ thống tự động bóc tách riêng từng khoản phụ phí làm sớm (EARLY_MORNING) và phụ phí ngày Lễ Tết (HOLIDAY) qua `SurchargeService`,  
> **So that** tôi thấy rõ ràng từng khoản cấu thành giá mà không cảm thấy mập mờ.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Đặt lịch vào khung giờ làm sớm (EARLY_MORNING)**
  * **Given** Đối tác có cấu hình phụ phí ca làm sớm: $150,000\text{ VND}$ trong bảng `catalog_schema.surcharges`.
  * **When** Khách hàng chọn giờ bắt đầu làm lúc `04:15 AM`.
  * **Then** `SurchargeService.calculateSurcharges` tự động nhận diện và trả về mục phụ phí `EARLY_MORNING` trị giá $150,000\text{ VND}$.

* **Scenario 02: Đặt lịch vào ngày Lễ/Tết (HOLIDAY)**
  * **Given** Đối tác có cấu hình phụ phí ngày Lễ/Tết: $200,000\text{ VND}$.
  * **When** Khách đặt lịch vào ngày Nghỉ Lễ theo quy định.
  * **Then** Hệ thống tự động thêm dòng phụ phí `HOLIDAY`: $200,000\text{ VND}$.

* **Scenario 03: Loại trừ phụ phí cự ly trùng lặp (`OUT_OF_RADIUS`)**
  * **Given** Phí di chuyển theo km đã được tính toán độc lập và chi tiết tại `DistanceFeeService`.
  * **When** `DynamicPricingServiceImpl` tổng hợp phụ phí từ `SurchargeService`.
  * **Then** Hệ thống tự động lọc bỏ loại phụ phí `OUT_OF_RADIUS` (`item.getSurchargeType() != SurchargeType.OUT_OF_RADIUS`) để tránh tình trạng tính 2 lần phí di chuyển trên hóa đơn.

---

### **US-PRC-05: API Preview Hóa đơn Chi tiết Realtime & Escrow 30% (`ISSUE-15.6`)**
> **As a** Khách hàng đang ở màn hình Đặt Lịch,  
> **I want** xem bảng báo giá hóa đơn chi tiết cập nhật tức thì (< 30ms) mỗi khi tôi đổi địa điểm, đổi giờ hẹn hoặc chọn thêm phụ kiện tóc (add-on),  
> **So that** tôi kiểm soát chính xác chi phí và biết rõ số tiền cọc 30% cần thanh toán trước khi xác nhận.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Khách hàng gọi API Preview Hóa đơn thành công (Happy Path)**
  * **Given** Khách hàng chọn:
    - Gói dịch vụ `packageId = 1` (Giá niêm yết: $2,500,000\text{ đ}$).
    - Chọn 2 Add-ons: Dán mi ($80,000\text{ đ}$) + Tạo kiểu tóc ($150,000\text{ đ}$).
    - Thời gian hẹn: 04:30 sáng ngày 01/01/2027.
    - Địa điểm cách thợ $14.5\text{ km}$ (Vượt bán kính $9.5\text{ km} \times 15,000\text{ đ} = 142,500\text{ đ}$).
    - Áp dụng Surge $1.10\times$ ($\text{surgeAmount} = 2,730,000 \times 0.10 = 273,000\text{ đ}$).
    - Phụ phí: Sớm ($150,000\text{ đ}$) + Lễ Tết ($200,000\text{ đ}$) = $350,000\text{ đ}$.
    - Voucher `"NEWYEAR2027"` giảm $100,000\text{ đ}$.
  * **When** Client gửi `POST /api/v1/pricing/preview-invoice`.
  * **Then** Backend tính toán theo chuẩn tài chính:
    1. $\text{serviceSubtotal} = 2,500,000 + 80,000 + 150,000 = 2,730,000.00\text{ đ}$.
    2. $\text{surgeAmount} = 273,000.00\text{ đ}$.
    3. $\text{distanceFee} = 142,500.00\text{ đ}$.
    4. $\text{totalSurchargesAmount} = 350,000.00\text{ đ}$.
    5. $\text{discountAmount} = 100,000.00\text{ đ}$.
    6. $\text{totalAmount} = 2,730,000 + 273,000 + 142,500 + 350,000 - 100,000 = 3,395,500.00\text{ đ}$.
    7. $\text{depositRequiredAmount} = \text{round}(3,395,500 \times 0.30 / 1000) \times 1000 = 1,019,000.00\text{ đ}$.
    8. $\text{remainingPayableAmount} = 3,395,500 - 1,019,000 = 2,376,500.00\text{ đ}$.
  * **And** Toàn bộ quá trình tính toán và trả về phản hồi hoàn tất trong vòng **$< 30\text{ms}$**.

---

### **US-PRC-06: Quản trị Quy tắc Surge & Công tắc Master H3 Toàn Sàn (`ISSUE-15.7`)**
> **As a** Super Admin,  
> **I want** tạo, sửa, xóa các quy tắc Surge giờ cao điểm và có công tắc bật/tắt động cơ H3 tức thời,  
> **So that** quản trị chính sách giá toàn nền tảng một cách linh hoạt mà không cần deploy lại code.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Super Admin cấu hình Quy tắc Surge mới**
  * **Given** Admin đăng nhập với quyền `ROLE_SUPER_ADMIN`.
  * **When** Gửi `POST /api/v1/admin/pricing/surge-rules` với payload:
    - `ruleName`: "Giờ Vàng Khai Xuân"
    - `startTime`: "06:00:00", `endTime`: "09:00:00"
    - `applicableDaysOfWeek`: "MONDAY,TUESDAY"
    - `surgeMultiplier`: 1.25
  * **Then** Hệ thống lưu vào `catalog_schema.surge_pricing_rules`, đồng thời xóa cache (`@CacheEvict` trên `surge_pricing_rules`, `surge_rule_list`).
  * **And** Trả về HTTP `201 CREATED`.

* **Scenario 02: Bật / Tắt Khẩn Cấp Động Cơ H3 Surge Toàn Sàn**
  * **Given** Đang trong đợt khuyến mãi tri ân hoặc hệ thống Redis cần bảo trì.
  * **When** Super Admin gọi `POST /api/v1/admin/pricing/surge-rules/toggle-h3?enabled=false`.
  * **Then** Hệ thống cập nhật Redis Key `pricing:settings:h3_surge_enabled = false`.
  * **And** Toàn bộ các lượt tính giá tiếp theo lập tức bỏ qua đánh giá H3 realtime mà chỉ dựa trên quy tắc khung giờ cố định.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ, VALIDATION & BẢNG MÃ LỖI BACK-END

Tất cả các lỗi tính toán và kiểm tra tính hợp lệ đều được đóng gói qua `GlobalExceptionHandler.java`:

```json
{
  "success": false,
  "code": "MÃ_LỖI_NGHIỆP_VỤ",
  "message": "Thông điệp mô tả lỗi chi tiết đã bản địa hóa theo Accept-Language",
  "data": null,
  "timestamp": "2026-09-18T08:00:00"
}
```

### 4.1. Bảng Ma trận Mã Lỗi Phân hệ Dynamic Pricing

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Giải Pháp Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_DISTANCE_EXCEEDS_MAX_RADIUS` | Khoảng cách từ thợ đến nhà khách vượt quá bán kính nhận việc tối đa của thợ/Studio (ví dụ $> 30\text{ km}$). | Chặn tạo đơn, thông báo người dùng chọn thợ khác gần hơn. |
| **`400 BAD_REQUEST`** | `ERR_PROVIDER_LOCATION_MISSING` | Cả 4 tầng phân giải vị trí đều không tìm thấy tọa độ hợp lệ của đối tác. | Ném ngoại lệ, yêu cầu đối tác cập nhật địa chỉ/bật định vị. |
| **`400 BAD_REQUEST`** | `ERR_PACKAGE_NOT_AVAILABLE` | Gói dịch vụ đã bị chủ thợ tắt trạng thái hoạt động (`is_available = false`). | Báo lỗi gói không còn khả dụng để đặt lịch. |
| **`400 BAD_REQUEST`** | `ERR_ADDON_NOT_IN_PACKAGE` | Danh sách `addOnItemIds` chứa dịch vụ bổ trợ không thuộc về gói dịch vụ chỉ định. | Kiểm tra ràng buộc sở hữu trong bảng `catalog_schema.package_items`. |
| **`400 BAD_REQUEST`** | `ERR_SURGE_RULE_INVALID` | Hệ số nhân Surge nằm ngoài biên độ quy định $[1.00, 1.50]$. | Chặn lưu quy tắc, yêu cầu nhập trong khoảng cho phép. |
| **`404 NOT_FOUND`** | `ERR_PACKAGE_NOT_FOUND` | `packageId` truyền lên không tồn tại trong cơ sở dữ liệu. | Ném `ResourceNotFoundException("catalog.package_not_found")`. |
| **`404 NOT_FOUND`** | `ERR_AGENCY_NOT_FOUND` | `providerId` của Agency không tìm thấy. | Ném `ResourceNotFoundException("ERR_AGENCY_NOT_FOUND")`. |
| **`404 NOT_FOUND`** | `ERR_MUA_PROFILE_NOT_FOUND` | `providerId` của MUA không tìm thấy. | Ném `ResourceNotFoundException("ERR_MUA_PROFILE_NOT_FOUND")`. |

---

### 4.2. Mã nguồn DTO Yêu cầu Preview Hóa đơn Chuẩn: `PreviewInvoiceReq.java`

```java
package com.makeup.platform.dto.request.pricing;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreviewInvoiceReq {

    @NotNull(message = "{validation.pricing_package_id_required}")
    private Long packageId;

    private List<Long> addOnItemIds;

    @NotNull(message = "{validation.pricing_booking_time_required}")
    @Future(message = "{validation.pricing_booking_time_future}")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm[:ss][.SSS][XXX][X]")
    private LocalDateTime bookingTime;

    @NotNull(message = "{validation.pricing_customer_lat_required}")
    @DecimalMin(value = "-90.0", message = "{validation.pricing_lat_range}")
    @DecimalMax(value = "90.0", message = "{validation.pricing_lat_range}")
    private BigDecimal customerLatitude;

    @NotNull(message = "{validation.pricing_customer_lng_required}")
    @DecimalMin(value = "-180.0", message = "{validation.pricing_lng_range}")
    @DecimalMax(value = "180.0", message = "{validation.pricing_lng_range}")
    private BigDecimal customerLongitude;

    @NotNull(message = "{validation.pricing_provider_type_required}")
    @Pattern(regexp = "^(FREELANCER|AGENCY)$", message = "{validation.pricing_provider_type_invalid}")
    private String providerType;

    @NotNull(message = "{validation.pricing_provider_id_required}")
    private Long providerId;

    private String voucherCode;
}
```

---

## 💻 5. ĐẶC TẢ REST API CONTRACTS

---

### 5.1. `POST /api/v1/pricing/preview-invoice` (Preview Hóa đơn Chi tiết Realtime)
* **Mục đích:** Client gọi mỗi khi khách thay đổi tùy chọn trên giao diện Đặt lịch để cập nhật bảng tính tiền.
* **Quyền truy cập:** Public / Authenticated.
* **Headers:** `Content-Type: application/json`, `Accept-Language: vi`
* **Request Body:**
```json
{
  "packageId": 1,
  "addOnItemIds": [2, 3],
  "bookingTime": "2027-01-01T04:30:00",
  "customerLatitude": 10.823099,
  "customerLongitude": 106.629664,
  "providerType": "FREELANCER",
  "providerId": 5,
  "voucherCode": "NEWYEAR2027"
}
```
* **Response `200 OK` (Bóc tách minh bạch 100%):**
```json
{
  "success": true,
  "code": "pricing.invoice_preview_success",
  "message": "Tính toán hóa đơn tạm tính thành công",
  "data": {
    "packageInfo": {
      "packageId": 1,
      "packageName": "Gói Trang điểm Cô Dâu Luxury 2026",
      "basePrice": 2500000.00
    },
    "addOns": [
      { "itemId": 2, "name": "Dán mi gẩy sợi kiềm dầu 24h", "price": 80000.00 },
      { "itemId": 3, "name": "Tạo kiểu tóc uốn sóng cao cấp", "price": 150000.00 }
    ],
    "serviceSubtotal": 2730000.00,
    "distanceInfo": {
      "distanceKm": 14.50,
      "freeRadiusKm": 5.00,
      "excessDistanceKm": 9.50,
      "pricePerKm": 15000.00,
      "distanceFee": 142500.00,
      "estimatedTravelMinutes": 35,
      "routingProvider": "GOONG_MAPS"
    },
    "surgePricing": {
      "isSurgeApplied": true,
      "multiplier": 1.10,
      "surgeReason": "Khung giờ cao điểm rước dâu sáng sớm",
      "surgeAmount": 273000.00,
      "demandCount": 12,
      "supplyCount": 4,
      "demandRatio": 3.00,
      "surgeType": "REALTIME_DEMAND_SURGE"
    },
    "surchargesBreakdown": [
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
    "totalSurchargesAmount": 350000.00,
    "discount": {
      "voucherCode": "NEWYEAR2027",
      "discountAmount": 100000.00,
      "description": "Ưu đãi đón xuân 2027 (-100,000đ)"
    },
    "financialSummary": {
      "totalAmount": 3395500.00,
      "depositRatio": 0.30,
      "depositRequiredAmount": 1019000.00,
      "remainingPayableAmount": 2376500.00,
      "currency": "VND"
    }
  },
  "timestamp": "2026-09-18T08:00:00"
}
```

---

### 5.2. `POST /api/v1/pricing/calculate-distance` (Đo Khoảng cách & Thời gian Tuyến đường)
* **Request Body:**
```json
{
  "originLatitude": 10.776889,
  "originLongitude": 106.700806,
  "destinationLatitude": 10.823099,
  "destinationLongitude": 106.629664
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "pricing.distance_calculate_success",
  "message": "Tính toán cự ly di chuyển thành công",
  "data": {
    "distanceKm": 12.45,
    "durationMinutes": 30,
    "isCached": true,
    "routingProvider": "GOONG_MAPS"
  },
  "timestamp": "2026-09-18T08:00:00"
}
```

---

### 5.3. `GET /api/v1/pricing/providers` (Danh sách Đối tác Kèm Tọa độ & Trạng thái Surge)
* **Mục đích:** Cung cấp danh sách đối tác Studio & MUA thực tế phục vụ chọn nhà cung cấp trên giao diện đặt lịch.
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "common.success",
  "message": "Thành công",
  "data": [
    {
      "id": 1,
      "type": "AGENCY",
      "name": "Áo Cưới & Makeup Thảo Tây",
      "address": "123 Võ Thị Sáu, Quận 3, TP.HCM",
      "latitude": 10.785210,
      "longitude": 106.691230,
      "isSurgeEnabled": true,
      "ratingAvg": 4.90
    },
    {
      "id": 5,
      "type": "FREELANCER",
      "name": "Nguyễn Lan Anh (LanAnh Makeup)",
      "address": "Khu vực Quận 1, TP.HCM",
      "latitude": 10.776889,
      "longitude": 106.700806,
      "isSurgeEnabled": true,
      "ratingAvg": 4.95
    }
  ],
  "timestamp": "2026-09-18T08:00:00"
}
```

---

### 5.4. Bộ API Quản trị Surge Rules cho Super Admin (`/api/v1/admin/pricing/surge-rules/**`)
* **Quyền hạn:** `hasRole('SUPER_ADMIN')`

1. **`GET /api/v1/admin/pricing/surge-rules`**: Lấy danh sách tất cả các quy tắc cao điểm.
2. **`POST /api/v1/admin/pricing/surge-rules`**: Tạo mới quy tắc (`ConfigureSurgeRuleReq`).
3. **`PUT /api/v1/admin/pricing/surge-rules/{id}`**: Cập nhật quy tắc.
4. **`DELETE /api/v1/admin/pricing/surge-rules/{id}`**: Xóa quy tắc.
5. **`GET /api/v1/admin/pricing/surge-rules/h3-status`**: Kiểm tra trạng thái động cơ H3 toàn sàn:
   ```json
   { "success": true, "data": { "isH3SurgeEnabled": true } }
   ```
6. **`POST /api/v1/admin/pricing/surge-rules/toggle-h3?enabled=true/false`**: Bật hoặc tắt tức thời động cơ H3:
   ```json
   { "success": true, "data": { "isH3SurgeEnabled": false } }
   ```

---

## 🗄️ 6. CƠ SỞ DỮ LIỆU ĐỒNG BỘ (DDL POSTGRESQL 16 & REDIS CACHE DESIGN)

### 6.1. DDL PostgreSQL 16 (`catalog_schema`, `agency_schema`, `mua_schema`)

Hệ thống quản lý dữ liệu trong 1 CSDL duy nhất `makeup_platform_db` qua các Flyway migrations theo chuẩn Timestamp:

```sql
-- 1. BẢNG CẤU HÌNH QUY TẮC SURGE PRICING (V20260915153000__Add_Surge_Pricing_And_Distance_Tiers.sql)
CREATE TABLE IF NOT EXISTS catalog_schema.surge_pricing_rules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_name VARCHAR(150) NOT NULL,
    zone_code VARCHAR(50) DEFAULT 'ALL',
    start_time TIME,
    end_time TIME,
    applicable_days_of_week VARCHAR(50),
    surge_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (surge_multiplier BETWEEN 1.00 AND 1.50),
    min_demand_ratio NUMERIC(4, 2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG BẬC THANG PHÍ DI CHUYỂN CHUẨN SÀN DỰ PHÒNG
CREATE TABLE IF NOT EXISTS catalog_schema.distance_fee_tiers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    min_distance_km NUMERIC(6, 2) NOT NULL,
    max_distance_km NUMERIC(6, 2) NOT NULL,
    price_per_km NUMERIC(12, 2) NOT NULL CHECK (price_per_km >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BỔ SUNG CỜ BẬT/TẮT SURGE CHO HỒ SƠ ĐỐI TÁC (V20260916143500)
ALTER TABLE agency_schema.agency_profiles 
    ADD COLUMN IF NOT EXISTS is_surge_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE mua_schema.mua_profiles 
    ADD COLUMN IF NOT EXISTS is_surge_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. BỔ SUNG TỌA ĐỘ CƠ SỞ & POSTGIS CHO AGENCY (V20260916161500)
ALTER TABLE agency_schema.agency_profiles
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
    ADD COLUMN IF NOT EXISTS location_point GEOMETRY(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_agency_profiles_location 
    ON agency_schema.agency_profiles USING GIST(location_point);

-- 5. BỔ SUNG TỌA ĐỘ VỊ TRÍ GẦN NHẤT & ĐỊA CHỈ CƠ SỞ CHO MUA (V20260915170000)
ALTER TABLE mua_schema.mua_profiles
    ADD COLUMN IF NOT EXISTS last_known_lat DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS last_known_lng DECIMAL(11, 8),
    ADD COLUMN IF NOT EXISTS last_known_updated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS base_address_lat DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS base_address_lng DECIMAL(11, 8),
    ADD COLUMN IF NOT EXISTS base_address_text TEXT;
```

---

### 6.2. Cấu trúc Khóa Redis In-Memory

| Tên Khóa (Key Pattern) | Kiểu Dữ liệu | Mục đích | Thời gian Sống (TTL) |
| :--- | :--- | :--- | :--- |
| `pricing:distance:%.4f,%.4f:%.4f,%.4f` | `String (JSON)` | Cache kết quả đo khoảng cách km và phút lái xe từ Maps API. | `86400s (24h)` |
| `geo:muas:active` | `zset (GEO)` | Lưu trữ tọa độ realtime của các MUA đang online sẵn sàng nhận việc. | Cập nhật theo GPS ping |
| `surge:demand:{h3_cell}` | `String (Integer)` | Bộ đếm số khách đang yêu cầu ca trong ô lục giác H3 cấp 7. | `300s (5 phút trượt)` |
| `pricing:settings:h3_surge_enabled` | `String (Boolean)` | Cờ công tắc Master cho phép Super Admin bật/tắt động cơ H3. | Vĩnh viễn (Persisted) |

---

## ⚡ 7. CÔNG THỨC TOÁN HỌC & MÔ HÌNH THUẬT TOÁN

```text
                                [ Khách Chọn Gói & Add-ons ]
                                             │
                                             ▼
                         serviceSubtotal = PackagePrice + ∑ AddOnPrice
                                             │
               ┌─────────────────────────────┴──────────────────────────────┐
               ▼                                                            ▼
    [ Phễu 4 Tầng & Đo Cự Ly (Maps) ]                            [ Surge Pricing Engine ]
   1. Redis GEO -> 2. Profile Last Known                        Schedule Rule (findMatchingRules)
   3. Base Address -> 4. Reject                                 Realtime H3 (Resolution 7 Binning)
   Matrix = Route(Origin, Destination)                          Multiplier = max(Schedule, Realtime)
   DistanceFee = max(0, Distance - 5km) * Price/Km              SurgeAmount = Subtotal * (Multiplier - 1.0)
               │                                                            │
               └─────────────────────────────┬──────────────────────────────┘
                                             │
                                             ▼
                        [ Surcharge Engine (Early / Holiday) ]
                        Surcharges = Surcharge_Early + Surcharge_Holiday
                                             │
                                             ▼
            totalAmount = serviceSubtotal + surgeAmount + distanceFee + Surcharges - Discount
                                             │
                                             ▼
             depositRequiredAmount = round(totalAmount * 0.30 / 1000) * 1000 (Escrow cọc 30%)
             remainingPayableAmount = totalAmount - depositRequiredAmount (Còn lại 70%)
```

1. **Công thức Tổng tiền Đơn hàng Hoàn chỉnh:**
   $$\text{serviceSubtotal} = \text{Price}_{\text{package}} + \sum_{i=1}^{n} \text{Price}_{\text{addon}_i}$$
   $$\text{totalAmount} = \text{serviceSubtotal} + \text{surgeAmount} + \text{distanceFee} + \text{totalSurchargesAmount} - \text{discountAmount}$$

2. **Công thức Phí Di chuyển (Distance Fee):**
   $$\text{distanceFee} = \max(0, \text{distanceKm} - \text{freeRadiusKm}) \times \text{pricePerKm}$$

3. **Công thức Hệ số Surge Cung/Cầu Realtime (H3 Resolution 7):**
   $$\text{Ratio} = \frac{\text{DemandCount}}{\max(\text{SupplyCount}, 1)}$$
   $$\text{Multiplier}_{\text{realtime}} = \begin{cases} 1.00 & \text{khi } \text{Ratio} \le 1.0 \\ \min(1.0 + (\text{Ratio} - 1.0) \times 0.25,\; 1.50) & \text{khi } \text{Ratio} > 1.0 \end{cases}$$
   $$\text{FinalMultiplier} = \max(\text{Multiplier}_{\text{schedule}},\; \text{Multiplier}_{\text{realtime}})$$

4. **Công thức Tiền Đặt cọc Escrow 30% (Thân thiện Tiền tệ Việt Nam):**
   $$\text{depositRequiredAmount} = \text{round}\left(\frac{\text{totalAmount} \times 0.30}{1000}\right) \times 1000$$
   $$\text{remainingPayableAmount} = \text{totalAmount} - \text{depositRequiredAmount}$$

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG BACK-END (NFRS)

1. **Thời gian Phản hồi Preview Hóa đơn (Calculation Latency):**
   - API `POST /api/v1/pricing/preview-invoice` phải hoàn thành tính toán trong vòng **$< 30\text{ms}$** đối với 99% request (p99 latency) khi có Redis Cache.
2. **Độ Chính xác Số học Tài chính (Financial Precision):**
   - 100% các phép tính tiền tệ phải sử dụng đối tượng `java.math.BigDecimal` với chế độ làm tròn `RoundingMode.HALF_UP`. Tuyệt đối không dùng `float` hoặc `double` để tránh sai số dấu phẩy động.
3. **Độ Tin cậy Ngoại vi (External Resilience):**
   - Cấu hình Timeout 800ms cho các cuộc gọi Maps API. Nếu gặp sự cố, tự động kích hoạt Haversine Fallback kết hợp hệ số uốn khúc đường bộ Việt Nam ($1.35\times$) để bảo vệ trải nghiệm của khách hàng.
4. **Khả năng Phục hồi khi Redis Gặp Sự cố (Redis Resilience):**
   - Khi Redis đếm Cung/Cầu gặp ngoại lệ, hệ thống tự động bắt lỗi và fallback về hệ số bình thường $1.00\times$, tuyệt đối không làm treo hay báo lỗi màn hình khách hàng.
5. **Bảo mật & Tính Toàn vẹn (Anti-Tampering):**
   - Phía Frontend chỉ gửi các định danh (`packageId`, `addOnItemIds`, tọa độ). Mọi đơn giá, tỷ lệ cọc và công thức phụ phí đều được tính toán và kiểm soát **$100\%$ tại Back-end**, ngăn chặn triệt để hành vi can thiệp sửa giá từ Client.

---

## 🛠️ 9. BÁO CÁO RÀ SOÁT CHẤT LƯỢNG MÃ NGUỒN, CÁC LỖI ĐÃ KHẮC PHỤC & KHUYẾN NGHỊ VẬN HÀNH

Sau quá trình rà soát độc lập và kiểm tra thực tế trên nhánh `feature/dynamic-pricing`, các vấn đề kỹ thuật và điểm tích hợp đã được giải quyết triệt để:

### 9.1. Các Lỗi Kỹ Thuật Đã Khắc Phục (Resolved Issues)

| STT | Vấn đề / Lỗi Kỹ thuật | Trạng thái Ban đầu | Giải pháp & Trạng thái Đã Khắc phục |
| :--- | :--- | :--- | :--- |
| 1 | **Lỗi Type Mismatch tại `DistanceFeeTierRepository`** | Khai báo `JpaRepository<DistanceFeeTierEntity, Integer>`, không tương thích với `BaseEntity` (id kiểu `Long`). | **ĐÃ KHẮC PHỤC**: Cập nhật thành `JpaRepository<DistanceFeeTierEntity, Long>` đồng bộ với Entity và migration Flyway `V20260915172000`. |
| 2 | **Bậc thang cước `distance_fee_tiers` chưa được đưa vào tính toán** | `DistanceFeeServiceImpl` chỉ tính phí phẳng theo `pricePerKm` đầu vào, chưa đọc bảng bậc thang giá sàn trong CSDL. | **ĐÃ KHẮC PHỤC**: Inject `DistanceFeeTierRepository` vào `DistanceFeeServiceImpl`, tự động tra cứu `findApplicableTier(actualDistance)` làm giá sàn dự phòng khi đối tác không cấu hình phụ phí riêng. |
| 3 | **Chưa đấu nối Dynamic Pricing vào Luồng Đặt ca Khẩn cấp 30s** | `CustomerInstantBookingServiceImpl` để `TODO` và hardcode giá tĩnh 500,000đ + 150,000đ. | **ĐÃ KHẮC PHỤC**: Inject `SurgePricingService` & `ServicePackageRepository`, tính giá gói động, áp dụng hệ số Surge theo tọa độ thực tế, tính phụ phí ca khẩn cấp và tiền cọc Escrow 30% làm tròn chuẩn VN, lưu snapshot chuẩn xác vào `BookingEntity`. |
| 4 | **Phân quyền Security cho API Báo giá** | Các endpoint `/api/v1/pricing/**` rơi vào `.anyRequest().authenticated()`, chặn khách chưa đăng nhập xem trước giá. | **ĐÃ KHẮC PHỤC**: Bổ sung `.requestMatchers("/api/v1/pricing/**").permitAll()` trong `SecurityConfig.java`, đảm bảo khách vãng lai tra cứu được báo giá công khai trước khi đăng ký. |
| 5 | **Định dạng tọa độ Goong Maps & Cấu hình `application.yaml`** | Dùng `String.format` thiếu `Locale.US` dẫn đến dấu phẩy trên server tiếng Việt và thiếu khai báo config `app.maps.goong`. | **ĐÃ KHẮC PHỤC**: Thêm `Locale.US` trong `MapsClientServiceImpl` và khai báo cấu hình `app.maps.goong` đọc từ biến môi trường `GOONG_API_KEY` trong `application.yaml`. |

### 9.2. Khuyến Nghị Lộ Trình Nâng Cấp Tiếp Theo (Next Sprint Recommendations)

1. **Chuyển giao Giao diện từ Demo HTML sang React SPA Frontend:**
   - Hiện tại đã có giao diện demo HTML tĩnh hoàn chỉnh tại `static/pricing.html` và `static/js/pricing.js`.
   - Sprint tiếp theo cần chuyển hóa các thành phần này thành React components chuẩn hóa (`src/components/features/booking/InvoicePreviewCard.jsx` và `src/pages/SuperAdmin/SurgePricingManagementPage.jsx`) kết nối API `/api/v1/pricing/*` qua Axios client và Zustand store.
2. **Module Voucher & Khuyến Mãi Tập Trung (Voucher Database Schema):**
   - Hiện logic mã ưu đãi đang xử lý tạm qua mã khuyến mãi ví dụ `"NEWYEAR2027"`. Cần mở rộng thiết kế bảng `catalog_schema.vouchers` để quản lý số lượng phát hành, hạn sử dụng, giới hạn lượt dùng và mức giảm tối đa.

