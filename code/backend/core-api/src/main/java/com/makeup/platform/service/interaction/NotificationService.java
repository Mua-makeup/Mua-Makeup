package com.makeup.platform.service.interaction;

import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.dto.response.notification.NotificationRes;
import com.makeup.platform.entity.interaction.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {

    Page<NotificationRes> getNotificationsForUser(Long userId, Long agencyId, Pageable pageable);

    long getUnreadCount(Long userId, Long agencyId);

    NotificationRes markAsRead(Long id, Long currentUserId);

    NotificationRes toggleRead(Long id, Long currentUserId);

    void markAllAsRead(Long userId, Long agencyId);

    void deleteNotification(Long id, Long currentUserId);

    void clearAllNotifications(Long userId, Long agencyId);

    NotificationEntity createBookingNotification(ScheduledBookingCreatedEvent event);
}
