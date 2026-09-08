---
name: realtime-gps-booking-flow
description: End-to-end workflow for developing and testing the Realtime Instant Booking (30s countdown) and GPS Telemetry Tracking flow across Microservices and React Frontend.
version: 1.0.0
---

# Universal Workflow: Realtime GPS & Instant Booking Flow

## Phase 1: Redis GEO & Location Service Setup
1. Thiết lập `location-service`:
   - Lắng nghe Kafka topic `driver-location-stream` để cập nhật tọa độ GPS thợ vào `Redis GEO` (`GEOADD available_drivers <lng> <lat> <driver_id>`).
   - Cung cấp API / query tìm kiếm thợ rảnh trong bán kính $R$ km (`GEORADIUS / GEOSEARCH`).
   - Lưu trữ lịch sử di chuyển vào bảng `telemetry_locations` trên PostgreSQL với chỉ mục PostGIS `GIST`.

## Phase 2: Instant Booking Broadcast & Countdown Engine
1. Tại `booking-service`:
   - Khi Khách hàng gửi request Đặt ngay (`POST /api/v1/customer/bookings/instant`), gọi `pricing-service` tính cước và `location-service` lấy danh sách thợ gần nhất.
   - Chuyển trạng thái đơn sang `BROADCASTING`.
   - Publish message lên Redis Pub/Sub / Kafka topic `booking-broadcast`.
2. Tại `api-gateway` (WebSocket Persistent Gateway):
   - Nhận event và broadcast WebSocket packet `BOOKING_BROADCAST` tới tất cả các thợ phù hợp.
3. Phía Frontend Thợ Make-up (`code/frontend/`):
   - Kích hoạt `InstantBookingCountdownModal.jsx` với bộ đếm ngược 30–45s kèm âm thanh thông báo.

## Phase 3: Concurrency Control với Redlock (Chống tranh chấp ca)
1. Khi Thợ nhấn "Chấp nhận ca làm":
   - Gửi request `POST /api/v1/freelancer/bookings/{bookingId}/accept`.
   - `booking-service` lấy khóa phân tán qua Redisson: `RLock lock = redissonClient.getLock("lock:booking:" + bookingId);`
   - Kiểm tra xem đơn đã được nhận chưa (`status == BROADCASTING`).
   - Nếu thợ đầu tiên giành được đơn:
     - Đổi trạng thái đơn sang `CONFIRMED / MOVING`.
     - Gán `assigned_artist_id = currentMUAId`.
     - Nhả lock `lock.unlock()`.
     - Phát Kafka event `BOOKING_ACCEPTED`.
   - Nếu thợ đến sau: Trả về lỗi `409 Conflict` (Ca làm đã được thợ khác tiếp nhận).

## Phase 4: GPS Telemetry Tracking & Map Rendering
1. Phía Thợ Make-up:
   - Khi bắt đầu di chuyển, kích hoạt `navigator.geolocation.watchPosition` gửi tọa độ mỗi 5s qua WebSocket `LOCATION_UPDATE`.
2. Phía Khách hàng:
   - Component `GpsTrackingView.jsx` nhận tọa độ từ WebSocket channel `booking:{bookingId}` và cập nhật vị trí marker của thợ trên bản đồ Mapbox/Google Maps.
3. Thợ cập nhật các mốc trạng thái: *Đã đến nơi $\rightarrow$ Bắt đầu làm $\rightarrow$ Tải ảnh nghiệm thu $\rightarrow$ Hoàn thành*.

## Phase 5: Escrow Payout & Wallet Settlement
1. Khi thợ tải ảnh nghiệm thu và hoàn tất ca làm:
   - `booking-service` đổi trạng thái `COMPLETED` và phát Kafka event `BOOKING_COMPLETED`.
   - `payment-service` lắng nghe event, tự động giải phóng tiền cọc Escrow:
     - Trừ hoa hồng sàn (ví dụ 15%).
     - Chuyển doanh thu vào Ví Thợ (hoặc Ví Đại lý nếu là thợ thuộc đại lý).
