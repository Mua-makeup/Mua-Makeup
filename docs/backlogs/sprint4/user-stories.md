# Sprint 4 Backlog

- [ ] [ISSUE-20.1] [Hạ Tầng P2P WebSocket Dispatching & Redis Cache Tối Ưu Cho Thông Báo Cá Nhân](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/backlogs/sprint4/user_story_websocket_realtime_gateway.md)
  - [ ] [ISSUE-20.2] Chuẩn hóa `WebSocketConfig`: Cấu hình User Destination Prefix (`/user`), xác thực phiên cá nhân để định tuyến chính xác kênh riêng `/user/{userId}/queue/notifications`.
  - [ ] [ISSUE-20.3] Module Redis Helper cho Thông báo: Chống gửi trùng lặp Event (`notif:dedup:{eventId}`) & Cache biến đếm tin chưa đọc (`notif:unread:{userId}`).
  - [ ] [ISSUE-20.4] Tích hợp Client-side STOMP Listener: Lắng nghe kênh riêng tư `/user/queue/notifications`, tự động reconnect khi rớt mạng & Render Toast Popup (<100ms).
- [ ] [ISSUE-21.1] [Phân Hệ Thông Báo In-App Bền Vững (Database, REST APIs & Event-Driven Dispatcher)](file:///c:/Users/Asus/Documents/Mua-Makeup/docs/backlogs/sprint4/user_story_in_app_notification_module.md)
  - [ ] [ISSUE-21.2] Script DDL Flyway Migration tạo bảng `interaction_schema.in_app_notifications` & JPA Entity (hỗ trợ `target_type`, `target_id`, `action_url`, Composite Index).
  - [ ] [ISSUE-21.3] Xây dựng Tầng Repository & Manual Mapper (`InAppNotificationRepository`, `InAppNotificationMapper`) hỗ trợ lọc, phân trang và đếm unread.
  - [ ] [ISSUE-21.4] Xây dựng Tầng Service & Controller (`/api/v1/notifications`): API xem danh sách phân trang, đếm chưa đọc, đánh dấu 1 tin đã đọc & đánh dấu đọc tất cả.
  - [ ] [ISSUE-21.5] Xây dựng `NotificationEventListener` với `@TransactionalEventListener(AFTER_COMMIT)`: Bắt các sự kiện Booking/Ví, lưu DB, tăng Redis count & bắn WebSocket P2P.
  - [ ] [ISSUE-21.6] Xây dựng UI Quả chuông Thông báo (Notification Center Dropdown) trên Header Web/App: Hiển thị số đỏ live, danh sách thông báo và Deep-link click chuyển trang.


