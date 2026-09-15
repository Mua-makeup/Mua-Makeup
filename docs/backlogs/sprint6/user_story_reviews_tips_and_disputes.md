# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: ĐÁNH GIÁ RATING 1-5★, TIP TIỀN THỢ & XỬ LÝ KHIẾU NẠI DỊCH VỤ (DISPUTES)
### (Spring Boot 3.3.x Layered Monolith with Domain Sub-packages `core-api` - Schema: `interaction_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Review, Tip & Dispute Resolution Management Engine`
* **Mã Jira Issues phụ trách (Sprint 6 - Nhóm 1):**
  * `ISSUE-24.1`: **User Story** - Module Đánh giá Rating 1-5★ & Nhận xét chất lượng sản phẩm (`reviews`).
  * `ISSUE-24.2`: **Task** - Tính năng Tip tiền trực tiếp cho Thợ từ Ví Khách hàng sau khi hoàn thành ca (`tip_amount`).
  * `ISSUE-24.3`: **Task** - Module Đơn Khiếu nại Dịch vụ (`disputes`) & Quy trình Tạm đóng băng tiền giải ngân của đơn hàng.

* **Mô hình Kiến trúc & Nguyên Tắc Vận Hành:**
  * **Đánh Giá & Xếp Hạng Thợ (Reputation Engine):**
    * Khách hàng chỉ được phép đánh giá khi đơn hàng ở trạng thái `COMPLETED` hoặc `PAID_OUT`. Mỗi đơn hàng chỉ được tạo tối đa 1 bản ghi review (`booking_id UNIQUE`).
    * Điểm số Rating ($1\text{–}5\text{★}$) tự động tính toán lại điểm trung bình (`average_rating`) và tổng số lượt đánh giá (`total_reviews`) của Thợ trong bảng `mua_schema.mua_profiles`.
  * **Tip Tiền Trực Tiếp (Direct Tip from Customer Wallet):**
    * Khách hàng có thể tùy chọn tip thêm tiền (ví dụ: $50,000\text{ đ}$, $100,000\text{ đ}$ hoặc số tiền tùy chỉnh) từ số dư ví khả dụng của mình.
    * Tiền tip được chuyển $100\%$ trực tiếp vào Ví Thợ (`FREELANCER_WALLET`), **Sàn không thu bất kỳ % hoa hồng nào trên tiền tip**.
  * **Quy Trình Kháng Nghị / Khiếu Nại (Dispute Resolution Workflow):**
    * Nếu khách hàng không hài lòng hoặc thợ không đến / làm hỏng trang phục, khách có thể mở đơn khiếu nại trong vòng $24\text{ giờ}$ sau ca làm.
    * Khi khiếu nại được tạo (`status = 'OPENED'`), hệ thống **tự động tạm dừng tiến trình giải ngân (Freeze Payout)** của đơn hàng đó.
    * Super Admin xem xét chứng cứ hình ảnh (`evidence_images`), lắng nghe 2 bên và ra phán quyết:
      - `RESOLVED_REFUND_CUSTOMER`: Hoàn cọc 100% về ví khách hàng.
      - `RESOLVED_PAY_MUA`: Tiếp tục giải ngân cho thợ nếu khách khiếu nại sai sự thật.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (DOMAIN SUB-PACKAGE: `interaction`)

Mã nguồn tuân thủ cấu trúc chuẩn mực của dự án tại `docs/project_structure.md`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java
│   │   ├── BaseController.java
│   │   └── ApiResponse.java
│   └── constants/
│       ├── ErrorCodes.java                    # ERR_BOOKING_NOT_ELIGIBLE_FOR_REVIEW, ERR_DISPUTE_ALREADY_EXISTS...
│       └── DisputeConstants.java              # MAX_DISPUTE_HOURS (24h), Tip Presets [20k, 50k, 100k, 200k]
│
├── controller/
│   └── review/
│       ├── ReviewCustomerController.java      # POST /api/v1/reviews (Tạo review kèm tip), GET /api/v1/reviews/mua/{id}
│       ├── DisputeCustomerController.java     # POST /api/v1/disputes (Mở khiếu nại), GET /api/v1/disputes/my
│       └── AdminDisputeController.java        # GET /api/v1/admin/disputes, PATCH /{id}/resolve (Phán quyết)
│
├── dto/
│   ├── request/
│   │   └── review/
│   │       ├── CreateReviewReq.java           # bookingId, rating (1-5), comment, reviewImages, tipAmount
│   │       ├── CreateDisputeReq.java          # bookingId, reason, evidenceImages
│   │       └── ResolveDisputeReq.java         # resolution (REFUND_CUSTOMER | PAY_MUA), resolutionNote
│   └── response/
│       └── review/
│           ├── ReviewDetailRes.java           # id, bookingId, rating, comment, reviewImages, tipAmount, customerName
│           ├── DisputeDetailRes.java          # id, disputeCode, bookingId, status, reason, evidenceImages
│           └── AdminDisputeSummaryRes.java    # pendingDisputesCount, totalResolvedThisMonth
│
├── entity/
│   └── review/
│       ├── ReviewEntity.java                  # table: interaction_schema.reviews
│       └── DisputeEntity.java                 # table: interaction_schema.disputes
│
├── mapper/
│   └── review/
│       ├── ReviewMapper.java                  # Manual Mapper (@Component)
│       └── DisputeMapper.java                 # Manual Mapper (@Component)
│
├── repository/
│   └── review/
│       ├── ReviewRepository.java              # findByBookingId, findByMuaIdOrderByCreatedAtDesc, calculateAverageRating
│       └── DisputeRepository.java             # findByBookingId, findByStatusOrderByCreatedAtAsc
│
└── service/
    └── review/
        ├── ReviewService.java                 # Interface chấm điểm, lưu ảnh review, cập nhật profile MUA
        ├── TipService.java                    # Interface trừ ví khách -> cộng 100% ví thợ (No Platform Fee)
        ├── DisputeService.java                # Interface mở khiếu nại, đóng băng thanh toán, admin xử lý
        └── impl/
            ├── ReviewServiceImpl.java         # 100% logic nghiệp vụ đánh giá & recalculate rating
            ├── TipServiceImpl.java            # 100% logic kế toán đúp chuyển tiền tip
            └── DisputeServiceImpl.java        # 100% logic quy trình hòa giải & hoàn tiền CSDL
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-REV-01: Đánh Giá Rating 1–5★ & Nhận Xét Kèm Ảnh Sau Khi Hoàn Thành Ca (`ISSUE-24.1`)**
> **As a** Khách hàng vừa sử dụng dịch vụ trang điểm,  
> **I want** chấm điểm từ 1 đến 5 sao, viết nhận xét và đính kèm tối đa 5 bức ảnh chụp lớp make-up thực tế,  
> **So that** tôi bày tỏ sự hài lòng hoặc góp ý chất lượng cho thợ, đồng thời giúp cộng đồng khách hàng khác có cơ sở chọn thợ uy tín.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Tạo đánh giá thành công cho đơn đã hoàn tất**
  * **Given** Khách hàng (`userId = 15`) có đơn `booking_id = 901` ở trạng thái `COMPLETED`.
  * **When** Khách gửi request `POST /api/v1/reviews`:
    ```json
    {
      "booking_id": 901,
      "rating": 5,
      "comment": "Chị Ngọc trang điểm cực kỳ có tâm, lớp nền mỏng nhẹ giữ được suốt 8 tiếng tiệc cưới!",
      "review_images": [
        "https://cdn.makeup.vn/reviews/r901_1.webp",
        "https://cdn.makeup.vn/reviews/r901_2.webp"
      ],
      "tip_amount": 0
    }
    ```
  * **Then** Hệ thống kiểm tra:
    1. `booking.customer_id == currentUserId` (Chống IDOR).
    2. Đơn hàng chưa từng có đánh giá nào (`ReviewRepository.findByBookingId(901) == null`).
    3. `rating` nằm trong khoảng $[1, 5]$.
  * **And** Lưu bản ghi vào bảng `interaction_schema.reviews`.
  * **And** Tự động tính toán lại điểm trung bình của Thợ:
    ```sql
    UPDATE mua_schema.mua_profiles 
    SET average_rating = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE mua_id = 89),
        total_reviews = total_reviews + 1
    WHERE id = 89;
    ```
  * **And** Trả về HTTP `201 Created` kèm thông tin review vừa tạo.

* **Scenario 02: Chặn đánh giá đơn hàng chưa hoàn tất hoặc đã đánh giá trước đó**
  * **Given** Đơn hàng đang ở trạng thái `ON_THE_WAY` hoặc đã có bản ghi trong bảng `reviews`.
  * **When** Khách hàng cố tình gửi request đánh giá.
  * **Then** Service từ chối, trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_BOOKING_NOT_ELIGIBLE_FOR_REVIEW`.

---

### **US-REV-02: Tính Năng Tip Tiền Trực Tiếp Cho Thợ Từ Số Dư Ví Khách (`ISSUE-24.2`)**
> **As a** Khách hàng rất hài lòng với tay nghề và thái độ phục vụ của Thợ,  
> **I want** gửi tặng thêm một khoản tiền Tip trực tiếp từ Ví của mình cho Thợ,  
> **So that** tôi khích lệ tinh thần chuyên viên mà không lo bị trừ phí trung gian nền tảng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Tip tiền thành công trong cùng transaction gửi đánh giá**
  * **Given** Khách hàng có số dư ví khả dụng `balance = 500,000 đ`.
  * **When** Khách hàng gửi review kèm `tip_amount = 100,000 đ`.
  * **Then** `TipService.transferTip(...)` thực thi trong 1 `@Transactional`:
    1. Trừ $-100,000\text{ đ}$ từ `wallets.balance` của Khách hàng.
    2. Cộng $+100,000\text{ đ}$ vào `wallets.balance` của Thợ trang điểm (Ví Sàn thu phí $0\%$).
    3. Ghi bút toán kế toán đúp vào `wallet_schema.ledger_entries`: `debit = customerWalletId`, `credit = muaWalletId`, `amount = 100,000 đ`.
    4. Ghi sao kê `wallet_transactions` cho cả 2 ví với mô tả: `"Tiền Tip từ khách hàng đơn #BK-260914-FAST901"`.
  * **And** Bắn WebSocket STOMP thông báo tới Thợ: `"Bạn vừa nhận được 100,000 đ tiền Tip từ khách hàng!"`.

* **Scenario 02: Từ chối khi số dư ví khách không đủ tiền Tip**
  * **Given** Số dư ví khách `balance = 20,000 đ`, nhưng khách chọn tip $100,000\text{ đ}$.
  * **Then** Backend từ chối giao dịch, trả về mã lỗi `ERR_WALLET_INSUFFICIENT_BALANCE` và gợi ý nạp thêm tiền ví.

---

### **US-REV-03: Mở Khiếu Nại Dịch Vụ (`disputes`) & Tạm Khóa Tiền Giải Ngân (`ISSUE-24.3`)**
> **As a** Khách hàng gặp sự cố dịch vụ hoặc Super Admin quản trị sàn,  
> **I want** khách hàng gửi đơn khiếu nại có bằng chứng rõ ràng và hệ thống tự động phong tỏa tiền giải ngân để Admin phân xử,  
> **So that** quyền lợi tài chính của khách được bảo vệ tuyệt đối và thợ có trách nhiệm với chất lượng dịch vụ.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Khách hàng tạo đơn khiếu nại trong vòng 24 giờ sau ca làm**
  * **Given** Ca làm hoàn tất lúc 10:00 sáng, đơn hàng có cọc đang ở trạng thái giữ bảo vệ.
  * **When** Khách hàng gửi request `POST /api/v1/disputes`:
    ```json
    {
      "booking_id": 901,
      "reason": "Thợ đến trễ 45 phút khiến cô dâu lỡ giờ làm lễ gia tiên, mỹ phẩm dùng loại không đúng cam kết gây dị ứng da.",
      "evidence_images": [
        "https://cdn.makeup.vn/disputes/disp901_proof1.webp"
      ]
    }
    ```
  * **Then** Hệ thống kiểm tra: Thời gian gửi khiếu nại $\le 24\text{ giờ}$ kể từ thời điểm kết thúc ca.
  * **And** Tạo bản ghi trong `interaction_schema.disputes` với `status = 'OPENED'`, sinh mã `dispute_code = "DISP-260914-901"`.
  * **And** Tự động chuyển trạng thái đơn hàng sang `DISPUTED`.
  * **And** Tạm dừng toàn bộ lệnh giải ngân vào ví thợ, giữ tiền nguyên vẹn trong quỹ cọc Escrow.
  * **And** Bắn thông báo khẩn cấp tới Web Admin và App Thợ về việc phát sinh khiếu nại.

* **Scenario 02: Super Admin ra phán quyết hoàn tiền 100% cho Khách hàng (Admin Dispute Resolution)**
  * **Given** Đơn khiếu nại `DISP-260914-901` đang ở trạng thái `UNDER_INVESTIGATION`.
  * **When** Admin đối soát hình ảnh và phát hiện thợ vi phạm nghiêm trọng quy chuẩn dịch vụ.
  * **And** Admin gọi `PATCH /api/v1/admin/disputes/DISP-260914-901/resolve` với `resolution = "REFUND_CUSTOMER"`.
  * **Then** Backend thực thi trong 1 `@Transactional`:
    1. Cập nhật `disputes.status = 'RESOLVED_REFUND_CUSTOMER'`, lưu `resolution_note`.
    2. Kích hoạt `EscrowService.refundDeposit(901)` hoàn lại $100\%$ tiền cọc vào ví khách hàng.
    3. Đổi trạng thái đơn hàng sang `CANCELLED`.
  * **And** Gửi thông báo kết quả giải quyết cho cả hai bên.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ & BẢNG MÃ LỖI

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_RATING_OUT_OF_RANGE` | Giá trị rating gửi lên nhỏ hơn 1 hoặc lớn hơn 5. | Bean Validation `@Min(1) @Max(5)` chặn tại Controller. |
| **`400 BAD_REQUEST`** | `ERR_BOOKING_NOT_ELIGIBLE_FOR_REVIEW` | Đơn hàng chưa hoàn tất hoặc khách đã từng đánh giá rồi. | Từ chối tạo review trùng. |
| **`400 BAD_REQUEST`** | `ERR_DISPUTE_WINDOW_EXPIRED` | Khách gửi khiếu nại sau quá 24 giờ kể từ lúc hoàn tất ca làm. | Từ chối tiếp nhận, hướng dẫn liên hệ Hotline CSKH. |
| **`403 FORBIDDEN`** | `ERR_DISPUTE_ACCESS_DENIED` | Người dùng không phải là người đặt đơn hàng cố tình mở khiếu nại. | Chặn quyền truy cập IDOR. |
| **`409 CONFLICT`** | `ERR_DISPUTE_ALREADY_OPENED` | Đơn hàng đã có một khiếu nại đang chờ xử lý. | Không cho tạo khiếu nại trùng. |

---

## 💻 5. ĐẶC TẢ REST API ĐÁNH GIÁ & KHIẾU NẠI

### 5.1. `POST /api/v1/reviews` (Tạo Đánh Giá & Tip Tiền)
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "booking_id": 901,
  "rating": 5,
  "comment": "Tay nghề rất xuất sắc, trang điểm tự nhiên đúng gu!",
  "review_images": ["https://cdn.makeup.vn/reviews/img1.webp"],
  "tip_amount": 50000.00
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "code": "REVIEW_CREATED_SUCCESS",
  "message": "Cảm ơn bạn đã gửi đánh giá và tip cho thợ!",
  "data": {
    "review_id": 301,
    "booking_id": 901,
    "rating": 5,
    "tip_amount": 50000.00,
    "mua_new_average_rating": 4.96,
    "created_at": "2026-09-14T11:45:00Z"
  },
  "timestamp": "2026-09-14T11:45:00Z"
}
```

---

## 🗄️ 6. THIẾT KẾ CƠ SỞ DỮ LIỆU DDL (`reviews` & `disputes`)

```sql
CREATE SCHEMA IF NOT EXISTS interaction_schema;

CREATE TYPE dispute_status_enum AS ENUM ('OPENED', 'UNDER_INVESTIGATION', 'RESOLVED_REFUND_CUSTOMER', 'RESOLVED_PAY_MUA', 'CLOSED');

CREATE TABLE interaction_schema.reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT UNIQUE NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE RESTRICT,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE RESTRICT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_images JSONB DEFAULT '[]'::jsonb,
    tip_amount DECIMAL(12, 2) DEFAULT 0.00 CHECK (tip_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interaction_schema.disputes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dispute_code VARCHAR(30) UNIQUE NOT NULL,
    booking_id BIGINT NOT NULL REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
    opened_by_user_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    evidence_images JSONB DEFAULT '[]'::jsonb,
    status dispute_status_enum DEFAULT 'OPENED',
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_reviews_mua ON interaction_schema.reviews(mua_id, rating);
CREATE INDEX idx_disputes_status ON interaction_schema.disputes(status, created_at ASC);
```

---

## ⚠️ 7. ĐÁNH GIÁ CÁC ĐIỂM CHƯA TỐI ƯU & RỦI RO KIẾN TRÚC CỦA TÍNH NĂNG

> [!WARNING]
> Dưới đây là **4 điểm nghẽn kỹ thuật và rủi ro gian lận** của phân hệ Review & Dispute:

1. **Rủi ro Gian Lận Đánh Giá Ảo & Đánh Giá Trả Đũa (Review Bombing / Collusion):**
   * *Thực trạng:* Thợ có thể nhờ người quen đặt các ca rẻ tiền rồi chấm liên tiếp 5 sao để "cày sao", hoặc đối thủ cố tình đặt đơn để chấm 1 sao kèm lời lẽ bôi nhọ danh dự.
   * *Giải pháp:* Tích hợp thuật toán phát hiện gian lận đánh giá (Spam Pattern Detection): Cảnh báo nếu nhiều đánh giá 5 sao đến từ cùng một địa chỉ IP / cùng dải thẻ ngân hàng. Cho phép Thợ gửi phản hồi minh bạch (MUA Reply to Review) dưới từng nhận xét tiêu cực.
2. **Khóa Tiền Tự Động Gây Thiệt Hại Cho Thợ Khi Khách Cố Tình Khiếu Nại Ảo (Malicious Dispute Lock):**
   * *Thực trạng:* Khi khách bấm khiếu nại, toàn bộ tiền ca làm bị đóng băng ngay lập tức. Khách hàng gian xảo có thể lợi dụng điều này sau khi đã được trang điểm đẹp để "ăn quỵt" tiền cọc.
   * *Giải pháp:* Thiết lập mức cọc khiếu nại hoặc kiểm duyệt sơ bộ: Khách hàng bắt buộc phải tải lên tối thiểu 1 bức ảnh chụp rõ khuôn mặt làm bằng chứng thì hệ thống mới cho phép mở trạng thái `OPENED`. Nếu khách khiếu nại sai sự thật quá 2 lần, tài khoản khách sẽ bị hạ điểm tín nhiệm.
3. **Tính Toán Lại Điểm Trung Bình Bằng Câu Lệnh `AVG()` Gây Tải CSDL (Expensive Average Calculation):**
   * *Thực trạng:* Mỗi lần có review mới, hệ thống lại chạy `SELECT AVG(rating) FROM reviews WHERE mua_id = ?`. Với thợ nổi tiếng có hàng ngàn review, câu lệnh này quét bảng liên tục làm chậm transaction.
   * *Giải pháp:* Tính toán tăng dần bằng công thức đại số (Incremental Running Average):
     $$\text{New Average} = \frac{(\text{Old Average} \times \text{Old Count}) + \text{New Rating}}{\text{Old Count} + 1}$$
     Cập nhật O(1) tức thì mà không cần quét lại toàn bộ lịch sử trong CSDL.
4. **Không Thể Thu Hồi Tiền Tip Khi Xảy Ra Khiếu Nại Đột Xuất:**
   * *Thực trạng:* Tiền tip được chuyển ngay vào ví thợ. Nếu hôm sau phát sinh tranh chấp và khách đòi lại cả tiền tip, thợ đã rút tiền về ngân hàng thì sàn sẽ khó thu hồi.
   * *Giải pháp:* Tiền Tip cũng được bảo vệ trong trạng thái phong tỏa tạm thời $12\text{ giờ}$ trước khi chuyển hẳn vào số dư khả dụng có thể rút của Thợ.
