> **Đã được thay thế bởi quy tắc nghiệp vụ xác nhận sau đó:** thợ nộp tiền mặt vào sàn, sàn chi ví. Các phân tích bên dưới về thu thêm tiền mặt từ ví thợ là giả định cũ, không còn áp dụng. Xem [luồng hiện tại](studio-dispute-flows.md). Bản sửa hiện tại không thu khoản tiền mặt lần hai khi hoàn và có công cụ Admin điều chỉnh phí cũ 15% thành 20%.

# Kiểm tra thanh toán tiền mặt và khiếu nại — 28/10/2026

## Cập nhật sau xác nhận của người dùng

Người dùng xác nhận thợ đã nhận tiền mặt và đã nhận hoa hồng. Đã bổ sung nhánh hoàn tiền nhận diện chính xác kiểu ghi sổ T-F/D-F của writer hiện tại, đối chiếu snapshot T/D/C và ledger trước khi thu hồi, giữ nguyên chặn thiếu số dư/sai bằng chứng. Test có trường hợp tách ví thợ 25.000 và Studio 17.500; thu hồi riêng 35.000 tiền mặt từ thợ. Hóa đơn đọc receipt để giữ trạng thái đã thanh toán tiền mặt trong khiếu nại. Đã loại bỏ tham chiếu AssignmentStatus.DECLINED không tồn tại để backend biên dịch.

Kiểm chứng sau sửa: 35 test backend chọn theo các luồng payment/dispute/cash đạt; 7 test trình bày hóa đơn đạt. TypeScript toàn app chưa đạt (ví dụ setPreviewPhotoUrl và các kiểu React Native ở những dòng ngoài thay đổi). Chưa kiểm thử thiết bị/HTTP/DB thật, chưa triển khai hay tác động số dư đơn thật. Chưa thay đổi writer phân bổ ví ban đầu; các phát hiện khác phía dưới vẫn là công việc cần xử lý riêng, không được coi đã sửa toàn bộ.

Phần dưới ghi lại kết quả kiểm tra ban đầu.

Phạm vi: đọc luồng backend, màn hóa đơn mobile và màn Studio; bổ sung hai test chẩn đoán. Chưa truy vấn DB của BK-SCHED-1644172, chưa sửa nghiệp vụ hoặc số dư, chưa triển khai. Các con số phí dưới đây dùng mặc định 15%, cần kiểm tra commission_rate thực tế của đơn.

## 1. Sai lệch giữa ghi sổ tiền mặt và kiểm tra hoàn tiền

`BookingSettlementServiceImpl.settleBooking` lưu `walletCreditedAmount = D-F` nhưng phân bổ `E = T-F` vào ví nhân viên và Studio (cả nhánh không có nhân viên). Không có bút toán trừ khoản tiền mặt C khỏi ví người cầm tiền trong phương thức này.

Với T=50.000, D=15.000, C=35.000, F=7.500:

| Giá trị | Số tiền |
| --- | ---: |
| Snapshot walletCreditedAmount (D-F) | 7.500 |
| Tổng CREDIT khi phân bổ bình thường (T-F) | 42.500 |
| CREDIT + tiền mặt + phí | 85.000 |
| Khách thực trả | 50.000 |

`StudioDisputeFinanceService.resolve` yêu cầu tổng CREDIT bằng snapshot và CREDIT+C+F bằng tổng thực trả. Cả hai phép kiểm đều không đạt; API trả `dispute.payment_reconciliation_required` trước khi đổi ví. Đây là mâu thuẫn giữa writer quyết toán và reader hoàn tiền, không phải bằng chứng khách chưa trả tiền. Đổi snapshot từ 7.500 thành 42.500 riêng lẻ không sửa được phương trình thứ hai.

Màn Studio trong ảnh báo hoàn 50.000 thực trả; trong mã hiện tại con số này đến từ `financials.paidAmount`, là dấu hiệu backend có nhận diện khoản thanh toán cuối. Cần DB xác nhận tiền mặt hay online, settlement và ledger thực tế trước khi kết luận nguyên nhân riêng của đơn.

## 2. Hóa đơn mất thông tin đã thanh toán khi mở khiếu nại

`history-detail/[id].tsx` suy `isPaidOut` từ `bookingDetail.status === 'PAID_OUT'`. `booking-payment.ts` hiển thị Tạm Dừng Quyết Toán cho DISPUTED khi isPaidOut=false. Nó không nhận bằng chứng receipt/settlement. Vì vậy một đơn đã quyết toán chuyển sang DISPUTED cũng hiện giống đơn chưa trả khoản 70%.

Trạng thái khiếu nại cần độc lập với trạng thái thu tiền: phân biệt chưa thu, khách báo đã trả/chờ thợ, đã nhận tiền, đã quyết toán, đã hoàn. Nhãn đang khiếu nại không được xóa lịch sử thu tiền. Cũng cần phân biệt hoàn khoản đã trả với miễn thu khoản chưa trả; hiện utility dùng Miễn Thu chung cho kết quả hoàn.

## 3. Xác nhận một bên và ranh giới khiếu nại

- Khách xác nhận chỉ ghi `customerConfirmedAt`; finance chỉ cộng tiền mặt khi BOTH_CONFIRMED và đủ hai timestamp.
- Thợ xác nhận tự điền customerConfirmedAt nếu trống. Hai timestamp hiện chưa chắc là hai thao tác độc lập.
- Khi đơn Studio đã DISPUTED, checkAndTriggerSettlement chặn thao tác xác nhận. Nếu khách báo đã trả nhưng thợ chưa xác nhận trước khiếu nại, không thể hoàn thiện biên nhận bằng endpoint thông thường.
- Finance không coi biên nhận một bên là tiền đã nhận. Nếu không có bằng chứng khác, hoàn khiếu nại chỉ tính cọc rồi CANCELLED biên nhận. Cần giải quyết tranh chấp tiền mặt đang chờ xác nhận trước khi đóng hồ sơ, tránh bỏ qua khoản khách khai đã trao.
- `declineByWorker` có thể xóa timestamp và đổi receipt sau khi đã quyết toán vì không kiểm tra trạng thái booking/settlement. Điều này làm mất bằng chứng mà luồng hoàn đang sử dụng.

## 4. Các điểm liên quan cần sửa cùng luồng

- `getStatus(bookingId, actorUserId)` không dùng actorUserId để kiểm quyền trên đơn.
- `getOrCreateReceipt` chỉ kiểm customerId khi tạo mới, bỏ qua kiểm quyền nếu receipt đã tồn tại.
- Khách/thợ lấy khóa receipt trước khóa booking trong khi xử lý khiếu nại lấy khóa booking trước. Cần thống nhất thứ tự khi chỉnh luồng xác nhận.
- Online và tiền mặt đều được cộng khi inspect: nếu thanh toán hai kênh thì guard tổng trả vượt tổng đơn sẽ chặn hoàn. Không được bỏ guard để làm mất khoản trả dư.

## Hướng sửa nhất quán

1. Chốt ghi sổ tiền mặt theo nguồn thực: khoản đã trao trực tiếp không được cộng thêm thành số dư ví khả dụng. Nếu giữ phân bổ thu nhập T-F, cần bù trừ C đúng người cầm tiền và xử lý rõ trường hợp tiền mặt vượt phần được hưởng, không tự tạo ví âm hoặc bỏ mất nợ. Luồng hoàn phải đảo đúng bút toán ròng tương ứng.
2. Với đơn cũ, đối chiếu receipt, deposit, payment, settlement, ledger và người thực nhận. Lập bút toán điều chỉnh có kiểm tra/idempotency; không sửa số dư hàng loạt hoặc bỏ guard.
3. Cho phép xác minh tiền mặt trong khiếu nại mà không tự chuyển đơn thành PAID_OUT/giải ngân; kết quả dùng chung cho Studio và Admin.
4. Trả bằng chứng thanh toán cho hóa đơn và tách nhãn thu tiền khỏi nhãn khiếu nại.
5. Bổ sung kiểm quyền và chặn hủy biên nhận đã dùng quyết toán; kiểm thử xác nhận lặp, hai kênh, khiếu nại đồng thời, hoàn lặp và thiếu số dư thu hồi.

## Kiểm chứng đã thực hiện

- Mobile: `node --test scripts/booking-payment.test.cjs`: 5/5 pass. Đây là kiểm tra hành vi hiện tại, không chứng minh vấn đề hiển thị đã được sửa.
- Bổ sung `cashSettlementWithGrossWalletCreditsRequiresReconciliationBeforeRefund` mô tả dữ liệu lệch 50.000/15.000/35.000 và yêu cầu guard chặn trước khi đổi tiền; bổ sung test phân loại xác nhận một bên.
- Lệnh Gradle chọn StudioDisputeFinanceTest, DisputeStageServiceTest, CashPaymentAuthorizationTest, FinalPayment*Test, AdminDisputeServiceTest không đến giai đoạn chạy test: compileJava thất bại tại BookingStaffAssignmentMapper.java:48 vì AssignmentStatus.DECLINED không tồn tại. Đây là lỗi sẵn có ngoài thay đổi hai test; không tuyên bố backend test pass.
- Chưa kiểm thử HTTP, DB, đồng thời hay gateway thật. Không chạy API hoàn tiền trên đơn thật.
