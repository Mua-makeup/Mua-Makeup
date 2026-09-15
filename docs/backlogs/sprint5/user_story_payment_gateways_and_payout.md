# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: CỔNG THANH TOÁN ĐA PHƯƠNG THỨC (MOMO, VNPAY, ZALOPAY, VIETQR) & QUẢN LÝ PAYOUT
### (Spring Boot 3.3.x Layered Monolith with Domain Sub-packages `core-api` - Schema: `wallet_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Multi-Gateway Payment Integration & Bank Payout Management`
* **Mã Jira Issues phụ trách (Sprint 5 - Nhóm 2):**
  * `ISSUE-23.1`: **User Story** - Bảng Quản lý Tài khoản Ngân hàng chính chủ đã liên kết (`user_bank_accounts`).
  * `ISSUE-23.2`: **Task** - Tích hợp Cổng thanh toán MoMo API (Khởi tạo mã QR & Xử lý Webhook IPN xác nhận chữ ký số HMAC-SHA256).
  * `ISSUE-23.3`: **Task** - Tích hợp Cổng thanh toán VNPay API (VNPay Sandbox Checkout & IPN Callback với mã hóa kiểm tra SHA-512).
  * `ISSUE-23.4`: **Task** - Tích hợp Cổng thanh toán ZaloPay & Phương thức VietQR Nạp tiền Ví tự động chuẩn NAPAS 247.
  * `ISSUE-23.5`: **Task** - Bảng Yêu cầu Rút tiền (`withdrawal_requests`) & Payout API giải ngân về Ngân hàng chính chủ.
  * `ISSUE-23.6`: **Task** - Dashboard Quản lý Duyệt Yêu cầu Rút tiền cho Super Admin & Studio Web Portal (`ROLE_SUPER_ADMIN`, `ROLE_AGENCY_ADMIN`).

* **Mô hình Kiến trúc Luồng Thanh Toán & Giải Ngân:**
  * **Xử lý Nạp Tiền & Thanh Toán Cọc (Inbound Payment Flow):**
    * Client khởi tạo yêu cầu nạp tiền hoặc thanh toán $\rightarrow$ Backend tạo bản ghi `payment_transactions` ở trạng thái `PENDING` và ký số request gửi sang đối tác trung gian thanh toán (MoMo, VNPay, ZaloPay).
    * Khách quét mã QR động hoặc thanh toán trên App ngân hàng $\rightarrow$ Cổng thanh toán gửi **Webhook IPN (Instant Payment Notification)** dạng Server-to-Server về `core-api`.
    * Hệ thống xác minh chữ ký bảo mật (Cryptographic Signature Verification) $\rightarrow$ Cộng tiền vào Ví và kích hoạt phong tỏa cọc Escrow.
  * **Xử lý Rút Tiền & Payout Ngân Hàng (Outbound Payout Flow):**
    * Thợ/Studio liên kết tài khoản ngân hàng chính chủ (`user_bank_accounts`).
    * Tạo lệnh rút tiền $\rightarrow$ Số dư khả dụng bị trừ ngay lập tức và đưa vào trạng thái chờ duyệt.
    * Super Admin kiểm tra trên Web Portal $\rightarrow$ Bấm duyệt và giải ngân tự động qua Cổng Payout / Ngân hàng liên kết.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (DOMAIN SUB-PACKAGE: `wallet` & `payment`)

Tuân thủ nghiêm ngặt chuẩn kiến trúc dự án tại `docs/project_structure.md`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java
│   │   ├── BaseController.java
│   │   └── ApiResponse.java
│   └── constants/
│       ├── ErrorCodes.java                    # ERR_PAYMENT_SIGNATURE_INVALID, ERR_PAYOUT_AMOUNT_LIMIT...
│       └── PaymentConstants.java              # MIN_PAYOUT_AMOUNT (100,000 đ), MAX_PAYOUT_AMOUNT (50,000,000 đ)
│
├── config/
│   ├── MomoConfig.java                        # PartnerCode, AccessKey, SecretKey, Endpoint URL
│   ├── VnpayConfig.java                       # TmnCode, HashSecret, PaymentUrl, ReturnUrl
│   └── ZalopayConfig.java                     # AppId, Key1, Key2, Endpoint URL
│
├── controller/
│   └── wallet/
│       ├── PaymentController.java             # POST /api/v1/payments/create-intent (Nạp tiền / Trả cọc)
│       ├── PaymentCallbackController.java     # POST /api/v1/payments/ipn/{momo,vnpay,zalopay} (Public IPN Webhook)
│       ├── BankAccountController.java         # GET, POST, DELETE /api/v1/wallets/bank-accounts
│       ├── PayoutController.java              # POST /api/v1/wallets/withdrawals (Người dùng tạo lệnh rút)
│       └── AdminPayoutController.java         # GET, PATCH /api/v1/admin/payouts/{id}/approve & /reject
│
├── dto/
│   ├── request/
│   │   └── wallet/
│   │       ├── CreatePaymentIntentReq.java    # amount, gateway (MOMO, VNPAY, ZALOPAY), bookingId
│   │       ├── LinkBankAccountReq.java        # bankCode, bankName, accountNumber, accountHolderName
│   │       ├── CreateWithdrawalReq.java       # bankAccountId, amount
│   │       ├── ProcessPayoutReq.java          # isApproved, adminNote
│   │       ├── MomoIpnReq.java                # Payload webhook của MoMo
│   │       └── VnpayIpnReq.java               # Payload webhook của VNPay
│   └── response/
│       └── wallet/
│           ├── PaymentCheckoutRes.java        # paymentCode, paymentUrl, qrCodeUrl, deepLink
│           ├── BankAccountRes.java            # id, bankName, accountNumber, holderName, isDefault
│           ├── WithdrawalRequestRes.java      # id, requestCode, amount, fee, netAmount, status, createdAt
│           └── PayoutDashboardSummaryRes.java # pendingCount, pendingTotalAmount, approvedToday
│
├── entity/
│   └── wallet/
│       ├── UserBankAccountEntity.java         # table: wallet_schema.user_bank_accounts
│       ├── PaymentTransactionEntity.java      # table: wallet_schema.payment_transactions
│       └── WithdrawalRequestEntity.java       # table: wallet_schema.withdrawal_requests
│
├── mapper/
│   └── wallet/
│       ├── BankAccountMapper.java             # Manual Mapper (@Component)
│       ├── PaymentMapper.java                 # Manual Mapper (@Component)
│       └── PayoutMapper.java                  # Manual Mapper (@Component)
│
├── repository/
│   └── wallet/
│       ├── UserBankAccountRepository.java     # findByUserIdAndIsVerifiedTrue, findByAccountNumber
│       ├── PaymentTransactionRepository.java  # findByPaymentCode, findByGatewayTransactionId
│       └── WithdrawalRequestRepository.java   # findByStatusOrderByCreatedAtAsc (Hàng đợi duyệt)
│
└── service/
    └── wallet/
        ├── PaymentGatewayService.java         # Interface khởi tạo thanh toán & điều phối đa cổng
        ├── PaymentWebhookProcessor.java       # Interface kiểm tra chữ ký & xử lý IPN idempotency
        ├── BankAccountService.java            # Interface quản lý & xác thực tài khoản ngân hàng
        ├── PayoutService.java                 # Interface tạo lệnh rút & duyệt giải ngân
        ├── gateway/                           # TẦNG TÍCH HỢP SDK CỔNG THANH TOÁN
        │   ├── MomoGatewayClient.java         # Giao tiếp API MoMo CollectionLink & verify HMAC-SHA256
        │   ├── VnpayGatewayClient.java        # Tạo URL VNPay Checkout & verify SecureHash SHA-512
        │   └── ZalopayGatewayClient.java      # Tạo đơn hàng ZaloPay & verify Callback MAC
        └── impl/
            ├── PaymentGatewayServiceImpl.java # Implement điều hướng MoMo/VNPay/ZaloPay
            ├── PaymentWebhookProcessorImpl.java # Implement xử lý IPN an toàn chống trùng lặp
            ├── BankAccountServiceImpl.java    # Implement CRUD tài khoản ngân hàng
            └── PayoutServiceImpl.java         # Implement khóa tiền & duyệt chi tiền
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-PAY-01: Quản Lý Tài Khoản Ngân Hàng Chính Chủ Đã Liên Kết (`ISSUE-23.1`)**
> **As a** Thợ trang điểm tự do hoặc Đại diện Studio,  
> **I want** liên kết tài khoản ngân hàng chính chủ của mình vào hệ thống,  
> **So that** tôi có thể rút doanh thu sau khi hoàn tất các ca trang điểm về tài khoản ngân hàng cá nhân một cách an toàn.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Liên kết tài khoản ngân hàng thành công**
  * **Given** Thợ trang điểm (`userId = 89`) sở hữu tài khoản Vietcombank.
  * **When** Thợ gửi request `POST /api/v1/wallets/bank-accounts`:
    ```json
    {
      "bank_code": "VCB",
      "bank_name": "Ngân hàng Ngoại thương Việt Nam (Vietcombank)",
      "account_number": "1012345678",
      "account_holder_name": "LE BAO NGOC",
      "is_default": true
    }
    ```
  * **Then** Service kiểm tra:
    1. Chuẩn hóa tên chủ tài khoản viết hoa không dấu: `"LE BAO NGOC"`.
    2. So khớp với họ tên định danh trên hồ sơ CCCD của Thợ: Trùng khớp $100\%$.
    3. Số tài khoản chưa từng được liên kết bởi tài khoản khác (hoặc hợp lệ theo quy chế).
  * **And** Lưu bản ghi vào bảng `wallet_schema.user_bank_accounts` với `is_verified = true`.
  * **And** Trả về HTTP `201 Created` kèm thông tin tài khoản đã kích hoạt.

* **Scenario 02: Từ chối khi tên chủ tài khoản ngân hàng không trùng khớp với hồ sơ (Anti-Fraud)**
  * **Given** Thợ trang điểm có tên định danh là `"Lê Bảo Ngọc"`.
  * **When** Cố tình nhập số tài khoản ngân hàng đứng tên người khác: `"NGUYEN VAN A"`.
  * **Then** Hệ thống phát hiện vi phạm quy tắc chính chủ, từ chối lưu.
  * **And** Trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_BANK_ACCOUNT_NAME_MISMATCH` và thông điệp: *"Tên chủ tài khoản ngân hàng phải trùng khớp hoàn toàn với họ tên đã xác thực trên hệ thống"*.

---

### **US-PAY-02: Tích Hợp Cổng Thanh Toán MoMo, VNPay, ZaloPay & VietQR Nạp Tiền (`ISSUE-23.2`, `ISSUE-23.3`, `ISSUE-23.4`)**
> **As a** Khách hàng hoặc Thợ trang điểm nạp tiền vào ví,  
> **I want** chọn cổng thanh toán yêu thích (MoMo, VNPay, ZaloPay, hoặc quét VietQR động),  
> **So that** tôi nạp tiền hoặc trả cọc đơn hàng nhanh chóng chỉ trong vài giây qua ứng dụng ngân hàng.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Khởi tạo yêu cầu nạp tiền qua MoMo (Create Payment Intent)**
  * **Given** Khách hàng yêu cầu nạp $1,000,000\text{ đ}$ qua MoMo.
  * **When** Gửi request `POST /api/v1/payments/create-intent` với `gateway = "MOMO"`.
  * **Then** Hệ thống tạo bản ghi `payment_transactions` với `payment_code = "PAY-260914-MOMO88"`, `status = 'PENDING'`.
  * **And** `MomoGatewayClient` tính toán chữ ký số HMAC-SHA256 với SecretKey và gọi API MoMo Create Payment.
  * **And** Trả về HTTP `200 OK` kèm `pay_url` và `qr_code_url` để hiển thị popup QR code trên màn hình.

* **Scenario 02: Tiếp nhận Webhook IPN từ MoMo và cộng tiền ví an toàn (Idempotent Webhook Processing)**
  * **Given** Giao dịch `PAY-260914-MOMO88` đang ở trạng thái `PENDING`.
  * **When** MoMo gửi Webhook IPN `POST /api/v1/payments/ipn/momo` chứa `resultCode = 0` (Thành công) kèm chữ ký `signature`.
  * **Then** `PaymentWebhookProcessor`:
    1. Tái tạo chữ ký HMAC-SHA256 từ các tham số IPN và so sánh an toàn bằng `MessageDigest.isEqual()`.
    2. Kiểm tra trạng thái hiện tại trong CSDL: Bản ghi vẫn là `PENDING`.
    3. Cập nhật `payment_transactions` sang `status = 'SUCCESS'`, ghi nhận `paid_at`.
    4. Trong cùng Transaction: Cộng $+1,000,000\text{ đ}$ vào `wallets.balance` của khách hàng và ghi bảng sao kê `wallet_transactions`.
  * **And** Trả về HTTP `204 No Content` cho MoMo để xác nhận đã xử lý xong.

* **Scenario 03: Chống tấn công giả mạo chữ ký số Webhook (Tampered Webhook Signature)**
  * **Given** Kẻ xấu cố tình gửi một request giả mạo IPN thành công tới webhook `/api/v1/payments/ipn/vnpay` nhưng chữ ký `vnp_SecureHash` không khớp với SecretKey của hệ thống.
  * **When** Backend kiểm tra mã băm SHA-512.
  * **Then** Phát hiện chữ ký không hợp lệ, lập tức từ chối, ghi log cảnh báo an ninh bảo mật.
  * **And** Trả về `{"RspCode":"97","Message":"Invalid Checksum"}` và không cộng bất kỳ khoản tiền nào.

* **Scenario 04: Chống xử lý trùng lặp Webhook IPN (Idempotent IPN Replay Prevention)**
  * **Given** Giao dịch `PAY-260914-MOMO88` đã được xử lý `SUCCESS` từ 1 phút trước.
  * **When** Cổng thanh toán gửi lại gói tin IPN lần thứ 2 do độ trễ mạng.
  * **Then** Hệ thống nhận diện `status` đã là `SUCCESS`, bỏ qua bước cộng tiền ví.
  * **And** Phản hồi xác nhận thành công ngay lập tức để đối tác không tiếp tục retry.

---

### **US-PAY-03: Yêu Cầu Rút Tiền & Quy Trình Duyệt Payout Giải Ngân Ngân Hàng (`ISSUE-23.5` & `ISSUE-23.6`)**
> **As a** Thợ trang điểm & Quản trị viên Tài chính (Super Admin),  
> **I want** thợ tạo yêu cầu rút tiền với các mốc kiểm tra hạn mức chặt chẽ và Admin có Dashboard kiểm duyệt chi trả an toàn,  
> **So that** thợ nhận được tiền về ngân hàng chuẩn xác và sàn kiểm soát tốt dòng tiền xuất quỹ chống rửa tiền.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Thợ tạo lệnh rút tiền hợp lệ (Create Withdrawal Request)**
  * **Given** Thợ có số dư khả dụng `balance = 5,000,000 đ` và đã liên kết tài khoản Vietcombank `id = 10`.
  * **When** Thợ gửi request `POST /api/v1/wallets/withdrawals`:
    ```json
    {
      "bank_account_id": 10,
      "amount": 2000000.00
    }
    ```
  * **Then** Hệ thống kiểm tra:
    - Hạn mức rút tối thiểu: $\ge 100,000\text{ đ}$.
    - Hạn mức rút tối đa trong ngày: $\le 50,000,000\text{ đ}$.
    - Phí rút tiền: $0\text{ đ}$ (hoặc theo biểu phí), Số tiền thực nhận: $2,000,000\text{ đ}$.
  * **And** Trừ ngay $2,000,000\text{ đ}$ từ `balance` sang trạng thái treo phong tỏa để chống việc thợ tiêu lẹm trong lúc chờ duyệt.
  * **And** Tạo bản ghi trong `wallet_schema.withdrawal_requests` với `status = 'PENDING'`.
  * **And** Trả về HTTP `201 Created` kèm `request_code = "WTH-260914-8801"`.

* **Scenario 02: Admin duyệt lệnh rút tiền trên Dashboard Web Portal (`ISSUE-23.6`)**
  * **Given** Super Admin mở trang **Dashboard Quản trị Payout** (`/admin/payouts`).
  * **When** Admin kiểm tra lịch sử hoạt động không có dấu hiệu gian lận và nhấn nút **[Duyệt Chi Trả]** cho yêu cầu `WTH-260914-8801`.
  * **Then** Hệ thống hiển thị `ConfirmDialog` bắt buộc xác nhận.
  * **And** Khi Admin bấm Đồng ý, request gửi tới `PATCH /api/v1/admin/payouts/WTH-260914-8801/approve`.
  * **And** Backend gọi API Payout Ngân hàng liên kết (hoặc ghi nhận ủy nhiệm chi hoàn tất).
  * **And** Cập nhật `withdrawal_requests` sang `status = 'SUCCESS'`, lưu `processed_at` và `processed_by_user_id`.
  * **And** Gửi thông báo Toast & Email tới Thợ: *"Lệnh rút tiền 2,000,000 đ đã được chuyển vào tài khoản Vietcombank của bạn thành công!"*.

* **Scenario 03: Admin từ chối lệnh rút tiền (Reject Payout) và hoàn lại tiền vào ví thợ**
  * **Given** Lệnh rút tiền bị nghi vấn vi phạm chính sách hoặc sai số tài khoản.
  * **When** Admin nhấn **[Từ chối]** kèm lý do: `"Số tài khoản ngân hàng đang tạm khóa bởi ngân hàng phát hành"`.
  * **Then** Backend cập nhật `status = 'REJECTED'`.
  * **And** Trong cùng 1 `@Transactional`: Cộng trả lại số tiền $2,000,000\text{ đ}$ vào `balance` khả dụng của Thợ.
  * **And** Ghi nhận lý do từ chối vào `admin_note`.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ & BẢNG MÃ LỖI CỔNG THANH TOÁN

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_BANK_ACCOUNT_NAME_MISMATCH` | Tên tài khoản ngân hàng không khớp với tên trên giấy tờ định danh. | Từ chối liên kết tài khoản ngân hàng. |
| **`400 BAD_REQUEST`** | `ERR_WITHDRAWAL_MIN_AMOUNT` | Số tiền rút nhỏ hơn hạn mức tối thiểu ($100,000\text{ đ}$). | Báo lỗi yêu cầu nhập số tiền hợp lệ. |
| **`400 BAD_REQUEST`** | `ERR_WITHDRAWAL_DAILY_LIMIT_EXCEEDED`| Tổng số tiền rút trong ngày vượt quá hạn mức $50,000,000\text{ đ}$. | Từ chối tạo lệnh, gợi ý quay lại vào ngày hôm sau. |
| **`401 UNAUTHORIZED`** | `ERR_PAYMENT_SIGNATURE_INVALID` | Chữ ký số Webhook IPN không khớp (nguy cơ bị can thiệp dữ liệu). | Từ chối cập nhật tiền, ghi log bảo mật. |
| **`404 NOT_FOUND`** | `ERR_PAYMENT_TRANSACTION_NOT_FOUND` | Không tìm thấy mã giao dịch thanh toán gửi kèm trong webhook. | Phản hồi mã lỗi không tìm thấy đơn. |
| **`409 CONFLICT`** | `ERR_PAYOUT_ALREADY_PROCESSED` | Lệnh rút tiền đã được duyệt hoặc từ chối trước đó bởi admin khác. | Chặn thao tác trùng lặp. |

---

## 💻 5. ĐẶC TẢ REST API CỔNG THANH TOÁN & PAYOUT

---

### 5.1. `POST /api/v1/payments/create-intent` (Khởi Tạo Thanh Toán / Nạp Tiền)
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "amount": 1000000.00,
  "gateway": "MOMO",
  "booking_id": null,
  "return_url": "https://makeup.vn/wallet/callback"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "PAYMENT_INTENT_CREATED",
  "message": "Khởi tạo thanh toán thành công",
  "data": {
    "payment_code": "PAY-260914-MOMO88",
    "payment_gateway": "MOMO",
    "amount": 1000000.00,
    "payment_url": "https://payment.momo.vn/v2/gateway/pay?s=...",
    "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=momo...",
    "expires_at": "2026-09-14T11:30:00Z"
  },
  "timestamp": "2026-09-14T11:15:00Z"
}
```

---

### 5.2. `POST /api/v1/payments/ipn/momo` (Webhook Nhận Kết Quả Từ MoMo - Public Endpoint)
* **Headers:** `Content-Type: application/json`
* **Request Body (Từ MoMo Server):**
```json
{
  "partnerCode": "MOMOBKUN2026",
  "orderId": "PAY-260914-MOMO88",
  "requestId": "REQ-1726308900",
  "amount": 1000000,
  "orderInfo": "Nap tien vi Makeup Platform",
  "orderType": "momo_wallet",
  "transId": 23091499999,
  "resultCode": 0,
  "message": "Thanh cong",
  "payType": "qr",
  "responseTime": 1726308910000,
  "extraData": "",
  "signature": "a5e9f82d1b7c..."
}
```
* **Response `204 No Content`:** (Xác nhận thành công).

---

### 5.3. `POST /api/v1/wallets/withdrawals` (Tạo Lệnh Rút Tiền)
* **Headers:** `Authorization: Bearer <JWT>`
* **Request Body:**
```json
{
  "bank_account_id": 10,
  "amount": 2000000.00
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "code": "WITHDRAWAL_REQUEST_SUBMITTED",
  "message": "Yêu cầu rút tiền của bạn đã được tiếp nhận và đang chờ duyệt",
  "data": {
    "request_code": "WTH-260914-8801",
    "amount": 2000000.00,
    "fee": 0.00,
    "net_amount": 2000000.00,
    "bank_name": "Vietcombank",
    "account_number": "1012345678",
    "status": "PENDING",
    "created_at": "2026-09-14T11:20:00Z"
  },
  "timestamp": "2026-09-14T11:20:00Z"
}
```

---

## ⚡ 6. SƠ ĐỒ TUẦN TỰ KHÉP KÍN (MERMAID SEQUENCE DIAGRAM)

```mermaid
sequenceDiagram
    autonumber
    actor U as Khách Hàng / Thợ
    participant FE as Web / Mobile App
    participant API as Payment Controller
    participant GW as Payment Gateway Service
    participant MOMO as MoMo / VNPay Gateway Server
    participant IPN as Webhook IPN Controller
    participant WAL as Wallet Service (ACID)
    participant DB as PostgreSQL (wallet_schema)

    U->>FE: Bấm Nạp 1,000,000 đ qua MoMo
    FE->>API: POST /api/v1/payments/create-intent (gateway=MOMO, amount=1M)
    API->>GW: createPaymentIntent()
    GW->>DB: INSERT INTO payment_transactions (code, amount, status=PENDING)
    GW->>MOMO: Request Create Payment (HMAC-SHA256 Signature)
    MOMO-->>GW: Trả về payUrl & qrCodeUrl
    GW-->>API-->>FE: Hiển thị Mã QR MoMo trên màn hình

    U->>MOMO: Mở App MoMo Quét Mã QR & Bấm Thanh Toán
    Note over MOMO: Khách thanh toán thành công trên MoMo!
    
    MOMO->>IPN: POST /api/v1/payments/ipn/momo (Server-to-Server IPN)
    IPN->>IPN: verifyHmacSignature(signature, secretKey)
    alt Chữ ký Hợp lệ & Status đang là PENDING
        IPN->>WAL: creditWalletBalance(userId, 1,000,000đ)
        WAL->>DB: UPDATE wallets SET balance = balance + 1000000
        WAL->>DB: UPDATE payment_transactions SET status = 'SUCCESS'
        WAL->>DB: INSERT INTO wallet_transactions (entry_type=CREDIT, 1M)
        IPN-->>MOMO: 204 No Content (Xác nhận đã ghi nhận)
        IPN-->>FE: Bắn WebSocket STOMP: Nạp tiền thành công!
    else Chữ ký Sai / Replay Attack
        IPN-->>MOMO: 400 Bad Request / Ignore
    end
```

---

## 🗄️ 7. THIẾT KẾ CƠ SỞ DỮ LIỆU DDL (3 BẢNG THANH TOÁN & RÚT TIỀN)

```sql
CREATE SCHEMA IF NOT EXISTS wallet_schema;

CREATE TYPE payout_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'REJECTED');

-- 1. BẢNG TÀI KHOẢN NGÂN HÀNG LIÊN KẾT
CREATE TABLE wallet_schema.user_bank_accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(20) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG GIAO DỊCH CỔNG THANH TOÁN
CREATE TABLE wallet_schema.payment_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    payment_gateway VARCHAR(30) NOT NULL, -- MOMO, VNPAY, ZALOPAY, BANK_TRANSFER, CASH
    gateway_transaction_id VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, REFUNDED
    payment_url TEXT,
    qr_code_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG YÊU CẦU RÚT TIỀN (PAYOUT)
CREATE TABLE wallet_schema.withdrawal_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_code VARCHAR(50) UNIQUE NOT NULL,
    wallet_id BIGINT NOT NULL REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
    bank_account_id BIGINT NOT NULL REFERENCES wallet_schema.user_bank_accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    fee DECIMAL(12, 2) DEFAULT 0.00 CHECK (fee >= 0),
    net_amount DECIMAL(15, 2) NOT NULL CHECK (net_amount > 0),
    status payout_status_enum DEFAULT 'PENDING',
    admin_note TEXT,
    processed_by_user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_txns_gateway ON wallet_schema.payment_transactions(payment_gateway, gateway_transaction_id);
CREATE INDEX idx_withdrawal_requests_status ON wallet_schema.withdrawal_requests(status, created_at ASC);
```

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG (NFRS)

1. **Bảo Mật Xác Thực Chữ Ký Số (Cryptographic Security):**
   * Tuyệt đối không bao giờ cập nhật số dư ví chỉ dựa trên dữ liệu Client trả về từ Return URL (`/return-url`). $100\%$ quyết định cộng tiền phải dựa vào Server-to-Server IPN Webhook đã qua bước xác thực chữ ký số HMAC-SHA256 (MoMo), SHA-512 (VNPay).
2. **Chống Tấn Công Timing Attack:**
   * Khi so sánh chữ ký nhận được từ webhook với chữ ký server tự tính toán, bắt buộc sử dụng `java.security.MessageDigest.isEqual()` (so sánh độ dài thời gian không đổi Constant-time comparison), tuyệt đối cấm dùng `String.equals()` để chống tấn công phân tích thời gian phản hồi.
3. **Tính Bất Biến Của Giao Dịch Đã Thành Công (Payment Idempotency):**
   * Đảm bảo cho dù cổng thanh toán gửi lại webhook 10 lần thì hệ thống cũng chỉ cộng tiền đúng 1 lần duy nhất cho 1 mã giao dịch.

---

## ⚠️ 9. ĐÁNH GIÁ CÁC ĐIỂM CHƯA TỐI ƯU & RỦI RO KIẾN TRÚC CỦA TÍNH NĂNG (CRITICAL GAP ANALYSIS & BOTTLENECK AUDIT)

> [!WARNING]
> Dưới đây là **6 điểm nghẽn kỹ thuật và rủi ro vận hành** của phân hệ Cổng Thanh Toán & Payout hiện tại:

---

### 9.1. Điểm Chưa Tối Ưu 1: Lệ Thuộc Hoàn Toàn Vào Webhook IPN Khi Mạng Đối Tác Chập Chờn (No Outbound Polling Fallback)
* **Thực trạng chưa tối ưu:**
  * Hiện tại hệ thống chỉ thụ động ngồi chờ Webhook IPN từ MoMo/VNPay bắn về.
  * Trong thực tế, có những thời điểm mạng của đối tác trung gian thanh toán bị nghẽn hoặc đường truyền quốc tế chập chờn khiến Webhook bị delay 15–30 phút. Khách hàng đã bị trừ tiền trong tài khoản MoMo nhưng mở app Makeup lên thấy số dư vẫn là 0, dẫn đến tâm lý hoang mang và khiếu nại gay gắt lên tổng đài CSKH.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Bổ sung cơ chế **Outbound Transaction Status Query Worker (Chủ động truy vấn trạng thái)**:
    * Nếu một giao dịch nạp tiền ở trạng thái `PENDING` quá 3 phút mà chưa nhận được IPN, một tiến trình Spring Scheduled sẽ chủ động gọi API Query Transaction Status của MoMo/VNPay để xác thực. Nếu đối tác báo thành công, hệ thống tự động cộng tiền ngay cho khách mà không cần đợi Webhook.

---

### 9.2. Điểm Chưa Tối Ưu 2: Trạng Thái Lơ Lửng (In-Doubt State) Khi Gọi API Payout Ngân Hàng Bị Timeout
* **Thực trạng chưa tối ưu:**
  * Khi Admin bấm duyệt chi trả Payout, server gọi API Payout sang cổng ngân hàng đối tác.
  * Nếu request bị **Socket Timeout (mạng ngắt giữa chừng lúc server đang đợi phản hồi)**, hệ thống không thể biết chắc chắn là ngân hàng đã chuyển tiền cho thợ hay chưa.
  * Nếu tự tiện đánh dấu `FAILED` và hoàn tiền lại vào ví thợ, nguy cơ cao ngân hàng vẫn chuyển tiền $\rightarrow$ **Thợ nhận được 2 lần tiền**. Ngược lại, nếu tự tiện đánh dấu `SUCCESS` mà ngân hàng chưa chuyển $\rightarrow$ **Thợ bị mất tiền oan**.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Thiết lập trạng thái trung gian bắt buộc: **`PROCESSING` (Đang xử lý)**.
  * Khi gặp sự cố Timeout, cấm tuyệt đối việc tự ý đổi sang `SUCCESS` hoặc `REJECTED`. Hệ thống phải giữ nguyên trạng thái `PROCESSING` và chuyển sang một hàng đợi kiểm tra đối soát tự động (Query Order Status sau 5 phút, 15 phút, 1 giờ) cho đến khi nhận được kết quả cuối cùng từ ngân hàng.

---

### 9.3. Điểm Chưa Tối Ưu 3: Thiếu Bộ Ngắt Mạch Circuit Breaker Khi Cổng Thanh Toán Bảo Trì (Third-Party Outage Handling)
* **Thực trạng chưa tối ưu:**
  * Nếu một cổng thanh toán (ví dụ: VNPay) gặp sự cố sập server hoặc bảo trì đột xuất, các request của khách hàng gửi tới sẽ bị treo 30–60 giây trước khi timeout, làm nghẽn toàn bộ connection pool của `core-api`.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Tích hợp thư viện **Resilience4j Circuit Breaker**:
    * Nếu tỷ lệ lỗi gọi tới cổng MoMo hoặc VNPay vượt quá $50\%$ trong 1 phút, Circuit Breaker tự động bật sang trạng thái `OPEN`.
    * Ngay lập tức từ chối và hiển thị thông báo thân thiện: *"Cổng thanh toán MoMo đang bảo trì, vui lòng chọn VNPay hoặc Chuyển khoản VietQR"* mà không cần gửi request chờ timeout.

---

### 9.4. Điểm Chưa Tối Ưu 4: Rủi Ro Gian Lận Liên Kết Tài Khoản Ngân Hàng (Bank Account Name Verification Gap)
* **Thực trạng chưa tối ưu:**
  * Việc so sánh tên chủ tài khoản `"LE BAO NGOC"` với họ tên định danh hiện tại chỉ kiểm tra chuỗi ký tự String do người dùng tự nhập vào lúc đăng ký.
  * Nếu người dùng mượn CCCD của người khác để tạo tài khoản ảo rồi nhập số tài khoản ngân hàng của chính mình, hệ thống không thể kiểm tra trực tiếp với dữ liệu liên ngân hàng NAPAS xem số tài khoản đó có thực sự thuộc về người đó hay không.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Tích hợp API **Tra cứu Số tài khoản Ngân hàng tự động qua VietQR / NAPAS API (Account Name Inquiry)**:
    * Khi thợ vừa nhập `bank_code` và `account_number`, hệ thống tự động gọi API ngân hàng để lấy ra chính xác tên chủ tài khoản thực tế được đăng ký tại ngân hàng, khóa cứng ô nhập tên không cho phép người dùng tự gõ tay.

---

### 9.5. Điểm Chưa Tối Ưu 5: Rủi Ro Rút Tiền Hàng Loạt Do Lộ Khóa Bí Mật Quản Trị (Lack of Multi-Signature / 2FA for Large Payouts)
* **Thực trạng chưa tối ưu:**
  * Hiện tại Admin chỉ cần bấm nút [Duyệt] là tiền được giải ngân. Nếu tài khoản Super Admin bị lộ mật khẩu hoặc bị tấn công Session Hijacking, kẻ tấn công có thể bấm duyệt hàng loạt lệnh rút tiền giả mạo về tài khoản cá nhân.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Bắt buộc áp dụng **Xác thực 2 yếu tố (TOTP 2FA / OTP qua Telegram Bot riêng của Ban Giám đốc)** đối với mọi lệnh rút tiền có giá trị lớn $> 10,000,000\text{ đ}$.
  * Cơ chế phê duyệt kép (**Maker - Checker Principle**): Nhân viên kế toán là người tạo đề xuất duyệt (Maker), Kế toán trưởng hoặc Giám đốc là người bấm phê duyệt cuối cùng (Checker).

---

### 9.6. Điểm Chưa Tối Ưu 6: Chi Phí Phí Giao Dịch Cổng (Payment Gateway Fee Burden)
* **Thực trạng chưa tối ưu:**
  * Các cổng thanh toán ví điện tử (MoMo, ZaloPay) thường thu phí $1.5\% - 2.2\%$ trên mỗi giao dịch nạp tiền. Nếu khách nạp tiền liên tục rồi rút ra mà không phát sinh dịch vụ, sàn sẽ phải chịu toàn bộ khoản lỗ chi phí cổng thanh toán này.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Áp dụng quy chế:
    * Khuyến khích nạp qua **VietQR chuyển khoản ngân hàng 247** (Phí gần như $0\text{ đ}$).
    * Đưa ra quy định: Tiền nạp vào ví nếu chưa phát sinh tối thiểu 1 đơn đặt lịch thành công mà muốn rút ra ngay sẽ bị trừ phí xử lý cổng thanh toán $2.0\%$.
