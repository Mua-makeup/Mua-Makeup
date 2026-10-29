# Thanh toán thưởng tăng ca

Studio là bên chi trả. Duyệt báo cáo và thanh toán là hai trạng thái riêng.

- `NOT_APPLICABLE`: báo cáo chưa được duyệt thưởng hoặc không có số tiền phải trả.
- `PENDING_FUNDS`: đã duyệt thưởng, chưa có bút toán thanh toán; chờ ví Studio đủ số dư.
- `PAID`: sổ cái ghi đủ tiền trừ Studio và cộng thợ cho báo cáo.
- `RECONCILIATION_REQUIRED`: khoản cũ thiếu/lệch bút toán hoặc thiếu thông tin người trả/nhận. Không tự chuyển thêm.

API danh sách, chi tiết và duyệt báo cáo trả `allowancePaymentStatus`. Không đổi enum trạng thái duyệt hoặc tự sửa các bút toán cũ.

Cả duyệt, quyết toán và mở ví thợ đều dùng `OvertimeAllowancePaymentService`. Hàm khóa báo cáo và ví, chỉ chuyển khi Studio đủ tiền cho toàn bộ khoản thưởng. Hai biến động số dư và hai bút toán ở cùng giao dịch; lỗi ghi sổ phải rollback. Khóa chống trùng gắn với report ID. Thông báo cộng tiền chỉ gửi sau commit.

Khi quyết toán, phần doanh thu của Studio vào ví Studio trước khi thử thanh toán thưởng. Nếu vẫn thiếu thì tiếp tục chờ. Sau khi Studio bổ sung số dư, mở ví thợ sẽ thử lại; chưa có tác vụ tự động định kỳ riêng cho việc này.

Kiểm thử thủ công sau triển khai: duyệt 150.000đ khi Studio có 50.000đ (hai ví không đổi), bổ sung đủ tiền rồi mở ví thợ (Studio -150.000đ, thợ +150.000đ), tải lại nhiều lần (không chuyển lặp). Kiểm tra các khoản cũ lệch bằng đối soát riêng, không dùng duyệt lại để cộng bù.
