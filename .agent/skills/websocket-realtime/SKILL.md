---
name: websocket-realtime
description: Realtime bidirectional WebSocket streaming, Redis Pub/Sub, Kafka event integration standard for GPS Telemetry tracking, 30s Instant Booking broadcasts, and in-app chat via dedicated websocket-service.
version: 2.0.0
tags: [realtime, websocket, kafka, redis-pubsub, telemetry, gps, system-wide]
---

# Realtime WebSocket & Event Streaming Skill

## 1. Mục đích & Nguyên lý
Hệ thống sử dụng riêng **`websocket-service` (Port: 8088)** kết hợp với **Kafka Event Bus (Port: 9092)** và **Redis Pub/Sub (Redis DB 1)** để đáp ứng các tính năng thời gian thực với độ trễ thấp (< 100ms):
1. **GPS Telemetry Streaming**: Thợ gửi tọa độ GPS định kỳ (5–10s), khách hàng nhận tọa độ realtime để vẽ đường đi.
2. **Instant Booking Broadcast**: Đẩy thông báo nhận đơn tức thì có đếm ngược 30–45s đến danh sách thợ rảnh trong bán kính $R$ km.
3. **In-app Chat & Live Status Notification**: Nhắn tin trực tiếp giữa Khách và Thợ / Đại lý, cập nhật trạng thái đơn hàng.

---

## 2. Kiến trúc Luồng Dữ liệu (Data Flow Architecture)

```text
[ Mobile / Web Client ] 
       │ 
       ▼ (WSS Connection / JWT Auth: Port 8088)
[ websocket-service ] 
       │ 
       ├── (Publish Event) ──> [ Apache Kafka Topic: driver-location-stream ]
       │                                     │
       │                                     ▼
       │                          [ location-service (Port 8084) ]
       │                                     │ (Save)
       │                                     ▼
       │                          [ Redis GEO DB 2 + PostGIS location_tracking_db ]
       │
       └── (Subscribe) <────── [ Redis Pub/Sub DB 1 Channel: booking:{id} ]
                                             ▲
                                             │ (Publish)
                                  [ booking-service (Port 8085) ]
```

---

## 3. Quy chuẩn Kỹ thuật Bắt buộc

### 3.1. Xác thực & Quản lý Kết nối (Handshake & Session)
- Client kết nối qua WebSocket URL: `wss://<domain>:8088/ws?token=<jwt_token>`.
- `websocket-service` xác thực JWT trong bước Handshake (`ChannelInterceptor`). Nếu token hết hạn $\rightarrow$ từ chối kết nối ngay tại tầng mạng (HTTP 401).
- Session ID được lưu trữ trong Redis DB 1 và liên kết với `userId` và `role` (`CUSTOMER`, `FREELANCER`, `AGENCY_COORDINATOR`).

### 3.2. Cấu trúc Message Payload (Standard Message Envelope)
Mọi tin nhắn truyền tải qua WebSocket bắt buộc tuân theo cấu trúc JSON chuẩn:
```json
{
  "type": "LOCATION_UPDATE | BOOKING_BROADCAST | CHAT_MESSAGE | ORDER_STATUS",
  "senderId": 12345,
  "recipientId": 67890,
  "bookingId": 9999,
  "timestamp": 1725792000000,
  "data": {
    "latitude": 10.762622,
    "longitude": 106.660172,
    "speed": 25.5,
    "heading": 180.0
  }
}
```

### 3.3. Xử lý Mất kết nối & Tự động Reconnect phía Frontend
- Frontend sử dụng Custom Hook `src/hooks/useWebSocket.js` để quản lý kết nối.
- Bắt buộc áp dụng thuật toán **Exponential Backoff Reconnect** (Thử lại sau 1s, 2s, 4s, 8s... tối đa 30s) khi mạng chập chờn.
- Đồng bộ lại dữ liệu mới nhất (Sync state) từ REST API ngay khi kết nối WebSocket thành công trở lại.
