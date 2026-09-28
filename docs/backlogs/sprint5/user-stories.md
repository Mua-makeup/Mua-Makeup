# Sprint 5 Backlog

## Phạm vi và thứ tự nghiệm thu

| Mốc | Issues | Đầu ra được nghiệm thu |
| :--- | :--- | :--- |
| 1. Kết nối cổng | `ISSUE-23.1` (phần payment), `ISSUE-23.3`, `ISSUE-23.2` | VNPay và MoMo tạo checkout, xác thực kết quả qua IPN/truy vấn cổng, lưu trạng thái payment đúng một lần. **Chưa coi là nạp ví thành công.** |
| 2. Ví và nạp tiền | `ISSUE-22.1`–`ISSUE-22.4`, phần còn lại của `ISSUE-23.1` | Payment đã được cổng xác nhận được hạch toán đúng một lần vào ví, ledger và sao kê; có thể đối soát và retry khi ghi sổ lỗi. |
| 3. Escrow | `ISSUE-22.5` | Giữ cọc, hoàn cọc hoặc tất toán booking theo nguồn tiền thực có; không giải ngân vượt số tiền đã thu. |
| 4. Mở rộng | `ISSUE-23.4`, `ISSUE-24.1`–`ISSUE-24.4` | ZaloPay/VietQR sau khi xác nhận được cơ chế đối soát; tài khoản ngân hàng, yêu cầu rút và payout theo khả năng của đối tác. |

**Quy ước trạng thái:** `payment_transactions.status = SUCCESS` là cổng đã xác nhận thu tiền. Chỉ sau khi ghi sổ và cập nhật ví thành công mới được báo “nạp ví thành công”. Return URL của trình duyệt không thay thế IPN hoặc truy vấn trạng thái có xác thực từ cổng.

**Test khi chưa có mobile:** VNPay sandbox có thể hoàn tất bằng trình duyệt với thẻ test; MoMo kiểm thử tạo checkout, chữ ký, callback và lỗi bằng test tích hợp. Giao dịch ví MoMo sandbox thật cần MoMo Test app/tài khoản test theo hướng dẫn đối tác. Với backend localhost, IPN cần URL HTTPS public qua tunnel; return URL frontend có thể là `http://localhost:3000/payments/return/vnpay` và `http://localhost:3000/payments/return/momo`. Đây là URL dự kiến, chưa phải route đã có.

## User stories và tasks

- [ ] [ISSUE-23.1] [Thanh toán đa phương thức và nạp tiền vào ví](user_story_payment_gateways_and_payout.md)
  - [ ] Payment dùng chung: intent, `PENDING`/`SUCCESS`/`FAILED`, cấu hình return/IPN, tra cứu trạng thái theo chủ giao dịch, idempotency và đối soát.
  - [ ] [ISSUE-23.3] VNPay sandbox: checkout, thẻ test trên web, IPN GET và kiểm tra HMAC-SHA512.
  - [ ] [ISSUE-23.2] MoMo sandbox: `captureWallet`, `payUrl`, IPN POST và kiểm tra HMAC-SHA256.
  - [ ] Sau `ISSUE-22.1`–`ISSUE-22.4`: ghi sổ nạp ví đúng một lần cho payment `SUCCESS`, kể cả IPN trùng hoặc đến muộn.
  - [ ] [ISSUE-23.4] ZaloPay/VietQR: đặc tả cách xác thực tiền vào trước khi ghi ví; triển khai sau hai cổng trên.
- [ ] [ISSUE-22.1] [Ví, sổ cái và Escrow](user_story_double_entry_ledger_and_escrow.md)
  - [ ] [ISSUE-22.2] Ví với `balance`, `frozen_balance` và `wallet_holds` theo booking/yêu cầu rút; giữ/mở phong tỏa có kiểm tra số dư và chống lặp.
  - [ ] [ISSUE-22.3] Ledger cho mọi khoản tiền thực chuyển giữa các ví/tài khoản đối ứng; đối soát với số dư.
  - [ ] [ISSUE-22.4] Sao kê snapshot trước/sau cho mọi biến động ví, kể cả `FREEZE`/`UNFREEZE`.
  - [ ] [ISSUE-22.5] Escrow theo booking: giữ cọc → hoàn cọc hoặc thu đủ phần còn lại → chia doanh thu và hoa hồng trong một transaction.
- [ ] [ISSUE-24.1] Tài khoản ngân hàng và payout cho Thợ/Studio
  - [ ] [ISSUE-24.2] Liên kết tài khoản ngân hàng; chỉ đánh dấu đã xác minh khi có bằng chứng xác minh.
  - [ ] [ISSUE-24.3] Giữ tiền rút, xử lý payout và đối soát kết quả ngân hàng; không tự xác nhận thành công khi request timeout.
  - [ ] [ISSUE-24.4] Dashboard duyệt/từ chối yêu cầu rút; hiển thị trạng thái thực tế.

Chi tiết tiêu chí nghiệm thu và thiết kế dữ liệu ở hai file story liên kết phía trên.

