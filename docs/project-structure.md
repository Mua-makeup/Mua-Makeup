# Cấu trúc thư mục dự án

## I. Source tổng

```text
├── docs/                               # Tài liệu dự án
│   ├── srs.md                          # Tài liệu đặc tả phần mềm
│   ├── convention.md                   # Quy tắc code
│   ├── project-structure.md            # Cấu trúc thư mục dự án
│   ├── backlogs/                       # Chứa backlog
│   │   ├── sprint1/                    # Chứa user story, task
│   │   └── sprint2/                    # Chứa user story, task
│   ├── DB-erd/                         # Thiết kế DB
│   └── UI/UX style guideline/          # Style front end
│
├── code/                               # Chứa code của dự án
│   ├── frontend/                       # Source code React Vite
│   └── backend/                        # Source code Backend
│       └── api-gateway/                # Service API Gateway
│
├── .agent/                             # Chứa các rule, workflow và skill của AI
│   ├── rules/                          # Quy tắc code cho AI
│   ├── skills/                         # Các skill hướng dẫn
│   └── workflows/                      # Quy trình làm việc
├── test/                               # Chứa các file test case
└── docker-compose.yml                  # File docker compose chạy các service
```

---

## II. Frontend (React JS)

```text
code/frontend/
├── .husky/                             # Thư mục script chặn commit (pre-commit hook)
│   └── pre-commit                      # Script chạy lint trước khi git commit
│
├── public/                             # Tài nguyên tĩnh không qua build (favicon, robots.txt)
│
├── src/
│   ├── assets/                         # Tài nguyên tĩnh đi qua build (images, svg, local fonts)
│   ├── pages/                          # Chứa các trang màn hình
│   │   ├── Auth/                       # Ví dụ: LoginPage.jsx, RegisterPage.jsx
│   │   └── Dashboard/                  # Ví dụ: DashboardPage.jsx
│   ├── components/                     # Chứa các component giao diện
│   │   ├── base/                       # Component base tự custom (BaseButton, BaseTable...)
│   │   └── features/                   # Component theo nghiệp vụ
│   ├── routes/                         # Nơi cấu hình react-router-dom
│   │   └── index.jsx                   # Định nghĩa các đường dẫn nối tới các Pages
│   ├── layouts/                        # Chứa bộ khung UI (Header, Sidebar, Footer)
│   │   ├── MainLayout.jsx              # Layout cho user đã đăng nhập
│   │   └── AuthLayout.jsx              # Layout cho trang đăng nhập/đăng ký
│   ├── lib/                            # Cấu hình axios, utils chung
│   ├── hooks/                          # Custom React Hooks
│   ├── store/                          # Global State (Zustand)
│   ├── styles/                         # Cấu hình CSS như theme, global
│   ├── providers/                      # Các provider của react
│   ├── schemas/                        # Validator trên front end (Sử dụng zod)
│   ├── services/                       # Các hàm gọi api đến backend
│   ├── utils/                          # Chứa các hàm sử dụng chung
│   ├── constants/                      # Định nghĩa các hằng số
│   ├── App.jsx                         # Component gốc bao bọc toàn bộ ứng dụng
│   └── main.jsx                        # Điểm neo vào file index.html
│
├── index.html
├── eslint.config.mjs                   # Cấu hình linter khắt khe (boundaries, kebab-case, cấm magic number)
├── .prettierrc                         # Cấu hình Prettier
├── tailwind.config.js                  # Cấu hình TailwindCSS (ghi đè mã màu)
├── vite.config.js                      # Cấu hình Vite
├── Dockerfile                          # Dockerfile build frontend
├── .dockerignore
├── sentry/                             # Cấu hình ghi nhận bug trên product
├── package.json
├── .gitignore                          # Cấu hình những thứ không push lên git
└── .env                                # Cấu hình biến môi trường
```

---

## III. Backend Java (Layered Architecture)

```text
code/backend/api-gateway/
├── src/main/java/com/trung/apigateway/
│   ├── ApiGatewayApplication.java      # File chạy chính của Spring Boot
│   │
│   ├── common/                         # Các tiện ích và class cốt lõi dùng chung
│   │   ├── base/                       # Chứa các Base Classes
│   │   │   ├── BaseEntity.java         # @MappedSuperclass có id, created_at, updated_at
│   │   │   ├── BaseController.java     # Định nghĩa chung các hàm API phản hồi HTTP
│   │   │   ├── BaseService.java        # Interface CRUD dùng Generics <T, ID>
│   │   │   └── BaseServiceImpl.java    # Code thực thi CRUD dùng chung
│   │   ├── constants/                  # Hằng số (ErrorCodes, SystemConstants, RegexConstants)
│   │   ├── exception/                  # Xử lý lỗi toàn hệ thống
│   │   │   ├── GlobalExceptionHandler.java  # @RestControllerAdvice bắt lỗi tập trung
│   │   │   └── CustomBusinessException.java # Định nghĩa lỗi nghiệp vụ riêng
│   │   └── utils/                      # Các hàm phụ trợ (JwtUtils, DateUtils, PasswordEncoder)
│   │
│   ├── config/                         # Cấu hình Framework
│   │   ├── SecurityConfig.java         # Cấu hình phân quyền, chặn API, CORS
│   │   ├── OpenApiConfig.java          # Cấu hình tài liệu Swagger API
│   │   └── DatabaseConfig.java         # Cấu hình kết nối DB
│   │
│   ├── controller/                     # TẦNG API (Giao tiếp HTTP)
│   │   ├── admin/                      # Nhóm API cho Admin (ví dụ: AdminUserController)
│   │   └── student/                    # Nhóm API cho Sinh viên / Khách hàng
│   │
│   ├── dto/                            # DATA TRANSFER OBJECT (Chứa object gửi/nhận)
│   │   ├── request/                    # Dữ liệu Client gửi lên (UserCreateReq, LoginReq) - chứa @Valid
│   │   └── response/                   # Dữ liệu trả về (UserDetailRes, PaginatedRes)
│   │
│   ├── entity/                         # TẦNG MAP VỚI DATABASE (JPA)
│   │   └── UserEntity.java             # Map với bảng users
│   │
│   ├── repository/                     # TẦNG TRUY VẤN DỮ LIỆU
│   │   ├── custom/                     # Nơi chứa interface gọi Native SQL / Stored Procedure phức tạp
│   │   └── UserRepository.java         # Kế thừa JpaRepository cho các câu lệnh đơn giản
│   │
│   └── service/                        # TẦNG NGHIỆP VỤ LÕI
│       ├── impl/                       # Thư mục bắt buộc chứa code thực thi thật
│       │   └── UserServiceImpl.java   # Xử lý logic, tính toán, gọi Repository
│       └── UserService.java            # Chỉ chứa Interface (Định nghĩa hành động)
│
├── unitest/                            # Cài thêm unit test để kiểm thử
├── sonarLint/                          # Cài sonarlint để quản lý chất lượng mã nguồn
├── Dockerfile                          # Dockerfile build backend
├── .dockerignore
├── build.gradle                        # Cấu hình dependencies (Spring Boot, Postgres, Flyway)
└── src/main/resources/
    ├── application.yaml                # Cấu hình port, database credentials
    ├── text/                           # Cấu hình ResourceBundle để lưu text, không hard text vào code
    └── db/migration/                   # Nơi viết các file migration CSDL
        └── V1__Init_Tables.sql         # Script tạo bảng CSDL
```
