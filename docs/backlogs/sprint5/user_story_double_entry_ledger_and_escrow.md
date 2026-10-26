# Ví, ledger, hold và hoàn tiền — Thiết kế bám code hiện tại

Cập nhật 05/10/2026. Tên file được giữ để các link cũ không gãy. Nội dung thay thế schema dự kiến trước đây bằng [kế hoạch hiện hành](wallet_topup_manual_withdrawal_plan.md).

## Nền tảng thực tế

- `wallets`: available_balance, frozen_balance, currency, version; unique user_id. `WalletRepository.findByUserIdWithLock` đã có.
- `wallet_holds`: wallet_id, booking_id bắt buộc, deposit_id, amount và status. Chưa giữ được withdrawal.
- `ledger_entries`: mỗi dòng có wallet_id, reference_type/id, entry_type DEBIT/CREDIT, amount, balance_after, idempotency_key unique.
- `payment_transactions`: purpose TOP_UP/BOOKING_DEPOSIT/BOOKING_FINAL_PAYMENT; status PENDING/SUCCESS/FAILED; wallet_posting_status NOT_POSTED/POSTED; application_status PENDING/APPLIED/REFUND_REQUIRED/REVIEW_REQUIRED.
- `booking_deposits`, `booking_settlements`, `booking_cash_receipts` và các service tương ứng đã có. `retryPendingSettlements` hiện mới là placeholder log.

Không có cột wallets.balance, ledger_entries.debit_wallet_id/credit_wallet_id hoặc bảng transactions/wallet_transactions trong migration đã rà soát. Comment “double-entry” trong entity không đủ chứng minh tất cả nghiệp vụ đã có bút toán đối ứng. Kế hoạch dùng sổ biến động ví hiện có; không yêu cầu xây hệ kế toán mới để hoàn tất sprint.

## Sửa bắt buộc trước khi rút tiền

1. Tách mọi thay đổi tài chính khỏi GET wallet. GET khách hiện cập nhật frozen từ tổng hold booking; GET cả hai vai trò còn sửa trạng thái hold/deposit.
2. Deposit/settlement/refund/compensation cập nhật balance và hold trong transaction nghiệp vụ; không chờ mở màn ví mới đồng bộ.
3. Query tổng frozen lấy mọi hold ACTIVE của ví. Query danh sách booking đang thực hiện phục vụ UI là query riêng.
4. Mở rộng hold_type và withdrawal_request_id bằng migration mới; booking_id nullable chỉ cho hold rút, có CHECK đúng một nguồn và unique withdrawal.
5. Hold đã bồi thường dùng CONSUMED, không ghi COMPENSATED_TO_MUA vào CHECK wallet_holds hiện tại. Lý do bồi thường thuộc deposit/ledger.
6. Lịch sử resolve reference theo loại; TOP_UP/paymentId không được tra thành booking có cùng ID.
7. Khóa thống nhất và tạo ví lần đầu chống race; không dùng kiểm tra exists đơn lẻ để thay unique constraint.

## Quy ước ghi sổ mới

Bổ sung balance_bucket AVAILABLE/FROZEN và snapshot trước/sau nullable cho tương thích ledger cũ. Giữ DEBIT/CREDIT trong entry_type, ghi nguồn nghiệp vụ ở reference_type.

| Nghiệp vụ | Biến động bucket | Key gợi ý |
| --- | --- | --- |
| TOP_UP thành công | CREDIT AVAILABLE | topup:{paymentId}:available |
| Giữ rút | DEBIT AVAILABLE + CREDIT FROZEN | withdrawal:{id}:hold:available / :frozen |
| Giải phóng khoản rút | DEBIT FROZEN + CREDIT AVAILABLE | withdrawal:{id}:release:available / :frozen |
| Rút đã đối soát | DEBIT FROZEN | withdrawal:{id}:consume |
| Hoàn cọc | DEBIT FROZEN + CREDIT AVAILABLE | giữ key credit refund:booking:{id} tương thích; thêm leg frozen riêng |
| Hoàn khoản thu chưa áp dụng | CREDIT AVAILABLE | payment-return:{paymentId}:available |

Mỗi nghiệp vụ và mọi leg commit cùng balance/hold/status. UI gom leg giữ/hoàn thành một mục, không hiển thị thành hai lần rút/nạp. Không diễn giải lại ledger cũ bằng quy tắc bucket mới khi chưa có snapshot. Chi tiết payment-return và kiểm nguồn ở mục D kế hoạch chính.

## Invariant và nghiệm thu

- [ ] Available/frozen không âm; frozen khớp tổng hold ACTIVE; không clamp về 0 để che thiếu tiền.
- [ ] Hold/release không thay tổng available+frozen; tiền rút thành công chỉ giảm frozen một lần.
- [ ] TOP_UP credit đúng một lần; payment SUCCESS tồn tại độc lập với lỗi posting.
- [ ] Refund được kiểm operation key/hold dưới khóa trước khi cộng tiền; cạnh tranh settlement không chi hai phía.
- [ ] Booking deposit/final/cash settlement/compensation giữ nghiệp vụ hiện có sau refactor.
- [ ] Payment cũ/hold lệch được báo cáo và xử lý có bằng chứng; không backfill tiền tự động từ trạng thái UI.
- [ ] Test tích hợp PostgreSQL chứng minh rollback, unique và khóa; unit test mock hiện hữu chỉ là lớp kiểm thử logic.

Các file nguồn, API đề xuất, thứ tự khóa, công việc W01/W02/W08 và ma trận test được ghi trong [kế hoạch chính](wallet_topup_manual_withdrawal_plan.md).
