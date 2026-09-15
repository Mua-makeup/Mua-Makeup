# Coding Conventions & Best Practices

## 1. Quy tắc chung & Git Workflow
- **Commit convention**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- **Branch naming**: `feature/<feature-name>`, `bugfix/<issue-id>`, `release/<version>`.

## 2. Frontend Conventions (React + JavaScript / JSX)
- **Tên file & folder**: Định dạng `kebab-case` cho thư mục tiện ích/tài nguyên, `PascalCase` cho React Components (`LoginPage.jsx`, `BaseButton.jsx`).
- **Validation**: Bắt buộc dùng **Zod** schema cho dữ liệu form & API payload tại `src/schemas/`.
- **Tuyệt đối không dùng**: Magic numbers (đưa vào `src/constants/`), hard-coded color/text (sử dụng tailwind/css variables).
- **Phân tách ranh giới module**: Kiểm soát import bằng `eslint-plugin-boundaries`.

## 3. Backend Conventions (Spring Boot )
- **Layered Pattern**: `controller -> service (interface) -> service/impl (logic thực thi) -> repository -> database`.
- **Base Classes**: Mọi entity kế thừa `BaseEntity` (id, created_at, updated_at). Mọi service CRUD cơ bản kế thừa `BaseService` & `BaseServiceImpl`.
- **Data Transfer**: Luôn sử dụng DTO (`dto/request`, `dto/response`) với `@Valid` / Bean Validation, không expose Entity trực tiếp ra Controller.
- **Quản lý đa ngôn ngữ & thông điệp**: Không hardcode text phản hồi; sử dụng `ResourceBundle` trong `resources/text/messages.properties`.
- **Database Migration**: Toàn bộ thay đổi DDL/DML quản lý qua **Flyway** tại `resources/db/migration/`.
