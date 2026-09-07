---
name: api-integration
description: Universal fullstack integration workflow connecting Backend Spring Boot REST APIs with Frontend React applications.
version: 2.0.0
---

# Universal Workflow: Fullstack API Integration

## Phase 1: Backend Endpoint & DTO Contract
1. Xác định Request DTO (`dto/request/*Req.java`) có Bean Validation (`@Valid`).
2. Xác định Response DTO (`dto/response/*Res.java`) hoặc `PaginatedRes<T>`.
3. Khai báo endpoint trong Controller tương ứng kế thừa `BaseController`.
4. Đảm bảo mã lỗi (nếu có) được định nghĩa trong `common/constants/ErrorCodes.java` và `messages.properties`.

## Phase 2: Frontend Schema & API Service Alignment
1. Tạo Zod Schema trong `src/schemas/` phản ánh chính xác cấu trúc Request DTO của backend.
2. Tạo API service method trong `src/services/` với URL và HTTP method tương ứng.
3. Cấu hình xử lý Response data và unwrap payload thành công.

## Phase 3: Error Mapping & User Feedback
1. Cấu hình xử lý lỗi từ backend: đọc mã lỗi `code` từ response JSON và hiển thị toast/alert tương ứng trên giao diện.
2. Xử lý các HTTP Status Code chuẩn:
   - `400 Bad Request`: Hiển thị lỗi validation form theo từng trường.
   - `401 Unauthorized`: Điều hướng về trang `/login` hoặc refresh token.
   - `403 Forbidden`: Hiển thị thông báo không đủ quyền.
   - `404 Not Found`: Hiển thị thông báo không tìm thấy tài nguyên.
   - `500 Internal Server Error`: Báo lỗi hệ thống và ghi nhận vào Sentry.

## Phase 4: E2E Integration Testing
1. Khởi động Microservice tương ứng hoặc API Gateway trên cổng backend (ví dụ: `8080`).
2. Khởi động Frontend React trên cổng `3000`.
3. Thực hiện tương tác trên giao diện, kiểm tra Network Tab (CORS, Request Headers, Response Payload).
