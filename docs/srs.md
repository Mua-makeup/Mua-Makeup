# Software Requirements Specification (SRS)

## 1. Tổng quan hệ thống (System Overview)
- **Tên dự án**: IOC Internship Management Platform
- **Kiến trúc**: Microservices Architecture (Backend: Spring Boot, Frontend: React + Vite + JavaScript)

## 2. Các phân hệ chính
1. **API Gateway Service**: Điều hướng request, bảo mật JWT, Rate limiting, CORS.
2. **User & Auth Service**: Quản lý tài khoản, phân quyền (Admin, Student, Mentor).
3. **Internship Management Service**: Quản lý đề tài thực tập, tiến độ, báo cáo.

## 3. Yêu cầu phi chức năng (Non-functional Requirements)
- Hiệu năng cao, phản hồi < 200ms với API thông thường.
- Tuân thủ RESTful API design.
- Khả năng mở rộng theo container (Docker / K8s).
