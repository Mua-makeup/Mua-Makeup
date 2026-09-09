---
name: websocket-realtime
description: Realtime bidirectional STOMP WebSocket streaming, Redis GEO integration for GPS Telemetry tracking, 30s Instant Booking broadcasts, and in-app chat embedded directly in core-api.
version: 3.0.0
tags: [realtime, websocket, stomp, redis-geo, telemetry, gps, system-wide]
---

# Realtime WebSocket & Event Streaming Skill (Embedded Monolith)

## 1. Mục đích & Nguyên lý
Hệ thống sử dụng **Embedded STOMP WebSocket Gateway** chạy trực tiếp trong tiến trình Spring Boot `code/backend/core-api` (Port: 8080) tại endpoint `/ws-makeup`, kết hợp với **Spring EventBus (`ApplicationEventPublisher`)** và **Redis GEO** để đáp ứng các tính năng thời gian thực với độ trễ cực thấp (< 5ms):
1. **GPS Telemetry Streaming**: Thợ gửi tọa độ GPS định kỳ (5–10s), khách hàng nhận tọa độ realtime để vẽ đường đi qua STOMP topic `/topic/gps-stream/{bookingId}`.
2. **Instant Booking Broadcast**: Đẩy thông báo nhận đơn tức thì có đếm ngược 30–45s đến danh sách thợ rảnh trong bán kính $R$ km qua STOMP topic `/topic/booking-broadcast`.
3. **In-app Chat & Live Status Notification**: Nhắn tin trực tiếp giữa Khách và Thợ / Đại lý, cập nhật trạng thái đơn hàng.

---

## 2. Kiến trúc Luồng Dữ liệu (Data Flow Architecture)

```text
[ Mobile / Web Client ] 
       │ 
       ▼ (WSS Connection / JWT Auth: Port 8080 Endpoint: /ws-makeup)
[ Spring Boot core-api ] 
       │ 
       ├── (In-Memory Spring Event) ──> [ BookingCreatedEvent ]
       │                                       │
       │                                       ▼
       │                            [ Spring EventListener ]
       │                                       │ (Save & Broadcast)
       │                                       ▼
       │                            [ Redis GEO & STOMP /topic/booking-broadcast ]
       │
       └── (Telemetry Stream) ────────> [ Redis GEO key: 'mua:geo:active' ]
                                               │
                                               ▼ (STOMP Broadcast)
                                    [ /topic/gps-stream/{bookingId} ]
```

---

## 3. Quy chuẩn Kỹ thuật Bắt buộc

### 3.1. Xác thực & Quản lý Kết nối (Handshake & Session)
- Client kết nối qua WebSocket STOMP URL: `ws://localhost:8080/ws-makeup`.
- `StompChannelInterceptor` xác thực JWT trong bước CONNECT command. Nếu token hết hạn hoặc blacklisted $\rightarrow$ từ chối kết nối ngay lập tức.

### 3.2. Cấu trúc Message Payload (Standard Message Envelope)
Mọi tin nhắn truyền tải qua WebSocket tuân theo cấu trúc JSON chuẩn:
```json
{
  "type": "LOCATION_UPDATE | BOOKING_BROADCAST | CHAT_MESSAGE | ORDER_STATUS",
  "senderId": 12345,
  "recipientId": 67890,
  "bookingId": 9999,
  "timestamp": 1725792000000,
  "data": {
    "latitude": 10.762622,
    "longitude": 106.660172
  }
}
```
