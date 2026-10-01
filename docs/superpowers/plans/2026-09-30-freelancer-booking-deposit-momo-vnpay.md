# Kế hoạch đặt cọc MoMo/VNPay và quyết toán đơn thợ tự do có thanh toán tiền mặt

Ngày: 2026-09-30. Trạng thái: kế hoạch đề xuất; chưa triển khai mã nguồn.

## 1. Phạm vi và quyết định mặc định

- Áp dụng cho thợ tự do (`FREELANCER_DIRECT`), cả `REALTIME_INSTANT` và `SCHEDULED`.
- Dùng chung payment/checkout/callback/ghi sổ; tách điều kiện được thanh toán, thời hạn và chuyển trạng thái theo loại booking.
- Cọc 30% tổng giá đã chốt; backend tính bằng BigDecimal và làm tròn HALF_UP tới đồng VND. Lưu số tiền tại thời điểm chốt giá, không tính lại khi callback về.
- Khách thanh toán trực tiếp cho đơn qua MoMo/VNPay, không bắt buộc nạp ví trước. Nội bộ vẫn ghi nhận tiền và khoản phong tỏa theo mô hình ví/sổ cái đã có trong tài liệu sprint 5.
- Đặt hẹn trước: giữ hành vi hiện tại, lịch trống được giữ khi tạo đơn và tự xác nhận sau khi cọc; không thêm bước thợ duyệt.
- Đề xuất đơn gấp có 5 phút thanh toán kể từ khi khách chốt giá; thời gian xem thợ/dịch vụ là thời hạn riêng. Đây là quy tắc đề xuất cần đồng bộ với các bộ đếm hiện có, không khẳng định backend đã hỗ trợ.
- Đặt hẹn trước giữ chỗ 15 phút kể từ lúc tạo booking. Thử lại/đổi cổng không gia hạn booking.
- Bổ sung phạm vi: khách trả phần còn lại bằng tiền mặt trực tiếp cho thợ và quyết toán khoản cọc vào ví thợ theo mục 10. Cọc vẫn bắt buộc qua MoMo/VNPay; không phải phương án trả toàn bộ đơn bằng tiền mặt. Thu phần còn lại online, rút tiền ngân hàng và luồng agency chưa nằm trong đợt này. Phải có cơ chế ghi nhận/đối soát/hoàn tiền ngoại lệ trước khi chạy tiền thật.

## 2. Hiện trạng đã kiểm tra

| Thành phần | Hiện trạng | Việc cần làm |
|---|---|---|
| PaymentGatewayServiceImpl | Tạo checkout từ amount do request gửi, chưa liên kết booking | Thêm intent chuyên biệt cho cọc, số tiền lấy từ backend |
| PaymentTransactionEntity | Có cổng, số tiền, trạng thái và walletPostingStatus | Thêm booking, mục đích, khóa chống lặp và trạng thái áp dụng nghiệp vụ |
| PaymentWebhookProcessorImpl | Xác thực qua strategy, khóa transaction, đối chiếu amount nếu có, ghi SUCCESS/FAILED | Kiểm tra đủ dữ liệu; lưu sự kiện bền vững và xử lý cọc |
| ScheduledBookingServiceImpl | Check slot có buffer 30 phút, giữ lịch 15 phút, cọc 30%, PENDING_DEPOSIT → ACCEPTED | Thay xác nhận cọc trực tiếp bằng kết quả thu tiền đã xác thực |
| CustomerInstantBookingServiceImpl | confirmDeposit nhận addOnTotal từ client, đặt cờ Redis 7 ngày, phát WebSocket | Chốt add-on và giá ở backend; lưu paid trong DB; chỉ phát sau ghi sổ thành công |
| BookingStateMachineServiceImpl | isDepositPaid còn dựa vào Redis/trạng thái booking | Đọc bản ghi cọc bền vững; chặn bắt đầu di chuyển nếu chưa cọc |
| App đặt hẹn | POST /customer/bookings, payload providerId/providerType/bookingTime | Đổi sang /customer/bookings/scheduled và ánh xạ đúng DTO backend |
| App đặt gấp | Có màn xác nhận cọc giả lập tại instant-matched/[id].tsx | Dùng màn checkout chung và trạng thái từ backend |
| Gateway strategy | Cả hai đang trả hạn checkout khoảng 15 phút | Nhận hạn từ booking; kiểm tra giới hạn thực tế của từng cổng |
| Ví/sổ cái | Có đặc tả sprint 5; chưa tìm thấy implementation ví/ledger trong lượt rà soát này | Xây phần tối thiểu phục vụ ghi nhận và phong tỏa cọc trước khi bật thu tiền thật |

Tệp trọng tâm nằm trong `code/backend/core-api/src/main/java/com/makeup/platform/` và `code/app/src/`. Kế hoạch phải rà soát lại nhánh triển khai để tránh ghi đè thay đổi đang làm.

## 3. Luồng nghiệp vụ

### Đơn hẹn trước

1. Khách chọn thợ, gói, add-on, thời gian và địa chỉ.
2. Backend kiểm tra chủ sở hữu gói/add-on, lịch trống, giá; tạo SCHEDULED/PENDING_DEPOSIT và giữ lịch 15 phút.
3. App mở màn đặt cọc; khách chọn MOMO hoặc VNPAY.
4. Backend tạo payment gắn booking; trả checkout và thời hạn.
5. Cổng gửi IPN hợp lệ; backend lưu kết quả thu tiền rồi áp dụng cọc đúng một lần.
6. Ghi sổ và phong tỏa đúng booking thành công → deposit PAID, booking ACCEPTED, giữ lịch và thông báo khách/thợ.
7. Quá hạn chưa có cọc hợp lệ → hủy và giải phóng lịch. Callback thu tiền đến sau hủy được ghi nhận để hoàn/đối soát, không tự khôi phục lịch.

### Đơn gấp

1. Tìm thợ và thợ nhận đơn như hiện tại; booking ACCEPTED chưa đồng nghĩa đã cọc.
2. Khách chốt dịch vụ và add-on; backend tính giá từ ID dịch vụ, khóa phiên bản giá và lập thời hạn cọc.
3. Khách chọn cổng và dùng checkout chung.
4. Sau IPN + ghi sổ/phong tỏa thành công: deposit PAID, giữ booking ACCEPTED, thông báo thợ; cho phép thao tác ON_THE_WAY.
5. Không tự động chuyển ON_THE_WAY khi thanh toán; thợ vẫn chủ động bấm bắt đầu di chuyển.
6. Chưa cọc và hết hạn → hủy, giải phóng thợ/tài nguyên dispatch theo logic booking. Không dùng timeout tìm thợ làm timeout thanh toán.

Trạng thái booking, trạng thái thu tiền và trạng thái áp dụng cọc là ba thông tin riêng. ACCEPTED của đơn gấp không chứng minh khách đã trả tiền.

## 4. Dữ liệu và API đề xuất

### Dữ liệu

- `payment_transactions`: bổ sung nullable booking_id để không phá giao dịch cũ, purpose (BOOKING_DEPOSIT; giao dịch cũ phân loại rõ), idempotency_key, request_fingerprint, pricing_version, application_status (PENDING/APPLIED/REFUND_REQUIRED/REVIEW_REQUIRED), application_error và applied_at.
- Phân biệt gateway status với application_status và wallet_posting_status. Cổng thu thành công nhưng ghi sổ lỗi vẫn phải giữ SUCCESS và retry; không đổi thành FAILED.
- `booking_deposits`: một nghĩa vụ cọc/booking, unique booking_id, required_amount, paid_amount, status (UNPAID/PENDING/PAID/EXPIRED/REFUND_PENDING/REFUNDED), payment_id đã được áp dụng, paid_at, expires_at, pricing_version. Một nghĩa vụ có thể có nhiều lần thử payment nhưng chỉ một lần áp dụng cọc.
- Thêm inbox/outbox bền vững và chỉ mục phục vụ retry/đối soát. Khóa duy nhất theo mã payment/source transaction để chống ghi sổ lặp.
- Phần ví theo đặc tả sprint 5: wallets, transactions, ledger_entries, wallet_transactions, wallet_holds. Giữ tiền theo booking; không cộng thẳng số dư có thể rút của thợ.
- Không đánh dấu dữ liệu lịch sử đã trả chỉ vì booking ACCEPTED. Chuyển đổi dựa trên bằng chứng thanh toán, dữ liệu demo phải được phân biệt.

### API

| API | Mục đích |
|---|---|
| POST /api/v1/customer/bookings/scheduled | Tạo đơn hẹn trước theo DTO hiện tại |
| POST /api/v1/customer/bookings/{id}/deposit-intents | Tạo/lấy lại checkout cọc; body gatewayCode, pricingVersion; header Idempotency-Key |
| GET /api/v1/customer/bookings/{id}/deposit | Trạng thái nghĩa vụ cọc, số tiền, hạn, payment hiện hành, trạng thái xử lý |
| GET /api/v1/payments/gateways | Tái sử dụng danh sách cổng |
| GET /api/v1/payments/{paymentCode} | Tái sử dụng tra cứu payment của chủ sở hữu |
| Các IPN hiện tại | Tái sử dụng, chuẩn hóa kết quả và phản hồi từng cổng |

Đơn gấp cần thao tác chốt giá trước tạo intent: tái sử dụng API phù hợp nếu có, hoặc thêm endpoint quote/confirm có phiên bản. Không đưa amount/addOnTotal do client tự tính vào hợp đồng cọc.

Tạo intent phải kiểm tra người dùng là chủ booking, đúng FREELANCER_DIRECT, trạng thái hợp lệ, chưa cọc, còn hạn, giá khớp phiên bản. Kiểm tra thợ/gói vẫn phù hợp khi tạo booking và chốt giá. Cùng idempotency key + cùng payload trả cùng kết quả; khác payload trả conflict. Khóa booking/nghĩa vụ cọc khi tạo intent để ngăn hai thiết bị tạo cạnh tranh.

Giá và add-on không được sửa trong khi checkout còn có thể thu tiền. Đổi giá hoặc đổi cổng phải có vòng đời lần thử rõ ràng; giao dịch cũ thu thành công sau đó vẫn phải được ghi nhận và xử lý tiền dư. MVP ưu tiên dùng lại checkout đang chờ; chỉ cho tạo lần thử mới khi lần cũ đã thất bại/hết hạn được xác định.

Hai API xác nhận cọc trực tiếp (`/{id}/deposit`, `/{id}/confirm-deposit`) không được phép ghi paid từ thao tác khách nữa. Gỡ hoặc trả lỗi hướng sang checkout; cập nhật cả caller web nếu còn. Không để đường giả lập hoạt động trên production.

## 5. Xử lý callback, ghi sổ và cạnh tranh

1. Adapter kiểm tra chữ ký, merchant/partner, gateway khớp giao dịch, mã tham chiếu, currency khi có và amount bắt buộc; chuẩn hóa đơn vị tiền riêng cho từng cổng. Kết quả được phân loại SUCCESS/FAILED/PENDING/UNKNOWN khi cần, không quy mọi mã chưa thành công thành thất bại cuối cùng.
2. Lưu kết quả xác thực và sự kiện xử lý vào DB trong transaction ngắn; trả ACK đúng giao thức. Callback lặp/đến sai thứ tự không được làm giảm trạng thái thành công hoặc ghi tiền hai lần. Kết quả mâu thuẫn phải được query/đối soát.
3. Worker xử lý theo khóa nhất quán giữa booking/deposit/payment và ví (ví theo ID tăng dần); cùng thứ tự với hủy và scheduler. Rà soát transaction boundary/commit của việc giữ lịch, không chỉ dựa vào Redis lock.
4. Booking còn hợp lệ, payment đúng giá và chưa áp dụng: ghi nhận tiền từ GATEWAY_CLEARING_WALLET sang ví khách rồi tạo hold cho booking, cập nhật deposit và booking trong cùng DB transaction. Không tạo chuyển khoản giả giữa hai ví để mô tả FREEZE; giữ đúng mô hình sprint 5.
5. Nếu ghi sổ lỗi: rollback phần áp dụng, giữ bằng chứng cổng đã thu, retry có giới hạn và đưa vào danh sách cần đối soát. App hiển thị “Đã nhận thanh toán, đang xác nhận lịch”, chưa báo đặt cọc hoàn tất.
6. Commit thành công mới phát WebSocket/notification qua outbox; mất kết nối app vẫn lấy lại được kết quả bằng GET.
7. Tiền đã thu nhưng booking hết hạn/hủy hoặc đã có payment khác áp dụng: không xác nhận booking lần nữa, không chi tiêu/giữ cọc hai lần; ghi nhận khoản cần hoàn với đối ứng sổ cái riêng và mã nguồn payment duy nhất.

Không gọi HTTP cổng thanh toán trong lúc giữ DB lock dài: lưu intent với khóa chống lặp, gọi cổng bên ngoài transaction, rồi lưu kết quả. Nếu lỗi mạng sau khi cổng có thể đã nhận request, giữ trạng thái chưa rõ và query theo mã tham chiếu; không tạo mã mới mù quáng.

### Thời hạn và callback muộn

- Backend quản lý deadline; bộ đếm app chỉ hiển thị theo server time. Hạn checkout không kéo dài quyền giữ booking; cấu hình hạn cổng nếu API hỗ trợ.
- Adapter MoMo hiện tính expiresAt cục bộ: phải xác minh hạn thực tế của checkout, không coi timestamp trả app là bằng chứng link đã vô hiệu.
- Scheduler khóa cùng booking với processor; khi đã có SUCCESS chờ áp dụng trước hạn thì ưu tiên xử lý/review, không hủy chỉ vì worker chậm.
- Nếu chưa biết kết quả mà deadline đã hết, mặc định hủy và trả tài nguyên. Payment thành công được biết sau khi hủy đi vào hoàn tiền/đối soát, kể cả timestamp thu tiền trước deadline. Chính sách này ưu tiên tránh xác nhận lại khung giờ đã cấp cho người khác.
- Worker query giao dịch pending/unknown quá ngưỡng và SUCCESS chưa áp dụng; không phụ thuộc hoàn toàn vào IPN.
- Hoàn tiền cần tracking trạng thái, chống lặp và bằng chứng kết quả. Có thể làm vận hành thủ công có audit ở MVP; không được đánh dấu REFUNDED chỉ vì đã gửi yêu cầu. Hủy sau cọc theo chính sách hủy hiện có; chưa tự suy diễn mọi hủy đều hoàn 100%.

## 6. Thay đổi app

- Thêm payment service và màn đặt cọc dùng chung theo bookingId; hiển thị tổng tiền, cọc 30%, phần còn lại, MoMo/VNPay và thời gian còn lại.
- Scheduled: sửa service/store ánh xạ package_id, mua_id, booking_partner=FREELANCER_DIRECT, booking_date, start_time, addon_item_ids và các field địa chỉ theo DTO/API serialization thực tế. Kiểm tra interceptor trước khi thêm chuyển đổi snake_case. Sau tạo đơn đi tới màn cọc, không báo đã xác nhận lịch ngay.
- Instant: giữ màn xem thợ/add-on; thay nút giả lập bằng chốt giá và checkout. Không gửi số tiền add-on tự tính làm nguồn giá.
- Mở checkout bằng cơ chế browser/deep link phù hợp app; khi quay về/resume tải lại trạng thái từ backend. Không tin query parameter trên return URL làm bằng chứng paid.
- Hỗ trợ đang thanh toán, đang xác nhận, thành công, thất bại/thử lại, hết hạn, cần hoàn tiền và mất mạng. Đóng trang checkout không đồng nghĩa thất bại.
- Lịch hẹn có mục chờ cọc và nút tiếp tục khi còn hạn. Màn thợ lấy isDepositPaid từ DB và chỉ bật di chuyển khi backend cho phép; WebSocket giúp cập nhật nhanh, không là nguồn sự thật duy nhất.
- Trước khi viết code app, đọc hướng dẫn Expo v57 theo `code/app/AGENTS.md`.

## 7. Các mốc triển khai

| Mốc | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 1. Hợp đồng và dữ liệu | Migration, deposit model, trạng thái, API DTO, quy tắc timeout/làm tròn, phân loại dữ liệu cũ | Contract rõ cho cả hai loại booking, migration tương thích |
| 2. Ghi sổ tối thiểu | Ví, ledger, hold theo booking, nguồn clearing, idempotency và retry | Ghi nhận/phong tỏa đúng một lần; rollback không làm mất dấu tiền |
| 3. Backend cọc dùng chung | Intent, chốt giá, adapter, IPN inbox, worker, outbox, scheduler và query đối soát | Hai cổng dùng cùng nghiệp vụ, không còn paid từ client/Redis |
| 4. Đơn hẹn trước | Nối endpoint/payload, checkout, giữ/nhả lịch, thông báo | Sandbox hoàn chỉnh cho MoMo và VNPay |
| 5. Đơn gấp | Nối chốt giá/checkout, deadline, gating di chuyển và thông báo | Sandbox hoàn chỉnh, chưa paid không thể bắt đầu di chuyển |
| 6. Ngoại lệ và phát hành | Refund/review, kiểm thử cạnh tranh, runbook, feature flag, loại bỏ giả lập | Đủ tiêu chí nghiệm thu bên dưới trước khi bật production |

Mốc 1–3 là nền chung; hoàn thiện và kiểm chứng đơn hẹn trước trước, rồi nối đơn gấp. Không nhân đôi tích hợp MoMo/VNPay theo loại đơn.

## 8. Kiểm thử và tiêu chí nghiệm thu

- Ma trận 2 loại booking × 2 cổng: tạo đơn, trả đúng cọc, ghi sổ/hold đúng, app và thợ thấy đúng trạng thái.
- Chữ ký giả, sai merchant/gateway/amount/currency, payment không tồn tại và truy cập đơn người khác không làm cập nhật paid.
- Callback lặp, hai worker đồng thời, hai thiết bị tạo intent, hai payment cùng thu thành công: một cọc được áp dụng; khoản dư có hồ sơ hoàn tiền.
- Thử lại cùng key; lỗi checkout trước/sau cổng tiếp nhận; timeout HTTP; callback trước return/return trước callback; app đóng/mất mạng rồi mở lại.
- Scheduler chạy đồng thời callback và hủy; callback thành công muộn sau slot được người khác đặt; không có hai đơn chiếm cùng slot vì tự phục hồi booking.
- Backend restart hoặc Redis mất dữ liệu vẫn biết đã cọc; mất WebSocket vẫn đọc đúng từ DB.
- Ghi sổ lỗi, worker crash trước/sau commit, phát notification lỗi: retry không nhân đôi bút toán/hold và không đánh mất payment SUCCESS.
- Add-on ID không thuộc gói, client sửa amount, phiên bản giá cũ và sai làm tròn bị chặn hoặc báo chốt lại giá; tổng cọc khớp số cổng thu.
- API xác nhận giả lập không thể ghi nhận paid; thợ chưa cọc không thể gọi trực tiếp API chuyển ON_THE_WAY.
- Kiểm tra migration trên dữ liệu cũ, contract app/backend, unit test quy tắc, integration test với DB thật cho locking/uniqueness và sandbox E2E. Không chỉ mock test cho tranh chấp giao dịch.
- Có truy vấn/vận hành cho SUCCESS chưa áp dụng, payment UNKNOWN quá lâu, khoản cần hoàn; kiểm tra tổng nghĩa vụ tiền, hold và sổ cái khớp.

Hoàn thành khi mỗi giao dịch thu tiền đều có kết quả rõ ràng: áp dụng cọc đúng booking đúng một lần, hoặc được theo dõi xử lý/hoàn tiền; app không thể tự xác nhận paid. Chỉ hoàn thành kế hoạch và test sandbox chưa đồng nghĩa được phép bật tiền thật.

## 9. Ví và lịch sử giao dịch phía thợ (bổ sung theo trao đổi)

### Tiền cọc nằm ở đâu

- Tiền thực tế được cổng thu và đối soát về tài khoản merchant theo cấu hình/hợp đồng cổng; IPN thành công không chứng minh tiền đã về tài khoản ngân hàng thợ.
- Theo mô hình kế toán của kế hoạch này, tiền được ghi nhận vào ví khách rồi phong tỏa bằng wallet_hold gắn booking. Thợ có thể thấy khoản đó ở mục “Cọc khách đang được giữ cho đơn”, nhưng nó không phải số dư khả dụng hay frozen_balance thuộc ví thợ.
- Không ghi cùng khoản cọc thành số dư tài sản của cả khách và thợ. Dashboard thợ đọc projection từ các hold/booking mà thợ được chỉ định; không cộng projection này vào tổng số dư ví thợ.
- Chỉ khi đủ điều kiện quyết toán mới ghi có ví thợ theo số tiền thực còn được nhận và chính sách hoa hồng. Quyết toán khi phần còn lại trả tiền mặt được bổ sung tại mục 10; không ghi có toàn bộ giá trị đơn khi mới thu 30%.
- Nếu sản phẩm muốn chuyển quyền sở hữu cọc sang ví thợ ngay khi thu thì phải thay đổi mô hình kế toán, hoàn tiền và thu hồi trước khi triển khai. Kế hoạch hiện tại chọn giữ cọc theo đơn, chưa cho thợ rút.

### Màn hình thợ và API bắt buộc trong phạm vi cọc

Thêm trang “Ví & giao dịch” cho thợ với các mục phân biệt rõ:

1. Số dư khả dụng của ví thợ, số dư phong tỏa thuộc ví thợ nếu có; chỉ lấy từ sổ cái thực tế.
2. Cọc khách đang được giữ cho các đơn của thợ: tổng và danh sách theo booking, ghi rõ chưa thể rút và không phải thu nhập thực nhận.
3. Lịch sử cọc theo đơn: đã nhận cọc, đang hoàn, hoàn thành, hoàn thất bại/chờ xử lý; đây là lịch sử tiền của đơn, không phải mọi dòng đều là biến động ví thợ.
4. Lịch sử biến động ví thợ: chỉ các bút toán thực ảnh hưởng ví thợ. Có thể chưa có dòng nếu chưa triển khai giải ngân.

API đề xuất (đều trong /api/v1, xác thực FREELANCER và giới hạn dữ liệu theo thợ hiện tại):

| API | Dữ liệu |
|---|---|
| GET /freelancer/wallet | availableBalance, frozenBalance, bookingDepositsHeld, currency; không cộng trùng khoản giữ theo đơn |
| GET /freelancer/wallet/transactions | Lịch sử biến động ví thực, phân trang cursor, lọc thời gian/loại/trạng thái/booking |
| GET /freelancer/bookings/{bookingId}/payment-history | Lịch sử cọc/hoàn của đơn thuộc thợ, số tiền, trạng thái, mốc thời gian, lý do hoàn được phép xem |
| GET /freelancer/booking-deposits | Danh sách cọc theo đơn, phân trang và lọc trạng thái/ngày; dùng cho mục cọc đang giữ và lịch sử hoàn |

Chi tiết giao dịch có mã tham chiếu công khai, bookingCode, loại sự kiện, amount, currency, status, createdAt/completedAt và liên kết giao dịch gốc khi hoàn. Chỉ trả số dư trước/sau cho biến động ví thực. Không trả chữ ký callback, bí mật cổng hoặc dữ liệu tài khoản thanh toán của khách cho thợ.

### Khi hoàn cọc

- Thợ không phải chuyển tiền thủ công nếu cọc vẫn do hệ thống giữ và chưa giải ngân. Backend thực hiện quy trình hoàn và đối soát; thợ nhận thông báo và xem lịch sử.
- Khi chấp thuận hoàn: ghi refund request liên kết payment gốc, số tiền được hoàn, lý do và chính sách áp dụng. Cập nhật REFUND_PENDING; phong tỏa khoản cần hoàn, không vừa mở cho khách chi tiêu vừa hoàn qua cổng.
- Chỉ ghi REFUNDED sau bằng chứng hoàn thành được xác thực/query/đối soát. Ghi bút toán đảo/hoàn đúng nguồn, cập nhật hold và số cọc đang giữ; không xóa giao dịch cọc ban đầu.
- Thông báo khách và thợ sau commit. Nếu hoàn lỗi, giữ trạng thái chờ xử lý/thất bại có retry; không báo đã hoàn và không bắt thợ tự hoàn thêm.
- Lịch và trạng thái booking được xử lý theo quyết định hủy, không đợi tiền hoàn về mới giải phóng lịch/thợ. Hoàn tiền không tự khôi phục hoặc hoàn thành booking.
- Nếu tiền đã được giải ngân cho thợ thì phải dùng quy trình thu hồi/bù trừ riêng; không áp dụng logic hoàn cọc chưa giải ngân một cách mặc định. Mục 10 phân biệt hoàn trước và sau quyết toán.
- Nếu thợ gây hủy, lý do/bằng chứng và ảnh hưởng tài khoản theo chính sách hủy là quy trình riêng; việc hoàn tiền thành công không tự xóa trách nhiệm này.

### Bổ sung mốc và nghiệm thu

- Mốc 2–3: API số dư/lịch sử, refund record và projection cọc của thợ.
- Mốc 4–5: trang Ví & giao dịch, chi tiết lịch sử cọc, thông báo hoàn cho thợ; dùng chung cho đơn gấp/hẹn trước.
- Mốc 6: kiểm thử quyền truy cập giữa hai thợ; phân trang ổn định; cọc/hoàn lặp không nhân đôi số tiền; tổng cọc đang giữ giảm đúng khi hoàn thành; hoàn lỗi không ghi là hoàn xong; biến động ví không lẫn lịch sử khoản giữ thuộc khách.

## 10. Khách thanh toán phần còn lại bằng tiền mặt

### Phạm vi và nguồn giá

- Áp dụng cho cả đơn gấp và hẹn trước: cọc online trước, trả phần còn lại bằng tiền mặt khi hoàn thành dịch vụ. Chọn `remaining_payment_method=CASH` trước lúc chốt thanh toán cuối; lưu lịch sử thay đổi.
- Phần còn lại do backend tính từ hóa đơn cuối cùng và các khoản đã trả hợp lệ. Không mặc định luôn là 70% nếu đã có điều chỉnh được hai bên chấp thuận. MVP khóa giá sau cọc; phát sinh ngoài hóa đơn phải xử lý bằng quy trình điều chỉnh riêng, không để client tự tăng số phải thu.
- Snapshot chính sách hoa hồng và cơ sở tính phí khi chốt đơn; không lấy cấu hình Redis mới nhất lúc quyết toán làm thay đổi thu nhập đã chốt.
- Code hiện tính phí trên `serviceSubtotal`; `distanceFee` và `surchargeFee` được cộng vào thu nhập thợ. Giữ cơ sở này khi chưa thay đổi chính sách. Nếu có voucher/discount, phải xác định bên chịu chi phí và tính earnings phía backend trước khi cho quyết toán; chưa có quy tắc thì chặn trường hợp đó để xử lý, không suy diễn.

### Luồng xác nhận tiền mặt

1. Dịch vụ hoàn tất và có bằng chứng nghiệm thu theo luồng hiện tại. Hiển thị hóa đơn cuối, cọc đã trả và “Cần trả tiền mặt cho thợ”. Hoàn tất dịch vụ chưa đồng nghĩa hoàn tất thanh toán.
2. Khách bấm “Đã trả tiền mặt”; thợ bấm “Đã nhận đủ tiền mặt”. Hai xác nhận độc lập, có actor/time và phiên bản hóa đơn; không để một bên xác nhận thay bên kia.
3. Một bên chưa xác nhận: giữ trạng thái chờ xác nhận tiền mặt, chưa giải ngân cọc. Cho phép thao tác theo bất kỳ thứ tự nào nhưng cả hai phải khớp cùng số tiền/phiên bản.
4. Đủ hai xác nhận, đơn đã nghiệm thu, không có tranh chấp/hủy/hoàn đang chờ: chạy quyết toán đúng một lần. Khóa booking, settlement và các ví theo thứ tự thống nhất.
5. Một bên phản đối/khai nhận thiếu tiền: chuyển DISPUTED, giữ cọc và đưa vào xử lý hỗ trợ có audit. MVP không tự giải ngân chỉ vì một bên im lặng hoặc hết bộ đếm; bổ sung hàng đợi/nhắc việc vận hành để tránh treo vô hạn.

### Cách tính tiền cộng vào ví thợ

Ký hiệu cho đơn không giảm giá/điều chỉnh:

- T: tổng hóa đơn cuối.
- D: tiền cọc hệ thống đang giữ.
- C: tiền mặt khách đã trả trực tiếp cho thợ, C = T - D.
- F: phí nền tảng theo snapshot chính sách.
- E: tổng thu nhập thợ được hưởng, E = T - F.
- N: phần còn phải trả thợ qua ví, N = E - C = D - F.

Ví dụ tổng 1.000.000đ, toàn bộ là giá dịch vụ, phí 20%:

| Khoản | Số tiền |
|---|---:|
| Cọc online D | 300.000đ |
| Khách trả tiền mặt C | 700.000đ |
| Phí nền tảng F | 200.000đ |
| Tổng thu nhập thợ E | 800.000đ |
| Cộng vào ví thợ N | 100.000đ |

Thợ nhận tổng 700.000đ tiền mặt + 100.000đ ví = 800.000đ. Không cộng 800.000đ vào ví nữa và không thu phí 200.000đ lần thứ hai.

- N > 0: từ cọc, phân bổ N vào ví thợ và F vào ví nền tảng; đánh dấu hold CONSUMED.
- N = 0: toàn bộ cọc bù phí; không ghi bút toán ví thợ giá trị 0 như một khoản thu nhập mới.
- N < 0: cọc không đủ phí. Dùng D bù một phần phí; phần thiếu F-D thu từ số dư khả dụng của thợ nếu chính sách và số dư cho phép. Nếu không đủ, trạng thái PENDING_FEE_COLLECTION, ghi nghĩa vụ phải trả bền vững và đưa vào đối soát; không tự tạo tiền hoặc cho ví âm không kiểm soát. Chỉ SETTLED khi phí được xử lý đủ. Bù trừ với thu nhập tương lai phải có lịch sử và chính sách rõ, không tự trừ khoản không liên quan trong MVP.
- Đơn có discount/subsidy phải dùng bảng phân bổ nguồn tài trợ đã chốt; công thức D-F chỉ dùng khi T=E+F và không có nguồn tài trợ khác.

### Ghi sổ và hiển thị ví

- Tiền mặt là khoản khách/thợ xác nhận đã trao bên ngoài nền tảng; lưu `cash_receipt`, không giả lập payment MoMo/VNPay SUCCESS, không cộng C vào ví khách/thợ và không đi qua GATEWAY_CLEARING_WALLET.
- Settlement lưu T/D/C/F/E/N và nguồn chính sách. Trong cùng transaction, tiêu thụ hold và chuyển đúng phần tiền hệ thống đang nắm; tổng phân bổ phải bằng nguồn thực được sử dụng.
- Unique settlement theo booking/phiên bản quyết toán, unique source cho từng bút toán; retry/crash không cộng ví hoặc thu phí hai lần. Không sửa/xóa lịch sử khi điều chỉnh: dùng bút toán đảo có liên kết.
- Tách `service_status`, `cash_receipt_status` và `settlement_status`; chỉ đánh dấu quyết toán hoàn tất khi ghi sổ thành công. `PAID_OUT` hiện có cần được rà soát nghĩa trước khi ánh xạ; không dùng nó để khẳng định đã rút về ngân hàng.
- Trang thợ hiển thị rõ: tổng thu nhập, tiền mặt đã nhận, phí nền tảng, tiền được cộng ví, khoản phí còn phải trả nếu có. Thu nhập thống kê không bằng số tiền tăng ví.
- Lịch sử ví chỉ có biến động thực của ví; lịch sử tài chính đơn có thêm cash receipt và phân bổ phí. Tránh vừa tính cash receipt vừa tính tổng thu nhập thành hai lần doanh thu.

### Dữ liệu/API bổ sung

- `booking_settlements`: booking_id unique cho lần quyết toán đầu, version, totals snapshot, commission snapshot, status, settled_at, failure_reason; bản điều chỉnh riêng liên kết bản gốc.
- `booking_cash_receipts`: booking_id, invoice_version, expected_amount, customer_confirmed_at, freelancer_confirmed_at, status, dispute_reason, các actor và audit. Không cho client quyết định expected_amount.
- API dưới `/api/v1`:
  - GET /bookings/{id}/settlement: chi tiết hóa đơn/phân bổ, lọc trường theo vai trò và quyền trên booking.
  - POST /customer/bookings/{id}/cash-payment-confirmation: khách xác nhận đã trả; nhận invoiceVersion và idempotency key.
  - POST /freelancer/bookings/{id}/cash-receipt-confirmation: thợ xác nhận đã nhận đủ; cùng ràng buộc phiên bản/chống lặp.
  - POST /bookings/{id}/payment-disputes: bên tham gia báo chưa trả/chưa nhận/sai số tiền; chuyển xử lý tranh chấp.
- Việc thực thi settlement là nội bộ backend, không có API cho client tự cộng ví. API thợ không được đọc/xác nhận đơn thợ khác; tương tự phía khách.

### Hủy/hoàn khi có tiền mặt

- Hủy trước nhận tiền mặt và trước quyết toán: dùng quy trình hoàn cọc mục 9, thợ không tự hoàn tiền cọc.
- Đã khai nhận tiền mặt hoặc đã quyết toán: chuyển xử lý tranh chấp/điều chỉnh có kiểm soát; không chạy tự động luồng hoàn cọc trước dịch vụ.
- Hệ thống chỉ gửi hoàn qua cổng đối với khoản đã thu qua cổng, không thể hoàn C qua giao dịch chỉ thu D. Khoản tiền mặt cần thợ hoàn trực tiếp theo quyết định xử lý và khách xác nhận nhận lại, lưu bằng chứng; nếu nền tảng ứng hoàn thì phải ghi khoản phải thu thợ và quy trình riêng, chưa tự động hóa trong MVP.
- Sau quyết toán, hoàn tiền có thể cần đảo phí và thu hồi phần đã ghi ví thợ; nếu thợ đã rút/không đủ số dư, giữ nghĩa vụ cần xử lý thay vì giả định thu hồi thành công.

### Mốc triển khai và nghiệm thu bổ sung

- Sau mốc 5, thêm mốc 5B: dữ liệu receipt/settlement, hai API xác nhận, giao diện khách/thợ, ledger phân bổ và hàng đợi tranh chấp/thiếu phí. Mốc 6 phải bao gồm kiểm thử 5B.
- Kiểm thử cả hai loại booking với cọc MoMo/VNPay rồi trả tiền mặt; ví thợ chỉ tăng N.
- Kiểm thử hai xác nhận theo hai thứ tự, nhấn lặp, hai thiết bị, invoice cũ, sai chủ đơn, chưa hoàn tất dịch vụ, một bên không xác nhận và tranh chấp đồng thời settlement.
- Kiểm thử N dương/0/âm, phí không tính trên phụ phí theo chính sách hiện tại, thay đổi cấu hình phí sau cọc, discount chưa có chính sách bị chặn.
- Kiểm thử ghi sổ lỗi/retry, hủy/hoàn đồng thời, số tiền mặt không bị ghi thành tiền trong ví và hoàn tiền mặt không bị hoàn qua cổng lần nữa.
- Đối soát: cash received + wallet credited - khoản phí bổ sung đã trả phải khớp thu nhập được hưởng; cọc được phân bổ/hoàn đúng một lần, mọi khoản chờ xử lý có trạng thái và audit.

## 11. Tài liệu tham chiếu

- Code nội bộ: PaymentGatewayServiceImpl, PaymentWebhookProcessorImpl, ScheduledBookingServiceImpl, CustomerInstantBookingServiceImpl, BookingStateMachineServiceImpl, booking.service.ts và booking.store.ts.
- `docs/backlogs/sprint5/user_story_double_entry_ledger_and_escrow.md`: mô hình ledger, clearing wallet, hold và giới hạn thu 70% còn lại.
- MoMo IPN: https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/ — xác thực chữ ký và đối chiếu thông tin giao dịch; ACK HTTP 204 trong giới hạn tài liệu. Kiểm tra phiên bản/sản phẩm đang tích hợp khi triển khai.
- VNPay thanh toán: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html — hợp đồng IPN, Return URL, checksum và dữ liệu thanh toán. Return chỉ phục vụ điều hướng/hiển thị; backend xác nhận từ thông tin cổng đã kiểm chứng.
