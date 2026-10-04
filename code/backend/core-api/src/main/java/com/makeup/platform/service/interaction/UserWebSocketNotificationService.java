package com.makeup.platform.service.interaction;

import com.makeup.platform.entity.interaction.NotificationEntity;

public interface UserWebSocketNotificationService {

    /**
     * Đẩy gói tin thông báo thời gian thực tới đúng người dùng qua WebSocket STOMP.
     * Hỗ trợ chuẩn P2P (/user/queue/notifications) và topic người dùng (/topic/user-notifications/{userId}).
     *
     * @param userId ID người dùng nhận thông báo
     * @param notification Bản ghi thông báo vừa tạo
     * @param unreadCount Số lượng thông báo chưa đọc hiện tại của người dùng
     */
    void sendNotificationToUser(Long userId, NotificationEntity notification, long unreadCount);
}
