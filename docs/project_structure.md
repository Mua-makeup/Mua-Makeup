# CẤU TRÚC DỰ ÁN MUA-MAKEUP


**Mục lục**

1. [Tổng quan hệ thống](#section-1)
2. [Cây thư mục gốc](#section-2)
3. [Backend — `code/backend/core-api`](#section-3)
4. [Web portal — `code/frontend`](#section-4)
5. [Ứng dụng Expo — `code/app`](#section-5)
6. [Bot, Docker và triển khai](#section-6)
7. [Tài liệu, SQL và tài nguyên hỗ trợ](#section-7)
8. [Chạy và kiểm tra theo từng thành phần](#section-8)
9. [Tra cứu nhanh khi sửa chức năng](#section-9)
10. [Quy ước đọc và duy trì tài liệu](#section-10)

<a id="section-1"></a>

## 1. Tổng quan hệ thống

Dự án đặt nhiều ứng dụng trong cùng repository. Mỗi ứng dụng có manifest, dependencies và cách chạy riêng; hiện không có `package.json` ở gốc để điều phối toàn bộ bằng npm workspace.

| Thành phần | Thư mục | Công nghệ khai báo | Trách nhiệm |
| --- | --- | --- | --- |
| Backend | `code/backend/core-api` | Java 17, Spring Boot 3.3.4, Gradle | REST, xác thực, booking, điều phối, giá, ví, thanh toán, realtime, AI |
| Web portal | `code/frontend` | React 18, Vite 5, JavaScript/JSX, Tailwind 3 | Landing, quản trị sàn và chủ studio |
| Ứng dụng | `code/app` | Expo 57, React 19.2.3, React Native 0.86.3, TypeScript | Khách hàng, freelancer và nhân viên studio; Android/iOS/Expo Web |
| Bot vận hành | `code/discord-bot` | Node.js, discord.js 14, Axios | Kiểm tra độ trễ, sức khỏe backend và thông số máy chủ qua Discord |
| Dữ liệu | `docker/postgres`, `docker/redis` | PostgreSQL 16/PostGIS 3.4; Redis 7 | Lưu nghiệp vụ, dữ liệu địa lý, cache, token, khóa và lease |
| Giám sát | `docker` và Compose production | Prometheus, Grafana, Loki, Promtail, node-exporter | Metrics, log và quan sát hệ thống |

Phiên bản trên lấy từ manifest/build/Dockerfile, không khẳng định môi trường đang triển khai đã chạy đúng phiên bản đó.

```text
Web portal / Expo app
        │ REST + WebSocket
        ▼
Spring Boot core-api ──────► PostgreSQL / PostGIS
        │                  Redis / Redisson
        └─────────────────► Payment / Maps / Media / Email / AI / Push

Discord bot ──────────────► Backend health + node-exporter
Promtail → Loki ──┐
Prometheus ───────┴───────► Grafana
```

<a id="section-2"></a>

## 2. Cây thư mục gốc

```text
Mua-Makeup/
├── code/
│   ├── app/                    # Ứng dụng Expo
│   ├── backend/core-api/       # Backend Spring Boot
│   ├── discord-bot/            # Bot giám sát vận hành
│   └── frontend/               # Web portal React/Vite
├── docs/                       # SRS, kiến trúc, ERD, backlog, tài liệu nghiệp vụ
├── docker/                     # Image/config dữ liệu và giám sát
├── scripts/                    # SQL hỗ trợ dữ liệu demo
├── .github/workflows/          # CI và triển khai backend
├── .agent/                     # Tài nguyên hỗ trợ agent
├── .ai/                        # Cấu hình/công cụ hỗ trợ phát triển
├── .claude/                    # Cấu hình hỗ trợ phát triển
├── .env.example                # Mẫu biến môi trường gốc
├── .gitignore                  # Quy tắc loại trừ Git
├── docker-compose.yml          # PostgreSQL + Redis cho local
├── docker-compose.prod.yml     # Backend + dữ liệu + giám sát + bot
└── patch_pkg_items.js           # Script sửa nguồn chuyên biệt, không phải entry point
```

`.git/`, `.idea/`, `.env` và các cache có thể hiện diện trên máy nhưng không thuộc cây mã ứng dụng cần tra cứu. `patch_pkg_items.js` sửa trực tiếp component web bằng thay chuỗi; không phải bước khởi động/build thường xuyên.

<a id="section-3"></a>

## 3. Backend — `code/backend/core-api`

### 3.1. Điểm vào và kiến trúc

Backend là một ứng dụng Spring Boot theo tầng, phân nhóm nghiệp vụ trong từng tầng. Các package không phải microservice hoặc module Gradle độc lập. Không coi tên miền nghiệp vụ là bằng chứng dự án đã áp dụng đầy đủ DDD/Clean Architecture.

```text
Controller → DTO / Validation → Service → Repository → Entity / Database
                                 │
                                 ├── Event → Listener → Notification / WebSocket
                                 ├── Redis / Lock / Scheduler
                                 └── Adapter tích hợp dịch vụ ngoài
```

Điểm vào: [Application.java](../code/backend/core-api/src/main/java/com/makeup/platform/Application.java). Build: [build.gradle](../code/backend/core-api/build.gradle).

```text
code/backend/core-api/
├── gradle/
├── src/
├── .dockerignore
├── .env.example
├── build.gradle
├── Dockerfile
├── gradle.properties
├── gradlew
├── gradlew.bat
├── settings.gradle
└── websocket-tests.init.gradle
```
### 3.2. Package mã nguồn chính

Gốc package: `src/main/java/com/makeup/platform`.

| Package | Nội dung / trách nhiệm |
| --- | --- |
| `common/` | Base entity/response, mã lỗi, event, exception, i18n, validation và tiện ích |
| `config/` | Spring configuration, security, CORS, WebSocket và tích hợp |
| `controller/` | Endpoint theo admin, agency, auth, booking, customer, catalog, payment, telemetry… |
| `dto/` | Dữ liệu request/response và DTO dùng cho agency |
| `entity/` | Ánh xạ bảng, quan hệ, enum trạng thái và kiểu dữ liệu nghiệp vụ |
| `service/` | Xử lý nghiệp vụ, transaction, phân quyền tài nguyên và dịch vụ ngoài |
| `repository/` | JPA/repository, query và truy vấn tùy chỉnh; có cả file trực tiếp tại gốc package |
| `mapper/` | Chuyển đổi entity ↔ DTO theo miền nghiệp vụ |
| `security/` | Danh tính/quyền, kiểm soát WebSocket và truy cập tài nguyên |
| `listener/` | Xử lý sự kiện booking, interaction và notification |

```text
code/backend/core-api/src/main/java/com/makeup/platform/service/
├── admin/
├── agency/
├── auth/
├── booking/
├── catalog/
├── chatbot/
├── customer/
├── interaction/
├── mail/
├── media/
├── mua/
├── payment/
├── pricing/
├── telemetry/
└── wallet/
```
### 3.3. Cấu hình, dữ liệu và kiểm thử

| Vị trí | Vai trò |
| --- | --- |
| `src/main/resources/application.yml` | Cấu hình nền của ứng dụng |
| `src/main/resources/application-dev.yml` | Cấu hình profile phát triển |
| `src/main/resources/application-prod.yml` | Cấu hình profile production |
| `src/main/resources/db/migration/` | Migration Flyway; nguồn theo dõi thay đổi schema/dữ liệu |
| `src/main/resources/i18n/` | Thông điệp JSON tiếng Việt/Anh |
| `src/main/resources/text/` | Resource thông điệp properties |
| `src/test/java/com/makeup/platform/` | Test service, security, config, mapper, utility và integration |
| `gradle/wrapper/`, `gradlew`, `gradlew.bat` | Gradle Wrapper cho môi trường chạy khác nhau |
| `websocket-tests.init.gradle` | Init script bổ trợ chạy nhóm kiểm thử WebSocket |
| `.env.example`, `Dockerfile` | Mẫu môi trường và đóng gói backend |

Task `test` loại các test gắn tag `infrastructure`; task `integrationTest` chạy nhóm này với hạ tầng container. `jacocoTestReport` xuất báo cáo coverage. Không suy ra đã pass chỉ từ sự tồn tại của test.

<a id="section-4"></a>

## 4. Web portal — `code/frontend`

### 4.1. Luồng khởi tạo

`index.html` → `src/main.jsx` → `src/App.jsx` → `src/routes/index.jsx` → layout/page.

Router hiện cho `ROLE_SUPER_ADMIN` vào `/admin/*` và `ROLE_AGENCY_ADMIN` vào `/agency/*`. `ROLE_AGENCY_STAFF` không được cấp toàn portal studio chỉ vì là staff. Kiểm tra UI không thay thế phân quyền backend.

```text
code/frontend/src/
├── assets/
├── components/
├── constants/
├── hooks/
├── layouts/
├── lib/
├── pages/
├── providers/
├── routes/
├── schemas/
├── services/
├── store/
├── styles/
├── utils/
├── App.jsx
└── main.jsx
```
### 4.2. Các tầng giao diện

| Vị trí | Dùng cho |
| --- | --- |
| `pages/` | Màn hình theo Auth, SuperAdmin, Agency, Join, Landing, NotFound; còn thư mục Dashboard |
| `components/base/` | Thành phần UI tái sử dụng |
| `components/features/` | Component theo admin, agency, auth, booking, landing, notification |
| `layouts/` | Khung admin/studio và các thành phần bố cục |
| `routes/` | Router chính, ProtectedRoute và RoleBasedRoute |
| `services/` | Axios client và API auth, user, booking, agency, admin, notification |
| `store/` | Zustand: auth, app, i18n, notification, theme, toast |
| `schemas/` | Zod validation cho auth, agency, booking và super admin |
| `hooks/` | Auth, pagination, kiểm tra xung đột ca, undo và hiệu ứng cuộn |
| `constants/` | Hằng số role, trạng thái, nội dung và từ điển |
| `styles/`, `assets/`, `lib/`, `utils/` | CSS, tài nguyên và tiện ích |
| `providers/` | Có AppProvider; việc có file không đồng nghĩa đang được gắn ở root |

Alias `@` trỏ đến `src` theo Vite. `src/styles/global.css` được import tại `main.jsx`. Auth phải đối chiếu `api-client.js` và `useAuthStore.js`; không mô tả hệ thống là chỉ dùng cookie hoặc không lưu token khi nguồn có nhánh khác.

### 4.3. Route đang đăng ký

| Nhóm | Đường dẫn |
| --- | --- |
| Công khai | `/`, `/login`, `/register`, `/join`; fallback `*` |
| Super admin | `/admin/dashboard`, `/admin/bookings`, `/admin/users`, `/admin/agencies`, `/admin/muas/credentials`, `/admin/taxonomy`, `/admin/pricing`, `/admin/disputes` |
| Studio — vận hành | `/agency/dashboard`, `/agency/bookings`, `/agency/staff`, `/agency/staff/:staffId`, `/agency/shifts` |
| Studio — dịch vụ | `/agency/packages`, `/agency/portfolio`, `/agency/surcharges` |
| Studio — chất lượng/tài chính | `/agency/reviews`, `/agency/staff-leaderboard`, `/agency/wallet`, `/agency/disputes` |
| Studio — cấu hình | `/agency/settings`; `/agency/profile` redirect về settings |

`/admin` và `/agency` redirect về dashboard tương ứng. File page có mặt nhưng không được router đăng ký không được coi là màn hình độc lập đang hoạt động.

Nguồn route: [index.jsx](../code/frontend/src/routes/index.jsx).

<a id="section-5"></a>

## 5. Ứng dụng Expo — `code/app`

### 5.1. Điểm vào và phân tầng

`package.json` dùng `expo-router/entry`; layout gốc là `src/app/_layout.tsx`. Route được tổ chức theo file. `_layout.tsx` và nhóm `(auth)` có ý nghĩa định tuyến đặc biệt, không phải segment URL thông thường.

```text
code/app/src/
├── app/
├── components/
├── constants/
├── hooks/
├── schemas/
├── services/
├── store/
├── utils/
└── global.css
```
| Vị trí | Dùng cho |
| --- | --- |
| `src/app/` | Màn hình và layout Expo Router |
| `src/components/` | Component auth, base, booking, common, customer, mua, notification, staff, ui |
| `src/services/` | HTTP/API, WebSocket, GPS, push, payment, review, AI và các miền nghiệp vụ |
| `src/store/` | Zustand cho phiên, booking, workstation, vị trí, khám phá, thông báo, popup/undo |
| `src/schemas/` | Validation hồ sơ, booking, instant, gói/showcase và preview giá |
| `src/constants/`, `src/hooks/`, `src/utils/` | Cấu hình/hằng số, hook giao diện và tiện ích |
| `assets/` | Tài nguyên ứng dụng |
| `android/` | Dự án native Android có trong working tree |
| `app.json`, `tsconfig.json`, `expo-env.d.ts` | Cấu hình Expo/TypeScript |
| `scripts/`, `tests/` | Script hỗ trợ và test utility dạng `.test.cjs` |

Alias `@/*` trỏ `src/*`; `@/assets/*` trỏ `assets/*`. UI dùng React Native components/StyleSheet; có `src/global.css` không đồng nghĩa đã cấu hình NativeWind. Không liệt kê `ios/` như thư mục hiện có khi working tree chưa có thư mục này.

### 5.2. Cây route ứng dụng

Cây sau chỉ liệt kê file route, không mở rộng hàng trăm component bên trong.

```text
code/app/src/app/
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── onboarding.tsx
│   └── register.tsx
├── booking/
│   ├── deposit/
│   │   └── [id].tsx
│   ├── detail/
│   │   └── [id].tsx
│   ├── history-detail/
│   │   └── [id].tsx
│   ├── instant-matched/
│   │   └── [id].tsx
│   ├── tracking/
│   │   └── [id].tsx
│   └── create.tsx
├── job-execution/
│   └── [id].tsx
├── mua/
│   ├── packages/
│   │   ├── [id]/
│   │   │   ├── add-showcase.tsx
│   │   │   ├── edit.tsx
│   │   │   ├── items.tsx
│   │   │   └── showcase.tsx
│   │   ├── create.tsx
│   │   └── index.tsx
│   └── workstation.tsx
├── mua-detail/
│   └── [id].tsx
├── mua-reviews/
│   └── [id].tsx
├── profile/
│   ├── customer-wallet.tsx
│   ├── edit.tsx
│   ├── freelancer-wallet.tsx
│   ├── mua-profile.tsx
│   └── staff-profile.tsx
├── staff/
│   ├── package-detail/
│   │   └── [id].tsx
│   ├── overtime-reports.tsx
│   └── schedule.tsx
├── studio/
│   └── [id].tsx
├── studio-reviews/
│   └── [id].tsx
├── _layout.tsx
├── activity.tsx
├── bookings.tsx
├── explore.tsx
├── index.tsx
├── join.tsx
├── notifications.tsx
└── support-chat.tsx
```
### 5.3. Cách đọc theo nhóm người dùng

| Nhóm | Bắt đầu từ |
| --- | --- |
| Tài khoản | `(auth)/`, `_layout.tsx`, `src/store/auth.store.ts` |
| Khách | `index.tsx`, `explore.tsx`, `booking/`, `activity.tsx`, `bookings.tsx` |
| Hồ sơ dịch vụ | `mua-detail/`, `studio/`, `mua-reviews/`, `studio-reviews/` |
| Freelancer | Trang chủ theo role, `job-execution/`, `mua/packages/`, `profile/mua-profile.tsx` |
| Nhân viên studio | `staff/`, `profile/staff-profile.tsx`, `job-execution/`, `join.tsx` |
| Ví / thông báo / AI | `profile/customer-wallet.tsx`, `profile/freelancer-wallet.tsx`, `notifications.tsx`, `support-chat.tsx` |

`mua/workstation.tsx` hiện là điểm chuyển về trang chủ; workstation thực tế còn phụ thuộc role và component ở trang chủ. Native và Expo Web có cách lưu phiên/quyền thiết bị khác nhau; đọc service/store trước khi thay đổi.

<a id="section-6"></a>

## 6. Bot, Docker và triển khai

### 6.1. Discord bot

```text
code/discord-bot/
├── src/
│   └── index.js
├── Dockerfile
└── package.json
```
`src/index.js` đọc cấu hình môi trường, đăng ký lệnh `ping`, `health`, `server` và truy vấn backend/node-exporter. Đây là thành phần vận hành, không phải chức năng chat trực tiếp khách–thợ. Thiếu token thì nguồn hiện kết thúc tiến trình; SRS/cấu trúc không cần chứa giá trị token.

### 6.2. Cấu hình hạ tầng

```text
docker/
├── grafana/
│   └── provisioning/
│       └── datasources/
├── init-db/
│   └── 01-init-databases.sql
├── postgres/
│   ├── 01-init-databases.sql
│   └── Dockerfile
├── prometheus/
│   └── prometheus.yml
├── promtail/
│   └── promtail-config.yml
└── redis/
    ├── Dockerfile
    └── redis.conf
```
| Tệp | Phạm vi thực tế |
| --- | --- |
| `docker-compose.yml` | Local: PostgreSQL và Redis; publish cổng 5432/6379; dữ liệu qua named volumes |
| `docker-compose.prod.yml` | PostgreSQL, Redis, core-api, Loki, Promtail, node-exporter, Prometheus, Grafana, Discord bot |
| `docker/postgres/Dockerfile` | Build từ PostGIS 16-3.4; copy init SQL cạnh Dockerfile |
| `docker/redis/Dockerfile` | Build Redis 7; nạp `redis.conf` |
| `docker/prometheus/prometheus.yml` | Cấu hình thu thập metrics |
| `docker/promtail/promtail-config.yml` | Cấu hình thu thập log |
| `docker/grafana/provisioning/datasources/datasources.yml` | Provision datasource cho Grafana |

Compose production không khai báo container web/app; các dự án client có `vercel.json` riêng. Việc có tệp triển khai không chứng minh đã deploy. File trong `docker/init-db/` tồn tại, nhưng Dockerfile Postgres hiện copy SQL từ `docker/postgres/`; không mặc định cả hai cùng được thực thi.

### 6.3. CI/CD

- [ci.yml](../.github/workflows/ci.yml): Java 17, chạy `test integrationTest jacocoTestReport`; có chuẩn bị Docker cho Testcontainers. Job web dùng Node.js 22, `npm ci` và `npm run build`.
- [deploy-backend.yml](../.github/workflows/deploy-backend.yml): build/push image backend và triển khai VPS qua SSH/Compose; có thông báo Discord.


