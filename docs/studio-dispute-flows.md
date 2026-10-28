# Thanh toán và khiếu nại Studio

## Quy tắc đã được chủ sản phẩm xác nhận

- Phí sàn Studio là 20% tổng hóa đơn, không phụ thuộc tiền mặt/online.
- Thợ thu hộ tiền mặt và nộp vào sàn; sàn phân bổ thu nhập vào ví. Tiền mặt thu hộ không phải hoa hồng thợ và không được thu hồi thêm từ ví thợ khi hoàn khách.
- Mô hình này giả định nghiệp vụ nộp tiền mặt vào sàn được thực hiện. Biên nhận khách/thợ hiện là xác nhận nghiệp vụ, không phải bằng chứng chuyển khoản ngân hàng; chưa có tích hợp xác minh nộp tiền mặt tự động.
- Ví dụ tổng 50.000, cọc 15.000, tiền mặt 35.000, hoa hồng thợ 25.000: phí sàn 10.000, thu nhập Studio 15.000, tổng ghi có ví 40.000.

## Quyết toán

BookingCommissionPolicy được áp dụng tại writer cash/online và thông báo tiền mặt. Studio cash mới lưu settlementVersion=2, walletCreditedAmount=T-F (toàn bộ thu nhập chi qua ví). Khóa booking ngăn quyết toán/hoàn/điều chỉnh cùng đơn chạy chồng. Từ chối chia hoa hồng vượt thu nhập sau phí hoặc thiếu người nhận. Không sửa hoa hồng sau khi có settlement hoặc đang khiếu nại.

Khách và thợ xác nhận độc lập; thợ không tự điền xác nhận của khách. Khách luôn được kiểm tra quyền kể cả receipt đã tồn tại. Đọc receipt kiểm quyền theo đơn. Không cho thợ xóa xác nhận đã dùng để quyết toán. Xác nhận khi DISPUTED chỉ cập nhật bằng chứng, không tự giải ngân hoặc đóng khiếu nại. Hồ sơ có khai báo tiền mặt một phía phải làm rõ trước khi hoàn/đóng.

## Hoàn khiếu nại

| Giai đoạn | Hoàn khách | Công nhận Studio |
| --- | --- | --- |
| Chưa hoàn thành | Hoàn cọc thực trả | Cọc chuyển chủ Studio |
| Hoàn thành chưa trả đủ | Hoàn số thực trả đã xác nhận | Trở về COMPLETED |
| Trả đủ chưa quyết toán | Hoàn số thực trả từ nguồn sàn đang giữ, không trừ tiền mặt thêm từ thợ | Quyết toán cùng transaction |
| Đã quyết toán | Đảo các khoản chi ví thực tế; hoàn tổng thực trả | Giữ PAID_OUT, không chi lần hai |

Chia 50/50 chỉ trước hoàn thành. Cùng một service tài chính áp dụng cho Studio, khách chấp thuận và Admin phân xử. Kiểm số dư trước khi thu hồi. Không thu phí sàn thêm từ thợ/Studio khi hoàn. Bút toán hoàn có idempotency key, giao dịch online đã hoàn đánh dấu REFUNDED và receipt CANCELLED.

Kiểm tổng chi ví ròng + phí sàn = tiền thực trả. Dữ liệu cash cũ lưu D-F nhưng ledger chi T-F chỉ được chấp nhận khi đầy đủ snapshot T/D/C khớp bằng chứng. Không cộng thêm C vào số phải thu hồi. Phí đã điều chỉnh được trừ khỏi khoản thu hồi của chủ Studio để không trừ hai lần.

## Đơn cũ áp dụng nhầm 15%

Admin → Đơn đặt lịch → Chi tiết đơn Studio PAID_OUT/DISPUTED → Đối soát phí Studio 20%.

1. Kiểm tra phí đã ghi: GET /api/v1/admin/bookings/{id}/studio-fee-reconciliation.
2. Màn hình hiển thị oldFee, correctFee, recoveryAmount và applicable. Đây là xem trước; POST vẫn kiểm tra lại mọi bằng chứng và số dư.
3. Xác nhận điều chỉnh: POST cùng URL, JSON {"expectedOldFee":7500}.
4. Server yêu cầu SUPER_ADMIN, khóa booking/ví, chỉ nhận đúng kiểu phí cũ 15%, kiểm bằng chứng thanh toán và ledger, đủ số dư và khoản Studio thực nhận.
5. Ghi DEBIT riêng với key studio_fee20:{id}, giữ nguyên CREDIT cũ và hoa hồng thợ, cập nhật snapshot phí/net. Retry không trừ lần hai; snapshot đã thay đổi hoặc đã hoàn thì chặn.

Đơn ví dụ: trừ 2.500 khỏi ví chủ Studio, 17.500 còn 15.000. Không tự chạy điều chỉnh khi GET ví, không tự sửa toàn bộ dữ liệu lịch sử, không áp dụng vào đơn đã hoàn.

## Hiển thị

Web đọc platformFeeRate/platformFee/settlementRecorded từ API; đơn cũ chưa đối soát hiển thị đúng phí lịch sử thay vì tự gắn 20%. estimatedStudioNet đã trừ phí sàn. Mobile giữ trạng thái thanh toán khi DISPUTED qua receipt và isPaymentSettled; cash-confirmation trả bookingStatus để app không tự suy đoán PAID_OUT.

## Kiểm chứng

Chạy Gradle test (không gồm infrastructure-tagged), test utility hóa đơn mobile và Vite production build. Các test bao gồm chia phí tiền mặt/online, hoàn legacy cash không thu hai lần, điều chỉnh phí/retry/thiếu số dư/preview cũ, hoàn sau điều chỉnh và quyền receipt. Chưa triển khai, chưa chạy điều chỉnh vào DB thật, chưa xác minh thiết bị và luồng nộp tiền ngân hàng thật.
