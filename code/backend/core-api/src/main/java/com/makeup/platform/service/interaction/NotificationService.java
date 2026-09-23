package com.makeup.platform.service.interaction;

import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.dto.response.notification.NotificationRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
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

    NotificationEntity createStaffApplicationNotification(
            AgencyProfileEntity agency,
            MuaProfileEntity mua,
            String inviteCode,
            Long staffId
    );

    void createCertificateUploadedNotification(
            MuaProfileEntity mua,
            String certName,
            String imageUrl
    );
}
