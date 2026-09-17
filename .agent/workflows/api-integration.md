---
name: api-integration
description: Universal fullstack integration workflow connecting Backend Spring Boot REST & Embedded WebSocket STOMP APIs with Frontend React applications.
version: 3.0.0
---

# Universal Workflow: Frontend - Backend API & WebSocket Integration

## 1. Cấu hình Kết nối Tập trung (Centralized Connection)
Trong kiến trúc Monolith, Frontend kết nối về duy nhất 1 host backend:
- **REST API Base URL**: `http://localhost:8080/api/v1`
- **WebSocket STOMP URL**: `ws://localhost:8080/ws-makeup`

## 2. Các Bước Tích Hợp Chuẩn
1. **Thiết lập Axios Instance (`code/frontend/src/lib/axios.js`)**:
   - Gắn `baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'`.
   - Request Interceptor: Đính kèm `Authorization: Bearer <accessToken>`.
   - Response Interceptor: Tự động bắt lỗi 401 và gọi `POST /api/v1/auth/refresh-token` để lấy access token mới, lưu lại vào `authStore`.
2. **Thiết lập STOMP Client (`code/frontend/src/lib/stomp-client.js`)**:
   - Kết nối tới `/ws-makeup`.
   - Đính kèm JWT vào STOMP connect headers.
3. **Form Validation với Zod (`code/frontend/src/schemas/`)**:
   - Đồng bộ quy tắc validation (SĐT Việt Nam, mật khẩu tối thiểu 8 ký tự, 1 role per user) tương ứng với Bean Validation của Backend.
