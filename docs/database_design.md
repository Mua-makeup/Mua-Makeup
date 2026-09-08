# PHÂN TÍCH & GIẢI PHÁP THIẾT KẾ CƠ SỞ DỮ LIỆU CHUYÊN SÂU
## MÔ HÌNH PHÂN QUYỀN RBAC 4 BẢNG, VÍ 7 BẢNG & BẢNG KỸ NĂNG PHONG CÁCH (`agency_staff_styles`)

---

## 🔒 1. MÔ HÌNH PHÂN QUYỀN NGUYÊN BẢN 4 BẢNG (GRANULAR RBAC PERMISSION MODEL)

Mô hình phân quyền bạn yêu cầu:
```
  [users] ──(1:N)──> [user_roles] <──(N:1)── [roles] ──(1:N)──> [role_permissions]
```

👉 **MÔ HÌNH PHÂN QUYỀN CHUẨN ĐẦU BẢNG TRONG NGÀNH CÔNG NGHỆ (Spring Security / Auth0 / Keycloak / Casbin Standard)!**

### **Cấu trúc 4 Bảng Phân quyền RBAC:**
1. **`users`**: Quản lý thông tin tài khoản dùng chung cho cả Khách hàng, Thợ tự do, Chủ Studio và Nhân viên Studio (Khóa chính `BIGINT Identity`).
2. **`roles`**: Danh mục các Vai trò chính trong hệ thống (`ROLE_CUSTOMER`, `ROLE_FREELANCE_MUA`, `ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`, `ROLE_SUPER_ADMIN`).
3. **`user_roles`**: Bảng nối N-N liên kết tài khoản với một hoặc nhiều Vai trò (Ví dụ: Một tài khoản vừa là `ROLE_CUSTOMER` vừa là `ROLE_FREELANCE_MUA`).
4. **`role_permissions`**: Bảng định nghĩa các **Quyền hạn chi tiết (Granular Permissions)** cấp cho từng Vai trò (`permission_code` ví dụ: `booking:create`, `booking:dispatch`, `agency:invite_staff`, `wallet:withdraw`, `wallet:view_balance`).

---

## 🎨 2. QUẢN LÝ NĂNG LỰC THỢ THEO PHONG CÁCH MAKE-UP (`agency_staff_styles`)

Năng lực của thợ make-up phụ thuộc vào 2 chiều độc lập:
1. **Loại Dịch vụ / Gói làm được (`agency_staff_services`)**: Gói Cô dâu, Gói đi tiệc, Gói kỷ yếu...
2. **Phong cách / Tone Make-up gẩy sợi được (`agency_staff_styles`)**: Tone Douyin, Tone Thái, Tone Hàn, Tone Tây, Tone Hồng Baby...

### **Cấu trúc SQL Bảng Kỹ năng Phong cách:**
```sql
CREATE TABLE agency_staff_styles (
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    style_id INT REFERENCES makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (staff_id, style_id)
);
CREATE INDEX idx_agency_staff_styles ON agency_staff_styles(staff_id, style_id, is_qualified);
```

### **Truy vấn SQL Lọc Thợ Khả dụng khi Khách đặt [Gói + Tone Make-up]:**
```sql
-- Ví dụ: Đặt Gói Cô Dâu (package_id = 1) và yêu cầu Tone Thái (style_id = 2)
SELECT s.id, u.full_name
FROM agency_staff s
JOIN users u ON s.mua_id = u.id
-- 1. Kiểm tra thợ có làm được Gói Cô Dâu không
JOIN agency_staff_services ass ON s.id = ass.staff_id 
    AND ass.package_id = 1 
    AND ass.is_qualified = TRUE
-- 2. Kiểm tra thợ có đánh được Tone Thái không
JOIN agency_staff_styles ast ON s.id = ast.staff_id 
    AND ast.style_id = 2 
    AND ast.is_qualified = TRUE;
```

---

## 🖼️ 3. QUẢN LÝ ALBUM ẢNH HOÀN THIỆN THEO GÓI & TONE MAKE-UP (`staff_portfolio_showcases`)

Bảng **`staff_portfolio_showcases`** liên kết linh hoạt giữa Thợ (`staff_id` hoặc `mua_id`), Gói dịch vụ (`package_id`) và Tone Make-up (`style_id`) để lưu các hình ảnh sản phẩm make-up hoàn thiện của khách hàng trước đó:

```sql
CREATE TABLE staff_portfolio_showcases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    staff_id BIGINT REFERENCES agency_staff(id) ON DELETE CASCADE,
    mua_id BIGINT REFERENCES mua_profiles(id) ON DELETE CASCADE,
    package_id BIGINT REFERENCES service_packages(id) ON DELETE SET NULL,
    style_id INT REFERENCES makeup_styles(id) ON DELETE SET NULL,
    title VARCHAR(150),
    image_url TEXT NOT NULL,                  -- Ảnh sản phẩm make-up hoàn thiện của khách trước đó
    additional_images JSONB DEFAULT '[]'::jsonb, -- Album ảnh bổ sung (các góc chụp khác)
    description TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_portfolio_showcase_lookup ON staff_portfolio_showcases(staff_id, mua_id, package_id, style_id);
```

### **Truy vấn Lấy Album Ảnh Mẫu Hoàn Thiện của Thợ A cho Gói Cô Dâu + Tone Thái:**
```sql
SELECT title, image_url, additional_images, description
FROM staff_portfolio_showcases
WHERE (staff_id = :staffId OR mua_id = :muaId)
  AND (package_id = 1 OR package_id IS NULL)
  AND (style_id = 2 OR style_id IS NULL)
ORDER BY is_featured DESC, created_at DESC;
```

---

## 💳 4. KIẾN TRÚC PHÂN VÙNG VÍ ĐIỆN TỬ & THANH TOÁN 7 BẢNG (DOUBLE-ENTRY LEDGER ARCHITECTURE)

Hệ thống quản lý Ví & Thanh toán được phân rã thành **7 Bảng dữ liệu chuyên biệt** thuộc `payment_service` để đảm bảo tính an toàn giao dịch tối đa (ACID), khả năng mở rộng Fintech và khả năng kiểm toán tài chính 100% không thể thất thoát:

```
                  ┌──────────────────────┐
                  │ payment_transactions │  (MoMo / VNPay / ZaloPay / Banking)
                  └──────────┬───────────┘
                             │ (1:1)
                  ┌──────────▼───────────┐
                  │     transactions     │  (Business Transaction Master)
                  └─────┬──────────┬─────┘
                        │ (1:N)    │ (1:N)
   ┌────────────────────▼─┐      ┌─▼───────────────────┐
   │ wallet_transactions  │      │   ledger_entries    │  (Sổ cái Kế toán Đúp: Nợ/Có)
   └──────────┬───────────┘      └─────────┬───────────┘
              │ (N:1)                      │ (N:1)
              └────────────┐     ┌─────────┘
                           │     │
                        ┌──▼─────▼──┐
                        │  wallets  │  (Số dư Ví Khách / Ví Thợ / Ví Studio / Ví Sàn)
                        └──▲─────▲──┘
                           │     │
   ┌───────────────────────┴─┐   └─────────────────────────┐
   │  withdrawal_requests    │   │   user_bank_accounts    │ (Ngân hàng chính chủ)
   └─────────────────────────┘   └─────────────────────────┘
```

### **Chi tiết 7 Bảng Dữ liệu Ví Điện Tử:**
1. **`wallets`**: Lưu trữ số dư khả dụng (`balance`) và số dư bị đóng băng (`frozen_balance`) của các bên (Khách hàng, Thợ tự do, Studio/Đại lý, Ví hệ thống Sàn).
2. **`user_bank_accounts`**: Lưu trữ danh sách Tài khoản Ngân hàng chính chủ đã liên kết (Tên ngân hàng, Số tài khoản, Tên chủ tài khoản, Trạng thái mặc định).
3. **`withdrawal_requests`**: Quản lý các yêu cầu Rút tiền từ Ví về Ngân hàng (Mã `WTH-...`, số tiền rút, phí rút tiền, số tiền thực nhận, trạng thái duyệt PENDING / SUCCESS / REJECTED).
4. **`payment_transactions`**: Quản lý các giao dịch nạp tiền/thanh toán trực tiếp qua Cổng thanh toán bên ngoài (MoMo, VNPay, ZaloPay, VietQR, Tiền mặt). Lưu mã tham chiếu Cổng (`gateway_transaction_id`), QR code và trạng thái webhook.
5. **`transactions`**: Bảng Master ghi nhận mọi loại giao dịch nghiệp vụ trong hệ thống (`DEPOSIT`, `WITHDRAWAL`, `ESCROW_LOCK`, `ESCROW_RELEASE`, `PLATFORM_COMMISSION`, `REFUND`, `TIP`).
6. **`wallet_transactions`**: Sao kê chi tiết biến động số dư của từng Ví (`balance_before`, `balance_after`, `entry_type`: `CREDIT` / `DEBIT` / `FREEZE` / `UNFREEZE`).
7. **`ledger_entries`**: Bảng Sổ cái Kế toán Đúp (Double-Entry General Ledger). Mọi dòng tiền chuyển từ Ví A sang Ví B đều được ghi nhận song song: **Bên Nợ (`debit_wallet_id`)** và **Bên Có (`credit_wallet_id`)**, đảm bảo Tổng Nợ luôn bằng Tổng Có trên toàn hệ thống.
