# System-Wide Architecture & Engineering Rules

## 1. Triết lý Kiến trúc Toàn Hệ thống (System Architecture)
Hệ thống được thiết kế theo mô hình **Microservices Architecture** kết hợp với **Single Page Application (SPA)** Frontend:
- **Backend (Spring Boot Ecosystem)**: Hệ thống gồm tập hợp các Microservices độc lập (Core Gateway, Auth, Domain Services: User, Product, Makeup, Order, Booking, Notification...). Mỗi service chịu trách nhiệm cho một Bounded Context riêng biệt.
- **Frontend (React + Vite + JavaScript/JSX)**: Ứng dụng giao diện modularized, chia tách rõ ràng giữa Core/Shared UI và các Feature Modules.
- **Tính tự trị (Service Autonomy)**: Mỗi service có cơ chế quản lý Database, cấu hình (`application.yml`), migration (Flyway), container hóa (Dockerfile, docker-compose) riêng.

---

## 2. Quy chuẩn Bắt buộc cho Backend Microservices
1. **Layered Pattern Chuẩn**:
   - `Controller`: Chỉ tiếp nhận HTTP Request, gọi `@Valid` trên Request DTO, ủy quyền xử lý cho Service Interface. Không viết business logic tại đây.
   - `Service (Interface)` & `Service/impl (Class)`: Tách biệt rõ ràng hợp đồng (contract) và code thực thi logic thực tế.
   - `Repository`: Quản lý truy vấn dữ liệu JPA. Các câu truy vấn Native SQL hoặc Stored Procedure phức tạp phải đặt trong `repository/custom/`.
2. **Kế thừa Base Components**:
   - Mọi `@Entity` đại diện cho bảng dữ liệu bắt buộc kế thừa `BaseEntity` (chứa `id`, `created_at`, `updated_at`).
   - Mọi CRUD Service cơ bản kế thừa `BaseService<T, ID>` và `BaseServiceImpl<T, ID, R>`.
   - Mọi Controller kế thừa `BaseController`.
3. **Data Transfer & Validation**:
   - Tuyệt đối không gửi/nhận trực tiếp JPA Entity qua API.
   - Luôn sử dụng Request DTO (`dto/request/*Req.java`) có Bean Validation (`@NotBlank`, `@NotNull`, `@Min`, `@Max`, `@Email`, `@Pattern`).
   - Luôn trả về Response DTO (`dto/response/*Res.java`) hoặc đối tượng phân trang `PaginatedRes<T>`.
4. **Quản lý Lỗi & Đa ngôn ngữ (i18n)**:
   - Không ném exception thuần không định danh (`throw new RuntimeException()`).
   - Sử dụng `CustomBusinessException(errorCode, message)` kết hợp bắt lỗi tập trung tại `GlobalExceptionHandler`.
   - Không hard-code chuỗi thông báo lỗi tiếng Việt/Anh trực tiếp trong code Java; quản lý thông qua `ResourceBundle` trong `resources/text/messages.properties`.
5. **Database Migration**:
   - Mọi service dùng RDBMS bắt buộc quản lý schema qua **Flyway** (`resources/db/migration/V<Version>__<Description>.sql`). Tuyệt đối tắt `ddl-auto: create/update` trên môi trường production.

---

## 3. Quy chuẩn Bắt buộc cho Frontend (React + Vite + JS)
1. **Ranh giới Module (Boundary Rules)**:
   - Tuân thủ cấu hình `eslint-plugin-boundaries`. Các tầng tiện ích (`schemas/`, `utils/`, `constants/`) tuyệt đối không import ngược từ `components/`, `pages/`, hoặc `services/`.
2. **Validation & Type Safety**:
   - Toàn bộ form nhập liệu và dữ liệu payload API phải được kiểm chứng qua **Zod** schema tại `src/schemas/`.
3. **Quy tắc Clean Code & Styling**:
   - **Không Magic Numbers**: Mọi con số cấu hình (kích thước trang, thời gian timeout, status code...) phải đưa vào `src/constants/`.
   - **Không Hard-code Color**: Phải sử dụng semantic color palette từ `tailwind.config.js` (`brand-*`, `surface-*`).
   - Đặt tên file: `kebab-case.js` cho helpers/services/schemas, `PascalCase.jsx` cho React Components, `use<Name>.js` cho custom hooks.

---

## 4. Quy chuẩn Git & Quality Gate
- **Commit Convention**: Tuân thủ Conventional Commits (`feat(service-name): ...`, `fix(frontend): ...`, `refactor: ...`, `docs: ...`).
- **Pre-commit Checks**: Mọi commit phải vượt qua kiểm tra linting (`npm run lint` trên frontend) và build thành công (`./gradlew compileJava` trên backend).
