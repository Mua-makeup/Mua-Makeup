# TÀI LIỆU TOÀN DIỆN: CÁC CÔNG THỨC TÍNH TOÁN & THUẬT TOÁN HỆ THỐNG
## Makeup Booking Platform (Mua-Makeup)

---

## MỤC LỤC
1. [Hệ Thống Định Giá Động (Dynamic Pricing Engine)](#1-hệ-thống-định-giá-động-dynamic-pricing-engine)
2. [Hệ Thống Phí Di Chuyển (Distance Fee Calculation)](#2-hệ-thống-phí-di-chuyển-distance-fee-calculation)
3. [Hệ Thống Hệ Số Cao Điểm (Surge Pricing Engine)](#3-hệ-thống-hệ-số-cao-điểm-surge-pricing-engine)
4. [Hệ Thống Tiền Cọc & Phân Chia Doanh Thu (Escrow & Revenue Split)](#4-hệ-thống-tiền-cọc--phân-chia-doanh-thu-escrow--revenue-split)
5. [Ma Trận Lead Time Xác Nhận Ca Hẹn (Confirm Deadline Matrix)](#5-ma-trận-lead-time-xác-nhận-ca-hẹn-confirm-deadline-matrix)
6. [Hệ Thống Tọa Độ GPS & Telemetry (Geospatial & Tracking)](#6-hệ-thống-tọa-độ-gps--telemetry-geospatial--tracking)
7. [Thuật Toán Trí Tuệ Nhân Tạo RAG (AI Hybrid Knowledge Search)](#7-thuật-toán-trí-tuệ-nhân-tạo-rag-ai-hybrid-knowledge-search)
8. [Thuật Toán Đánh Giá Điểm Bayes & Cửa Sổ Trượt (Bayesian & Rolling Rating)](#8-thuật-toán-đánh-giá-điểm-bayes--cửa-sổ-trượt-bayesian--rolling-rating)
   * [8.1. Rolling Window 100 Đơn Gần Nhất](#81-thuật-toán-điểm-trượt-100-đơn-gần-nhất-rolling-window-rating)
   * [8.2. Điểm Trung Bình Chuẩn Bayes MUA](#82-thuật-toán-điểm-trung-bình-chuẩn-bayes-bayesian-average-rating)
   * [8.3. Đánh Giá Tích Lũy Kép Studio ($WR_{\text{Studio}}$)](#83-cơ-chế-đánh-giá-tích-lũy-kép-cho-studio-agency-dual-aggregation--bayesian-rating)
   * [8.4. Phân Tầng Trách Nhiệm Ca Tiệc Cưới Nhiều Thợ](#84-cơ-chế-phân-tầng-trách-nhiệm-ca-tiệc-cưới-nhiều-thợ-primary-vs-assistant-mua)
9. [Thuật Toán Xếp Hạng Tìm Kiếm Đa Chiều (Search Ranking Score)](#9-thuật-toán-xếp-hạng-tìm-kiếm-đa-chiều-search-ranking-score)
10. [Thuật Toán Điều Phối Đơn Hàng Khẩn Cấp (Tiered Instant Dispatch Engine)](#10-thuật-toán-điều-phối-đơn-hàng-khẩn-cấp-tiered-instant-dispatch-engine)
11. [Thuật Toán Chống Gian Lận Đánh Giá (Review Fraud & Collusion Detection)](#11-thuật-toán-chống-gian-lận-đánh-giá-review-fraud--collusion-detection)
12. [Cơ Chế Đào Thải, Cảnh Cáo & Gamification Tín Nhiệm (Safety & Badges)](#12-cơ-chế-đào-thải-cảnh-cáo--gamification-tín-nhiệm-safety--badges)

---

## 1. Hệ Thống Định Giá Động (Dynamic Pricing Engine)

### 1.1. Công thức Tổng tiền Đơn Hàng (Invoice Total Amount)
Vị trí: `DynamicPricingServiceImpl.java`, `CustomerInstantBookingServiceImpl.java`

$$\text{TotalAmount} = \max\left(0, \text{ServiceSubtotal} + \text{SurgeAmount} + \text{DistanceFee} + \text{TotalSurcharges} - \text{DiscountAmount}\right)$$

Trong đó:
* $\text{ServiceSubtotal} = \text{PackagePrice} + \sum \text{AddOnPrices}$: Tổng giá tiền gói dịch vụ và các dịch vụ tùy chọn khách chọn thêm.
* $\text{SurgeAmount}$: Số tiền biến thiên do tăng giá giờ cao điểm hoặc giảm giá giờ vàng.
* $\text{DistanceFee}$: Phí bù đắp quãng đường di chuyển của thợ.
* $\text{TotalSurcharges} = \sum \text{Surcharge}_i$: Tổng các phụ phí cố định (làm sớm, lễ tết, ca khẩn cấp).
* $\text{DiscountAmount}$: Số tiền giảm trừ từ Voucher/Mã khuyến mãi.

---

## 2. Hệ Thống Phí Di Chuyển (Distance Fee Calculation)

### 2.1. Công thức Tính Phí Di Chuyển
Vị trí: `DistanceFeeServiceImpl.java`, `PricingConstants.java`

$$\text{ExcessDistanceKm} = \max\left(0, \text{ActualDistanceKm} - \text{FreeRadiusKm}\right)$$

$$\text{DistanceFee} = \text{round}\left(\text{ExcessDistanceKm} \times \text{PricePerKm}\right)$$

### 2.2. Các Hằng Số & Ràng Buộc:
* $\text{FreeRadiusKm}$: Bán kính miễn phí di chuyển (Mặc định: $5.0\text{ km}$).
* $\text{PricePerKm}$: Đơn giá mỗi km vượt trội (Mặc định: $15.000\text{ VNĐ/km}$).
* $\text{MaxServiceRadiusKm}$: Bán kính phục vụ tối đa của thợ/Studio (Mặc định: $30.0\text{ km}$).
* **Ràng buộc an toàn**: Nếu $\text{ActualDistanceKm} > \text{MaxServiceRadiusKm}$, hệ thống ném ngoại lệ `ERR_DISTANCE_EXCEEDS_MAX_RADIUS` và chặn tạo đơn.

---

## 3. Hệ Thống Hệ Số Cao Điểm (Surge Pricing Engine)

### 3.1. Công thức Hệ Số Nhân Giá (Final Surge Multiplier)
Vị trí: `SurgePricingServiceImpl.java`, `PricingConstants.java`

$$\text{FinalMultiplier} = \text{clamp}\left(\max\left(M_{\text{schedule}}, M_{\text{realtime}}\right), 0.70, 1.50\right)$$

$$\text{SurgeAmount} = \text{round}\left(\text{ServiceSubtotal} \times (\text{FinalMultiplier} - 1.0)\right)$$

Trong đó:
* $M_{\text{schedule}}$: Hệ số cấu hình theo khung giờ cố định và ngày trong tuần (ví dụ: khung giờ 06:00 - 08:30 sáng mùa cưới $M = 1.20$; giờ vắng khách trưa $M = 0.85$).
* $M_{\text{realtime}}$: Hệ số thời gian thực quét theo thuật toán không gian Uber H3 Binning (Resolution 7 ~ $1.2\text{ km}$, cửa sổ trượt 5 phút):
  $$\text{DemandRatio} = \frac{\text{DemandCount}}{\max\left(1, \text{SupplyCount}\right)}$$
  $$M_{\text{realtime}} = 1.0 + \max\left(0, (\text{DemandRatio} - 1.0) \times 0.25\right)$$
* $\text{clamp}(x, 0.70, 1.50)$: Ràng buộc sàn không cho phép giảm quá $-30\%$ ($0.70\times$) và không cho phép tăng quá $+50\%$ ($1.50\times$).

---

## 4. Hệ Thống Tiền Cọc & Phân Chia Doanh Thu (Escrow & Revenue Split)

### 4.1. Tiền Đặt Cọc Bảo Chứng (Escrow Deposit)
Vị trí: `BookingDepositServiceImpl.java`, `PricingConstants.java`

$$\text{DepositAmount} = \text{round}\left(\text{TotalAmount} \times 0.30\right)$$

$$\text{RemainingAmount} = \text{TotalAmount} - \text{DepositAmount}$$

* Tỷ lệ đặt cọc bắt buộc toàn sàn: $30\%$ tổng giá trị cuốc làm đẹp.
* Khách hàng thanh toán trước $30\%$ vào quỹ Escrow sàn; $70\%$ còn lại thanh toán sau khi hoàn tất dịch vụ.

### 4.2. Phân Chia Doanh Thu Thợ Tự Do (Freelancer Revenue Split)
Vị trí: `CustomerInstantBookingServiceImpl.java`, `BookingStateMachineServiceImpl.java`

$$\text{PlatformFee} = \text{round}\left(\text{TotalAmount} \times \text{CommissionRate}\right)$$

$$\text{FreelancerEarnings} = \text{TotalAmount} - \text{PlatformFee}$$

* $\text{CommissionRate}$: Mặc định $20\%$ ($0.20$), có thể cấu hình động qua Redis key `settings:freelancer_commission_rate` hoặc chính sách ưu đãi Top Pro ($10\%$).

### 4.3. Phân Chia Doanh Thu Viện Cưới / Studio (Agency Staff Commission Split)
Vị trí: `booking_schema.booking_staff_assignments`, `AgencyStaffCommissionSplit`

$$\text{StaffEarnings} = \text{round}\left(\text{TotalAmount} \times \frac{\text{StaffCommissionRate}}{100}\right)$$

$$\text{StudioNetEarnings} = \text{TotalAmount} - \text{PlatformFee} - \text{StaffEarnings}$$

---

## 5. Ma Trận Lead Time Xác Nhận Ca Hẹn (Confirm Deadline Matrix)

Vị trí: `BookingConfirmationTimeoutHelper.java`

Hạn chót để Thợ MUA xác nhận tiếp nhận ca hẹn trước (`confirm_deadline`) được tính dựa trên khoảng cách từ lúc cọc đến giờ hẹn ($\Delta t_{\text{lead}} = t_{\text{booking}} - t_{\text{deposit}}$):

| Khoảng Cách Lead Time ($\Delta t_{\text{lead}}$) | Thời Hạn Xác Nhận ($\tau_{\text{confirm}}$) | Giới Hạn Đệm An Toàn |
| :--- | :---: | :--- |
| $\le 3\text{ giờ}$ (Ca gấp trong ngày) | **15 phút** | $\min(15\text{m}, \Delta t_{\text{lead}} - 45\text{m})$ |
| $3\text{ giờ} - 12\text{ giờ}$ (Ca trong ngày) | **30 phút** | $\min(30\text{m}, \Delta t_{\text{lead}} - 45\text{m})$ |
| $12\text{ giờ} - 48\text{ giờ}$ (Đặt trước 1-2 ngày) | **120 phút** (2 tiếng) | $\min(120\text{m}, \Delta t_{\text{lead}} - 45\text{m})$ |
| $> 48\text{ giờ}$ (Đặt trước dài hạn) | **240 phút** (4 tiếng) | $\min(240\text{m}, \Delta t_{\text{lead}} - 45\text{m})$ |

* **Quy tắc Đóng băng Ban Đêm (Night Pause)**: Đối với các ca đặt trước $>12\text{h}$, nếu hạn chót rơi vào khung giờ $22:00 - 07:00$, hệ thống tự động dời thời hạn sang $07:00$ sáng hôm sau cộng thêm $50\%$ thời gian hiệu lực.

---

## 6. Hệ Thống Tọa Độ GPS & Telemetry (Geospatial & Tracking)

Vị trí: `GeoDistanceUtils.java`, `TelemetryConstants.java`

### 6.1. Công thức Khoảng cách Trắc địa Haversine (Great-circle Distance)
Bán kính cầu Trái Đất $R = 6.371.000\text{ m}$:

$$\Delta \varphi = \frac{\pi}{180} (\text{lat}_2 - \text{lat}_1), \quad \Delta \lambda = \frac{\pi}{180} (\text{lon}_2 - \text{lon}_1)$$

$$a = \sin^2\left(\frac{\Delta \varphi}{2}\right) + \cos\left(\frac{\pi}{180} \text{lat}_1\right) \cos\left(\frac{\pi}{180} \text{lat}_2\right) \sin^2\left(\frac{\Delta \lambda}{2}\right)$$

$$d_{\text{meters}} = 2 R \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

### 6.2. Ước tính Thời gian Di chuyển Đường Bộ Đô Thị (Estimated Travel Time)
$$\text{TravelMinutes} = \max\left(5, \text{round}\left(\frac{d_{\text{km}} \times K_{\text{road}}}{V_{\text{urban}}} \times 60\right)\right)$$

* $K_{\text{road}} = 1.35$: Hệ số uốn khúc đường bộ đô thị Việt Nam (Haversine Road Factor).
* $V_{\text{urban}} = 25.0\text{ km/h}$: Tốc độ lái xe máy trung bình trong nội thành.
* Quy đổi xấp xỉ: $\text{TravelMinutes} \approx \text{round}(d_{\text{km}} \times 3.24) \approx d_{\text{km}} \times 3.5\text{ phút}$.

### 6.3. Làm Mờ Tọa Độ Bảo Mật Radar (Privacy Fuzzing / Jittering)
Bảo vệ nơi ở riêng tư của thợ bằng cách làm mờ ngẫu nhiên trong bán kính $r \in [30\text{m}, 50\text{m}]$ với góc quay $\theta \in [0, 2\pi)$:

$$\Delta \text{lat} = \frac{r \cos(\theta)}{111.320}, \quad \Delta \text{lon} = \frac{r \sin(\theta)}{111.320 \times \cos(\text{lat} \times \frac{\pi}{180})}$$

---

## 7. Thuật Toán Trí Tuệ Nhân Tạo RAG (AI Hybrid Knowledge Search)

Vị trí: `KnowledgeRetrievalServiceImpl.java`

Điểm tương đồng tài liệu CSKH kết hợp giữa **Vector Cosine Similarity** và **Keyword BM25 Match**:

$$\text{FinalSimilarity} = (0.70 \times \text{CosineSimilarity}) + (0.30 \times \text{KeywordScore})$$

Trong đó Cosine Similarity giữa vector câu hỏi $\mathbf{u}$ và vector tri thức $\mathbf{v}$:

$$\text{CosineSimilarity}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \cdot \|\mathbf{v}\|_2} = \frac{\sum_{i=1}^n u_i v_i}{\sqrt{\sum_{i=1}^n u_i^2} \cdot \sqrt{\sum_{i=1}^n v_i^2}}$$

---

## 8. Thuật Toán Đánh Giá Điểm Bayes & Cửa Sổ Trượt (Bayesian & Rolling Rating)

### 8.1. Thuật toán Điểm Trượt 100 Đơn Gần Nhất (Rolling Window Rating)
Chỉ tính trung bình điểm đánh giá trên $K = 100$ đơn hàng gần nhất (loại bỏ quán tính lịch sử quá cũ):

$$R_{\text{rolling}} = \frac{1}{\min(K, n)} \sum_{i=1}^{\min(K, n)} \text{Rating}_i$$

### 8.2. Thuật toán Điểm Trung Bình Chuẩn Bayes (Bayesian Average Rating)
Giải quyết triệt để vấn đề thợ làm 1 đơn 5★ xếp trên thợ làm 500 đơn 4.9★:

$$\text{Bayesian Rating } (WR) = \frac{v}{v + m} \times R_{\text{rolling}} + \frac{m}{v + m} \times C$$

Trong đó:
* $R_{\text{rolling}}$: Điểm trung bình trượt của thợ.
* $v$: Tổng số lượt đánh giá hợp lệ thợ đã nhận (`total_reviews`).
* $m = 10$: Ngưỡng số lượng đánh giá tối thiểu để đạt độ tin cậy thống kê.
* $C = 4.60$: Điểm đánh giá bình quân của toàn bộ thợ trên sàn Mua-Makeup.

### 8.3. Cơ Chế Đánh Giá Tích Lũy Kép Cho Studio (Agency Dual-Aggregation & Bayesian Rating)
Áp dụng cho các Viện cưới / Studio (`AgencyProfileEntity`) khi nhận đánh giá từ các ca làm của nhân viên:

$$\text{Agency Rating } (WR_{\text{Studio}}) = \frac{v_{\text{Studio}}}{v_{\text{Studio}} + m_{\text{Studio}}} \times R_{\text{Studio\_avg}} + \frac{m_{\text{Studio}}}{v_{\text{Studio}} + m_{\text{Studio}}} \times C_{\text{Studio}}$$

Trong đó:
* $R_{\text{Studio\_avg}} = \frac{1}{v_{\text{Studio}}} \sum_{i=1}^{v_{\text{Studio}}} \text{Rating}_i$: Điểm trung bình cộng thực tế của tất cả các review thuộc các đơn hàng của Studio.
* $v_{\text{Studio}}$: Tổng số lượt đánh giá hợp lệ của Studio (`total_reviews`).
* $m_{\text{Studio}} = 15$: Ngưỡng tin cậy của Studio (quy mô Studio lớn hơn thợ cá nhân nên cần mẫu $m = 15$).
* $C_{\text{Studio}} = 4.65$: Điểm đánh giá bình quân toàn bộ Studio trên sàn Mua-Makeup.

#### Quy tắc Hiển thị UI & Xếp Hạng:
1. **Khách hàng nhìn thấy**: Hiển thị song song điểm thực và số lượt đánh giá: `⭐ 4.85 (120 đánh giá)`.
2. **Khi $v_{\text{Studio}} = 0$**: `rating_avg = null`, giao diện hiển thị `--` hoặc badge `Studio mới`, tuyệt đối không gán 5.0★ ảo.
3. **Thứ tự xếp hạng tìm kiếm Explore**: Sử dụng điểm chuẩn Bayes $WR_{\text{Studio}}$ làm tiêu chí sắp xếp, ngăn chặn triệt để hành vi tạo 1 review 5★ mồi để nhảy lên Top 1.
4. **Bảo toàn Tài sản Thương hiệu**: Đơn hàng và Review gắn vĩnh viễn với `agency_id`. Khi nhân viên nghỉ việc hoặc chuyển Studio, điểm lịch sử của Studio không bị mất.

### 8.4. Cơ Chế Phân Tầng Trách Nhiệm Ca Tiệc Cưới Nhiều Thợ (Primary vs Assistant MUA)
Trong các gói tiệc cưới lớn của Studio có phân công Thợ chính (`PRIMARY_MUA`) và Trợ lý (`ASSISTANT_MUA`), khách hàng chỉ đánh giá 1 lần (1 form 1 chạm). Hệ thống phân bổ điểm theo ma trận:

| Đối Tượng | Vai Trò | Quy Tắc Phân Bổ Điểm & Số Ca |
| :--- | :--- | :--- |
| **Studio (`AgencyProfileEntity`)** | Đơn vị chủ quản nhận thanh toán | Nhận **100% điểm review** vào tổng điểm Studio. |
| **Thợ chính (`PRIMARY_MUA`)** | Trưởng ca chịu trách nhiệm chuyên môn tối cao | Nhận **100% điểm review** vào hồ sơ cá nhân (`MuaProfileEntity`), gắn nhãn ca làm *"Thợ chính"*. |
| **Trợ lý (`ASSISTANT_MUA`)** | Làm tóc, phụ trang điểm phụ kiện | 1. Luôn được cộng **$+1$ ca hoàn thành** (`total_completed_jobs += 1`).<br>2. **Cơ chế bảo vệ thợ trẻ học việc**: Chỉ ghi nhận điểm vào hồ sơ nếu ca đạt **$\ge 4★$**. Ca bị phàn nàn ($\le 3★$) không phạt điểm tay nghề cá nhân của trợ lý (lưu log hiệu suất nội bộ Studio). |

---

## 9. Thuật Toán Xếp Hạng Tìm Kiếm Đa Chiều (Search Ranking Score)

Áp dụng sắp xếp danh sách thợ tại **Tab Khám Phá (Explore)** và **Tìm kiếm Trang Chủ** trên Mobile App & Web.

$$\text{Rank Score} = \left(0.40 \times S_{\text{rating}}\right) + \left(0.30 \times S_{\text{distance}}\right) + \left(0.20 \times S_{\text{experience}}\right) + \left(0.10 \times S_{\text{online}}\right)$$

### Chuẩn hóa các thành phần về thang điểm $[0, 100]$:

| Thành Phần | Trọng Số | Công Thức Chuẩn Hóa |
| :--- | :---: | :--- |
| **1. Điểm Uy Tín ($S_{\text{rating}}$)** | **40%** | $$S_{\text{rating}} = \frac{WR}{5.0} \times 100$$ |
| **2. Điểm Khoảng Cách ($S_{\text{distance}}$)** | **30%** | $$S_{\text{distance}} = \max\left(0, \left(1 - \frac{d}{d_{\max}}\right) \times 100\right)$$ *(với $d_{\max} = 15\text{ km}$)* |
| **3. Điểm Kinh Nghiệm ($S_{\text{experience}}$)** | **20%** | $$S_{\text{experience}} = \min\left(100, \frac{\log_{10}(N + 1)}{\log_{10}(101)} \times 100\right)$$ *(với $N$ là số ca hoàn thành)* |
| **4. Điểm Trực Tuyến ($S_{\text{online}}$)** | **10%** | $$S_{\text{online}} = \begin{cases} 100 & \text{khi } \text{isOnline} = \text{true} \\ 0 & \text{khi } \text{isOnline} = \text{false} \end{cases}$$ |

---

## 10. Thuật Toán Điều Phối Đơn Hàng Khẩn Cấp (Tiered Instant Dispatch Engine)

Khi khách hàng đặt ca khẩn cấp 30 phút, hệ thống phân tầng phát sóng theo thứ bậc (Tiered Broadcast) thay vì chỉ xếp theo khoảng cách:

$$\text{Dispatch Priority Score} = \left(0.50 \times S_{\text{distance}}\right) + \left(0.30 \times S_{\text{acceptance}}\right) + \left(0.20 \times S_{\text{rating}}\right)$$

Trong đó:
* $S_{\text{acceptance}}$: Tỷ lệ nhận ca trong 30 ngày gần nhất:
  $$S_{\text{acceptance}} = \frac{\text{Số ca bấm nhận}}{\text{Tổng số ca được mời trong 30 ngày}} \times 100$$
* **Phân tầng Thời gian Ưu tiên**:
  * **Tầng 1 (Thợ Top Pro $\ge 4.8★$)**: Gửi tín hiệu mời ca ngay lập tức (Giây thứ $0 - 30$).
  * **Tầng 2 (Thợ tiêu chuẩn $4.6★ - 4.7★$)**: Gửi tín hiệu nếu tầng 1 không phản hồi sau 10 giây.
  * **Thợ bị khóa (`is_emergency_locked = true`)**: Loại bỏ hoàn toàn khỏi hàng đợi.

---

## 11. Thuật Toán Chống Gian Lận Đánh Giá (Review Fraud & Collusion Detection)

Điểm nguy cơ gian lận ($\text{Fraud Risk Score} \in [0, 100]$):

$$\text{FraudScore} = F_{\text{device}} + F_{\text{ip}} + F_{\text{bank}} + F_{\text{frequency}}$$

* $F_{\text{device}} = 50$: Trùng `device_id` giữa khách hàng và thợ trong vòng 7 ngày.
* $F_{\text{ip}} = 25$: Trùng địa chỉ IP mạng nội bộ/Wi-Fi lúc đánh giá.
* $F_{\text{bank}} = 30$: Trùng thẻ ngân hàng/tài khoản thanh toán nạp - rút.
* $F_{\text{frequency}} = 20$: Tần suất khách đánh giá thợ này $>3$ lần trong 30 ngày.

**Hành động Hệ Thống**:
* $\text{FraudScore} \ge 50$: Trạng thái `FLAGGED_FRAUD` $\rightarrow$ Hủy bỏ đánh giá, không tính điểm vào profile.
* $25 \le \text{FraudScore} < 50$: Trạng thái `PENDING_AUDIT` $\rightarrow$ Chờ Super Admin kiểm duyệt thủ công.
* $\text{FraudScore} < 25$: Trạng thái `APPROVED` $\rightarrow$ Ghi nhận điểm tức thời.

---

## 12. Cơ Chế Đào Thải, Cảnh Cáo & Gamification Tín Nhiệm (Safety & Badges)

### 12.1. Ngưỡng Đào Thải & Khóa Quyền Tự Động (Deactivation Thresholds)
* **Ngưỡng Cảnh Báo (Level 1)**: $WR < 4.60★$ (sau tối thiểu 10 đơn):
  * Tự động đặt `is_emergency_locked = true` (Khóa quyền nhận cuốc khẩn cấp 30 phút).
  * Gửi cảnh báo In-app và Email yêu cầu cải thiện chất lượng dịch vụ.
* **Ngưỡng Đào Thải Vĩnh Viễn (Level 2)**: $WR < 4.20★$ (sau 10 đơn tiếp theo không cải thiện):
  * Tự động đình chỉ tài khoản (`account_status = SUSPENDED`).
  * Khóa quyền truy cập hệ thống và thông báo kiểm định tay nghề.

### 12.2. Huy Hiệu Tín Nhiệm (Top Pro Badge) & Ưu Đãi Hoa Hồng
* **Điều kiện đạt Huy hiệu Vàng "TOP PRO"**:
  $$\begin{cases} WR \ge 4.90★ \\ \text{CompletedBookings} \ge 50 \\ \text{AcceptanceRate} \ge 85\% \end{cases}$$
* **Đặc quyền**:
  * Gắn huy hiệu tích vàng nổi bật cạnh tên thợ trên toàn bộ ứng dụng.
  * Ưu đãi chiết khấu sàn: Giảm phí hoa hồng từ $20\%$ xuống còn $10\%$ (`commission_rate = 0.10`).
