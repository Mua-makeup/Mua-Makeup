# TÀI LIỆU ĐẶC TẢ USER STORIES & THIẾT KẾ KỸ THUẬT CHI TIẾT
## PHÂN HỆ: VÍ, SỔ CÁI KẾ TOÁN ĐÚP & ESCROW
### (Spring Boot 3.3.x Layered Monolith with Domain Sub-packages `core-api` - Schema: `wallet_schema`, Port `8080`)

---

## 📌 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

* **Tên Phân hệ Nghiệp vụ:** `Double-Entry Accounting Ledger & Automated Escrow Engine`
* **Mã Jira Issues phụ trách (Sprint 5 - Nhóm 1):**
  * `ISSUE-22.1`: **User Story** - Khởi tạo 5 bảng lõi của ví và sổ cái trong `wallet_schema`; 3 bảng payment/payout thuộc `ISSUE-23`–`ISSUE-24`.
  * `ISSUE-22.2`: **Task** - Module Quản lý Số dư khả dụng (`balance`) & Số dư phong tỏa (`frozen_balance`) trong Bảng `wallets`.
  * `ISSUE-22.3`: **Task** - Bảng Sổ cái Kế toán Đúp (`ledger_entries`) hạch toán Nợ (`debit`) / Có (`credit`) đối ứng bảo toàn tiền tệ.
  * `ISSUE-22.4`: **Task** - Bảng Sao kê Biến động số dư từng Ví (`wallet_transactions`) với các trạng thái `CREDIT`, `DEBIT`, `FREEZE`, `UNFREEZE`.
  * `ISSUE-22.5`: **Task** - Cơ chế Escrow Tự động: Giữ cọc 30% $\rightarrow$ Giải ngân Ví Thợ/Studio $\rightarrow$ Cắt % Hoa hồng Sàn (`SYSTEM_PLATFORM_WALLET`) trong 1 Database Transaction ACID duy nhất.

* **Liên kết với thanh toán `ISSUE-23.1`–`ISSUE-23.3`:** VNPay/MoMo được tích hợp trước để tạo checkout và xác nhận kết quả bằng IPN. `payment_transactions.status = SUCCESS` chỉ xác nhận cổng đã thu tiền; không đồng nghĩa số dư ví đã tăng. Khi `ISSUE-22.1`–`ISSUE-22.4` hoàn thành, xử lý từng payment thành công chưa hạch toán: tạo `transactions` loại `DEPOSIT`, `ledger_entries`, `wallet_transactions` và cộng `wallets.balance` đúng một lần trong cùng database transaction. `transactions.source_payment_code` là khóa duy nhất; payment có `wallet_posting_status` riêng. Nếu ghi sổ lỗi, giữ payment đã được cổng xác nhận để retry/đối soát; chỉ hiển thị “nạp ví thành công” sau khi ghi sổ xong.

* **Quy ước luồng tiền:** `ledger_entries.debit_wallet_id` là ví nguồn bị giảm, `credit_wallet_id` là ví đích tăng. Nạp tiền từ cổng dùng ví kỹ thuật `GATEWAY_CLEARING_WALLET` làm nguồn đối ứng; ví này có thể âm và không cho người dùng chi tiêu. Số âm đại diện khoản phải đối soát với tiền thực thu từ cổng, không phải số dư khách hàng. Không dùng ví sàn để tự tạo tiền. `FREEZE`/`UNFREEZE` chỉ chuyển giữa `balance` và `frozen_balance` của **cùng một ví**, nên ghi `wallet_transactions` và `transactions` nhưng không tạo chuyển khoản giả giữa hai ví.

* **Theo dõi tiền phong tỏa:** `wallet_holds` lưu khoản giữ theo `booking_id` hoặc mã yêu cầu rút, với `ACTIVE`/`RELEASED`/`CONSUMED`. `frozen_balance` là tổng các hold `ACTIVE`; chỉ hold đúng booking/yêu cầu mới được giải phóng hoặc tiêu thụ. Một ví có thể đồng thời giữ cọc nhiều booking và tiền chờ rút.

* **Phạm vi Escrow sprint 5:** để giải ngân toàn bộ giá trị đơn vào ví, khách phải có đủ **30% cọc đã phong tỏa và 70% còn lại trong số dư ví** khi tất toán. Nếu 70% được trả tiền mặt cho Thợ, không được cộng toàn bộ giá trị đơn vào ví; luồng tiền mặt cần chính sách phân chia, thu hoa hồng và đối soát riêng trước khi triển khai.

* **Mô hình Kiến trúc & Nguyên Lý Kế Toán Đúp:**
  * **Toàn vẹn dữ liệu kế toán:** mỗi chuyển tiền giữa hai ví có một bút toán với nguồn, đích và cùng số tiền; đối soát số dư từng ví với ledger và sao kê. Truy vấn `SUM(amount)` trên một bảng một cột không chứng minh được cân bằng; phải kiểm tra cả hai phía và chênh lệch với số dư thực tế.
  * **Bảo vệ Tranh Chấp Đơn Hàng (Escrow Protection):** 
    * Khi đơn hàng được xác nhận, tiền cọc $30\%$ của khách hàng được chuyển từ `balance` sang `frozen_balance` (Số dư phong tỏa).
    * Khi đơn hoàn tất nghiệm thu, động cơ Escrow tự động phân bổ:
      - $80\%$ doanh thu vào Ví Thợ tự do (`FREELANCER_WALLET`) hoặc Ví Studio (`AGENCY_WALLET`).
      - $20\%$ phí hoa hồng nền tảng vào Ví Sàn (`SYSTEM_PLATFORM_WALLET`).
  * **Bảo toàn Giao dịch & Chống Race Condition:**
    * Sử dụng **Khóa Bi quan (Pessimistic Locking - `PESSIMISTIC_WRITE`)** trên các dòng bản ghi của bảng `wallets` trong suốt quá trình biến động số dư.
    * Khóa ví theo ID tăng dần để giảm nguy cơ deadlock; vẫn cần timeout/retry có giới hạn và khóa duy nhất chống lặp.

---

## 🏗️ 2. KIẾN TRÚC PHÂN TẦNG BACK-END (DOMAIN SUB-PACKAGE: `wallet`)

Mã nguồn được tổ chức chặt chẽ theo cấu trúc chuẩn dự án tại `docs/project_structure.md`:

```text
code/backend/core-api/src/main/java/com/makeup/platform/
├── common/
│   ├── base/
│   │   ├── BaseEntity.java                    # id, created_at, updated_at
│   │   ├── BaseController.java                # ok, created, noContent, error
│   │   └── ApiResponse.java                   # Chuẩn hóa Envelope
│   └── constants/
│       ├── ErrorCodes.java                    # ERR_WALLET_INSUFFICIENT_BALANCE, ERR_LEDGER_UNBALANCED...
│       └── WalletConstants.java               # Tỷ lệ cọc 30%, Hoa hồng sàn 20%, SYSTEM_WALLET_ID
│
├── config/
│   └── DatabaseConfig.java                    # Quản lý @EnableTransactionManagement
│
├── controller/
│   └── wallet/
│       ├── WalletController.java              # GET /api/v1/wallets/me, GET /api/v1/wallets/transactions
│       └── AdminWalletAuditController.java    # GET /api/v1/admin/wallets/ledger-audit (Đối soát)
│
├── dto/
│   ├── request/
│   │   └── wallet/
│   │       ├── EscrowLockReq.java             # bookingId, customerId, amount
│   │       └── EscrowReleaseReq.java          # bookingId, completionProofNote
│   └── response/
│       └── wallet/
│           ├── WalletBalanceRes.java          # walletId, balance, frozenBalance, currency
│           ├── WalletTransactionDetailRes.java# id, amount, balanceBefore, balanceAfter, entryType
│           └── LedgerAuditRes.java            # debitWalletId, creditWalletId, amount, transactionCode
│
├── entity/
│   └── wallet/
│       ├── WalletEntity.java                  # table: wallet_schema.wallets
│       ├── TransactionEntity.java             # table: wallet_schema.transactions
│       ├── WalletTransactionEntity.java       # table: wallet_schema.wallet_transactions
│       ├── WalletHoldEntity.java              # table: wallet_schema.wallet_holds
│       └── LedgerEntryEntity.java             # table: wallet_schema.ledger_entries
│
├── mapper/
│   └── wallet/
│       ├── WalletMapper.java                  # Manual Mapper (@Component)
│       └── LedgerMapper.java                  # Manual Mapper (@Component)
│
├── repository/
│   └── wallet/
│       ├── WalletRepository.java              # findByIdWithPessimisticLock, findByUserId, findByAgencyId
│       ├── TransactionRepository.java         # findByTransactionCode, findByBookingId
│       ├── WalletTransactionRepository.java   # findByWalletIdOrderByCreatedAtDesc (Pageable)
│       └── LedgerEntryRepository.java         # findByTransactionId, calculateTotalDebitCreditAudit
│
├── event/
│   └── wallet/
│       ├── EscrowLockedEvent.java             # Bắn ra khi tiền cọc đã phong tỏa an toàn
│       └── EscrowDisbursedEvent.java          # Bắn ra khi đã giải ngân ví thợ và ví sàn
│
└── service/
    └── wallet/
        ├── WalletService.java                 # Interface nạp tiền, trừ tiền, khóa/mở phong tỏa
        ├── LedgerService.java                 # Interface ghi nhận bút toán kép đối ứng
        ├── EscrowService.java                 # Interface vòng đời cọc đơn hàng: Hold -> Release -> Refund
        └── impl/
            ├── WalletServiceImpl.java         # 100% logic khóa bi quan, kiểm tra số dư khả dụng
            ├── LedgerServiceImpl.java         # 100% logic hạch toán Nợ/Có bảo toàn tổng tài sản
            └── EscrowServiceImpl.java         # 100% logic điều phối giải ngân và cắt hoa hồng sàn
```

---

## 📋 3. DANH SÁCH USER STORIES CHI TIẾT & TIÊU CHÍ BDD (ACCEPTANCE CRITERIA)

---

### **US-WAL-01: Quản Lý Số Dư Khả Dụng & Số Dư Phong Tỏa Trong Bảng `wallets` (`ISSUE-22.1` & `ISSUE-22.2`)**
> **As a** Chủ sở hữu Ví (Khách hàng / Thợ / Studio / Ban Quản trị Sàn),  
> **I want** hệ thống quản lý độc lập 2 loại số dư: **Số dư khả dụng (`balance`)** và **Số dư đóng băng/phong tỏa (`frozen_balance`)**,  
> **So that** tôi biết chính xác số tiền có thể rút hoặc chi tiêu ngay lập tức, trong khi các khoản cọc đang thực hiện dịch vụ được bảo vệ an toàn.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Phong tỏa số dư để đặt cọc đơn hàng (Freeze Balance)**
  * **Given** Khách hàng A (`userId = 15`) sở hữu ví có `balance = 2,000,000 đ` và `frozen_balance = 0 đ`.
  * **When** Khách hàng đặt đơn hàng yêu cầu cọc $819,000\text{ đ}$.
  * **Then** Service mở transaction, xin khóa bi quan `PESSIMISTIC_WRITE` trên dòng ví của Khách A.
  * **And** Kiểm tra điều kiện: `balance >= 819,000` (Thỏa mãn).
  * **And** Cập nhật ví:
    * `balance = 2,000,000 - 819,000 = 1,181,000 đ`.
    * `frozen_balance = 0 + 819,000 = 819,000 đ`.
  * **And** Tạo hold `ACTIVE` gắn booking và ghi `wallet_transactions` với `entry_type = 'FREEZE'`, lưu snapshot trước/sau. Hold trùng booking không được trừ tiền lần hai.

* **Scenario 02: Từ chối phong tỏa khi số dư khả dụng không đủ**
  * **Given** Khách hàng B sở hữu ví có `balance = 500,000 đ`, cần cọc $819,000\text{ đ}$.
  * **When** Hệ thống thực hiện lệnh phong tỏa cọc.
  * **Then** Service phát hiện `balance < amount`, lập tức ném ngoại lệ `CustomBusinessException(ErrorCodes.ERR_WALLET_INSUFFICIENT_BALANCE)`.
  * **And** Trả về HTTP `400 BAD_REQUEST`, hủy bỏ giao dịch (Rollback toàn bộ).

---

### **US-WAL-02: Bút Toán Sổ Cái Kế Toán Đúp (`ledger_entries`) Đối Ứng Nợ / Có (`ISSUE-22.3`)**
> **As a** Giám đốc Tài chính & Kế toán Trưởng Hệ thống,  
> **I want** mọi giao dịch tài chính phát sinh đều phải tạo thành một cặp bút toán kép: Ví Ghi Nợ (`debit_wallet_id`) và Ví Ghi Có (`credit_wallet_id`) với số tiền bằng nhau,  
> **So that** hệ thống không thể xảy ra tình trạng "tiền ảo" tự sinh ra hoặc thất thoát ngoài tầm kiểm soát.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Hạch toán phân bổ tiền hoa hồng sàn khi hoàn tất ca làm**
  * **Given** Đơn hàng hoàn tất, hệ thống thu phí hoa hồng sàn $20\%$ tương đương $546,000\text{ đ}$.
  * **When** `LedgerService.recordEntry(...)` được gọi:
    * Ví trích tiền: Ví Khách (`debit_wallet_id = 15`), từ tổng giá trị đơn đã được thu đủ trong ví.
    * Ví thụ hưởng (Có): Ví Doanh Thu Sàn (`credit_wallet_id = 1` - `SYSTEM_PLATFORM_WALLET`).
    * Số tiền: $546,000\text{ đ}$.
  * **Then** Hệ thống chèn 1 bản ghi vào bảng `wallet_schema.ledger_entries`:
    ```sql
    INSERT INTO wallet_schema.ledger_entries (transaction_id, debit_wallet_id, credit_wallet_id, amount, currency, description)
    VALUES (7801, 15, 1, 546000.00, 'VND', 'Thu phí hoa hồng sàn 20% đơn #BK-260914-FAST901');
    ```
  * **And** Luôn đảm bảo: Số tiền giảm bên Nợ chính xác bằng số tiền tăng bên Có.

* **Scenario 02: Đối soát sổ cái với số dư ví (Audit Balance Check)**
  * **Given** Ban quản trị chạy API đối soát.
  * **When** Tính số dư kỳ vọng của mỗi ví từ số dư mở đầu cộng tổng `credit_wallet_id` trừ tổng `debit_wallet_id`, đồng thời đối chiếu các snapshot `FREEZE`/`UNFREEZE`.
  * **Then** Số dư kỳ vọng khớp `balance + frozen_balance` hiện tại của từng ví và tổng biến động toàn hệ thống bằng 0. Bất kỳ sai lệch nào phải được báo rõ ví và giao dịch liên quan; không dùng riêng `SELECT SUM(amount)` để kết luận sổ cái cân bằng.

---

### **US-WAL-03: Bảng Sao Kê Biến Động Số Dư (`wallet_transactions`) Snapshot Minh Bạch (`ISSUE-22.4`)**
> **As a** Người dùng sở hữu Ví,  
> **I want** xem lịch sử sao kê chi tiết từng dòng biến động số dư kèm ảnh chụp trạng thái trước và sau khi thay đổi,  
> **So that** tôi tự kiểm tra được tính minh bạch và chính xác của từng đồng tiền trong ví.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Xem sao kê biến động ví của Thợ trang điểm**
  * **Given** Thợ trang điểm vừa hoàn tất ca và được giải ngân $2,184,000\text{ đ}$.
  * **When** Thợ gửi request `GET /api/v1/wallets/transactions?page=0&size=10`.
  * **Then** Trả về danh sách sao kê có cấu trúc snapshot hoàn chỉnh:
    ```json
    {
      "id": 9901,
      "transaction_id": 7801,
      "entry_type": "CREDIT",
      "amount": 2184000.00,
      "balance_before": 1500000.00,
      "balance_after": 3684000.00,
      "frozen_balance_before": 0.00,
      "frozen_balance_after": 0.00,
      "created_at": "2026-09-14T11:00:00Z",
      "description": "Nhận tiền thù lao ca làm đơn #BK-260914-FAST901"
    }
    ```
  * **And** Với `CREDIT`, `balance_after = balance_before + amount`; với `DEBIT` thì trừ `amount`. Với `FREEZE`/`UNFREEZE`, kiểm tra cả `balance` và `frozen_balance` thay đổi đối ứng, tổng hai số dư không đổi.

---

### **US-WAL-04: Động Cơ Tự Động Hóa Escrow: Giữ Cọc $\rightarrow$ Giải Ngân $\rightarrow$ Cắt Hoa Hồng Sàn (`ISSUE-22.5`)**
> **As a** Hệ thống Điều phối Kinh tế Nền tảng (Platform Economy Engine),  
> **I want** khi đơn hàng hoàn tất, hệ thống tự động giải phóng cọc Escrow, cộng doanh thu thuần cho Thợ/Studio và trích hoa hồng cho Sàn trong cùng 1 `@Transactional`,  
> **So that** không cần bất kỳ sự can thiệp thủ công nào của con người và loại trừ hoàn toàn nguy cơ mất tiền hoặc hạch toán dở dang.

#### **Tiêu chí Nghiệm thu (Acceptance Criteria - BDD):**

* **Scenario 01: Hoàn tất đơn hàng và giải ngân tự động trọn gói (Full Settlement Flow)**
  * **Given** Đơn hàng `booking_id = 901` có tổng giá trị $2,730,000\text{ đ}$, trong đó:
    * Tiền cọc đã phong tỏa trong ví khách: $819,000\text{ đ}$ (`frozen_balance`).
    * Phần còn lại $1,911,000\text{ đ}$ đã có trong `balance` khả dụng của ví khách trước khi tất toán; **không phải tiền mặt**.
    * Tỷ lệ hoa hồng sàn: $20\%$, Doanh thu thực nhận của Thợ ($80\%$): $2,184,000\text{ đ}$.
    * Hoa hồng Sàn thu về ($20\%$): $546,000\text{ đ}$.
  * **When** Thợ bấm "Nghiệm thu hoàn tất" và Khách hàng xác nhận thành công.
  * **Then** `EscrowService.settleBooking(901L)` thực thi trong 1 giao dịch database duy nhất:
    1. Kiểm tra booking chưa tất toán, hold `ACTIVE` đúng booking có 819,000 đ và `balance >= 1,911,000`; nếu thiếu tiền thì không chuyển tiền và không đổi trạng thái booking.
    2. Trừ $819,000\text{ đ}$ từ `frozen_balance` và $1,911,000\text{ đ}$ từ `balance` của khách: tổng nguồn $2,730,000\text{ đ}$.
    3. Cộng $2,184,000\text{ đ}$ vào ví Thợ/Studio và $546,000\text{ đ}$ vào ví Sàn.
    4. Ghi hai bút toán nguồn ví Khách $\rightarrow$ ví Thợ/Studio và nguồn ví Khách $\rightarrow$ ví Sàn, cùng các snapshot `wallet_transactions`; bảo đảm tổng ghi giảm bằng tổng ghi tăng.
    5. Đánh dấu hold `CONSUMED`, đổi trạng thái booking theo state machine hiện có sang trạng thái đã tất toán; khóa duy nhất theo `booking_id` để callback/nhấn nút lặp không giải ngân lần hai.
  * **And** Bắn sự kiện `EscrowDisbursedEvent` để WebSocket Gateway gửi thông báo Toast cho cả Khách và Thợ.

* **Scenario 02: Khách hàng hủy đơn hợp lệ $\rightarrow$ Hoàn cọc 100% tự động (Auto-Refund Flow)**
  * **Given** Đơn khẩn cấp sau 45s không có thợ nhận, hoặc khách hủy trước khi thợ di chuyển theo đúng chính sách hoàn tiền.
  * **When** `EscrowService.refundDeposit(901L, "SEARCH_TIMEOUT")` được kích hoạt.
  * **Then** Hệ thống chỉ mở hold `ACTIVE` thuộc booking này và chuyển ngược $819,000\text{ đ}$ từ `frozen_balance` quay trở lại `balance` khả dụng của khách:
    * `frozen_balance = frozen_balance - 819,000`.
    * `balance = balance + 819,000`.
  * **And** Đánh dấu hold `RELEASED`, ghi `wallet_transactions` với `entry_type = 'UNFREEZE'`.
  * **And** Nếu refund được gọi lại, không mở phong tỏa hoặc ghi sao kê lần hai. Đo thời gian xử lý trong test hiệu năng riêng, không cam kết mốc `< 50ms` khi chưa có số đo.

* **Scenario 03: Thiếu 70% còn lại hoặc yêu cầu tất toán bị gửi trùng**
  * **Given** Hold của booking vẫn `ACTIVE` nhưng ví khách không đủ phần còn lại, hoặc booking đã có giao dịch `SETTLEMENT`.
  * **When** Hệ thống nhận yêu cầu tất toán.
  * **Then** Nếu thiếu tiền, giữ nguyên hold, ví và booking để khách nạp thêm; nếu đã tất toán, trả trạng thái hiện tại mà không ghi thêm ledger/sao kê hay cộng tiền lần hai.

---

## ⚠️ 4. CHI TIẾT NGOẠI LỆ & BẢNG MÃ LỖI VÍ ĐIỆN TỬ

| HTTP Status | Mã Lỗi (`code`) | Nguyên Nhân Kích Hoạt | Xử Lý Phía Server |
| :--- | :--- | :--- | :--- |
| **`400 BAD_REQUEST`** | `ERR_WALLET_INSUFFICIENT_BALANCE` | Số dư khả dụng (`balance`) nhỏ hơn số tiền cần giao dịch/phong tỏa. | Rollback giao dịch, yêu cầu nạp thêm tiền. |
| **`400 BAD_REQUEST`** | `ERR_WALLET_FROZEN_INSUFFICIENT` | Số dư phong tỏa không khớp với số tiền cọc cần giải ngân/hoàn trả. | Chặn giải ngân, ghi log cảnh báo dữ liệu không nhất quán. |
| **`403 FORBIDDEN`** | `ERR_WALLET_ACCESS_DENIED` | Người dùng cố tình truy cập thông tin số dư hoặc sao kê của ví người khác. | Ném lỗi vi phạm phân quyền IDOR. |
| **`409 CONFLICT`** | `ERR_WALLET_LOCKED_CONCURRENT` | Ví đang bị một tiến trình khác khóa quá thời gian chờ (Pessimistic Lock Timeout). | Tự động retry tối đa 3 lần với backoff 100ms. |
| **`500 INTERNAL_ERROR`**| `ERR_LEDGER_UNBALANCED_ENTRY` | Tổng số tiền bên Nợ không bằng bên Có trong cùng bút toán kép. | Rollback toàn bộ transaction, kích hoạt cảnh báo khẩn cấp tới DevOps. |

---

## 💻 5. ĐẶC TẢ REST API VÍ ĐIỆN TỬ

### 5.1. `GET /api/v1/wallets/me` (Xem Số Dư Ví Cá Nhân)
* **Quyền truy cập:** Đã đăng nhập (`ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_ADMIN`).
* **Headers:** `Authorization: Bearer <JWT>`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "WALLET_BALANCE_FETCHED",
  "message": "Lấy thông tin số dư ví thành công",
  "data": {
    "wallet_id": 88,
    "wallet_type": "CUSTOMER_WALLET",
    "balance": 1181000.00,
    "frozen_balance": 819000.00,
    "total_asset": 2000000.00,
    "currency": "VND",
    "is_active": true
  },
  "timestamp": "2026-09-14T11:15:00Z"
}
```

---

### 5.2. `GET /api/v1/wallets/transactions` (Lấy Danh Sách Sao Kê Biến Động Ví)
* **Query Parameters:** `page=0&size=10&entry_type=ALL`
* **Response `200 OK`:**
```json
{
  "success": true,
  "code": "WALLET_TRANSACTIONS_FETCHED",
  "message": "Lấy danh sách sao kê thành công",
  "data": {
    "content": [
      {
        "id": 9902,
        "transaction_code": "TXN-260914-DISBURSE-901",
        "entry_type": "CREDIT",
        "amount": 2184000.00,
        "balance_before": 1500000.00,
        "balance_after": 3684000.00,
        "frozen_balance_before": 0.00,
        "frozen_balance_after": 0.00,
        "created_at": "2026-09-14T11:00:00Z"
      }
    ],
    "page": 0,
    "size": 10,
    "total_elements": 1,
    "total_pages": 1,
    "last": true
  },
  "timestamp": "2026-09-14T11:15:00Z"
}
```

---

## ⚡ 6. SƠ ĐỒ TUẦN TỰ KHÉP KÍN (MERMAID SEQUENCE DIAGRAM)

```mermaid
sequenceDiagram
    autonumber
    actor M as Thợ Trang Điểm
    participant API as Booking Controller
    participant ESC as Escrow Service
    participant WAL as Wallet Service (Pessimistic Lock)
    participant LED as Ledger Service
    participant DB as PostgreSQL (wallet_schema)
    actor C as Khách Hàng

    M->>API: POST /api/v1/freelancer/bookings/901/complete
    API->>ESC: settleBooking(901L)
    Note over ESC: Bắt đầu 1 Transaction ACID duy nhất (@Transactional)

    ESC->>WAL: lockWalletsInAscendingOrder(customerWalletId, muaWalletId, systemWalletId)
    WAL->>DB: SELECT * FROM wallets WHERE id IN (15, 89, 1) FOR UPDATE
    DB-->>WAL: Đã khóa 3 ví theo ID tăng dần

    ESC->>WAL: verify(customerFrozen>=819000, customerBalance>=1911000)

    ESC->>WAL: deductFrozenBalance(customerWalletId, 819,000đ)
    WAL->>DB: UPDATE wallets SET frozen_balance = frozen_balance - 819000 WHERE id = 15
    ESC->>WAL: debitAvailableBalance(customerWalletId, 1,911,000đ)
    WAL->>DB: UPDATE wallets SET balance = balance - 1911000 WHERE id = 15
    WAL->>DB: INSERT INTO wallet_transactions (wallet_id=15, DEBIT, total=2730000)

    ESC->>WAL: creditBalance(muaWalletId, 2,184,000đ - 80%)
    WAL->>DB: UPDATE wallets SET balance = balance + 2184000 WHERE id = 89
    WAL->>DB: INSERT INTO wallet_transactions (wallet_id=89, CREDIT, 2184000)

    ESC->>WAL: creditBalance(systemWalletId, 546,000đ - 20%)
    WAL->>DB: UPDATE wallets SET balance = balance + 546000 WHERE id = 1
    WAL->>DB: INSERT INTO wallet_transactions (wallet_id=1, CREDIT, 546000)

    ESC->>LED: recordDoubleEntry(debitWallet=15, creditWallet=89, 2184000)
    LED->>DB: INSERT INTO ledger_entries (debit=15, credit=89, amount=2184000)

    ESC->>LED: recordDoubleEntry(debitWallet=15, creditWallet=1, 546000)
    LED->>DB: INSERT INTO ledger_entries (debit=15, credit=1, amount=546000)

    Note over ESC: Ghi khóa tất toán booking; transaction COMMIT thành công
    API-->>M: 200 OK (Giải ngân hoàn tất)
    par Bắn thông báo Realtime
        API-->>C: STOMP: Đơn hoàn tất, đã thanh toán đủ tiền
        API-->>M: STOMP: Bạn vừa nhận được +2,184,000 đ vào ví
    end
```

---

## 🗄️ 7. THIẾT KẾ CƠ SỞ DỮ LIỆU DDL (5 BẢNG VÍ CỐT LÕI)

DDL dưới đây là thiết kế cho giai đoạn 2. `payment_transactions` được tạo trước ở giai đoạn 1; các liên kết giữa payment và `transactions` thêm sau khi cả hai bảng đã tồn tại. Migration thực tế phải dùng số phiên bản Flyway mới, không sửa migration đã chạy.

```sql
CREATE SCHEMA IF NOT EXISTS wallet_schema;

CREATE TYPE wallet_schema.wallet_type_enum AS ENUM ('CUSTOMER_WALLET', 'FREELANCER_WALLET', 'AGENCY_WALLET', 'SYSTEM_PLATFORM_WALLET', 'GATEWAY_CLEARING_WALLET');
CREATE TYPE wallet_schema.transaction_type_enum AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'SETTLEMENT', 'PLATFORM_COMMISSION', 'REFUND', 'TIP');

-- 1. BẢNG VÍ
CREATE TABLE wallet_schema.wallets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE RESTRICT,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE RESTRICT,
    mua_id BIGINT REFERENCES mua_schema.mua_profiles(id) ON DELETE RESTRICT,
    wallet_type wallet_schema.wallet_type_enum NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    frozen_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (frozen_balance >= 0),
    currency VARCHAR(3) DEFAULT 'VND',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_nonnegative_spendable_balance CHECK (wallet_type = 'GATEWAY_CLEARING_WALLET' OR balance >= 0),
    CONSTRAINT chk_clearing_not_frozen CHECK (wallet_type <> 'GATEWAY_CLEARING_WALLET' OR frozen_balance = 0)
);

-- 2. BẢNG GIAO DỊCH NGHIỆP VỤ
CREATE TABLE wallet_schema.transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    source_payment_code VARCHAR(50) UNIQUE, -- chỉ cho DEPOSIT; liên kết payment theo mã, FK thêm khi cả hai bảng đã tồn tại
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE RESTRICT,
    transaction_type wallet_schema.transaction_type_enum NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) DEFAULT 'COMPLETED',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_booking_settlement ON wallet_schema.transactions(booking_id)
    WHERE transaction_type = 'SETTLEMENT' AND booking_id IS NOT NULL;

-- 3. BẢNG SAO KÊ BIẾN ĐỘNG SỐ DƯ TỪNG VÍ
CREATE TABLE wallet_schema.wallet_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES wallet_schema.transactions(id) ON DELETE RESTRICT,
    wallet_id BIGINT NOT NULL REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    frozen_balance_before DECIMAL(15, 2) NOT NULL,
    frozen_balance_after DECIMAL(15, 2) NOT NULL,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT', 'FREEZE', 'UNFREEZE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG SỔ CÁI KẾ TOÁN ĐÚP
CREATE TABLE wallet_schema.ledger_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES wallet_schema.transactions(id) ON DELETE RESTRICT,
    debit_wallet_id BIGINT NOT NULL REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
    credit_wallet_id BIGINT NOT NULL REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'VND',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. KHOẢN GIỮ TIỀN THEO NGHIỆP VỤ; reference_code ví dụ BOOKING:901 hoặc WITHDRAWAL:WTH-...
CREATE TABLE wallet_schema.wallet_holds (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES wallet_schema.wallets(id) ON DELETE RESTRICT,
    reference_code VARCHAR(100) NOT NULL UNIQUE,
    hold_type VARCHAR(30) NOT NULL CHECK (hold_type IN ('BOOKING_DEPOSIT', 'WITHDRAWAL')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'CONSUMED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ledger_debit_credit ON wallet_schema.ledger_entries(debit_wallet_id, credit_wallet_id, created_at DESC);
CREATE INDEX idx_wallet_txns_wallet_time ON wallet_schema.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_holds_active ON wallet_schema.wallet_holds(wallet_id) WHERE status = 'ACTIVE';
```

---

## 🛡️ 8. YÊU CẦU PHI CHỨC NĂNG (NFRS)

1. **Bảo Đảm Tính Toàn Vẹn ACID Tuyệt Đối (Zero Monetary Drift):**
   * Mọi biến động ví, bút toán ledger, trừ cọc escrow bắt buộc nằm trọn vẹn trong 1 `@Transactional`. Nếu xảy ra bất kỳ lỗi runtime nào, toàn bộ giao dịch phải rollback $100\%$, không bao giờ xảy ra tình trạng "ví đã trừ tiền mà sổ cái chưa ghi".
2. **Giảm nguy cơ deadlock:**
   * Mọi thao tác cần lock nhiều ví cùng lúc sắp xếp ID tăng dần trước `SELECT ... FOR UPDATE`; vẫn xử lý lock timeout/deadlock bằng retry hữu hạn trên toàn transaction và idempotency key.
3. **Độ Chính Xác Tính Toán Tiền Tệ (Mathematical Precision):**
   * Tuyệt đối không dùng kiểu `float` hoặc `double` trong mã nguồn Java. $100\%$ các phép tính tiền tệ, hoa hồng, hoàn cọc phải sử dụng `BigDecimal` với `RoundingMode.HALF_UP` và scale 2 chữ số thập phân.

---

## ⚠️ 9. ĐÁNH GIÁ CÁC ĐIỂM CHƯA TỐI ƯU & RỦI RO KIẾN TRÚC CỦA TÍNH NĂNG (CRITICAL GAP ANALYSIS & BOTTLENECK AUDIT)

> [!WARNING]
> Dưới đây là **5 điểm nghẽn kiến trúc tài chính và hạn chế kỹ thuật** của hệ thống Ví & Sổ cái hiện tại, cùng giải pháp khắc phục chi tiết:

---

### 9.1. Điểm Chưa Tối Ưu 1: Nghẽn Cổ Chai Khóa Bi Quan Trên Ví Nền Tảng (Pessimistic Lock Contention on System Wallet)
* **Thực trạng chưa tối ưu:**
  * Toàn bộ hoa hồng $20\%$ của mọi đơn booking hoàn tất trên cả nước đều được ghi Có (`Credit`) vào duy nhất 1 ví: `SYSTEM_PLATFORM_WALLET` (`wallet_id = 1`).
  * Trong giờ cao điểm (ví dụ: tối Chủ Nhật), hàng trăm ca làm cùng hoàn tất trong 1 giây. Việc mỗi transaction đều thực hiện `SELECT * FROM wallets WHERE id = 1 FOR UPDATE` sẽ biến dòng ví sàn thành **điểm thắt cổ chai cực đại (Hotspot Bottleneck)**. Các transaction phải xếp hàng chờ lock ví sàn, dẫn đến hiện tượng timeout (`PessimisticLockingFailureException`) và giảm thông lượng hệ thống nghiêm trọng.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Nếu đo được nghẽn thực tế, có thể tạo nhiều bản ghi cùng loại `SYSTEM_PLATFORM_WALLET`, chọn theo hash ổn định của `bookingId` và cộng tổng khi đối soát. Không cần tạo thêm giá trị enum cho từng ví phụ.
  * Không trì hoãn cập nhật số dư ví sàn tách khỏi ledger trong luồng tài chính hiện tại, vì như vậy phá vỡ điều kiện ACID và đối soát tức thời. Chỉ cân nhắc phân mảnh khi đã đo thấy nghẽn thực tế.

---

### 9.2. Điểm Chưa Tối Ưu 2: Rủi Ro Lệch Tiền Do Thiếu Tiến Trình Đối Soát Tự Động Định Kỳ (Lack of Automated Reconciliation Cron)
* **Thực trạng chưa tối ưu:**
  * Mặc dù đã thiết kế bảng `ledger_entries` theo kế toán đúp, nhưng hệ thống hiện tại chưa có một Worker tự động chạy định kỳ để đối soát chéo (Reconciliation Job).
  * Nếu chẳng may có một lập trình viên vô tình viết câu lệnh `UPDATE wallets SET balance = balance + 100` trực tiếp mà quên ghi ledger, số dư ví sẽ bị lệch so với tổng sổ cái mà không ai hay biết cho đến kỳ kiểm toán cuối năm.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Xây dựng một Spring `@Scheduled` chạy vào lúc 01:00 sáng mỗi ngày:
    * Quét toàn bộ các ví: So sánh `wallets.balance` hiện tại với tổng công thức:
      $$\text{Tổng số dư kỳ vọng} = \text{Tổng mở đầu} + \sum \text{Credit (Vào)} - \sum \text{Debit (Ra)}.$$
    * Đối chiếu riêng `balance` và `frozen_balance` bằng snapshot sao kê; chuyển `FREEZE`/`UNFREEZE` không làm đổi tổng tài sản ví.
    * Nếu phát hiện bất kỳ ví nào lệch dù chỉ $1\text{ đ}$, lập tức kích hoạt còi báo động qua Telegram / Slack tới Ban Giám đốc và tạm khóa chức năng rút tiền của ví đó để kiểm tra an toàn.

---

### 9.3. Điểm Chưa Tối Ưu 3: Tốc Độ Phình Bảng Sổ Cái Gấp 5-6 Lần Đơn Booking (Ledger Data Explosion)
* **Thực trạng chưa tối ưu:**
  * Với mỗi 1 đơn hàng booking từ lúc tạo đến lúc hoàn tất, hệ thống phát sinh:
    * 1 giao dịch giữ cọc (1 dòng `transactions` + 1 dòng `wallet_transactions`).
    * 1 giao dịch giải ngân ví thợ (1 dòng `transactions` + 1 dòng `wallet_transactions` + 1 dòng `ledger_entries`).
    * 1 giao dịch cắt hoa hồng sàn (1 dòng `transactions` + 1 dòng `wallet_transactions` + 1 dòng `ledger_entries`).
    * $\rightarrow$ Trung bình mỗi đơn booking sinh ra **6 đến 8 dòng dữ liệu tài chính**.
  * Với mục tiêu 10.000 đơn/ngày và giả định 6–8 dòng tài chính/đơn, toàn bộ các bảng tài chính có thể tăng khoảng 1,8–2,4 triệu dòng/tháng. Đây là phép ước lượng, cần đo theo luồng thực tế trước khi phân vùng bảng.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Cấu hình **PostgreSQL Table Partitioning theo quý hoặc theo tháng** cho bảng `wallet_transactions` và `ledger_entries` (`PARTITION BY RANGE (created_at)`).
  * Đánh chỉ mục chuyên biệt `CREATE INDEX CONCURRENTLY` trên cặp `(wallet_id, created_at DESC)`.

---

### 9.4. Điểm Chưa Tối Ưu 4: Thiếu Cơ Chế Đóng Băng Tự Động Khi Phát Hiện Ví Bị Số Dư Âm (Negative Balance Circuit Breaker)
* **Thực trạng chưa tối ưu:**
  * Dù CSDL đã có ràng buộc `CHECK (balance >= 0)`, nhưng trong các tình huống tranh chấp hoàn tiền (Chargeback từ thẻ ngân hàng hoặc Khách hàng khiếu nại thành công sau khi Thợ đã rút hết tiền ví về tài khoản ngân hàng), ví của Thợ có thể rơi vào tình huống bị ép ghi nợ dẫn đến số dư âm hoặc không thể thu hồi công nợ.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Bổ sung cơ chế **Công Nợ Sàn (Debt Ledger)**: Nếu phát sinh khoản phạt hoặc hoàn tiền mà ví thợ không đủ số dư, khoản nợ được ghi nhận vào bảng `mua_debts`. Khi thợ hoàn thành các đơn tiếp theo, hệ thống tự động trừ cấn trừ công nợ trước khi giải ngân vào số dư khả dụng.

---

### 9.5. Điểm Chưa Tối Ưu 5: Chưa Tách Biệt Sổ Cái Đọc & Ghi (Read/Write Contention on Ledger)
* **Thực trạng chưa tối ưu:**
  * Các truy vấn xem lịch sử sao kê ví của người dùng (`GET /api/v1/wallets/transactions`) chạy chung trên Master Database với các lệnh ghi `INSERT INTO ledger_entries` của tiến trình giải ngân đơn khẩn cấp.
  * Khi nhiều khách hàng cùng mở app xem lại lịch sử chi tiêu, các câu lệnh `SELECT ... ORDER BY created_at DESC` với OFFSET lớn sẽ cạnh tranh tài nguyên I/O đĩa cứng với luồng ghi giao dịch cốt lõi.
* **Phương án Khắc phục / Lộ trình Tối ưu:**
  * Cấu hình **Read-Replica Database** (Phân tách Đọc / Ghi qua `@Transactional(readOnly = true)` trỏ tới PostgreSQL Read-Replica Slave). Master Database chỉ chuyên tâm phục vụ luồng ghi giao dịch tài chính.
