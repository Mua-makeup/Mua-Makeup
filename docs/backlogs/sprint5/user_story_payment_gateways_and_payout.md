# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: CỔNG THANH TOÁN ĐA PHƯƠNG THỨC (MOMO, VNPAY, ZALOPAY, VIETQR) & QUẢN LÝ PAYOUT
### (Spring Boot 3.3.x Layered Monolith with Domain Sub-packages `core-api` - Schema: `wallet_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Multi-Gateway Payment Integration & Bank Payout Management`
* **Mã Jira Issues phụ trách (Sprint 5 - Nhóm 2):**
  * `ISSUE-23.1`: **User Story** - Cổng thanh toán đa phương thức nạp tiền vào ví; giai đoạn đầu tích hợp VNPay/MoMo, sau khi có ledger mới hạch toán vào ví.
    * **Thiết kế mở rộng:** áp dụng Strategy cho thao tác riêng của từng cổng. Luồng tạo intent, xác nhận payment và hạch toán ví dùng một service chung; thêm cổng mới bằng adapter mới và cấu hình, không sửa `PaymentGatewayService` hay `PaymentWebhookProcessor`.
  * `ISSUE-23.2`: **Task** - Tích hợp MoMo `captureWallet`, `payUrl` và IPN HMAC-SHA256; QR chỉ khi cổng trả dữ liệu QR.
  * `ISSUE-23.3`: **Task** - Tích hợp Cổng thanh toán VNPay API (VNPay Sandbox Checkout & IPN Callback với HMAC-SHA512).
  * `ISSUE-23.4`: **Task** - ZaloPay và VietQR; chỉ tự động ghi ví nếu có thông báo/truy vấn giao dịch được xác thực từ đối tác, không dựa vào ảnh QR hoặc lời báo đã chuyển khoản.
  * `ISSUE-24.1`: **User Story** - Quản lý tài khoản ngân hàng và quy trình payout cho Thợ/Studio.
  * `ISSUE-24.2`: **Task** - Tài khoản ngân hàng chính chủ đã liên kết (`user_bank_accounts`).
  * `ISSUE-24.3`: **Task** - Yêu cầu rút tiền (`withdrawal_requests`) & Payout API giải ngân về ngân hàng.
  * `ISSUE-24.4`: **Task** - Dashboard duyệt yêu cầu rút tiền cho Super Admin & Studio Web Portal (`ROLE_SUPER_ADMIN`, `ROLE_AGENCY_ADMIN`).

* **Thứ tự nghiệm thu:**
  1. **Nền tảng Strategy + kết nối VNPay/MoMo:** đăng ký adapter VNPay/MoMo theo mã cổng, lưu `payment_transactions` ở `PENDING`, tạo checkout, nhận return để hiển thị kết quả, xác thực IPN và ghi `SUCCESS`/`FAILED` idempotent. `wallet_posting_status = NOT_POSTED`; giai đoạn này chưa cộng số dư ví.
  2. **Hoàn tất nạp ví:** sau `ISSUE-22.1`–`ISSUE-22.4`, mỗi payment `SUCCESS` tạo đúng một `transactions` loại `DEPOSIT` với `source_payment_code` duy nhất, ledger và sao kê trong cùng transaction; sau đó `wallet_posting_status = POSTED`. Nếu lỗi, payment vẫn `SUCCESS` còn posting `NOT_POSTED`, để retry/đối soát.
  3. **Mở rộng:** `ISSUE-22.5`, `ISSUE-23.4` và `ISSUE-24.x` theo backlog.

* **URL khi phát triển trên localhost (dự kiến):**
  * VNPay return: `http://localhost:3000/payments/return/vnpay`; MoMo return: `http://localhost:3000/payments/return/momo`. Đây là trang frontend nhận điều hướng, không phải bằng chứng để cộng tiền.
  * VNPay IPN: `https://<public-backend>/api/v1/payments/ipn/vnpay` (đăng ký trong cấu hình sandbox); MoMo `ipnUrl`: `https://<public-backend>/api/v1/payments/ipn/momo`. Backend localhost cần HTTPS public qua tunnel để cổng gọi được. Khi đổi domain tunnel, cập nhật IPN URL tại cổng/cấu hình tương ứng.

* **Kiểm thử khi chưa có mobile:** VNPay sandbox thanh toán bằng trình duyệt với thẻ test do VNPay cung cấp; xác nhận IPN đến backend qua tunnel và return chỉ đọc trạng thái. Với MoMo, test được tạo intent, chữ ký, callback hợp lệ/sai/trùng bằng fixture và test tích hợp; giao dịch ví sandbox thật cần MoMo Test app/tài khoản test. Fixture callback không được coi là bằng chứng cổng đã thu tiền hoặc là nghiệm thu end-to-end.

* **Mô hình Kiến trúc Luồng Thanh Toán & Giải Ngân:**
  * **Xử lý Nạp Tiền & Thanh Toán Cọc (Inbound Payment Flow):**
    * Trong sprint 5, intent chỉ phục vụ **nạp ví**. Thanh toán booking trực tiếp và giữ cọc sau gateway là luồng riêng cần đặc tả trước khi mở `booking_id` trong API. Backend tạo `payment_transactions` ở `PENDING` và ký request sang VNPay/MoMo.
    * Khách quét mã QR động hoặc thanh toán trên App ngân hàng $\rightarrow$ Cổng thanh toán gửi **Webhook IPN (Instant Payment Notification)** dạng Server-to-Server về `core-api`.
    * Hệ thống xác minh chữ ký bảo mật (Cryptographic Signature Verification) $\rightarrow$ ghi nhận kết quả thanh toán. Khi phần ví/ledger hoàn thành, payment thành công mới được hạch toán vào ví đúng một lần. Phong tỏa cọc Escrow thuộc `ISSUE-22.5`.
  * **Xử lý Rút Tiền & Payout Ngân Hàng (Outbound Payout Flow):**
    * Thợ/Studio liên kết tài khoản ngân hàng chính chủ (`user_bank_accounts`).
    * Tạo lệnh rút tiền $\rightarrow$ chuyển từ `balance` sang `frozen_balance` trong cùng ví và ghi sao kê; chưa ghi giảm tổng tài sản.
    * Super Admin duyệt $\rightarrow$ trạng thái `PROCESSING`; chỉ khi ngân hàng/đối tác xác nhận đã chi trả mới ghi `SUCCESS` và trừ khoản phong tỏa. Nếu chưa có API payout, ghi nhận chuyển khoản thủ công cùng bằng chứng/đối soát, không giả lập thành công tự động.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (DOMAIN SUB-PACKAGE: `wallet` & `payment`)

**Strategy contract:** `PaymentGatewayStrategy` cung cấp `gatewayCode()`, metadata hiển thị, `createCheckout(intent)`, `verifyAndParseCallback(rawRequest)`, `callbackAcknowledgement(processingResult)` và `queryStatus(payment)` nếu cổng hỗ trợ truy vấn. `rawRequest` phải giữ nguyên dữ liệu cần ký (body/query) trước khi chuẩn hóa. Kết quả callback được chuẩn hóa thành `GatewayPaymentResult` gồm mã payment, mã request cổng, mã giao dịch cổng, số tiền, trạng thái và thời điểm. Adapter chỉ xử lý giao thức/chữ ký và định dạng phản hồi của cổng; service chung kiểm tra payment đã lưu, khóa/idempotency, đổi trạng thái và sau này gọi bước ghi ví. Adapter **không tự cập nhật** `payment_transactions`, `wallets` hay ledger.

**Chọn Strategy:** Spring inject danh sách `PaymentGatewayStrategy` vào `PaymentGatewayRegistry`, tạo map theo `gatewayCode` chuẩn hóa chữ hoa khi khởi động. Trùng mã cổng phải fail startup; mã chưa hỗ trợ hoặc cổng bị tắt trong cấu hình phải trả lỗi có kiểm soát. Không dùng `switch`/`if` theo tên cổng trong `PaymentGatewayService`, `PaymentWebhookProcessor`, DTO validation hoặc callback controller. Callback GET/POST đi qua controller chung `/api/v1/payments/ipn/{gateway}`; adapter xác minh payload và tạo phản hồi đúng giao thức của cổng (MoMo `204`, VNPay `RspCode`/`Message`). Phương thức HTTP không được adapter hỗ trợ bị từ chối; callback sai chữ ký không được chuyển sang bước thay đổi payment.

**Giới hạn của “không sửa code”:** tích hợp cổng mới vẫn cần viết adapter và cấu hình/kiểm thử đặc thù của cổng. Mục tiêu là **không sửa mã nguồn luồng chung hoặc các adapter cũ**. Frontend lấy danh sách cổng đang bật từ `GET /api/v1/payments/gateways`, render tùy chọn từ metadata và dùng một route return `/payments/return/:gateway`, nên không cần sửa màn hình thanh toán cho cổng mới có cùng trải nghiệm chuyển hướng. Nếu cổng có khả năng khác biệt (ví dụ VietQR chưa có API xác thực tiền vào), chỉ bật nạp ví tự động sau khi có bằng chứng giao dịch đáng tin cậy.

Cấu trúc dự kiến theo `docs/project_structure.md`:

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
│   ├── VnpayConfig.java                       # TmnCode, HashSecret, PaymentUrl, ReturnUrl; IPN cấu hình trên sandbox
│   └── ZalopayConfig.java                     # AppId, Key1, Key2, Endpoint URL
│
├── controller/
│   └── wallet/
│       ├── PaymentController.java             # POST create-intent; GET gateways; GET /api/v1/payments/{code}
│       ├── PaymentCallbackController.java     # GET/POST /api/v1/payments/ipn/{gateway}, chuyển raw request vào Strategy
│       ├── BankAccountController.java         # GET, POST, DELETE /api/v1/wallets/bank-accounts
│       ├── PayoutController.java              # POST /api/v1/wallets/withdrawals (Người dùng tạo lệnh rút)
│       └── AdminPayoutController.java         # GET, PATCH /api/v1/admin/payouts/{id}/approve & /reject
│
├── dto/
│   ├── request/
│   │   └── wallet/
│   │       ├── CreatePaymentIntentReq.java    # amount, gatewayCode; kiểm tra bằng Registry, không hardcode enum
│   │       ├── LinkBankAccountReq.java        # bankCode, bankName, accountNumber, accountHolderName
│   │       ├── CreateWithdrawalReq.java       # bankAccountId, amount
│   │       ├── ProcessPayoutReq.java          # isApproved, adminNote
│   │       ├── MomoIpnReq.java                # DTO riêng trong adapter MoMo
│   │       └── VnpayIpnReq.java               # Query params riêng trong adapter VNPay
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
        ├── PaymentGatewayService.java         # Tạo intent chung, tìm Strategy theo mã cổng
        ├── PaymentWebhookProcessor.java       # Xử lý kết quả đã xác thực, idempotency và trạng thái chung
        ├── BankAccountService.java            # Interface quản lý & xác thực tài khoản ngân hàng
        ├── PayoutService.java                 # Interface tạo lệnh rút & duyệt giải ngân
        ├── gateway/                           # Strategy và adapter cho từng cổng
        │   ├── PaymentGatewayStrategy.java    # Contract checkout, callback, acknowledgement, status query
        │   ├── PaymentGatewayRegistry.java    # Map gatewayCode -> Strategy; kiểm tra trùng mã
        │   ├── GatewayPaymentResult.java      # Kết quả cổng đã chuẩn hóa
        │   ├── MomoGatewayStrategy.java       # MoMo Create Payment, IPN HMAC-SHA256
        │   ├── VnpayGatewayStrategy.java      # VNPay Checkout, IPN HMAC-SHA512
        │   └── ZalopayGatewayStrategy.java    # Thêm ở ISSUE-23.4, không sửa service chung
        └── impl/
            ├── PaymentGatewayServiceImpl.java # Điều phối qua Registry, không rẽ nhánh theo cổng
            ├── PaymentWebhookProcessorImpl.java # Implement xử lý IPN an toàn chống trùng lặp
            ├── BankAccountServiceImpl.java    # Implement CRUD tài khoản ngân hàng
            └── PayoutServiceImpl.java         # Implement khóa tiền & duyệt chi tiền
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-PAY-01: Xác Nhận Thanh Toán VNPay/MoMo Và Nạp Ví (`ISSUE-23.1`–`ISSUE-23.3`; mở rộng `ISSUE-23.4`)**
> **As a** Khách hàng hoặc Thợ trang điểm nạp tiền vào ví,
> **I want** chọn VNPay hoặc MoMo để nạp tiền,
> **So that** tôi theo dõi được kết quả thanh toán và số dư ví tăng sau khi hệ thống đã hạch toán thành công.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Tạo checkout VNPay sandbox (`ISSUE-23.3`)**
  * **Given** Khách yêu cầu thanh toán 1,000,000 đ qua VNPay và cấu hình sandbox đã có `vnp_TmnCode`, `vnp_HashSecret`.
  * **When** Gửi `POST /api/v1/payments/create-intent` với `gateway = "VNPAY"`.
  * **Then** Backend tạo `payment_transactions` ở `PENDING`, sinh `vnp_TxnRef` duy nhất, số tiền `vnp_Amount = 100000000` (đơn vị nhỏ nhất của VNPay), `vnp_ReturnUrl` theo cấu hình server và URL checkout có `vnp_SecureHash` hợp lệ.
  * **And** Frontend chuyển khách đến URL checkout; return URL chỉ mở trang kết quả và truy vấn trạng thái từ backend.

* **Scenario 02: Tạo checkout MoMo (`ISSUE-23.2`)**
  * **Given** Khách hàng yêu cầu nạp $1,000,000\text{ đ}$ qua MoMo.
  * **When** Gửi request `POST /api/v1/payments/create-intent` với `gateway = "MOMO"`.
  * **Then** Hệ thống tạo bản ghi `payment_transactions` với `payment_code = "PAY-260914-MOMO88"`, `status = 'PENDING'`.
  * **And** `MomoGatewayStrategy` tính toán chữ ký số HMAC-SHA256 với SecretKey và gọi API MoMo Create Payment (`captureWallet`).
  * **And** Request MoMo có `redirectUrl` và `ipnUrl` từ cấu hình server; trả về `pay_url`. Nếu cổng trả `qrCodeUrl`, frontend tự render mã QR từ dữ liệu này; không coi đó là URL ảnh QR.

* **Scenario 03: Tiếp nhận MoMo IPN (`ISSUE-23.2`)**
  * **Given** Giao dịch `PAY-260914-MOMO88` đang ở trạng thái `PENDING`.
  * **When** MoMo gửi Webhook IPN `POST /api/v1/payments/ipn/momo` chứa `resultCode = 0` (Thành công) kèm chữ ký `signature`.
  * **Then** `PaymentWebhookProcessor`:
    1. Tái tạo chữ ký HMAC-SHA256 từ các tham số IPN và so sánh an toàn bằng `MessageDigest.isEqual()`.
    2. Đối chiếu `partnerCode`, `orderId`, `requestId`, số tiền và mã giao dịch với payment đã lưu; không xử lý thông báo chỉ mới được ủy quyền như giao dịch đã hoàn tất.
    3. Khóa bản ghi, kiểm tra còn `PENDING`, rồi mới ghi `SUCCESS`, `paid_at` và `gateway_transaction_id` trong transaction.
  * **And** Trả về HTTP `204 No Content` cho MoMo khi đã ghi nhận an toàn. Chỉ hiển thị “cổng đã xác nhận thanh toán” cho đến khi hoàn thành hạch toán ví.

* **Scenario 04: Tiếp nhận VNPay IPN (`ISSUE-23.3`)**
  * **Given** Giao dịch VNPay đang `PENDING`.
  * **When** VNPay gọi `GET /api/v1/payments/ipn/vnpay` qua HTTPS public.
  * **Then** Backend kiểm tra `vnp_SecureHash` bằng HMAC-SHA512, đối chiếu `vnp_TmnCode`, `vnp_TxnRef`, `vnp_Amount` và cả `vnp_ResponseCode` lẫn `vnp_TransactionStatus`.
  * **And** Chỉ ghi `SUCCESS` khi hai mã kết quả đều là `00`; phản hồi JSON `RspCode`/`Message` theo quy ước VNPay.

* **Scenario 05: Từ chối IPN sai chữ ký hoặc sai số tiền**
  * **Given** Một IPN giả mạo tới `/api/v1/payments/ipn/vnpay` có `vnp_SecureHash` không khớp `vnp_HashSecret` của hệ thống.
  * **When** Backend kiểm tra chữ ký HMAC-SHA512.
  * **Then** Từ chối chữ ký sai; với chữ ký hợp lệ nhưng `vnp_Amount` không khớp payment đã lưu cũng không cập nhật trạng thái.
  * **And** Trả về `{"RspCode":"97","Message":"Invalid Checksum"}` và không cộng bất kỳ khoản tiền nào.

* **Scenario 06: IPN gửi trùng hoặc đến sau khi người dùng đóng trình duyệt**
  * **Given** Giao dịch `PAY-260914-MOMO88` đã được xử lý `SUCCESS` từ 1 phút trước.
  * **When** Cổng thanh toán gửi lại gói tin IPN lần thứ 2 do độ trễ mạng.
  * **Then** Hệ thống nhận diện payment đã `SUCCESS`, không ghi nhận kết quả thêm lần nữa; khi đã nối ví, cũng không tạo bút toán cộng tiền lần thứ hai.
  * **And** Phản hồi theo đúng giao thức retry của từng cổng. Return URL hoặc query string do trình duyệt gửi không được tự cập nhật payment hay ví.

* **Scenario 07: Hoàn tất nạp ví sau `ISSUE-22.1`–`ISSUE-22.4`**
  * **Given** Cổng đã xác nhận payment `SUCCESS` nhưng payment chưa được hạch toán vào ví.
  * **When** Phần ví và ledger sẵn sàng xử lý payment.
  * **Then** Tạo `transactions.source_payment_code` duy nhất, bút toán từ ví clearing của cổng sang ví khách và sao kê; cập nhật số dư ví và `wallet_posting_status = POSTED` cùng một database transaction.
  * **And** Nếu hạch toán lỗi, giữ payment `SUCCESS` và `wallet_posting_status = NOT_POSTED` để đối soát/retry an toàn; chỉ báo “nạp ví thành công” khi đã ghi sổ xong.

* **Scenario 08: Return đến trước IPN hoặc người dùng đóng trình duyệt**
  * **Given** Payment vẫn `PENDING` khi trình duyệt quay về return URL, hoặc người dùng đóng trình duyệt trước khi quay về.
  * **When** Frontend tra cứu payment hoặc IPN hợp lệ đến sau.
  * **Then** Trang return hiển thị “đang xác nhận” cho tới khi backend ghi nhận kết quả; IPN vẫn xử lý khi không có trình duyệt. Không lấy `vnp_ResponseCode`/`resultCode` từ URL để tự ghi `SUCCESS`.

* **Scenario 09: Tạo intent bị timeout hoặc không nhận IPN**
  * **Given** Request tới MoMo timeout hoặc payment `PENDING` quá ngưỡng cấu hình.
  * **When** Backend chưa có bằng chứng xác thực rằng cổng đã thất bại/thành công.
  * **Then** Giữ trạng thái chưa kết luận và truy vấn cổng/đối soát; không tạo intent mới với mã khác để ghi tiền trùng, không tự cộng ví hay đánh dấu `FAILED` chỉ vì timeout.

* **Scenario 10: Thêm cổng mới qua Strategy mà không sửa luồng chung**
  * **Given** `PaymentGatewayService` và `PaymentWebhookProcessor` đã chạy với VNPay/MoMo.
  * **When** Đăng ký một Strategy giả lập có `gatewayCode = "TEST_GATEWAY"` và cấu hình bật cổng.
  * **Then** `GET /api/v1/payments/gateways` trả metadata của cổng mới để frontend hiển thị; cùng API `create-intent`, route return và callback chung chọn được Strategy mới, tạo checkout, ghi nhận kết quả chuẩn hóa và trả acknowledgement theo adapter. Test xác nhận không cần sửa service/controller chung, DTO validation, schema payment, màn hình chọn cổng hay hai Strategy cũ.
  * **And** Nếu hai Strategy khai báo cùng mã, ứng dụng từ chối khởi động; nếu client chọn mã không đăng ký hoặc đã tắt, trả lỗi có kiểm soát và không tạo payment.

---

### **US-PAY-02: Quản Lý Tài Khoản Ngân Hàng Chính Chủ Đã Liên Kết (`ISSUE-24.1` & `ISSUE-24.2`)**
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
  * **Then** Service chuẩn hóa dữ liệu, kiểm tra tài khoản thuộc người đang đăng nhập trong hệ thống và lưu `is_verified = false` nếu chưa có dịch vụ xác minh tên chủ tài khoản từ ngân hàng/đối tác hoặc xác minh thủ công có bằng chứng.
  * **And** Chỉ cho phép payout khi tài khoản đã được xác minh; trả về HTTP `201 Created` với trạng thái xác minh thực tế.

* **Scenario 02: Từ chối khi tên chủ tài khoản ngân hàng không trùng khớp với hồ sơ (Anti-Fraud)**
  * **Given** Thợ trang điểm có tên định danh là `"Lê Bảo Ngọc"`.
  * **When** Cố tình nhập số tài khoản ngân hàng đứng tên người khác: `"NGUYEN VAN A"`.
  * **Then** Nếu kết quả xác minh từ nguồn đáng tin cậy cho thấy tên không khớp, hệ thống từ chối kích hoạt tài khoản. So khớp hai chuỗi do người dùng tự nhập không đủ để kết luận chính chủ.
  * **And** Trả về HTTP `400 BAD_REQUEST` với mã lỗi `ERR_BANK_ACCOUNT_NAME_MISMATCH` và thông điệp: *"Tên chủ tài khoản ngân hàng phải trùng khớp hoàn toàn với họ tên đã xác thực trên hệ thống"*.

---

### **US-PAY-03: Yêu Cầu Rút Tiền & Quy Trình Duyệt Payout Giải Ngân Ngân Hàng (`ISSUE-24.3` & `ISSUE-24.4`)**
> **As a** Thợ trang điểm & Quản trị viên Tài chính (Super Admin),  
> **I want** thợ tạo yêu cầu rút tiền với các mốc kiểm tra hạn mức chặt chẽ và Admin có Dashboard kiểm duyệt chi trả an toàn,  
> **So that** thợ nhận được tiền về ngân hàng chuẩn xác và sàn kiểm soát tốt dòng tiền xuất quỹ chống rửa tiền.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Thợ tạo lệnh rút tiền hợp lệ (Create Withdrawal Request)**
  * **Given** Thợ có số dư khả dụng `balance = 5,000,000 đ` và tài khoản Vietcombank `id = 10` đã được xác minh chính chủ.
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
  * **And** Chuyển $2,000,000\text{ đ}$ từ `balance` sang `frozen_balance` của cùng ví, tạo `wallet_holds` với `reference_code = WITHDRAWAL:WTH-260914-8801` và ghi snapshot `FREEZE`; tổng số dư ví không đổi.
  * **And** Tạo bản ghi trong `wallet_schema.withdrawal_requests` với `status = 'PENDING'`.
  * **And** Trả về HTTP `201 Created` kèm `request_code = "WTH-260914-8801"`.

* **Scenario 02: Admin duyệt lệnh rút tiền trên Dashboard Web Portal (`ISSUE-24.4`)**
  * **Given** Super Admin mở trang **Dashboard Quản trị Payout** (`/admin/payouts`).
  * **When** Admin kiểm tra lịch sử hoạt động không có dấu hiệu gian lận và nhấn nút **[Duyệt Chi Trả]** cho yêu cầu `WTH-260914-8801`.
  * **Then** Hệ thống hiển thị `ConfirmDialog` bắt buộc xác nhận.
  * **And** Khi Admin bấm Đồng ý, request gửi tới `PATCH /api/v1/admin/payouts/WTH-260914-8801/approve`.
  * **And** Backend chuyển yêu cầu sang `PROCESSING`, lưu người duyệt và mã tham chiếu payout; gọi API ngân hàng/đối tác nếu có quyền truy cập, hoặc chờ bằng chứng chuyển khoản thủ công.
  * **And** Chỉ khi có xác nhận chi trả cuối cùng mới chuyển `SUCCESS`, trừ $2,000,000\text{ đ}$ khỏi `frozen_balance`, đánh dấu hold `CONSUMED`, ghi ledger từ ví Thợ sang ví clearing và sao kê trong một transaction.
  * **And** Nếu API timeout, giữ `PROCESSING` để truy vấn/đối soát; không tự đánh dấu thành công, thất bại hay hoàn tiền. Thông báo cho Thợ theo trạng thái thật.

* **Scenario 03: Admin từ chối lệnh rút tiền (Reject Payout) và hoàn lại tiền vào ví thợ**
  * **Given** Lệnh rút tiền bị nghi vấn vi phạm chính sách hoặc sai số tài khoản.
  * **When** Admin nhấn **[Từ chối]** kèm lý do: `"Số tài khoản ngân hàng đang tạm khóa bởi ngân hàng phát hành"`.
  * **Then** Backend cập nhật `status = 'REJECTED'`.
  * **And** Trong cùng 1 `@Transactional`: chuyển $2,000,000\text{ đ}$ từ `frozen_balance` về `balance`, đánh dấu hold `RELEASED` và ghi `UNFREEZE`; không cộng thêm vào tổng tài sản ví.
  * **And** Chỉ cho phép từ chối/hoàn tiền khi chưa phát lệnh payout hoặc đã có xác nhận chắc chắn ngân hàng chưa chi trả.
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

### 5.1. `GET /api/v1/payments/gateways` (Danh Sách Cổng Đang Bật)
* Trả `gateway_code`, `display_name` và các khả năng checkout từ metadata của những Strategy đã đăng ký và đang bật. Frontend render danh sách này thay vì hardcode `MOMO`/`VNPAY`; không trả secret hoặc URL nội bộ.

---

### 5.2. `POST /api/v1/payments/create-intent` (Khởi Tạo Thanh Toán / Nạp Tiền)
* **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
* `gateway` là mã của Strategy đã đăng ký và được bật; API không chứa nhánh xử lý riêng cho từng cổng.
* **Request Body:**
```json
{
  "amount": 1000000.00,
  "gateway": "MOMO"
}
```
* `return_url` phải lấy từ cấu hình server theo cổng, không nhận URL tùy ý từ client. Với localhost: VNPay `http://localhost:3000/payments/return/vnpay`, MoMo `http://localhost:3000/payments/return/momo`.
* API giai đoạn này chỉ tạo intent nạp ví; không nhận `booking_id` hoặc URL callback do client tự chọn. `status = SUCCESS` phản ánh kết quả từ cổng; `wallet_posting_status = POSTED` mới phản ánh đã ghi ví. Không hiển thị số dư tăng khi chưa có ledger.
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
    "payment_url": "https://test-payment.momo.vn/v2/gateway/pay?...",
    "qr_code_url": "<du lieu QR do MoMo tra ve, neu co>",
    "expires_at": "2026-09-14T11:30:00Z",
    "status": "PENDING",
    "wallet_posting_status": "NOT_POSTED"
  },
  "timestamp": "2026-09-14T11:15:00Z"
}
```

---

### 5.3. `POST /api/v1/payments/ipn/momo` (Webhook Nhận Kết Quả Từ MoMo - Public Endpoint)
* Cùng `PaymentCallbackController` xử lý tuyến `/api/v1/payments/ipn/{gateway}`. Với `gateway = momo`, Strategy MoMo xác minh payload rồi trả `GatewayPaymentResult`; service chung mới đối chiếu payment và cập nhật trạng thái. Strategy MoMo định dạng acknowledgement `204` sau khi service xử lý xong.
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

### 5.4. `GET /api/v1/payments/ipn/vnpay` (VNPay IPN - Public Endpoint)
* Cùng controller `/api/v1/payments/ipn/{gateway}` nhận phương thức GET. Với `gateway = vnpay`, Strategy VNPay xác thực chữ ký HMAC-SHA512 và chuẩn hóa tham số; service chung đối chiếu mã merchant, mã giao dịch, số tiền và trạng thái với payment đã lưu trước khi ghi nhận. Strategy VNPay định dạng JSON acknowledgement theo kết quả xử lý. URL HTTPS public được cấu hình trong sandbox.
* **Response:** JSON `{"RspCode":"00","Message":"Confirm Success"}` khi đã xử lý; phản hồi mã phù hợp khi chữ ký sai, không tìm thấy hoặc giao dịch đã xử lý.

---

### 5.5. `GET /api/v1/payments/{payment_code}` (Tra Cứu Trạng Thái Cho Trang Return)
* Yêu cầu đăng nhập và chỉ cho phép chủ giao dịch xem. Frontend lấy `payment_code` từ tham số return của cổng (`vnp_TxnRef`/`orderId`), gọi API này để hiển thị cả `status` và `wallet_posting_status`; nếu IPN chưa tới, hiển thị `PENDING` và cho phép kiểm tra lại.
* Không cập nhật payment hoặc ví từ request return URL của trình duyệt.

---

### 5.6. `POST /api/v1/wallets/withdrawals` (Tạo Lệnh Rút Tiền)
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
    participant REG as Strategy Registry
    participant STR as MoMo Strategy
    participant MOMO as MoMo / VNPay Gateway Server
    participant IPN as Webhook IPN Controller
    participant WAL as Wallet Service (ACID)
    participant DB as PostgreSQL (wallet_schema)

    U->>FE: Bấm Nạp 1,000,000 đ qua MoMo
    FE->>API: POST /api/v1/payments/create-intent (gateway=MOMO, amount=1M)
    API->>GW: createPaymentIntent()
    GW->>DB: INSERT INTO payment_transactions (code, amount, status=PENDING)
    GW->>REG: resolve(MOMO)
    REG-->>GW: MoMo Strategy
    GW->>STR: createCheckout(intent)
    STR->>MOMO: Request Create Payment (HMAC-SHA256)
    MOMO-->>STR: payUrl, qrCodeUrl nếu có
    STR-->>GW: checkout đã chuẩn hóa
    GW-->>API-->>FE: Trả payUrl; render QR nếu có dữ liệu QR

    U->>MOMO: Mở App MoMo Quét Mã QR & Bấm Thanh Toán
    Note over MOMO: Khách thanh toán thành công trên MoMo!
    
    MOMO->>IPN: POST /api/v1/payments/ipn/momo (Server-to-Server IPN)
    IPN->>REG: resolve(MOMO)
    REG-->>IPN: MoMo Strategy
    IPN->>STR: verifyAndParseCallback(rawRequest)
    STR-->>IPN: GatewayPaymentResult đã xác thực
    alt Chữ ký hợp lệ, dữ liệu khớp và payment đang PENDING
        IPN->>DB: UPDATE payment_transactions SET status = 'SUCCESS'
        IPN-->>MOMO: 204 No Content (đã ghi nhận kết quả cổng)
    else Chữ ký sai hoặc dữ liệu không khớp
        IPN-->>MOMO: Từ chối, không thay đổi payment hoặc ví
    else IPN trùng
        IPN-->>MOMO: Xác nhận theo quy ước cổng, không ghi lần hai
    end
    Note over DB,WAL: Giai đoạn 2: worker xử lý payment SUCCESS chưa ghi ví
    DB->>WAL: payment SUCCESS + wallet_posting_status NOT_POSTED
    WAL->>DB: Cộng ví + ledger + sao kê + POSTED trong 1 transaction
    FE->>API: GET /api/v1/payments/{paymentCode}
    API-->>FE: status SUCCESS, wallet_posting_status POSTED
```

---

## 🗄️ 7. THIẾT KẾ CƠ SỞ DỮ LIỆU DDL (3 BẢNG THANH TOÁN & RÚT TIỀN)

Đây là DDL tham chiếu, **tách migration theo mốc triển khai**: giai đoạn 1 tạo `payment_transactions`; giai đoạn 2 tạo các bảng ví trong [đặc tả ví](user_story_double_entry_ledger_and_escrow.md) và bổ sung liên kết hạch toán; giai đoạn 4 mới tạo `user_bank_accounts` và `withdrawal_requests`. Không chạy cả khối này như một migration giai đoạn 1 vì `withdrawal_requests` tham chiếu `wallets` chưa tồn tại.

```sql
CREATE SCHEMA IF NOT EXISTS wallet_schema;

CREATE TYPE wallet_schema.payout_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'REJECTED');

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
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG GIAO DỊCH CỔNG THANH TOÁN
CREATE TABLE wallet_schema.payment_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    -- Sprint 5 chỉ nạp ví; booking payment trực tiếp cần migration và story riêng.
    user_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    payment_gateway VARCHAR(30) NOT NULL, -- mã Strategy; giai đoạn đầu MOMO, VNPAY; không CHECK danh sách cứng
    gateway_request_id VARCHAR(100), -- requestId của MoMo, duy nhất theo cổng
    gateway_transaction_id VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    wallet_posting_status VARCHAR(30) NOT NULL DEFAULT 'NOT_POSTED'
        CHECK (wallet_posting_status IN ('NOT_POSTED', 'POSTED')),
    payment_url TEXT,
    qr_code_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    wallet_posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_posted_payment_success CHECK (wallet_posting_status <> 'POSTED' OR (status = 'SUCCESS' AND wallet_posted_at IS NOT NULL))
);

-- `wallet_posting_status = POSTED` chỉ khi status = SUCCESS và transaction DEPOSIT
-- có source_payment_code = payment_code; thao tác ghi sổ + đổi posting status là nguyên tử.
-- Khi bảng wallet_schema.transactions đã tồn tại, thêm FK cho source_payment_code
-- trong migration riêng để tránh phụ thuộc vòng khi tạo schema.

-- 3. BẢNG YÊU CẦU RÚT TIỀN (PAYOUT)
CREATE TABLE wallet_schema.withdrawal_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_code VARCHAR(50) UNIQUE NOT NULL,
    wallet_id BIGINT NOT NULL REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
    bank_account_id BIGINT NOT NULL REFERENCES wallet_schema.user_bank_accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    fee DECIMAL(12, 2) DEFAULT 0.00 CHECK (fee >= 0),
    net_amount DECIMAL(15, 2) NOT NULL CHECK (net_amount > 0),
    status wallet_schema.payout_status_enum NOT NULL DEFAULT 'PENDING',
    payout_reference VARCHAR(100), -- mã idempotency khi gửi ngân hàng/đối tác
    bank_transaction_id VARCHAR(100), -- bằng chứng xác nhận chi trả cuối cùng
    admin_note TEXT,
    processed_by_user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_txns_gateway ON wallet_schema.payment_transactions(payment_gateway, gateway_transaction_id);
CREATE UNIQUE INDEX uq_payment_gateway_request ON wallet_schema.payment_transactions(payment_gateway, gateway_request_id)
    WHERE gateway_request_id IS NOT NULL;
CREATE UNIQUE INDEX uq_payment_gateway_transaction ON wallet_schema.payment_transactions(payment_gateway, gateway_transaction_id)
    WHERE gateway_transaction_id IS NOT NULL;
CREATE INDEX idx_payment_unposted ON wallet_schema.payment_transactions(created_at)
    WHERE status = 'SUCCESS' AND wallet_posting_status = 'NOT_POSTED';
CREATE INDEX idx_withdrawal_requests_status ON wallet_schema.withdrawal_requests(status, created_at ASC);
CREATE UNIQUE INDEX uq_payout_reference ON wallet_schema.withdrawal_requests(payout_reference)
    WHERE payout_reference IS NOT NULL;
```

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG (NFRS)

1. **Bảo Mật Xác Thực Chữ Ký Số (Cryptographic Security):**
   * Tuyệt đối không bao giờ cập nhật số dư ví chỉ dựa trên dữ liệu Client trả về từ Return URL. Quyết định ghi nhận tiền phải dựa vào IPN đã xác thực HMAC-SHA256 (MoMo), HMAC-SHA512 (VNPay), hoặc kết quả truy vấn trạng thái được xác thực từ cổng. Ghi vào ví chỉ khi ledger sẵn sàng và phải chống hạch toán trùng.
2. **Chống Tấn Công Timing Attack:**
   * Khi so sánh chữ ký nhận được từ webhook với chữ ký server tự tính toán, bắt buộc sử dụng `java.security.MessageDigest.isEqual()` (so sánh độ dài thời gian không đổi Constant-time comparison), tuyệt đối cấm dùng `String.equals()` để chống tấn công phân tích thời gian phản hồi.
3. **Tính Bất Biến Của Giao Dịch Đã Thành Công (Payment Idempotency):**
   * Khóa duy nhất `payment_code`, `(payment_gateway, gateway_request_id)` và `(payment_gateway, gateway_transaction_id)` khi có dữ liệu; cập nhật trạng thái payment theo điều kiện trạng thái hiện tại. `transactions.source_payment_code` duy nhất bảo vệ riêng bước ghi ví. IPN lặp lại không tạo thêm payment hoặc bút toán.

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
    * Nếu một payment `PENDING` quá ngưỡng cấu hình mà chưa nhận IPN, worker dùng API truy vấn trạng thái có xác thực của cổng để đối soát. Kết quả thành công chỉ cập nhật payment sang `SUCCESS`; bước ghi ví xử lý riêng khi ledger sẵn sàng và bảo đảm idempotency.

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
  * Phí cổng thanh toán và chính sách rút lại tiền có thể khác nhau theo hợp đồng đối tác. Nạp rồi rút ngay có thể tạo chi phí cho sàn.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Áp dụng quy chế:
    * Đo phí thực tế theo hợp đồng VNPay/MoMo trước khi chọn kênh ưu tiên.
    * Chính sách hạn chế rút ngay hoặc thu phí xử lý cần được Product/Finance phê duyệt và công bố cho người dùng trước khi đưa vào acceptance criteria; không mặc định mức 2%.
