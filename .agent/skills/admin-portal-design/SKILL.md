---
name: admin-portal-design
description: Professional, clean, and minimalist UI/UX design and development standards for Super Admin and Agency Admin portals in the Makeup Booking Platform (React + Vite + TailwindCSS + Zod).
version: 1.0.0
tags: [frontend, react, admin, agency, clean-ui, minimalist, dashboard, tailwind]
---

# Admin & Agency Portal Design Skill: Clean, Minimalist & Data-Dense Dashboard

## 1. Tôn Chỉ Thiết Kế (Design Principles)
Khác với giao diện ứng dụng khách hàng (B2C) cần nhiều cảm xúc nghệ thuật, giao diện dành cho **Super Admin** và **Agency Admin** là công cụ làm việc và quản trị hàng ngày, đòi hỏi:
- **Tối Giản & Sạch Sẽ (Clean & Minimalist)**: Tránh tối đa mọi chi tiết trang trí thừa thãi, hiệu ứng nhấp nháy hay màu sắc lòe loẹt gây mỏi mắt.
- **Mật Độ Dữ Liệu Cao (High Data-Density)**: Tối ưu không gian hiển thị danh sách, bảng biểu, bộ lọc và biểu đồ để người quản trị nắm bắt thông tin nhanh chóng.
- **Phản Hồi Trực Quan & Rõ Ràng**: Các trạng thái Thành công, Chờ duyệt, Từ chối, Xung đột giờ phải được biểu thị bằng mã màu chuẩn mực, dễ nhận diện.

---

## 2. Bảng Token Màu & Kiểu Chữ (Design Tokens)

### 2.1. Màu Nền & Đường Viền (Neutral Surfaces)
```text
Nền trang (Body Canvas)     : bg-slate-50 (#F8FAFC)
Nền thẻ & Bảng (Card / Table): bg-white (#FFFFFF)
Đường phân cách (Borders)   : border-slate-200 (#E2E8F0)
Đường viền mờ (Dividers)    : border-slate-100 (#F1F5F9)
Hover hàng dữ liệu          : hover:bg-slate-50/80
```

### 2.2. Kiểu Chữ (Typography)
- Font: Inter / Roboto / System Sans-serif chuẩn mực.
- Tiêu đề Trang (Page Title): `text-xl font-bold text-slate-900 tracking-tight`.
- Tiêu đề Card / Thẻ: `text-sm font-semibold text-slate-800`.
- Nội dung bảng (Table Text): `text-sm text-slate-600 font-normal`.
- Nhãn phụ / Thời gian (Meta): `text-xs text-slate-400`.

### 2.3. Trạng Thái Ngữ Nghĩa (Status Badges)
```jsx
// Active / Approved (Xanh lá)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
  Hoạt động
</span>

// Pending / Waiting (Vàng cam)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
  Chờ phê duyệt
</span>

// Rejected / Error / Overlap (Đỏ)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
  Từ chối / Xung đột
</span>

// Inactive / Draft (Xám)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
  Tạm ngưng
</span>
```

---

## 3. Mẫu Thiết Kế Các Thành Phần Phổ Biến (Standard Components)

### 3.1. Thẻ Chỉ Số KPI (Dashboard Metric Card)
```jsx
export const MetricCard = ({ title, value, subtext, icon: Icon, trend }) => (
  <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
    </div>
    {Icon && (
      <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
        <Icon className="w-5 h-5" />
      </div>
    )}
  </div>
);
```

### 3.2. Bảng Dữ Liệu Tối Giản (Minimal DataTable)
```jsx
export const DataTable = ({ columns, data, isLoading, emptyMessage }) => {
  if (isLoading) return <TableSkeleton />;
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-500 text-sm">
        {emptyMessage || 'Không có dữ liệu hiển thị'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-100/75 text-xs font-semibold uppercase text-slate-600">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3 tracking-wider">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {data.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
              {columns.map((col, cIdx) => (
                <td key={cIdx} className="px-4 py-3 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 3.3. Thanh Tìm Kiếm & Bộ Lọc Nhanh (Filter Toolbar)
```jsx
export const FilterToolbar = ({ searchPlaceholder, onSearch, filters = [] }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
    <div className="relative flex-1 min-w-[240px] max-w-md">
      <input
        type="text"
        placeholder={searchPlaceholder || 'Tìm kiếm...'}
        onChange={(e) => onSearch?.(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
      />
    </div>
    <div className="flex items-center gap-2">
      {filters.map((f, idx) => (
        <select
          key={idx}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
        >
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  </div>
);
```

---

## 4. Kiểm Thử Trải Nghiệm Người Dùng (UX Checklist)
- [ ] Bảng dữ liệu có phân trang gọn gàng (kích thước trang mặc định: 10 hoặc 15 dòng).
- [ ] Không xuất hiện thanh cuộn ngang trang (Horizontal Scroll) ngoài vùng chứa bảng.
- [ ] Mọi nút bấm thao tác hủy hoặc xóa có màu đỏ nhạt/viền đỏ cảnh báo, không gây nhầm lẫn với nút lưu.
- [ ] Modal mở nhanh, không giật màn hình, có nút đóng "x" rõ ràng và phím tắt `Esc` để thoát.
