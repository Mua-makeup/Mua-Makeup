# Sprint 5 Backlog

- [ ] [ISSUE-22.1] [Phân Vùng Ví 7 Bảng - Khởi tạo Schema Sổ Cái Kế Toán Đúp & Cơ Chế Escrow Tự Động](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/backlogs/sprint5/user_story_double_entry_ledger_and_escrow.md)
  - [ ] [ISSUE-22.2] Module Quản lý Số dư khả dụng & Số dư phong tỏa trong Bảng `wallet_schema.wallets`.
  - [ ] [ISSUE-22.3] Bảng Sổ cái Kế toán Đúp (`ledger_entries`) hạch toán Nợ (`DEBIT`) / Có (`CREDIT`) đối ứng cân bằng.
  - [ ] [ISSUE-22.4] Bảng Sao kê Biến động số dư từng ví (`wallet_transactions`) lưu vết giao dịch CREDIT/DEBIT/FREEZE.
  - [ ] [ISSUE-22.5] Cơ chế Escrow Tự động: Giữ cọc -> Giải ngân Ví Thợ/Studio -> Cắt % Hoa hồng Sàn trong 1 `@Transactional`.
- [ ] [ISSUE-23.1] [Cổng Thanh Toán Đa Phương Thức (MoMo, VNPay, ZaloPay, VietQR) Nạp Tiền Vào Ví](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/backlogs/sprint5/user_story_payment_gateways_and_payout.md)
  - [ ] [ISSUE-23.2] Tích hợp Cổng thanh toán MoMo API (Khởi tạo QR & Webhook IPN xử lý giao dịch).
  - [ ] [ISSUE-23.3] Tích hợp Cổng thanh toán VNPay API (VNPay Sandbox Checkout & IPN Callback).
  - [ ] [ISSUE-23.4] Tích hợp Cổng thanh toán ZaloPay & Phương thức VietQR Nạp tiền Ví.
- [ ] [ISSUE-24.1] Quản Lý Tài Khoản Ngân Hàng & Quy Trình Giải Ngân Payout Cho Thợ / Studio
  - [ ] [ISSUE-24.2] Bảng Quản lý Tài khoản Ngân hàng chính chủ đã liên kết (`user_bank_accounts`).
  - [ ] [ISSUE-24.3] Bảng Yêu cầu Rút tiền (`withdrawal_requests`) & Payout API giải ngân Ngân hàng.
  - [ ] [ISSUE-24.4] Dashboard Quản lý Duyệt Yêu cầu Rút tiền cho Admin / Studio Web Portal.

