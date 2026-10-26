# User stories — Nạp VNPay/MoMo và rút tiền thủ công

Cập nhật 05/10/2026. Đặc tả này thay thế phạm vi nhiều cổng trước đây. [Kế hoạch chính](wallet_topup_manual_withdrawal_plan.md) chứa đối chiếu code, API, migration và kiểm thử. Chỉ dùng VNPAY/MOMO đã có; bỏ VietQR/ZaloPay và API chi hộ khỏi sprint.

## US-TOPUP — Nhận tiền, cộng ví một lần, xem lịch sử

Là người dùng có ví, tôi muốn nạp qua cổng hiện có và biết rõ khi nào tiền đã vào số dư khả dụng.

**Hiện có:** PaymentController/create-intent/get-detail, adapter VNPAY/MOMO, IPN, queryTransaction, payment status và walletPostingStatus. **Còn thiếu:** TOP_UP posting, idempotent create-intent, scheduler TOP_UP và UI hoàn chỉnh. Các file nguồn được liên kết tại mục 2 kế hoạch chính.

Tiêu chí nghiệm thu:

- [ ] Số tiền TOP_UP nguyên VND, tối thiểu 1.000đ theo DTO hiện tại, tối đa theo cấu hình; gateway lấy từ registry enabled.
- [ ] Cùng Idempotency-Key/payload nhận lại cùng intent; khác payload hoặc purpose trả 409.
- [ ] Timeout create/query giữ mã gốc và trạng thái chưa rõ; không tự ghi FAILED hoặc tạo đơn khác.
- [ ] Chữ ký, gateway, định danh và số tiền được kiểm tra trước xác nhận; return URL không là nguồn xác nhận.
- [ ] SUCCESS được commit trước posting; ví + ledger + POSTED được ghi trong transaction riêng.
- [ ] IPN trùng, query cạnh tranh, crash/restart chỉ cộng một lần; scheduler phục hồi khi app đã đóng.
- [ ] UI phân biệt chờ thanh toán, đã thu/đang ghi ví và nạp thành công; lịch sử intent chưa thanh toán tách khỏi sao kê số dư.

Liên quan S5-W01–W04, W09–W10; ISSUE-23.1–23.3 và ISSUE-22.2–22.4.

## US-BANK — Đăng ký tài khoản nhận tiền

Là chủ ví, tôi muốn lưu tài khoản ngân hàng để nhận khoản rút.

**Hiện trạng:** chưa tìm thấy module bank account trong entity/controller/migration backend. Đây là phần xây mới.

- [ ] Số tài khoản là chuỗi, giữ số 0 đầu; ngân hàng/chủ TK được kiểm tra, số TK được che theo quyền.
- [ ] User chỉ quản lý tài khoản của mình; SUPER_ADMIN xác minh thủ công có người/thời điểm/ghi chú.
- [ ] Tự nhập tên không làm tài khoản VERIFIED; chỉ tài khoản VERIFIED được lập yêu cầu rút.
- [ ] Yêu cầu rút giữ snapshot người nhận; archive/sửa tài khoản không đổi lệnh cũ.

Liên quan S5-W05; ISSUE-24.2.

## US-WITHDRAW — Giữ tiền và theo dõi rút

Là CUSTOMER hoặc FREELANCE_MUA, tôi muốn rút số dư khả dụng và theo dõi trạng thái thực tế.

**Hiện trạng:** có wallet/lock repository, chưa có withdrawal API/entity/migration. wallet_holds hiện bắt buộc booking_id nên cần migration mở rộng trước.

- [ ] Tạo REQUESTED đồng thời giảm available, tăng frozen, tạo hold và ledger; không rút tiền đang giữ.
- [ ] Hai yêu cầu đồng thời không vượt available; request retry không giữ tiền lần hai.
- [ ] Chủ ví chỉ hủy khi REQUESTED; cạnh tranh approve/reject/cancel chỉ một kết quả.
- [ ] Reject/cancel/failed chắc chắn chưa chi trả hold đúng một lần; UNKNOWN không trả hold.
- [ ] Thành công giảm frozen, không trừ available lần thứ hai; hold booking khác không bị ảnh hưởng.
- [ ] Ví thợ hiển thị riêng tiền rút đang giữ với bookingDepositsHeld của khách.

Liên quan S5-W01–W02, W06, W09–W10; ISSUE-24.1/24.3.

## US-ADMIN-PAYOUT — Duyệt, chuyển khoản và đối soát

Là SUPER_ADMIN, tôi muốn duyệt yêu cầu, nhận trách nhiệm chuyển tiền và đối chiếu giao dịch trước khi hoàn tất.

- [ ] Chỉ SUPER_ADMIN gọi endpoint admin; mỗi thao tác có audit và action idempotency key.
- [ ] REQUESTED → APPROVED → PROCESSING (claim) trước khi thực hiện chuyển ngoài hệ thống.
- [ ] Nhập reference ngân hàng, số tiền, nguồn/đích, thời điểm → TRANSFERRED chờ đối soát.
- [ ] Khớp sao kê → SUCCESS; thông tin không rõ → UNKNOWN, giữ tiền và không chuyển lần hai.
- [ ] Reference ngân hàng chống trùng theo tài khoản nguồn/ngân hàng; thao tác confirm retry không ghi hai lần.
- [ ] Timeout lưu kết quả trên web không có nghĩa cần chuyển ngân hàng lại; tải lại trạng thái theo withdrawal ID.
- [ ] Dashboard lọc trạng thái, tuổi yêu cầu, người đang xử lý; hỗ trợ tra lịch sử và bằng chứng.

Liên quan S5-W07, W10; ISSUE-24.4. Dùng state machine và endpoint cụ thể trong mục C và mục 4 kế hoạch chính.

## US-REFUND — Hoàn tiền có nguồn và đối soát

- [ ] BOOKING_REFUND hiện có được khóa/transaction và chống lặp trước cập nhật tiền.
- [ ] Khoản giữ rút bị hủy/từ chối là release, không tạo thêm TOP_UP.
- [ ] Payment đã thu nhưng cọc hết hạn hoặc thanh toán thêm lần hai được đối soát; chỉ hoàn về ví khi chưa áp dụng/hoàn ở luồng khác.
- [ ] Không gán tính năng hoàn tiền qua gateway cho code hiện tại: PaymentGatewayStrategy chưa có method refund.

Liên quan S5-W08 và mục D kế hoạch chính. Tiêu chí chi tiết nằm trong ma trận kiểm thử; chưa đánh dấu hoàn thành chỉ dựa trên code đã tồn tại.
