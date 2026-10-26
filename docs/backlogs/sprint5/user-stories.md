# Sprint 5 — Nạp ví VNPay/MoMo, rút thủ công và đối soát

Cập nhật 05/10/2026, dựa trên source, migration và test trong working tree hiện tại. Các checkbox là đầu việc chưa nghiệm thu, không phải khẳng định toàn bộ code còn trống.

## Phạm vi

- Hoàn thiện TOP_UP qua hai adapter VNPAY/MOMO hiện có: nhận tiền → cộng ví đúng một lần → lịch sử.
- CUSTOMER/FREELANCE_MUA rút số dư khả dụng: giữ tiền → SUPER_ADMIN duyệt/chuyển khoản → đối soát.
- Kiểm thử trùng/mất callback, timeout, cạnh tranh số dư, hoàn cọc về ví và hoàn khoản chưa áp dụng.
- Bỏ `ISSUE-23.4` (VietQR/ZaloPay) khỏi Sprint 5. Không thêm provider hoặc API chi hộ tự động.

## Kế hoạch chính

Đọc [kế hoạch triển khai theo code hiện tại](wallet_topup_manual_withdrawal_plan.md) để xem bằng chứng từng file, khoảng trống, migration/API đề xuất, state machine, phụ thuộc và ma trận kiểm thử.

| Mốc | Đầu việc | Điều kiện nghiệm thu |
| --- | --- | --- |
| M1 — Nạp và lịch sử | W01–W04, phần mobile/test liên quan | GET ví không sửa tiền; TOP_UP được ghi đúng một lần; job phục hồi mất callback/posting lỗi |
| M2 — Rút thủ công | W05–W07, phần mobile/test liên quan | Ngân hàng đã xác minh, hold đúng, claim chuyển duy nhất, đối soát trước SUCCESS |
| M3 — Hoàn tiền và kiểm thử | W08, W10 và phần mobile còn lại | Refund/settlement/rút cạnh tranh vẫn nhất quán; regression đạt |

## Danh sách công việc

- [ ] S5-W01 / ISSUE-22.2, 22.5 — Tách mutation khỏi GET ví; sửa hold query/status; chuyển cập nhật frozen về deposit/settlement/refund.
- [ ] S5-W02 / ISSUE-22.3–22.4 — WalletMutationService, snapshot ledger, history theo referenceType và phân trang.
- [ ] S5-W03 / ISSUE-23.1–23.3 — TOP_UP intent idempotent, timeout checkout, giữ request gốc; sửa return đang xử lý/báo thành công từ URL.
- [ ] S5-W04 / ISSUE-23.1 — Confirmation, TopUpPostingService và reconciliation dùng queryTransaction hiện có.
- [ ] S5-W05 / ISSUE-24.2 — Tài khoản ngân hàng của chính user, xác minh thủ công, snapshot người nhận.
- [ ] S5-W06 / ISSUE-24.3 — Yêu cầu rút, hold theo withdrawal, state machine và audit.
- [ ] S5-W07 / ISSUE-24.4 — Web admin duyệt/claim/ghi chuyển/đối soát; hàng đợi payment lỗi.
- [ ] S5-W08 / ISSUE-22.5 — Hoàn cọc đúng một lần; xử lý payment đã thu nhưng chưa áp dụng; không tự gọi refund gateway.
- [ ] S5-W09 / ISSUE-23.1, 24.1 — Mobile nạp/ngân hàng/rút/lịch sử, khôi phục trạng thái khi quay lại app.
- [ ] S5-W10 — Test concurrency trên PostgreSQL, crash/retry, phân quyền, hồi quy booking và nghiệm thu E2E.

## Tài liệu chi tiết

- [Kế hoạch chính và đối chiếu source](wallet_topup_manual_withdrawal_plan.md).
- [User stories nạp và rút](user_story_payment_gateways_and_payout.md).
- [Ví, ledger, hold và hoàn tiền](user_story_double_entry_ledger_and_escrow.md).

Quy ước: payment SUCCESS là đã xác nhận thu; TOP_UP chỉ thành công với người dùng sau POSTED. APPROVED là đã duyệt rút; SUCCESS là đã đối soát chuyển tiền. UNKNOWN luôn giữ tiền chờ xác minh.
