package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.service.interaction.UserWebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserWebSocketNotificationServiceImpl implements UserWebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void sendNotificationToUser(Long userId, NotificationEntity notification, long unreadCount) {
        if (userId == null || notification == null) {
            return;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notification.getId());
            payload.put("notificationId", notification.getId());
            payload.put("type", notification.getType());
            payload.put("title", notification.getTitle());
            payload.put("content", notification.getContent());
            payload.put("bookingId", notification.getBooking() != null ? notification.getBooking().getId() : null);
            payload.put("referenceId", notification.getBooking() != null ? notification.getBooking().getId() : null);
            payload.put("isRead", notification.getIsRead());
            payload.put("createdAt", notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null);
            payload.put("unreadCount", unreadCount);
            payload.put("metadata", notification.getMetadata());
            payload.put("timestamp", System.currentTimeMillis());

            // 1. Chuẩn Spring WebSocket STOMP P2P (User-Destination: /user/{userId}/queue/notifications)
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/notifications",
                    payload
            );

            // 2. Kênh Topic dự phòng trực tiếp (/topic/user-notifications/{userId})
            messagingTemplate.convertAndSend(
                    "/topic/user-notifications/" + userId,
                    payload
            );

            log.info("[WebSocket] Dispatched P2P notification ID={} to userId={} (unreadCount={})",
                    notification.getId(), userId, unreadCount);
        } catch (Exception e) {
            log.error("[WebSocket] Failed to send P2P notification to userId={}: {}", userId, e.getMessage(), e);
        }
    }
}
