---
name: realtime-gps-booking-flow
description: End-to-end workflow for developing and testing the Realtime Instant Booking (30s countdown) and GPS Telemetry Tracking flow in the Layered Monolith (core-api) and React Frontend.
version: 3.0.0
---

# Universal Workflow: Realtime GPS Telemetry & 30s Instant Booking

## 1. Luồng Đặt Ca Khẩn Cấp Realtime 30s (Instant Booking)
1. **Khách hàng tạo đơn**: Client gửi `POST /api/v1/customer/bookings` (loại `REALTIME_INSTANT`).
2. **Quét thợ rảnh**: `BookingService` gọi `RedisGeoService` quét danh sách thợ rảnh gần nhất trong bán kính $R$ km (`GEORADIUS`).
3. **Phát sự kiện In-Memory**: `BookingService` phát `InstantBookingCreatedEvent` qua `ApplicationEventPublisher`.
4. **Broadcast qua STOMP WebSocket**: `@EventListener` bắt sự kiện và gọi `WebSocketBroadcastService` bắn tin nhắn STOMP tới topic `/topic/booking-broadcast` kèm đồng hồ đếm ngược 30–45s trên App thợ.
5. **Thợ chấp nhận ca**: Thợ đầu tiên bấm nhận đơn $\rightarrow$ gọi `POST /api/v1/freelancer/bookings/{id}/accept`.
6. **Bảo vệ chống Race-Condition (Redlock)**: `RedissonClient` thực hiện Distributed Lock theo `bookingId`. Thợ đầu tiên giữ lock thành công $\rightarrow$ chuyển đơn sang `ACCEPTED`. Các thợ bấm sau nhận thông báo đơn đã có người nhận.

## 2. Luồng GPS Telemetry Tracking Realtime
1. **Thợ phát sóng tọa độ**: Mobile App thợ gửi tọa độ định kỳ (5–10s) qua STOMP WebSocket `/app/telemetry/location` hoặc REST endpoint.
2. **Cập nhật vị trí tức thời**: Lưu tọa độ hiện tại vào Redis GEO (`GEOADD mua:geo:active <lng> <lat> <mua_id>`).
3. **Stream cho Khách hàng**: `WebSocketBroadcastService` bắn trực tiếp tọa độ tới STOMP topic `/topic/gps-stream/{bookingId}` để khách xem thợ di chuyển trên bản đồ.
4. **Lưu vết di chuyển**: Ghi bản ghi tọa độ vào bảng `telemetry_schema.telemetry_logs` (Point PostGIS 4326).
