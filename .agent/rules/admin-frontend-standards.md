# Quy Chuẩn Bắt Buộc: Frontend Super Admin & Agency Admin (Clean & Minimalist Standards)

## 1. Triết Lý Thiết Kế & Trải Nghiệm Người Dùng (UI/UX Principles)
Giao diện dành riêng cho **Super Admin (`ROLE_SUPER_ADMIN`)** và **Agency Admin (`ROLE_AGENCY_ADMIN`)** là cổng thông tin quản trị và điều phối nghiệp vụ nội bộ, do đó bắt buộc tuân thủ:

### 1.1. Tôn Chỉ: Tối Giản, Thực Dụng, Trực Quan (No Flashy / Gaudy UI)
- **Tuyệt đối KHÔNG lòe loẹt**: Cấm dùng nền đen tuyền phát sáng neon, cấm dùng hiệu ứng kính mờ (glassmorphism/backdrop-blur) gây nhòe và lag bảng dữ liệu, cấm gradient màu chói chang.
- **Nền & Khung trung tính cao cấp**:
  - Toàn bộ nền trang (Body): `bg-slate-50` (`#F8FAFC`).
  - Card & Bảng dữ liệu (Surface): `bg-white` (`#FFFFFF`) kết hợp viền mỏng phẳng `border border-slate-200`.
  - Không lạm dụng bóng đổ (Shadow); chỉ dùng bóng cực nhẹ `shadow-sm` cho Card và `shadow-md` cho Dropdown / Modal.
- **Màu sắc ngữ nghĩa rõ ràng (Semantic Palette)**:
  - Điểm nhấn chính (Primary Action): `bg-rose-600 hover:bg-rose-700 text-white`.
  - Nút phụ (Secondary Action): `bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200`.
  - Trạng thái Thành công / Hoạt động: `bg-emerald-50 text-emerald-700 border-emerald-200`.
  - Trạng thái Chờ duyệt / Cảnh báo: `bg-amber-50 text-amber-700 border-amber-200`.
  - Trạng thái Nguy hiểm / Từ chối / Xóa: `bg-rose-50 text-rose-700 border-rose-200`.
  - Trạng thái Không hoạt động / Bản nháp: `bg-slate-100 text-slate-600 border-slate-200`.
- **Tập trung vào Dữ liệu (Data-Density)**: Khoảng cách dòng (padding/margin) vừa phải, cỡ chữ hiển thị 13px - 14px cho bảng dữ liệu, số liệu thống kê to rõ, nhãn dán mạch lạc.

---

## 2. Quy Chuẩn Cấu Trúc Thư Mục Frontend Bắt Buộc

Mọi file mã nguồn trong `code/frontend/src/` liên quan đến Admin và Agency phải được đặt đúng vị trí phân quyền:

```text
code/frontend/src/
├── api/
│   ├── superAdminApi.js               # Gọi các endpoint /api/v1/admin/*, /api/v1/master-categories, v.v.
│   └── agencyApi.js                   # Gọi các endpoint /api/v1/agencies/*, /api/v1/packages/*, /api/v1/surcharges/*
├── schemas/
│   ├── superAdminSchema.js            # Zod validation cho tác vụ Super Admin (Duyệt chứng chỉ, sửa taxonomy)
│   └── agencySchema.js                # Zod validation cho tác vụ Agency (Profile, Gói dịch vụ, Phụ phí, Ca làm)
├── constants/
│   ├── superAdminConstants.js         # Hằng số, tab, enum trạng thái duyệt
│   └── agencyConstants.js             # Hằng số ngày trong tuần, loại phụ phí, trạng thái thợ
├── store/
│   ├── useSuperAdminStore.js          # Zustand store cho Super Admin
│   └── useAgencyStore.js              # Zustand store cho Agency Admin
├── components/
│   ├── base/                          # Button, Input, Select, Badge, DataTable, Modal, ConfirmDialog, Skeleton
│   └── features/
│       ├── admin/                     # Component con của Super Admin (Bảng duyệt chứng chỉ, Modal soi bằng)
│       └── agency/                    # Component con của Agency (Form gói dịch vụ, Modal QR mời thợ, Ma trận ca)
├── layouts/
│   ├── AdminLayout.jsx                # Khung trang Super Admin (Sidebar Admin + Header)
│   └── AgencyLayout.jsx               # Khung trang Agency Admin (Sidebar Agency + Header)
├── pages/
│   ├── SuperAdmin/                    # Trang Super Admin (Dashboard, MuaVerification, TaxonomyManagement)
│   └── Agency/                        # Trang Agency Admin (Dashboard, Profile, Packages, Surcharges, Staff, Shifts)
└── routes/
    ├── ProtectedRoute.jsx             # Kiểm tra đăng nhập
    └── RoleBasedRoute.jsx             # Chặn truy cập theo quyền (ROLE_SUPER_ADMIN vs ROLE_AGENCY_ADMIN)
```

---

## 3. Quy Tắc Code & Ràng Buộc Kỹ Thuật

1. **100% Form qua Zod Schema**: Mọi form nhập liệu (Profile, Gói dịch vụ, Phụ phí, Ca trực, Ghi chú từ chối duyệt) bắt buộc phải có Zod schema tại `src/schemas/` và gắn kèm thông điệp lỗi tiếng Việt thân thiện.
2. **Tách biệt Service Layer**: Tuyệt đối không gọi trực tiếp `axios.get/post` trong thân component của trang. Phải định nghĩa hàm trong `src/api/` hoặc `src/services/` và import vào sử dụng.
3. **Xử lý 3 trạng thái giao diện**: Mọi màn hình tải dữ liệu danh sách từ API bắt buộc phải có:
   - Trạng thái Đang tải (`isLoading`): Hiển thị `Skeleton` màu slate nhạt, không dùng icon loading quay tròn đơn điệu.
   - Trạng thái Rỗng (`data.length === 0`): Hiển thị thẻ trống tối giản kèm thông điệp *"Không tìm thấy bản ghi phù hợp"*.
   - Trạng thái Lỗi (`isError`): Hiển thị Toast thông báo lỗi hoặc Alert box rõ ràng kèm nút "Thử lại".
4. **Hộp thoại xác nhận (Confirm Dialog)**: Mọi hành động có tính rủi ro hoặc thay đổi trạng thái quan trọng (Xóa gói dịch vụ, Từ chối chứng chỉ thợ, Hủy ca trực) BẮT BUỘC phải mở `ConfirmDialog` hỏi người dùng xác nhận trước khi gửi request.
5. **Chặn lỗi phân quyền ngay trên Giao diện**:
   - Tài khoản `ROLE_SUPER_ADMIN` chỉ nhìn thấy menu và vào route của `/admin/*`.
   - Tài khoản `ROLE_AGENCY_ADMIN` chỉ nhìn thấy menu và vào route của `/agency/*`.
   - Nếu cố tình đổi URL, `RoleBasedRoute` phải điều hướng về trang 403 Forbidden hoặc trang chủ của role đó.
