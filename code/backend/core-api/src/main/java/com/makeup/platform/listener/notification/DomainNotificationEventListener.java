package com.makeup.platform.listener.notification;

import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.i18n.JsonMessageSource;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.interaction.NotificationRepository;
import com.makeup.platform.service.interaction.NotificationDeduplicationService;
import com.makeup.platform.service.interaction.UserWebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DomainNotificationEventListener {

    private final BookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationDeduplicationService deduplicationService;
    private final UserWebSocketNotificationService webSocketNotificationService;
    private final JsonMessageSource messageSource;

    @Async("notificationTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onBookingStateChanged(BookingStateChangedEvent event) {
        log.info("[DomainNotification] Received BookingStateChangedEvent for bookingId={}, toStatus={}, eventId={}",
                event.getBookingId(), event.getToStatus(), event.getEventId());

        // 1. Kiểm tra chống trùng lặp sự kiện (Idempotency Guard via Redis)
        if (!deduplicationService.tryAcquire(event.getEventId())) {
            log.warn("[DomainNotification] Duplicate event detected for eventId={}. Skipping.", event.getEventId());
            return;
        }

        // 2. Tra cứu thông tin đơn hàng
        BookingEntity booking = bookingRepository.findById(event.getBookingId()).orElse(null);
        if (booking == null) {
            log.warn("[DomainNotification] BookingEntity not found for id={}", event.getBookingId());
            return;
        }

        String muaName = "Chuyên viên trang điểm";
        if (booking.getMua() != null && booking.getMua().getUser() != null
                && StringUtils.hasText(booking.getMua().getUser().getFullName())) {
            muaName = booking.getMua().getUser().getFullName();
        }

        String customerName = "Khách hàng";
        if (booking.getCustomer() != null && StringUtils.hasText(booking.getCustomer().getFullName())) {
            customerName = booking.getCustomer().getFullName();
        }

        String bookingCode = booking.getBookingCode() != null ? booking.getBookingCode() : String.valueOf(booking.getId());

        // 3. Xử lý thông báo cho Khách hàng
        if (booking.getCustomer() != null) {
            dispatchCustomerNotification(booking, booking.getCustomer(), event.getToStatus(), muaName, bookingCode);
        }

        // 4. Xử lý thông báo cho Thợ MUA (nếu có ca bị hủy hoặc chuyển giao)
        if (booking.getMua() != null && booking.getMua().getUser() != null) {
            dispatchMuaNotification(booking, booking.getMua().getUser(), event.getToStatus(), customerName, bookingCode);
        }
    }

    private void dispatchCustomerNotification(
            BookingEntity booking,
            UserEntity customer,
            BookingStatus status,
            String muaName,
            String bookingCode
    ) {
        Locale locale = resolveLocale(customer);
        String titleKey = null;
        String contentKey = null;
        Object[] args = null;
        String notificationType = "BOOKING_STATUS_UPDATE";

        switch (status) {
            case ACCEPTED:
                titleKey = "notification.booking_accepted_title";
                contentKey = "notification.booking_accepted_content";
                args = new Object[]{muaName, bookingCode};
                notificationType = "BOOKING_ACCEPTED";
                break;
            case ON_THE_WAY:
                titleKey = "notification.booking_on_the_way_title";
                contentKey = "notification.booking_on_the_way_content";
                args = new Object[]{muaName};
                notificationType = "BOOKING_ON_THE_WAY";
                break;
            case ARRIVED:
                titleKey = "notification.booking_arrived_title";
                contentKey = "notification.booking_arrived_content";
                args = new Object[]{muaName, bookingCode};
                notificationType = "BOOKING_ARRIVED";
                break;
            case IN_PROGRESS:
                titleKey = "notification.booking_in_progress_title";
                contentKey = "notification.booking_in_progress_content";
                args = new Object[]{muaName};
                notificationType = "BOOKING_IN_PROGRESS";
                break;
            case COMPLETED:
            case PAID_OUT:
                titleKey = "notification.booking_completed_title";
                contentKey = "notification.booking_completed_content";
                args = new Object[]{bookingCode, muaName};
                notificationType = "BOOKING_COMPLETED";
                break;
            case CANCELLED:
            case CANCELLED_EXPIRED:
                titleKey = "notification.booking_cancelled_title";
                contentKey = "notification.booking_cancelled_content";
                String reason = StringUtils.hasText(booking.getEmergencyReason()) ? booking.getEmergencyReason() : "Hủy theo yêu cầu";
                args = new Object[]{bookingCode, reason};
                notificationType = "BOOKING_CANCELLED";
                break;
            default:
                break;
        }

        if (titleKey == null || contentKey == null) {
            return;
        }

        String title = messageSource.getLocalizedMessage(titleKey, null, "Thông báo lịch hẹn", locale);
        String content = messageSource.getLocalizedMessage(contentKey, args, "Lịch hẹn #" + bookingCode + " đã cập nhật.", locale);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", booking.getId());
        metadata.put("bookingCode", bookingCode);
        metadata.put("status", status.name());
        metadata.put("muaName", muaName);

        NotificationEntity entity = NotificationEntity.builder()
                .user(customer)
                .booking(booking)
                .agency(booking.getAgency())
                .type(notificationType)
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(customer.getId());

        // Bắn WebSocket P2P tới Khách Hàng
        webSocketNotificationService.sendNotificationToUser(customer.getId(), saved, unreadCount);
    }

    private void dispatchMuaNotification(
            BookingEntity booking,
            UserEntity muaUser,
            BookingStatus status,
            String customerName,
            String bookingCode
    ) {
        if (status != BookingStatus.CANCELLED && status != BookingStatus.CANCELLED_EXPIRED) {
            return;
        }

        Locale locale = resolveLocale(muaUser);
        String reason = StringUtils.hasText(booking.getEmergencyReason()) ? booking.getEmergencyReason() : "Khách hàng hủy";
        String title = messageSource.getLocalizedMessage("notification.booking_cancelled_title", null, "Lịch hẹn đã bị hủy", locale);
        String content = messageSource.getLocalizedMessage(
                "notification.booking_cancelled_content",
                new Object[]{bookingCode, reason},
                "Lịch hẹn #" + bookingCode + " đã bị hủy.",
                locale
        );

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", booking.getId());
        metadata.put("bookingCode", bookingCode);
        metadata.put("status", status.name());
        metadata.put("cancelledBy", customerName);

        NotificationEntity entity = NotificationEntity.builder()
                .user(muaUser)
                .booking(booking)
                .agency(booking.getAgency())
                .type("BOOKING_CANCELLED")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(muaUser.getId());

        // Bắn WebSocket P2P tới Thợ MUA
        webSocketNotificationService.sendNotificationToUser(muaUser.getId(), saved, unreadCount);
    }

    private Locale resolveLocale(UserEntity user) {
        if (user != null && StringUtils.hasText(user.getLanguage())) {
            return Locale.forLanguageTag(user.getLanguage());
        }
        return Locale.forLanguageTag("vi");
    }
}
