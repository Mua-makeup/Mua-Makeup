# Phân tách khiếu nại studio

Áp dụng chung cho studio duyệt hoàn, khách đồng ý kết quả studio và admin phân xử đơn đã chuyển lên sàn.

| Giai đoạn | Hoàn khách | Công nhận studio |
| --- | --- | --- |
| Chưa hoàn thành | Hoàn cọc thực trả, giải phóng hold; không thu hồi ví | Cọc chuyển vào ví chủ studio, giải phóng hold |
| Hoàn thành, chưa trả đủ | Hoàn số thực trả được xác nhận | Trở về COMPLETED để tiếp tục thanh toán, chưa PAID_OUT |
| Trả đủ, chưa quyết toán | Hoàn số thực trả; thu hồi tiền mặt đã được hai bên xác nhận từ người nhận nếu có | Quyết toán cùng transaction; lỗi thì không đóng khiếu nại |
| Đã quyết toán | Đảo các khoản CREDIT quyết toán đúng người nhận; thu hồi tiền mặt đã xác nhận; hoàn khách số thực trả | Giữ PAID_OUT, không cộng lại tiền |

- Chia 50/50 chỉ trước hoàn thành: khách và chủ studio mỗi bên nhận nửa cọc thực trả.
- Đọc tiền từ booking_deposits.paid_amount, giao dịch SUCCESS của BOOKING_FINAL_PAYMENT và biên nhận tiền mặt BOTH_CONFIRMED có xác nhận hai bên. Không lấy giá đơn làm bằng chứng đã trả tiền.
- API trả financials gồm stage, completedService, paidDeposit, paidAmount, cashAmount, settled. Studio/admin hiển thị cùng số liệu.
- Khách chỉ đồng ý hoặc chuyển admin sau khi studio đã từ chối. Khi chuyển admin, studio không còn quyền duyệt tại API.
- Các đường xử lý khóa booking và ví; dùng chung khóa ledger studio_dispute. Không đóng khiếu nại nếu thiếu tiền thu hồi hoặc số liệu quyết toán không khớp. Mọi thay đổi tài chính trong cùng transaction.
- Chỉ giảm frozen của hold ACTIVE thuộc đơn đó, không trừ ký quỹ đơn khác sau quyết toán.
- Giao dịch thanh toán cuối đã hoàn đánh dấu applicationStatus=REFUNDED; migration V20261027160000 mở rộng constraint. Reconciliation không quyết toán lại giao dịch này.

Quy tắc thu hồi: lấy đúng các khoản BOOKING_SETTLEMENT/CREDIT; phần phí nền tảng không thu thêm từ studio. Kiểm tra tổng khoản đã chi + tiền mặt + phí khớp tiền thực trả trước khi hoàn. Dữ liệu cũ thiếu hoặc bất nhất cần đối soát, không tự suy đoán. Không tự sửa số dư lịch sử.

Ngoại lệ có kiểm chứng cho writer tiền mặt hiện tại: writer ghi CREDIT bằng T-F nhưng snapshot walletCreditedAmount bằng D-F. Chỉ nhận diện khi snapshot T/D/C khớp bằng chứng thanh toán, D+C bằng số thực trả, CREDIT+F=T, snapshot+C=CREDIT và không có BOOKING_SETTLEMENT/DEBIT. Khi đó đảo toàn bộ CREDIT thực tế và thu hồi C từ người nhận tiền mặt, rồi hoàn khách D+C. Không bỏ thu hồi C hoặc chỉ đổi snapshot: làm vậy sẽ để lại khoản ghi có dư. Nếu người nhận không đủ số dư cho cả hoa hồng đã chi và tiền mặt phải thu hồi, transaction vẫn bị chặn bằng lỗi thiếu số dư. Không tự điều chỉnh dữ liệu cũ khi chỉ đọc hoặc mở khiếu nại.

Hóa đơn mobile đọc cash receipt: BOTH_CONFIRMED kèm xác nhận khách/thợ giữ nhãn Đã Thanh Toán Tiền Mặt khi booking chuyển DISPUTED. Kết quả hoàn/hủy vẫn được ưu tiên. Bản sửa này xử lý tương thích hoàn tiền và hiển thị; chưa thay đổi cách writer phân bổ tiền mặt thành số dư ví ở lần quyết toán ban đầu.

Kiểm chứng: unit test cho phân loại và phân bổ cọc, hoàn thành chưa trả đủ, online trả đủ chưa quyết toán, thu hồi đã quyết toán, thiếu số dư và các guard; frontend build. Chưa kiểm thử database/gateway thật hoặc triển khai migration lên môi trường chạy.
