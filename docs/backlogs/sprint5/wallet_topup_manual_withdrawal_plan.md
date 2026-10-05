# Sprint 5 — Hoàn thiện nạp ví, rút tiền thủ công và đối soát

Ngày rà soát: 05/10/2026. Nguồn: working tree hiện tại của repository; chưa chạy ứng dụng, DB hay giao dịch thật trong lần lập kế hoạch này. Các nhận định “đã có” là từ code/migration/test đã đọc, không đồng nghĩa đã nghiệm thu runtime.

## 1. Phạm vi đã chốt

1. Hoàn thiện nạp qua **VNPAY và MOMO** hiện có: xác nhận đã thu → cộng ví đúng một lần → lịch sử giao dịch.
2. Rút số dư khả dụng: giữ tiền → SUPER_ADMIN duyệt → chuyển khoản ngoài hệ thống → nhập kết quả → đối soát.
3. Kiểm thử callback trùng/mất/đến muộn, timeout, cạnh tranh số dư và hoàn tiền về ví theo nghiệp vụ hiện có.

Loại VietQR, ZaloPay, payOS và API chi hộ tự động khỏi Sprint 5. `ISSUE-23.4` được bỏ khỏi phạm vi, không tái sử dụng mã đó cho công việc khác. VNPAY/MOMO có thể trả phương thức QR trong checkout hiện hữu; việc bỏ tích hợp VietQR riêng không thay đổi checkout của hai adapter.

Áp dụng cho ví cá nhân CUSTOMER và FREELANCE_MUA đang có controller/màn hình. Chưa đưa ví Studio/pháp nhân vào vì code ví hiện tại gắn `user_id`; không giả định cơ chế sở hữu ví Studio. Phí rút MVP đề xuất bằng 0, cấu hình hạn mức trước nghiệm thu; đây là quyết định thiết kế mới, chưa phải quy tắc có sẵn trong code.

**Cách đọc tài liệu:** phần “Hiện có” có dẫn chứng file; tất cả class/field/endpoint trong phần “Bổ sung” là đề xuất cần code. Không lấy schema trong backlog cũ làm nguồn xác định DB hiện tại.

## 2. Bằng chứng từ code hiện tại

Các link dưới đây tính từ thư mục tài liệu này.

| Khu vực | Hiện có trong repository | Khoảng trống cần làm |
| --- | --- | --- |
| [PaymentController](../../../code/backend/core-api/src/main/java/com/makeup/platform/controller/payment/PaymentController.java) | GET gateways; POST create-intent; GET payment theo code, lấy user đăng nhập | Create-intent chưa nhận header Idempotency-Key; chưa có lịch sử payment phân trang qua controller |
| [PaymentGatewayServiceImpl](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/payment/impl/PaymentGatewayServiceImpl.java) | Tạo PENDING/NOT_POSTED; builder mặc định TOP_UP; kiểm tra chủ sở hữu khi đọc chi tiết | Không dùng idempotency/fingerprint đã có trong entity; gọi checkout trong transaction |
| [CreatePaymentIntentReq](../../../code/backend/core-api/src/main/java/com/makeup/platform/dto/request/payment/CreatePaymentIntentReq.java) | `amount >= 1000.00`, gatewayCode không rỗng | Chưa chặn phần lẻ VND/hạn mức tối đa; không áp quy tắc mới ngược lên booking cũ |
| [PaymentWebhookProcessorImpl](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/payment/impl/PaymentWebhookProcessorImpl.java) | Xác minh qua Strategy, khóa payment, so tiền, SUCCESS/FAILED; gọi xử lý cọc/final payment | Không có nhánh TOP_UP; ACK sớm mọi payment không PENDING; chưa so gateway callback với payment; catch lỗi posting trong transaction bao ngoài có nguy cơ rollback cả bằng chứng thu |
| [PaymentCallbackController](../../../code/backend/core-api/src/main/java/com/makeup/platform/controller/payment/PaymentCallbackController.java) | GET/POST IPN với hai alias; MoMo POST trả 204; backend tự render HTML return | Return gọi processor; query `resultCode=0`/`vnp_ResponseCode=00` có thể làm UI báo thành công; nội dung cố định “đặt cọc”, TOP_UP quay về app root |
| [PaymentGatewayStrategy](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/payment/gateway/PaymentGatewayStrategy.java) | `createCheckout`, `verifyAndParseCallback`, `callbackAcknowledgement`, `queryTransaction`, `normalizeAmount` | Không có method refund; result đang dùng boolean thành công, cần tách chưa rõ/thất bại chắc chắn |
| [MomoGatewayStrategy](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/payment/gateway/MomoGatewayStrategy.java) | Checkout captureWallet, chữ ký IPN, query theo orderId; số tiền làm tròn HALF_UP | requestId tạo mới mỗi create; queryRequestId trả qua cùng field gatewayRequestId; cần giữ request tạo gốc và query attempt riêng; lỗi query trả successful=false, không được hiểu là chắc chắn thất bại |
| [VnpayGatewayStrategy](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/payment/gateway/VnpayGatewayStrategy.java) | URL checkout; IPN HMAC; querydr kiểm chữ ký, merchant, ref, tiền, loại giao dịch; query timeout 5 giây | Query lấy vnp_CreateDate từ paymentUrl; phải giữ URL/thời điểm gốc khi retry; kiểm tra null URL có kiểm soát |
| [FinalPaymentSyncService](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/payment/impl/FinalPaymentSyncService.java) và [ReconciliationService](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/payment/impl/FinalPaymentReconciliationService.java) | Scheduler 30 giây, batch 100, cửa sổ 30 ngày, cursor; phục hồi BOOKING_FINAL_PAYMENT | Chưa phục hồi TOP_UP; query mạng trong transaction giữ khóa; không sao chép nguyên thiết kế này cho nạp |
| [WalletEntity](../../../code/backend/core-api/src/main/java/com/makeup/platform/entity/wallet/WalletEntity.java), [WalletRepository](../../../code/backend/core-api/src/main/java/com/makeup/platform/repository/wallet/WalletRepository.java) | available_balance, frozen_balance, currency, @Version; findByUserIdWithLock | Cần dùng khóa thống nhất cho mọi writer và tạo ví lần đầu an toàn khi cạnh tranh |
| [CustomerWalletServiceImpl](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/wallet/impl/CustomerWalletServiceImpl.java) | Tự tạo ví, đổi trạng thái hold/deposit và ghi frozen_balance ngay trong GET; lấy 20 ledger gần nhất | GET không thể tiếp tục sửa trạng thái tiền; tra mọi referenceId như booking gây nhầm với payment/withdrawal |
| [FreelancerWalletServiceImpl](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/wallet/impl/FreelancerWalletServiceImpl.java) | GET cũng sửa trạng thái hold/deposit; lấy 50 ledger; trả bookingDepositsHeld riêng | Tách cọc khách của booking khỏi frozen_balance thuộc ví thợ; lịch sử cũng đang tra mọi referenceId thành booking |
| [WalletHoldEntity](../../../code/backend/core-api/src/main/java/com/makeup/platform/entity/wallet/WalletHoldEntity.java), [WalletHoldRepository](../../../code/backend/core-api/src/main/java/com/makeup/platform/repository/wallet/WalletHoldRepository.java) | booking_id bắt buộc; query tổng hold join booking và lọc một số trạng thái booking | Chưa thể giữ tiền rút; tổng hold hiện tại bỏ qua hold không gắn booking và một số booking đang chờ |
| [LedgerEntryEntity](../../../code/backend/core-api/src/main/java/com/makeup/platform/entity/wallet/LedgerEntryEntity.java) | Một dòng gồm wallet, referenceType/id, DEBIT/CREDIT, amount, balanceAfter, unique idempotencyKey | Chưa có balance bucket/snapshot đầy đủ/journal đối ứng; comment “sổ cái kép” không chứng minh mọi luồng đã ghi đủ cặp |
| [BookingStateMachineServiceImpl](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/booking/impl/BookingStateMachineServiceImpl.java), method refundDepositToCustomer | Hoàn hold cọc về available, ghi BOOKING_REFUND; key refund:booking:{id} | Dùng findByUserId không khóa; kiểm key ledger sau khi cộng tiền; method không có @Transactional riêng; phải bảo đảm transaction qua mọi caller; `.max(0)` che thiếu frozen |
| [BookingDepositServiceImpl](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/payment/impl/BookingDepositServiceImpl.java), applyDepositFromPayment | Tạo hold cọc; payment cọc đến khi deposit EXPIRED được đánh REFUND_REQUIRED | Chưa có hoàn tiền qua gateway; guard deposit:apply:{id} khác key ghi thực tế :credit; payment thứ hai khi deposit PAID cần xử lý rõ, không chỉ APPLIED |
| [BookingSettlementServiceImpl](../../../code/backend/core-api/src/main/java/com/makeup/platform/service/wallet/impl/BookingSettlementServiceImpl.java) | Ghi thu nhập thợ, khóa ví thợ, consume hold; retryPendingSettlements chỉ log placeholder | Chuyển trách nhiệm cập nhật frozen của ví khách sang settlement vì GET sẽ không tự sửa nữa |
| [SecurityConfig](../../../code/backend/core-api/src/main/java/com/makeup/platform/config/SecurityConfig.java) | IPN/return public; /admin/** yêu cầu SUPER_ADMIN | Route rút/ngân hàng mới cần owner check và role phù hợp; không cho agency admin duyệt chi nền tảng |

**Migration là nguồn schema:** [payment foundation](../../../code/backend/core-api/src/main/resources/db/migration/V20260928163000__Init_Payment_Transactions_Module.sql), [wallet/deposit foundation](../../../code/backend/core-api/src/main/resources/db/migration/V20260930142000__Init_Deposit_And_Wallet_Foundation.sql), [purpose constraint](../../../code/backend/core-api/src/main/resources/db/migration/V20261001145200__Update_Payment_Purpose_Constraint.sql), [deposit compensation status](../../../code/backend/core-api/src/main/resources/db/migration/V20261004092500__Add_Compensated_To_Booking_Deposits_Status.sql).

- Có unique `(payment_gateway, gateway_transaction_id)`, `(payment_gateway, gateway_request_id)`, `(user_id, idempotency_key)`; có index payment SUCCESS chưa POSTED. Tái sử dụng, không tạo trùng.
- Chưa tìm thấy migration/entity/controller `user_bank_accounts`, `withdrawal_requests`, payout trong source backend được rà soát.
- Migration compensation mở rộng trạng thái **booking_deposits**, nhưng code GET ví ghi `COMPENSATED_TO_MUA` vào **wallet_holds** trong khi CHECK hold foundation chỉ có ACTIVE/CONSUMED/RELEASED/REFUNDED. Cần sửa mapping hold thành CONSUMED khi đã bồi thường, giữ lý do ở nghiệp vụ/ledger; không tùy tiện thêm trạng thái cho khớp một đoạn code.
- Chưa có bảng `transactions`, `wallet_transactions`, các cột `debit_wallet_id`/`credit_wallet_id` như backlog trước mô tả. Không dùng chúng làm tiền đề triển khai.

## 3. Thứ tự thực hiện

**A. Sửa nền ví và return → B. TOP_UP và phục hồi → C. rút thủ công → D. hoàn tiền/đối soát → E. nghiệm thu xuyên suốt.**

Một lần thay đổi chỉ mở rộng các package payment/wallet, repository, DTO, mapper, controller và Flyway hiện có. Tận dụng scheduler Spring, PostgreSQL và khóa repository; chưa cần hàng đợi dịch vụ riêng. Không xây lại settlement/cách tính hoa hồng, nhưng sửa các writer liên quan để số dư không phụ thuộc việc người dùng có mở màn ví hay không.

### A. Nền ví và dữ liệu lịch sử

1. Bổ sung `WalletMutationService` quản lý create-if-absent, khóa ví, credit/hold/release/consume. Unique user_id là lớp chống tạo hai ví; xử lý conflict ngoài transaction bị lỗi, không tiếp tục dùng transaction rollback-only.
2. Chuyển đổi hold và số dư ra khỏi hai GET wallet. `BookingDepositServiceImpl`, `BookingSettlementServiceImpl`, refund và compensation chịu trách nhiệm thay đổi trong transaction nghiệp vụ. GET có thể gọi bước bảo đảm ví tồn tại riêng khi user chưa có ví, nhưng không sửa trạng thái tiền.
3. Tổng frozen = tổng mọi hold ACTIVE của **ví sở hữu hold**, không lọc theo trạng thái booking để làm mất tiền đang giữ. Trạng thái nghiệp vụ phải chủ động consume/release hold. Query danh sách cọc đang thực hiện cho UI giữ tách biệt với query đối soát số dư.
4. Sửa lookup lịch sử theo referenceType: BOOKING_* mới resolve booking; TOP_UP resolve payment; WITHDRAWAL_* resolve withdrawal. Hai ID giống nhau ở hai bảng không được ghép chéo. Batch lookup để tránh mỗi dòng lại query DB.
5. Giữ ledger hiện tại làm nguồn sao kê. Bổ sung `balance_bucket` (AVAILABLE/FROZEN), `balance_before`, `available_after`, `frozen_after` nullable để tương thích dữ liệu cũ. Không suy ra lại balanceAfter lịch sử cũ vì ledger cọc/final payment có ý nghĩa khác nhau.
6. Dữ liệu mới: mỗi leg có key unique. Hold ghi DEBIT AVAILABLE + CREDIT FROZEN; release ghi ngược; thành công rút chỉ DEBIT FROZEN. UI gom các leg cùng thao tác thành một mục. Đây là sổ biến động bucket ví; không tuyên bố toàn hệ thống có double-entry accounting đầy đủ chỉ vì có DEBIT/CREDIT.
7. Trước migration nghiệp vụ, xuất báo cáo hold ACTIVE nhưng booking đã terminal, lệch frozen, ledger/key bất thường. Chỉ sửa theo bằng chứng giao dịch/settlement; không chạy backfill tự cộng tiền cho tất cả payment cũ hoặc đổi tất cả hold CANCELLED thành REFUNDED.

**Invariant:** available và frozen không âm; tổng tài sản ví chỉ tăng khi nạp/thu nhập/hoàn tiền hợp lệ, giảm khi thực chi; hold/release không đổi tổng. Mọi cập nhật balance + hold + ledger + trạng thái nghiệp vụ commit hoặc rollback cùng nhau. Thống nhất thứ tự khóa: payment/withdrawal hoặc booking/deposit → ví (ID tăng dần nếu nhiều ví) → hold; rà các caller cũ để không khóa ngược. Không giữ khóa khi gọi mạng.

### B. Nạp VNPay/MoMo đúng một lần

**B1 — Tạo intent**

- Giữ `POST /api/v1/payments/create-intent`, body `{amount, gatewayCode}`; bổ sung `Idempotency-Key`. Giữ min 1.000đ đã có; TOP_UP mới yêu cầu VND nguyên, max cấu hình không vượt precision DB. Không đổi normalizeAmount của booking cũ đang có test.
- Fingerprint gồm user, purpose TOP_UP, amount chuẩn hóa, gateway. Dùng unique/key repository hiện có: cùng key/cùng payload trả intent cũ; khác payload/purpose trả 409, kể cả key từng dùng cho booking.
- Transaction 1 lưu intent và định danh checkout ổn định rồi commit. Gọi checkout ngoài transaction. Transaction 2 lưu kết quả và checkout state dưới khóa, không ghi đè trạng thái tiền nếu callback đã đến.
- Đề xuất thêm checkout state `CREATING/READY/UNKNOWN/FAILED`, deepLink để replay response và thời điểm/query metadata cần thiết. MoMo lưu request tạo gốc trước gọi API; query attempt không ghi đè nó. VNPay giữ URL và vnp_CreateDate gốc.
- Timeout MoMo giữ intent và UNKNOWN; query bằng paymentCode cũ. Không mặc định tạo orderId khác hay tự retry gửi lệnh tạo liên tục. Nếu chưa xác định được checkout, API trả intent đang kiểm tra; client theo dõi mã đó.

**B2 — Tiếp nhận kết quả**

- Tách `PaymentConfirmationService` khỏi posting. Webhook và query gọi chung validator: gateway, paymentCode, định danh request theo loại create/query, merchant tại adapter, số tiền chuẩn hóa và transaction ID hợp lệ.
- Kiểm tra danh tính trước khi ACK payment đã xử lý. Không gán transaction ID rỗng/placeholder của giao dịch chưa thành công làm unique ID thanh toán.
- `GatewayPaymentResult` cần phân biệt SUCCESS, PENDING, FAILED chắc chắn, UNKNOWN; boolean false hiện tại không đủ kết luận timeout là thất bại. Việc ánh xạ mã từng cổng phải có test theo adapter hiện có; trạng thái không nhận diện được đi UNKNOWN/đối soát.
- Commit xác nhận SUCCESS và định danh giao dịch trong transaction ngắn **trước** posting. Có thể thêm bảng `payment_reconciliation_events` ghi nguồn IPN/QUERY, mã kết quả, thời điểm, payload hash và xử lý xung đột; không lưu secret. Payment là nguồn trạng thái bền vững, không cần broker để worker phục hồi.
- TOP_UP SUCCESS không bị callback FAILED muộn hạ trạng thái. SUCCESS tới sau trạng thái FAILED phải lưu dấu vết và query xác nhận trước áp dụng; không ACK rồi bỏ qua vĩnh viễn.

**B3 — Posting**

Bean mới `TopUpPostingService`: transaction khóa payment, chỉ xử lý purpose TOP_UP và SUCCESS; khóa/tạo ví; unique ledger key `topup:{paymentId}:available`; cộng amount vào available, ghi ledger reference TOP_UP/paymentId và snapshot; set walletPostingStatus=POSTED, walletPostedAt, applicationStatus=APPLIED, appliedAt; commit cùng lúc.

Đã POSTED thì no-op. Có ledger nhưng trạng thái/amount khác invariant thì chuyển đối soát, không cộng lại. Lỗi posting rollback riêng, payment SUCCESS vẫn còn; ghi lỗi/retry bằng transaction độc lập. Không dựa vào catch bên trong transaction bao ngoài để giữ bằng chứng.

**B4 — Mất callback, timeout và job phục hồi**

Thêm `TopUpReconciliationService`/scheduler theo mẫu FinalPaymentSyncService, nhưng chỉ chọn TOP_UP: (a) SUCCESS/NOT_POSTED để retry local posting; (b) PENDING/checkout UNKNOWN để queryTransaction. Snapshot ngoài khóa → query mạng → khóa lại/revalidate kết quả → confirmation → posting. Hai worker hoặc IPN+query cạnh tranh phải kết thúc với một posting.

Tái sử dụng index unposted; thêm retry_count, next_retry_at, last_error và index due nếu cần. Duyệt batch có giới hạn/backoff; payment quá số lần retry vẫn hiện trong hàng đợi admin. Không copy cửa sổ 30 ngày làm mất khả năng tìm payment chưa xử lý. Thời gian checkout hết hạn hoặc app đóng không tự chứng minh chưa thu tiền.

**B5 — Return và hiển thị**

Sửa `handleReturnCallback`: return không gọi processWebhook và không dùng query result code để xác nhận thành công. Public return chỉ hiển thị thông báo quay về app an toàn; trạng thái/chi tiết ví lấy qua API có owner check. Deep link theo purpose (TOP_UP về kết quả nạp, booking về booking); cấu hình host/scheme thay cho suy ra tùy ý từ Host header. Escape dữ liệu nếu còn render HTML.

PaymentDetailRes đã có status + walletPostingStatus: UI báo “Nạp thành công” chỉ với SUCCESS/POSTED; SUCCESS/NOT_POSTED là “Đã nhận thanh toán, đang cập nhật ví”. PENDING/UNKNOWN là đang kiểm tra. Không báo đặt cọc 30% cho TOP_UP.

### C. Rút tiền thủ công có đối soát

**C1 — Dữ liệu mới, chỉ bổ sung những bảng đang thiếu**

| Bảng / thay đổi | Trường và ràng buộc chính |
| --- | --- |
| `user_bank_accounts` (mới) | user_id, bank_code/name, account_number dạng chuỗi, account_holder_name, verification_status, verified_by/at, archived_at. Xác minh thủ công có ghi chú; không gọi là liên kết ngân hàng tự động |
| `withdrawal_requests` (mới) | wallet/user, bank_account_id, snapshot ngân hàng/số TK/chủ TK, amount, fee=0, net_amount, status, idempotency_key/fingerprint, version, created/approved/completed_at. Unique user+key; amount>0, net=amount−fee>0 |
| `wallet_holds` (mở rộng) | hold_type=BOOKING/WITHDRAWAL, withdrawal_request_id; booking_id nullable; CHECK đúng một nguồn; unique withdrawal_request_id; backfill hold cũ là BOOKING, giữ unique booking/deposit. Amount hiện NUMERIC(12,2), trong khi wallet NUMERIC(15,2): đồng bộ precision bằng migration hoặc giới hạn rút theo precision nhỏ hơn |
| `withdrawal_actions` (mới) | withdrawal_id, action, from/to state, actor, reason, action key, timestamp, bank reference và bằng chứng đối soát khi có; unique action key trong withdrawal |
| `withdrawal_transfers` (mới) | withdrawal_id unique trong MVP, operator, trạng thái SUBMITTED/UNKNOWN/CONFIRMED/NOT_SENT, source_bank_account_ref, bank_transaction_id, transferred_at, amount, destination snapshot, evidence_ref; unique bank reference theo ngân hàng/tài khoản nguồn khi đã có |

MVP một lần chuyển cho một withdrawal; nếu chắc chắn chưa chi và kết thúc FAILED, người dùng tạo yêu cầu mới. Không tạo transfer thứ hai khi lần đầu còn UNKNOWN. Lưu bằng chứng trong cơ chế lưu trữ của dự án sau khi xác định quyền đọc; có thể dùng mã tham chiếu sao kê và ghi chú để hoàn tất MVP, không bắt buộc tích hợp dịch vụ upload mới.

Người dùng nhập số tài khoản không làm tài khoản tự VERIFIED. SUPER_ADMIN kiểm tra, ghi người/thời điểm xác minh. Yêu cầu rút dùng snapshot bất biến; sửa/archive tài khoản sau đó không đổi đích chuyển của lệnh đang chạy.

**C2 — State machine và số dư**

| Từ → đến | Điều kiện | Số dư/hold |
| --- | --- | --- |
| tạo → REQUESTED | Chính chủ, ngân hàng VERIFIED, đủ available, hạn mức, idempotency | available−A; frozen+A; hold ACTIVE; ledger hold |
| REQUESTED → APPROVED | SUPER_ADMIN duyệt | Giữ nguyên hold |
| REQUESTED → REJECTED/CANCELLED | Admin từ chối / chủ ví hủy, chưa được duyệt | frozen−A; available+A; hold RELEASED; ledger release |
| APPROVED → PROCESSING | Admin claim xử lý dưới khóa trước khi mở app ngân hàng | Giữ hold; tạo transfer duy nhất |
| PROCESSING → TRANSFERRED | Admin nhập mã giao dịch, tiền, tài khoản và thời điểm sau khi chuyển | Chờ đối soát, chưa ghi SUCCESS |
| PROCESSING/TRANSFERRED → UNKNOWN | Mạng lỗi, không biết đã chuyển, thông tin chưa khớp | Giữ hold; không chuyển lại |
| TRANSFERRED/UNKNOWN → SUCCESS | Admin đối chiếu sao kê, đúng nguồn/đích/tiền/reference; xác nhận đúng một lần | frozen−A; hold CONSUMED; DEBIT FROZEN, không trừ available lần hai |
| PROCESSING/UNKNOWN → FAILED | Có bằng chứng chắc chắn chưa chi, không còn thao tác chuyển đang chạy | frozen−A; available+A; hold RELEASED |

Ghi đầy đủ trạng thái cuối khi retry. Cùng action key/payload trả kết quả cũ; payload khác 409. Cancel/approve/reject cạnh tranh chỉ một nhánh thắng. Không tự hủy PROCESSING hoặc mở hold vì quá thời gian chờ. Sau APPROVED không cho user hủy; admin phải nhận xử lý và chứng minh chưa chi mới kết thúc FAILED.

Ví dụ: available=500.000, frozen=0; rút 200.000 → 300.000/200.000; SUCCESS → 300.000/0; từ chối → 500.000/0. Nếu còn hold booking 100.000 thì không được đụng tới khoản đó.

**C3 — Quy trình vận hành**

SUPER_ADMIN duyệt → người phụ trách claim → chuyển khoản bằng ngân hàng ngoài hệ thống → ghi reference → đối chiếu sao kê → confirm. Dashboard phải hiện rõ ai đang xử lý để hai admin không cùng chuyển. Khi có nhiều admin, người đối soát nên khác người chuyển; đây là quy trình đề xuất, không giả định dự án đã có role kế toán riêng. Ảnh chuyển tiền riêng lẻ không đủ để kết luận đã chi; confirm cần reference và nội dung đối chiếu.

Manual transfer không cho phép code bảo đảm ngân hàng chỉ chuyển một lần; hệ thống bảo đảm claim/reference/ghi sổ không trùng và quy trình vận hành kiểm soát thao tác chuyển thật. Chuyển nhầm/trùng ngoài hệ thống đi vào xử lý sự cố, không sửa/xóa ledger để che lệch.

### D. Hoàn tiền bám theo nghiệp vụ hiện có

**D1 — Hoàn cọc booking về ví: nằm trong sprint.** Refactor `refundDepositToCustomer` sang bean transactional dùng WalletMutationService; khóa booking/deposit, ví và hold theo thứ tự thống nhất; kiểm nguồn thu/hold và operation key trước thay đổi; cập nhật hold/deposit/available/frozen/BOOKING_REFUND cùng transaction. Refund đồng thời với settlement/cancel/wallet GET chỉ một nhánh hợp lệ được áp dụng. Không dùng `.max(0)` để nuốt sai lệch: báo REVIEW_REQUIRED/đối soát và rollback nếu frozen thiếu. Kiểm mọi caller trong ScheduledBookingServiceImpl và BookingStateMachineServiceImpl.

**D2 — Trả tiền đang giữ của yêu cầu rút bị từ chối/hủy/thất bại chắc chắn: nằm trong sprint.** Đây là release hold, dùng key withdrawal:{id}:release, không ghi là nạp mới. UNKNOWN không đủ điều kiện release.

**D3 — Payment cọc đã thu nhưng chưa áp dụng (REFUND_REQUIRED hoặc trả thêm lần hai): cần xử lý trong sprint.** Code hiện chỉ đánh dấu/log, chưa có API refund gateway. Đề xuất admin xác minh giao dịch thành công, chưa có hold/settlement/posting/refund cho payment đó; credit vào available đúng một lần với key `payment-return:{paymentId}:available`, reference `PAYMENT_RETURN`, ghi lý do và người xử lý, walletPostingStatus=POSTED/applicationStatus=APPLIED. Không giảm frozen vì khoản này chưa vào hold. App phải nói rõ “hoàn về ví”. Payment thứ hai khi deposit đã PAID không được đánh APPLIED rồi bỏ tiền; chuyển vào hàng đợi REVIEW_REQUIRED và xử lý D3 khi đủ bằng chứng. Một dịch vụ posting kiểm tra chéo nguồn để TOP_UP/booking/refund không cùng credit một payment.

**D4 — Hoàn về nguồn VNPay/MoMo ban đầu:** chưa có method/adapter trong code, không coi đã được hỗ trợ và không đưa API refund cổng vào cam kết sprint này. Hoàn về ví và hoàn về ngân hàng là hai hành vi khác nhau; nếu người dùng muốn nhận tiền từ ví ra ngân hàng thì đi qua luồng withdrawal đã đối soát. Không tự động gọi API refund chưa tồn tại.

Với D3, lưu quyết định xử lý `RETURNED_TO_WALLET` trong bản ghi đối soát gắn payment. Posting booking và xử lý hoàn cùng khóa payment, kiểm quyết định này trước xử lý; applicationStatus=APPLIED tự nó không phân biệt đã áp dụng cọc với đã hoàn về ví. Khi chuyển đổi key/ledger refund cũ, kiểm key credit `refund:booking:{id}` trước cả hai leg; không bổ sung leg debit frozen cho khoản đã hoàn trước đó nếu không có bằng chứng snapshot tương ứng.

## 4. API và UI sẽ bổ sung

| API | Hiện trạng / công việc |
| --- | --- |
| GET `/api/v1/payments/gateways` | Đã có; UI lấy danh sách enabled |
| POST `/api/v1/payments/create-intent` | Đã có; bổ sung idempotency và trạng thái checkout |
| GET `/api/v1/payments/{paymentCode}` | Đã có owner check; mở rộng response purpose/expiresAt/checkout state nếu cần |
| GET `/api/v1/payments?purpose=TOP_UP&page=...` | Mới; lịch sử intent gồm cả pending/failed, không trộn với ledger chưa phát sinh |
| GET `/api/v1/customer/wallet`, `/api/v1/freelancer/wallet` | Đã có; sửa GET không thay đổi tiền, bổ sung withdrawalHeld/bookingHeld phù hợp |
| GET `/api/v1/wallets/transactions` | Mới; sao kê phân trang, owner từ JWT, map referenceType và gom leg |
| GET/POST `/api/v1/wallets/bank-accounts`; DELETE `/{id}` | Mới; ownership, validation, archive |
| GET/POST `/api/v1/wallets/withdrawals`; GET `/{id}`; POST `/{id}/cancel` | Mới; CUSTOMER/FREELANCE_MUA, idempotency và owner check |
| GET `/api/v1/admin/bank-accounts`; POST `/{id}/verify` hoặc `/{id}/reject` | Mới; SUPER_ADMIN, bằng chứng xác minh |
| GET `/api/v1/admin/withdrawals`; POST `/{id}/approve`, `/reject`, `/start`, `/record-transfer`, `/mark-unknown`, `/confirm`, `/fail` | Mới; SUPER_ADMIN, audit/action key/state/version |
| GET `/api/v1/admin/payment-reconciliation`; POST `/{paymentCode}/retry`, `/{paymentCode}/return-to-wallet` | Mới; retry gọi service chung; return-to-wallet chỉ trường hợp D3, không endpoint nhập số dư tùy ý |

Đường dẫn rút/ngân hàng là thiết kế mới, không tuyên bố đang có controller. Dùng BaseController/ApiResponse và i18n/error constants theo dự án. Mỗi endpoint cần phân quyền trên server dù UI đã ẩn nút.

**Mobile:** mở rộng [customer-wallet.tsx](../../../code/app/src/app/profile/customer-wallet.tsx), [freelancer-wallet.tsx](../../../code/app/src/app/profile/freelancer-wallet.tsx). [deposit.service.ts](../../../code/app/src/services/deposit.service.ts) hiện phục vụ cọc/final/cash và GET ví; thêm `wallet.service.ts`/`payment.service.ts` cho nghiệp vụ mới. Dùng paymentUrl/deepLink checkout đã có, đọc lại trạng thái khi quay về app, giữ Idempotency-Key qua retry. Tách lịch sử yêu cầu nạp/rút khỏi sao kê số dư đã ghi; không dùng optimistic update cộng/trừ tiền phía client.

**Web admin:** thêm `AdminWithdrawalsPage.jsx`, `AdminPaymentReconciliationPage.jsx`, mục xác minh ngân hàng và service dưới `code/frontend/src`; đăng ký trong [routes/index.jsx](../../../code/frontend/src/routes/index.jsx), menu/layout đang có. Hiện chưa thấy route payout/wallet trong file routes. Áp dụng SUPER_ADMIN giống AdminBookingController, không tạo role mới chỉ cho sprint này.

## 5. Công việc, phụ thuộc và đầu ra

| Mã kế hoạch / issue gốc | Công việc cụ thể | Phụ thuộc | Tiêu chí hoàn tất |
| --- | --- | --- | --- |
| S5-W01 / 22.2, 22.5 | Tách mutation khỏi GET; sửa hold query/status; cập nhật writer deposit/settlement/refund; báo cáo dữ liệu lệch | Đầu tiên | GET không đổi tiền; consume/release cập nhật frozen ngay; cọc thợ và số dư ví không trộn |
| S5-W02 / 22.3–22.4 | Migration snapshot/bucket; WalletMutationService; lịch sử theo referenceType, phân trang | W01 | Nạp/rút/booking có lịch sử đúng nguồn và snapshot, không nhầm ID |
| S5-W03 / 23.1–23.3 | Idempotent TOP_UP intent; checkpoint trước gọi cổng; requestId gốc/timeout; sửa return UI | W01 | Retry không tạo hai intent; return giả không báo thành công |
| S5-W04 / 23.1 | Confirmation/TopUpPostingService, query recovery và hàng đợi lỗi | W02, W03 | SUCCESS được giữ khi posting lỗi; nạp đúng một lần khi IPN/query đồng thời |
| S5-W05 / 24.2 | Bank account entity/migration/CRUD/admin xác minh/snapshot | W01 | Chỉ tài khoản của mình đã xác minh được dùng rút |
| S5-W06 / 24.3 | Withdrawal/transfer/actions migration, hold mở rộng, state machine | W02, W05 | Không vượt available, không release UNKNOWN, không trừ tiền hai lần |
| S5-W07 / 24.4 | Admin duyệt/claim/chuyển/đối soát; hàng đợi payment lỗi | W04, W06 | Audit và bank reference duy nhất; confirm có bằng chứng |
| S5-W08 / 22.5 | Harden BOOKING_REFUND; D3 payment chưa áp dụng; test refund/settlement race | W01, W02, W04 | Hoàn đúng nguồn, đúng một lần; trả thêm/cọc muộn không mất tiền |
| S5-W09 / 23.1, 24.1 | Mobile nạp/ngân hàng/rút/lịch sử/kết quả | Contract W03–W06 | App reopen/retry hiển thị trạng thái server, không fake thành công |
| S5-W10 / toàn sprint | Test tích hợp DB + regression + nghiệm thu E2E và runbook | W01–W09 | Ma trận mục 6 đạt; phân biệt fixture với giao dịch đối tác thật |

Không gắn ước lượng ngày công thành dữ kiện code. Cắt mốc nghiệm thu theo đầu ra: **M1 nạp + lịch sử + recovery (W01–W04, phần mobile/test)**; **M2 rút thủ công (W05–W07, phần mobile/test)**; **M3 hoàn tiền + nghiệm thu đồng thời (W08, W10)**. Chỉ mở rút sau khi các invariant hold/hoàn tiền liên quan đã đạt, kể cả công việc kiểm thử được chia theo mốc.

## 6. Kiểm thử dựa trên suite đang có

Đã đọc các test dưới [service/payment](../../../code/backend/core-api/src/test/java/com/makeup/platform/service/payment): `PaymentWebhookAmountTest` (đúng/sai/thiếu tiền), `FinalPaymentPostingTest`, `FinalPaymentSettlementTest` (retry không ghi lại), `FinalPaymentReconciliationServiceTest` (mất webhook, amount rounding, mismatch, retry posting, dữ liệu legacy). Đây là unit test dùng mock, chưa chứng minh khóa/unique/transaction hoạt động trên PostgreSQL.

[build.gradle](../../../code/backend/core-api/build.gradle) hiện Java 17, Spring Boot 3.3.4, starter-test và security-test; chưa khai báo Testcontainers. Khi triển khai W10, thêm Testcontainers PostgreSQL hoặc cấu hình DB test cô lập có migration thật. Không dùng H2 để kết luận đúng khóa/PostgreSQL constraint.

| Tình huống bắt buộc | Kết quả cần chứng minh |
| --- | --- |
| TOP_UP VNPAY/MOMO thành công | available tăng đúng số đã xác nhận; một ledger credit; POSTED; lịch sử hiển thị nạp |
| 10 callback giống nhau, callback + query + hai worker | Một lần cộng; unique cổng + ledger key giữ đúng; ACK vẫn phù hợp đường IPN hiện có |
| Callback sai chữ ký/gateway/merchant/amount/ref | Không đổi payment thành SUCCESS, không đổi ví |
| Gateway transaction ID dùng cho hai payment | DB chặn ghi nhận trùng; có lỗi đối soát, không credit payment thứ hai |
| Mất callback, app đóng | Scheduler queryTransaction phục hồi; không phụ thuộc mở màn hình |
| Query false/null/timeout hoặc checkout timeout | Không đánh FAILED chắc chắn, không hoàn/credit giả, giữ mã gốc để đối soát |
| DB lỗi khi ghi ledger sau SUCCESS | SUCCESS bền vững, posting rollback, job retry thành công một lần |
| Callback đến trước lưu checkout / đến muộn sau retry | Không ghi đè SUCCESS về PENDING, không phát sinh payment mới ngoài kiểm soát |
| Return có resultCode giả | Không mutate tiền, không báo nạp thành công từ query string |
| Cùng key/cùng payload và khác payload | Cùng tài nguyên; khác payload 409; kiểm cả key dùng ở purpose khác |
| Tạo ví đồng thời | Một wallet/user, không thất thoát credit |
| Hai rút cùng lúc / rút đồng thời refund, settlement, TOP_UP | Available không âm; tổng hold/snapshot nhất quán; không deadlock ngoài cơ chế retry giới hạn |
| GET customer/freelancer wallet khi đang rút | Không xóa/consume hold rút, không sửa tiền, không null-pointer booking |
| Approve/reject/cancel cạnh tranh, confirm lặp | Một transition; release/consume một lần; đủ audit |
| Đã chuyển, HTTP record-transfer/confirm timeout | Retry cùng key nhận kết quả cũ; không yêu cầu admin chuyển ngân hàng lại |
| Chuyển không rõ kết quả | UNKNOWN vẫn giữ tiền; cấm lần chuyển thứ hai, admin có thể tra/đối soát |
| Refund booking gọi 2 lần và đồng thời settlement | Hoàn về ví một lần; booking/deposit/hold/ledger nhất quán; không vừa trả thợ vừa hoàn khách |
| Hai payment cùng booking, cọc EXPIRED đã thu | Payment chưa áp dụng được đưa đối soát/D3; không mất tiền, không hold/hoàn hai lần |
| Refund với frozen thiếu hoặc hold đã consumed | Không clamp về 0 rồi cộng ví; rollback và báo đối soát |
| Payment ID = booking ID = withdrawal ID | Lịch sử đúng loại, không nhảy sang booking không liên quan |
| User khác/agency admin gọi API rút hoặc admin | 403/404 theo quy ước; không lộ tài khoản/số dư |
| Regression deposit/final/cash/compensation | Test hiện có vẫn đạt; full suite xác định lỗi mới so với baseline |

Lệnh dự kiến khi triển khai, chạy từ từng thư mục:

```powershell
# code/backend/core-api
.\gradlew.bat test --tests 'com.makeup.platform.service.payment.*'
.\gradlew.bat test
# code/app: test hiện hữu, thêm test nghiệp vụ mới theo cùng cơ chế
node --test tests/payment-notice.test.cjs
# code/frontend: scripts hiện có
npm run lint
npm run build
```

Các lệnh trên chưa được chạy trong lần lập kế hoạch này. Test backend mới đặt trong `service/payment`, `service/wallet` và test tích hợp controller/repository. Test frontend/mobile chỉ chọn công cụ đã có hoặc ghi rõ dependency bổ sung; không giả định package có sẵn Jest/Vitest. Khi code mobile, tuân thủ [AGENTS.md của app](../../../code/app/AGENTS.md) về đọc tài liệu đúng phiên bản Expo.

## 7. Nghiệm thu và vận hành

- [ ] Không còn phụ thuộc GET wallet để consume/refund hold hoặc sửa frozen.
- [ ] TOP_UP có luồng hoàn chỉnh cho cả hai adapter; posting và lịch sử nhất quán kể cả crash/retry.
- [ ] Callback public vẫn được xác minh; return chỉ hỗ trợ quay về app và đọc trạng thái có quyền.
- [ ] Rút thủ công có giữ tiền, phân quyền, claim, mã ngân hàng, audit, đối soát và UNKNOWN.
- [ ] Hoàn về ví được mô tả đúng trên UI; không tuyên bố hỗ trợ hoàn qua API cổng.
- [ ] Báo cáo lệch payment/ledger/hold/withdrawal và hướng xử lý có người chịu trách nhiệm.
- [ ] Đối soát payment SUCCESS/NOT_POSTED, REFUND_REQUIRED/REVIEW_REQUIRED, withdrawal TRANSFERRED/UNKNOWN mỗi ngày; tiền chi thực đối chiếu sao kê, số dư ví không được xem là bằng chứng tài khoản ngân hàng còn tiền.
- [ ] Có cấu hình dừng tạo nạp/rút mới nhưng vẫn nhận callback và phục hồi giao dịch cũ. Retry giới hạn rồi chuyển admin xử lý, không bỏ mất bản ghi.
- [ ] Chỉ ghi “E2E đối tác đạt” khi có kết quả môi trường đối tác thực sự; mock callback chỉ xác nhận logic phần mềm.

Tài liệu này thay thế kế hoạch VietQR trước đó và các giả định schema không khớp code trong backlog cũ. Các quyết định mới (hạn mức rút, phí, chứng từ xác minh) được ghi rõ là cấu hình/nghiệp vụ cần đặt khi triển khai; không gán chúng thành tính năng đã tồn tại.
