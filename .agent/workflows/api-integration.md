---
name: api-integration
description: Universal fullstack integration workflow connecting Backend Spring Boot REST & WebSocket APIs with Frontend React applications.
version: 2.1.0
---

# Universal Workflow: Fullstack API Integration

## Phase 1: Backend Endpoint & DTO Contract Definition
1. Định nghĩa Request DTO (`dto/request/*Req.java`) có đầy đủ Bean Validation (`@Valid`, `@NotBlank`, `@NotNull`, `@Future`...).
2. Định nghĩa Response DTO (`dto/response/*Res.java`) hoặc đối tượng phân trang `PaginatedRes<T>`.
3. Khai báo endpoint trong Controller tương ứng kế thừa `BaseController` (đặt trong package role: `admin/`, `customer/`, `agency/`, `freelancer/`).
4. Định nghĩa các mã lỗi mới trong `common/constants/ErrorCodes.java` và thông điệp tương ứng trong `resources/text/messages.properties`.

## Phase 2: Frontend Schema & API Service Alignment
1. Tạo Zod Schema trong `src/schemas/<feature>.schema.js` phản ánh chính xác cấu trúc Request DTO của backend.
2. Định nghĩa hằng số Endpoint trong `src/constants/<feature>.constant.js`.
3. Tạo API service method trong `src/services/<feature>.service.js` sử dụng `apiClient` Axios.
4. Unwrap response data và validate kiểu dữ liệu trả về.

## Phase 3: Error Handling & User Feedback
1. Cấu hình xử lý lỗi từ backend: đọc mã lỗi `code` từ response JSON và hiển thị Toast/Alert tương ứng với phong cách Luxury Beauty.
2. Xử lý các HTTP Status Code chuẩn:
   - `400 Bad Request`: Hiển thị thông báo validation chi tiết theo từng field input.
   - `401 Unauthorized`: Tự động điều hướng về màn hình đăng nhập `/login` hoặc kích hoạt refresh token.
   - `403 Forbidden`: Hiển thị Modal thông báo không đủ quyền hạn nghiệp vụ.
   - `404 Not Found`: Hiển thị trang/component Empty State thanh lịch.
   - `409 Conflict`: Báo lỗi tranh chấp dữ liệu (ví dụ: ca làm đã có thợ khác nhận).
   - `500 Internal Server Error`: Báo lỗi hệ thống và tự động log sang **Sentry**.

## Phase 4: WebSocket Realtime Channel Integration (Nếu có)
1. Kết nối kênh WebSocket thông qua `useWebSocket` hook.
2. Đăng ký nhận message theo `type` (ví dụ: `BOOKING_BROADCAST`, `LOCATION_UPDATE`).
3. Cập nhật state UI / Zustand store ngay khi nhận được packet dữ liệu mới.

## Phase 5: End-to-End Verification
1. Khởi động Microservice tương ứng hoặc toàn bộ hệ thống qua `docker-compose.yml`.
2. Khởi động Frontend React trên môi trường dev.
3. Kiểm tra tương tác form, Network Tab (Headers, Payload, CORS, WSS frames).
4. Chạy `npm run lint` để kiểm tra 0 vi phạm ranh giới module.
