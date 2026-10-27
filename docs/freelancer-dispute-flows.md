# Luồng khiếu nại của thợ tự do

Phạm vi: FREELANCER_DIRECT; đối chiếu BookingStateMachineServiceImpl, AdminDisputeServiceImpl và AdminDisputesPage. Ví dụ tổng đơn 200.000đ, cọc thực trả 60.000đ.

## Mở và bổ sung khiếu nại

- Khách hoặc thợ của đơn có thể chuyển sang DISPUTED từ ACCEPTED, ON_THE_WAY, ARRIVED, IN_PROGRESS, COMPLETED hoặc PAID_OUT theo state machine. Thợ phụ không được khiếu nại.
- Phải có lý do; thợ báo khách vắng/bỏ hẹn phải có ảnh minh chứng. Vai trò người báo được gắn vào lý do để phân biệt CUSTOMER, MUA hoặc DUAL khi có cả hai phía.
- Bổ sung giải trình/leo thang không tự tạo quyền nhận tiền. Người khởi tạo khiếu nại không quyết định người thắng; admin chọn phán quyết.
- Khi chờ xử lý, không hoàn cọc hoặc trả bồi thường chỉ vì đã gửi báo cáo.

## Trước khi hoàn thành

| Phán quyết admin | Ví khả dụng khách | Ví khả dụng thợ | Ký quỹ | Trạng thái đơn |
| --- | --- | --- | --- | --- |
| APPROVE_REFUND_CUSTOMER | +60.000đ | Không cộng/trừ | Giải phóng 60.000đ; REFUNDED | DISPUTE_REFUNDED |
| APPROVE_COMPENSATION_MUA / REJECT_AND_PAYOUT_MUA | Không cộng | +60.000đ | Giải phóng 60.000đ; CONSUMED | DISPUTE_COMPENSATED |
| SPLIT_50_50 / SPLIT_SETTLEMENT_50_50 | +30.000đ | +30.000đ | Giải phóng 60.000đ; SPLIT_SETTLED | DISPUTE_REFUNDED |

Khoản cọc đang hiển thị phía thợ là escrow, chưa phải số dư khả dụng của thợ. Vì vậy hoàn cọc không được ghi một khoản thu hồi 200.000đ từ ví thợ. Số tiền ưu tiên lấy từ paidAmount trong booking deposit; code cũ vẫn có fallback depositAmount nếu thiếu bản ghi trả tiền.

## Sau khi hoàn thành: hành vi hiện có và giới hạn

Cần phân biệt hoàn thành dịch vụ và đã thanh toán/quyết toán. Bản sửa phân loại hoàn thành bằng lịch sử COMPLETED/PAID_OUT hoặc bản ghi quyết toán; không dựa trên totalAmount > depositAmount hay ảnh tải lên.

| Phán quyết | Hành vi hiện có |
| --- | --- |
| Hoàn cho khách | Hoàn totalAmount; chỉ chạy thu hồi ví thợ khi có quyết toán. Chỉ giảm frozen của khách nếu còn hold ACTIVE, tránh trừ nhầm ký quỹ đơn khác. |
| Công nhận thợ | Gọi dịch vụ quyết toán, đích PAID_OUT. |
| Chia đôi | Backend từ chối; không áp dụng chia đôi cọc sau hoàn thành. |

Các điểm cần xử lý riêng trước khi coi toàn bộ luồng sau hoàn thành là chuẩn kế toán:

1. COMPLETED chưa chứng minh khách đã trả phần còn lại. Nhánh hoàn toàn bộ hiện chưa đối chiếu số tiền thực thu cuối cùng. Cần tách hoàn thành/chưa trả đủ, trả tiền mặt đã xác nhận, và thanh toán online thành công.
2. Khi quyết toán tiền mặt, thợ nhận tiền mặt trực tiếp và ví chỉ nhận cọc trừ phí. Thu hồi totalAmount từ ví không đồng nghĩa đảo đúng bút toán quyết toán; phải xác định phần thợ chịu, phần phí nền tảng hoàn lại và tiền mặt cần thu hồi.
3. Thu hồi hiện chặn số dư âm bằng max(0) nhưng sổ cái vẫn ghi đủ totalAmount. Nếu thiếu số dư, cần cơ chế công nợ/thu hồi hoặc chặn phán quyết; không được coi là đã thu đủ.
4. Nhánh công nhận thợ truyền commissionRate=null và bắt lỗi quyết toán rồi tiếp tục. Đơn có thể bị gắn PAID_OUT dù quyết toán thất bại. Cần quyết định cách tiếp tục thu phần còn thiếu và dùng mức phí cấu hình trước khi sửa nhánh này.
5. Nhánh chia đôi dùng trạng thái DISPUTE_REFUNDED chung với hoàn toàn bộ; phân biệt bằng phán quyết và ledger. Thông báo hiện có chỗ dùng nội dung từ chối khiếu nại cho mọi phán quyết không phải hoàn toàn bộ.

## Bản sửa lần này

- Sửa nhầm phân loại trước/sau hoàn thành ở backend và admin UI; API trả completedService dùng chung nguồn phân loại.
- Khóa booking khi phán quyết và khóa ví khách khi hoàn, ngăn hai lần duyệt đồng thời qua cùng endpoint.
- Không thu hồi ví thợ khi chưa có quyết toán; không giảm ký quỹ đã giải phóng.
- Kiểm thử hồi quy ba phương án phân bổ cọc, từ chối duyệt lại, và phân loại theo lịch sử/quyết toán thay vì giá/ảnh.

Không tự điều chỉnh dữ liệu ví đã ghi sai trước đây. Những đơn như trong ảnh cần đối soát riêng từ ledger, tiền cọc thực nhận và quyết toán trước khi tạo bút toán điều chỉnh.
