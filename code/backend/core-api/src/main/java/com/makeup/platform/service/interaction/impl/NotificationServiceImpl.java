package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.notification.NotificationRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.mapper.interaction.NotificationMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.interaction.NotificationRepository;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final AgencyProfileRepository agencyProfileRepository;
    private final BookingRepository bookingRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationRes> getNotificationsForUser(Long userId, Long agencyId, Pageable pageable) {
        Page<NotificationEntity> page;
        if (agencyId != null) {
            page = notificationRepository.findByAgencyIdOrderByCreatedAtDesc(agencyId, pageable);
        } else {
            page = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return page.map(notificationMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, Long agencyId) {
        if (agencyId != null) {
            return notificationRepository.countByAgencyIdAndIsReadFalse(agencyId);
        }
        if (userId != null) {
            return notificationRepository.countByUserIdAndIsReadFalse(userId);
        }
        return 0;
    }

    @Override
    @Transactional
    public NotificationRes markAsRead(Long id, Long currentUserId) {
        NotificationEntity notification = notificationRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND, "Thông báo không tồn tại"));

        notification.setIsRead(true);
        notification = notificationRepository.save(notification);
        return notificationMapper.toResponse(notification);
    }

    @Override
    @Transactional
    public NotificationRes toggleRead(Long id, Long currentUserId) {
        NotificationEntity notification = notificationRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND, "Thông báo không tồn tại"));

        notification.setIsRead(!Boolean.TRUE.equals(notification.getIsRead()));
        notification = notificationRepository.save(notification);
        return notificationMapper.toResponse(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId, Long agencyId) {
        if (agencyId != null) {
            notificationRepository.markAllAsReadByAgencyId(agencyId);
        } else if (userId != null) {
            notificationRepository.markAllAsReadByUserId(userId);
        }
    }

    @Override
    @Transactional
    public void deleteNotification(Long id, Long currentUserId) {
        NotificationEntity notification = notificationRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND, "Thông báo không tồn tại"));
        notificationRepository.delete(notification);
    }

    @Override
    @Transactional
    public void clearAllNotifications(Long userId, Long agencyId) {
        if (agencyId != null) {
            notificationRepository.deleteAllByAgencyId(agencyId);
        } else if (userId != null) {
            notificationRepository.deleteAllByUserId(userId);
        }
    }

    @Override
    @Transactional
    public NotificationEntity createBookingNotification(ScheduledBookingCreatedEvent event) {
        AgencyProfileEntity agency = null;
        if (event.getAgencyId() != null) {
            agency = agencyProfileRepository.findById(event.getAgencyId()).orElse(null);
        }

        BookingEntity booking = null;
        if (event.getBookingId() != null) {
            booking = bookingRepository.findById(event.getBookingId())
                    .orElseGet(() -> bookingRepository.getReferenceById(event.getBookingId()));
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", event.getBookingId());
        metadata.put("bookingCode", event.getBookingCode());
        metadata.put("customerName", event.getCustomerName());
        metadata.put("customerPhone", event.getCustomerPhone());
        metadata.put("servicePackageName", event.getServicePackageName());
        metadata.put("bookingDate", event.getBookingDate() != null ? event.getBookingDate().toString() : null);
        metadata.put("startTime", event.getStartTime() != null ? event.getStartTime().toString() : null);
        metadata.put("totalAmount", event.getTotalAmount());
        metadata.put("depositAmount", event.getDepositAmount());

        NotificationEntity entity = NotificationEntity.builder()
                .agency(agency)
                .user(agency != null ? agency.getOwner() : null)
                .booking(booking)
                .type("NEW_BOOKING")
                .title("Có Đơn Đặt Lịch Mới!")
                .content("Khách hàng " + (event.getCustomerName() != null ? event.getCustomerName() : "") + " vừa đặt gói " + (event.getServicePackageName() != null ? event.getServicePackageName() : ""))
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created in-app notification ID={} for agencyId={}", saved.getId(), event.getAgencyId());
        return saved;
    }
}
