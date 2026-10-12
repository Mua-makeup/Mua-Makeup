# Agency Staff Commission Split & Payout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng tính năng phân chia hoa hồng tự động và minh bạch giữa Thợ chính (`PRIMARY_MUA`) và Thợ phụ (`ASSISTANT_MUA`) cho các đơn hàng của Studio/Agency sau khi hoàn thành ca, hiển thị đầy đủ lý do, tỷ lệ, số tiền và trạng thái giải ngân ví đối với từng thợ.

**Architecture:** Mở rộng bảng `booking_schema.booking_staff_assignments` bằng Flyway migration để lưu vết `commission_rate`, `commission_amount`, `commission_note`, `payout_status`, `payout_at`. Mở rộng `AgencyDispatchService` tự động snapshot hoa hồng khi phân công thợ và bổ sung API cập nhật điều chỉnh hoa hồng. Mở rộng `BookingSettlementService` giải ngân vào ví từng thợ trong cùng 1 transaction ACID khi ca hoàn tất. Cập nhật frontend `AgencyBookingDetailModal.jsx` hiển thị ma trận phân bổ hoa hồng (Commission Split Matrix) chi tiết.

**Tech Stack:** Java 17, Spring Boot 3.3, PostgreSQL 16 (booking_schema, wallet_schema), JPA Hibernate, React 18, Vite, Tailwind CSS, Zod, Zustand i18n.

**Spec:** [docs/frontend_admin_agency_specification.md](file:///e:/Trung/Code/IOC%20Internship/Mua-Makeup/docs/frontend_admin_agency_specification.md), User Request 2026-10-12.

## Global Constraints
- **Teamwork Migration Standard**: Tên migration bắt buộc `V20261012142000__Agency_Staff_Commission_Split_And_Payout.sql`. Tuyệt đối không sửa file migration cũ.
- **AI Rule 4**: Tuyệt đối KHÔNG tạo/sửa file trong `src/test/`. Kiểm tra chất lượng qua `./gradlew compileJava` và frontend lint/build.
- **Layered Architecture**: Controller mỏng, 100% logic ở Service, Manual Mapper qua Spring `@Component`.
- **Clean Imports Standard**: Import tường minh mọi class ở đầu file, không dùng Fully Qualified Class Name trong thân code.
- **i18n Standard**: Đồng bộ cả `messages_vi.json` / `messages_en.json` (Backend) và `TRANSLATIONS.vi` / `TRANSLATIONS.en` trong `i18n.constant.js` (Frontend).

---

### Task 1: Database Migration - Cấu trúc dữ liệu phân chia hoa hồng đa nhân sự
**Files:**
- Create: `code/backend/core-api/src/main/resources/db/migration/V20261012142000__Agency_Staff_Commission_Split_And_Payout.sql`

**Interfaces:**
- Thêm vào `booking_schema.booking_staff_assignments`:
  - `commission_rate DECIMAL(5, 2)`: Tỷ lệ % hoa hồng áp dụng cho thợ này trong ca
  - `commission_amount DECIMAL(15, 2)`: Số tiền hoa hồng tính ra (VNĐ)
  - `commission_note TEXT`: Căn cứ / Lý do tính hoa hồng (VD: Thỏa thuận cá nhân 30%, Hỗ trợ bới tóc 10%)
  - `payout_status VARCHAR(20) DEFAULT 'PENDING'`: Trạng thái chi trả (`PENDING`, `SETTLED`, `CANCELLED`)
  - `payout_at TIMESTAMP WITH TIME ZONE`: Thời điểm ghi nhận giải ngân ví

- [ ] **Step 1: Viết script Flyway migration**
```sql
-- V20261012142000__Agency_Staff_Commission_Split_And_Payout.sql
ALTER TABLE booking_schema.booking_staff_assignments
    ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 0.00 CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(15, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS commission_note TEXT,
    ADD COLUMN IF NOT EXISTS payout_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (payout_status IN ('PENDING', 'SETTLED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS payout_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN booking_schema.booking_staff_assignments.commission_rate IS 'Tỷ lệ % hoa hồng thợ được hưởng trong ca làm này';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.commission_amount IS 'Số tiền hoa hồng tính ra (VNĐ) cho thợ trong ca';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.commission_note IS 'Lý do / căn cứ phân chia hoa hồng cho thợ này';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.payout_status IS 'Trạng thái giải ngân hoa hồng vào ví: PENDING, SETTLED, CANCELLED';
COMMENT ON COLUMN booking_schema.booking_staff_assignments.payout_at IS 'Thời điểm hoàn tất chuyển tiền hoa hồng vào ví thợ';
```

---

### Task 2: Cập nhật Entity, DTO, Mapper Backend
**Files:**
- Modify: `code/backend/core-api/src/main/java/com/makeup/platform/entity/booking/BookingStaffAssignmentEntity.java`
- Modify: `code/backend/core-api/src/main/java/com/makeup/platform/dto/response/agency/StaffAssignmentDetailRes.java`
- Create: `code/backend/core-api/src/main/java/com/makeup/platform/dto/request/agency/UpdateStaffCommissionSplitReq.java`
- Create: `code/backend/core-api/src/main/java/com/makeup/platform/dto/request/agency/StaffCommissionSplitItem.java`
- Modify: `code/backend/core-api/src/main/java/com/makeup/platform/mapper/booking/BookingStaffAssignmentMapper.java`
- Modify: `code/backend/core-api/src/main/java/com/makeup/platform/mapper/agency/AgencyBookingMapper.java`

**Interfaces:**
- `BookingStaffAssignmentEntity`: Bổ sung fields `commissionRate`, `commissionAmount`, `commissionNote`, `payoutStatus`, `payoutAt`
- `StaffAssignmentDetailRes`: Bổ sung các getter/setter tương ứng
- `UpdateStaffCommissionSplitReq`: DTO nhận danh sách các thợ kèm `staffId`, `commissionRate`, `commissionAmount`, `commissionNote`
- `BookingStaffAssignmentMapper`: Chuyển đổi đầy đủ thông tin hoa hồng ra `StaffAssignmentDetailRes`
- `AgencyBookingMapper`: Tính tổng `estimatedStaffCommission` là tổng hoa hồng của tất cả thợ (`sum(commissionAmount)`), và `estimatedStudioNet = totalAmount - totalStaffCommission`

- [ ] **Step 1: Cập nhật `BookingStaffAssignmentEntity.java`**
- [ ] **Step 2: Cập nhật `StaffAssignmentDetailRes.java`**
- [ ] **Step 3: Tạo `UpdateStaffCommissionSplitReq.java` & `StaffCommissionSplitItem.java`**
- [ ] **Step 4: Cập nhật `BookingStaffAssignmentMapper.java`**
- [ ] **Step 5: Cập nhật `AgencyBookingMapper.java` tính toán đa nhân sự**

---

### Task 3: Nghiệp vụ Điều phối, Cập nhật Hoa hồng & Quyết toán Ví (`AgencyDispatchService` & `BookingSettlementService`)
**Files:**
- Modify: `code/backend/core-api/src/main/java/com/makeup/platform/service/agency/AgencyDispatchService.java`
- Modify: `code/backend/core-api/src/main/java/com/makeup/platform/service/agency/impl/AgencyDispatchServiceImpl.java`
- Modify: `code/backend/core-api/src/main/java/com/makeup/platform/controller/agency/AgencyDispatchController.java`
- Modify: `code/backend/core-api/src/main/java/com/makeup/platform/service/wallet/impl/BookingSettlementServiceImpl.java`
- Modify: `code/backend/core-api/src/main/resources/i18n/messages_vi.json`
- Modify: `code/backend/core-api/src/main/resources/i18n/messages_en.json`

**Interfaces:**
- `AgencyDispatchService.updateStaffCommissions(Long userId, Long bookingId, UpdateStaffCommissionSplitReq req)`
- Khi điều phối (`assignStaff`):
  - Thợ chính: `commissionRate` lấy từ `primaryStaff.getAgreedCommissionRate()` (hoặc `agency.getCommissionRateInternal()`), `commissionNote` = "Thợ chính - Hợp đồng cá nhân " + rate + "%".
  - Thợ phụ: `commissionRate` lấy từ `astStaff.getAgreedCommissionRate()` hoặc mặc định `10.0%`, `commissionNote` = "Thợ phụ - Hỗ trợ dịch vụ " + rate + "%".
  - Tự động tính `commissionAmount = totalAmount * commissionRate / 100`.
- Khi quyết toán (`BookingSettlementServiceImpl.settleBooking` & `settleBookingOnlinePayment`):
  - Kiểm tra nếu `booking.getStaffAssignments()` có danh sách active:
    - Duyệt qua từng assignment:
    - Tìm ví thợ (`assignment.getStaff().getMua().getUser().getId()`).
    - Ghi có số tiền `commissionAmount` vào ví.
    - Tạo `LedgerEntryEntity` với mô tả: `"Quyết toán ca #" + bookingCode + " - " + roleLabel + " (" + commissionNote + ")"`.
    - Đánh dấu `assignment.payoutStatus = 'SETTLED'`, `assignment.payoutAt = OffsetDateTime.now()`.
  - Nếu không có staff assignments (đơn thợ freelance thông thường): giữ nguyên luồng cũ.

- [ ] **Step 1: Bổ sung method điều chỉnh hoa hồng trong `AgencyDispatchService` & `AgencyDispatchController`**
- [ ] **Step 2: Cập nhật snapshot hoa hồng khi phân công trong `AgencyDispatchServiceImpl.java`**
- [ ] **Step 3: Cập nhật quyết toán ví đa nhân sự trong `BookingSettlementServiceImpl.java`**
- [ ] **Step 4: Bổ sung i18n messages backend**
- [ ] **Step 5: Chạy `./gradlew compileJava` kiểm tra biên dịch thành công**

---

### Task 4: Frontend UI - Hiển thị Ma trận Hoa hồng & Điều chỉnh trong Agency Admin
**Files:**
- Modify: `code/frontend/src/services/agency.service.js`
- Create: `code/frontend/src/components/features/agency/StaffCommissionSplitMatrix.jsx`
- Create: `code/frontend/src/components/features/agency/EditStaffCommissionSplitModal.jsx`
- Modify: `code/frontend/src/components/features/agency/AgencyBookingDetailModal.jsx`
- Modify: `code/frontend/src/constants/i18n.constant.js`

**Interfaces:**
- `agencyService.updateStaffCommissions(bookingId, payload)`: `PUT /api/v1/agency/dispatch/bookings/{bookingId}/staff-commissions`
- `StaffCommissionSplitMatrix.jsx`:
  - Hiển thị bảng chi tiết:
    - Thợ & Vai trò (Badge Thợ chính vàng / Thợ phụ tím)
    - Căn cứ & Lý do tính (ví dụ: "Thợ chính - Hợp đồng cá nhân 30.0%", "Thợ phụ 1 - Hỗ trợ bới tóc 10.0%")
    - Tỷ lệ % & Số tiền hoa hồng (VNĐ)
    - Trạng thái giải ngân ví (`PENDING`: Chờ hoàn thành ca, `SETTLED`: Đã giải ngân vào ví)
  - Nút "Điều chỉnh hoa hồng ca làm" (chỉ hiển thị khi đơn chưa hoàn tất hoặc cần điều chỉnh số liệu)
- `EditStaffCommissionSplitModal.jsx`: Cho phép Studio Admin chỉnh % hoặc số tiền và lý do/ghi chú cho từng thợ trước khi nghiệm thu hoàn tất.
- `i18n.constant.js`: Thêm key song ngữ cho tất cả các nhãn mới.

- [ ] **Step 1: Cập nhật `agency.service.js`**
- [ ] **Step 2: Viết `StaffCommissionSplitMatrix.jsx`**
- [ ] **Step 3: Viết `EditStaffCommissionSplitModal.jsx`**
- [ ] **Step 4: Tích hợp vào `AgencyBookingDetailModal.jsx`**
- [ ] **Step 5: Thêm key i18n song ngữ vào `i18n.constant.js`**
- [ ] **Step 6: Kiểm tra syntax và build frontend qua `npm run build` hoặc linting**

---

### Task 5: Kiểm tra và nghiệm thu tổng thể
- [ ] **Step 1: Chạy `./gradlew compileJava`**
- [ ] **Step 2: Kiểm tra frontend bundle (`npm run build` / lint)**
- [ ] **Step 3: Báo cáo kết quả và trình người dùng nghiệm thu (Accept)**
