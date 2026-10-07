package com.makeup.platform.listener.notification;

import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.i18n.JsonMessageSource;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.interaction.NotificationRepository;
import com.makeup.platform.service.interaction.NotificationDeduplicationService;
import com.makeup.platform.service.interaction.UserWebSocketNotificationService;
import com.makeup.platform.service.mail.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
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
    private final EmailService emailService;

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
            dispatchCustomerEmailNotifications(booking, event);
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
                if (booking.getBookingType() == BookingType.SCHEDULED) {
                    titleKey = "notification.scheduled_booking_accepted_title";
                    contentKey = "notification.scheduled_booking_accepted_content";
                    String dateStr = booking.getBookingDate() != null
                            ? booking.getBookingDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            : "ngày đã đặt";
                    String timeStr = booking.getStartTime() != null
                            ? booking.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm"))
                            : "giờ đã hẹn";
                    args = new Object[]{muaName, bookingCode, dateStr, timeStr};
                    notificationType = "SCHEDULED_BOOKING_ACCEPTED";
                }
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
                // Các bước tiến trình đơn hàng (ON_THE_WAY, ARRIVED, IN_PROGRESS, COMPLETED)
                // được theo dõi trực quan tại Tab "Theo Dõi" (Activity Tracking), không tạo rác hòm thư Quả Chuông.
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

        // Bắn WebSocket P2P tới Khách Hàng (Chuông thông báo in-app)
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

    private void dispatchCustomerEmailNotifications(BookingEntity booking, BookingStateChangedEvent event) {
        if (booking == null || booking.getCustomer() == null || !StringUtils.hasText(booking.getCustomer().getEmail())) {
            return;
        }

        String toEmail = booking.getCustomer().getEmail().trim();
        String customerName = booking.getCustomer().getFullName();
        String bookingCode = booking.getBookingCode() != null ? booking.getBookingCode() : String.valueOf(booking.getId());

        // LUỒNG 1: ĐẶT LỊCH HẸN TRƯỚC (SCHEDULED) - Gửi mail khi Thợ xác nhận tiếp nhận đơn sau khi khách cọc
        if (booking.getBookingType() == BookingType.SCHEDULED) {
            if (event.getToStatus() == BookingStatus.ACCEPTED) {
                try {
                    String artistName = (booking.getMua() != null && booking.getMua().getUser() != null)
                            ? booking.getMua().getUser().getFullName()
                            : "Chuyên viên trang điểm";
                    String artistPhone = (booking.getMua() != null && booking.getMua().getUser() != null)
                            ? booking.getMua().getUser().getPhoneNumber()
                            : "Chưa cập nhật";
                    String artistRating = (booking.getMua() != null && booking.getMua().getRatingAvg() != null)
                            ? String.format(Locale.US, "%.1f", booking.getMua().getRatingAvg())
                            : "5.0";
                    String packageName = booking.getServicePackage() != null
                            ? booking.getServicePackage().getPackageName()
                            : "Gói Dịch Vụ Đặt Lịch";
                    String styleName = booking.getStyle() != null
                            ? booking.getStyle().getStyleName()
                            : "Tiêu chuẩn";
                    String destinationAddress = booking.getDestinationAddress();
                    String bookingDate = booking.getBookingDate() != null
                            ? booking.getBookingDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            : "Theo lịch hẹn";
                    String startTime = booking.getStartTime() != null
                            ? booking.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm"))
                            : "Theo giờ hẹn";
                    BigDecimal totalAmount = booking.getTotalAmount() != null
                            ? booking.getTotalAmount()
                            : BigDecimal.ZERO;
                    BigDecimal depositAmount = booking.getDepositAmount() != null
                            ? booking.getDepositAmount()
                            : BigDecimal.ZERO;
                    BigDecimal remainingAmount = totalAmount.subtract(depositAmount).max(BigDecimal.ZERO);

                    emailService.sendCustomerScheduledBookingConfirmedEmail(
                            toEmail, customerName, bookingCode, artistName, artistPhone,
                            artistRating, packageName, styleName, destinationAddress,
                            bookingDate, startTime, totalAmount, depositAmount, remainingAmount
                    );
                    log.info("[DomainNotification] Triggered SCHEDULED booking confirmed email for bookingCode={} to customer={}",
                            bookingCode, toEmail);
                } catch (Exception ex) {
                    log.error("[DomainNotification] Failed to send SCHEDULED booking confirmed email for bookingId={}: {}",
                            booking.getId(), ex.getMessage(), ex);
                }
            }
            return;
        }

        // LUỒNG 2: ĐƠN KHẨN CẤP (REALTIME_INSTANT) - Toàn bộ luồng email khẩn cấp CHỈ áp dụng cho REALTIME_INSTANT
        if (booking.getBookingType() != BookingType.REALTIME_INSTANT) {
            return;
        }

        String bookingType = booking.getBookingType().name();

        // Phần 1: Khi thợ bắt đầu di chuyển (ON_THE_WAY)
        if (event.getToStatus() == BookingStatus.ON_THE_WAY) {
            try {
                String artistName = (booking.getMua() != null && booking.getMua().getUser() != null)
                        ? booking.getMua().getUser().getFullName()
                        : "Chuyên viên trang điểm";
                String artistPhone = (booking.getMua() != null && booking.getMua().getUser() != null)
                        ? booking.getMua().getUser().getPhoneNumber()
                        : "Chưa cập nhật";
                String artistRating = (booking.getMua() != null && booking.getMua().getRatingAvg() != null)
                        ? String.format(Locale.US, "%.1f", booking.getMua().getRatingAvg())
                        : "5.0";
                String packageName = booking.getServicePackage() != null
                        ? booking.getServicePackage().getPackageName()
                        : "Gói Dịch Vụ Khẩn Cấp";
                String styleName = booking.getStyle() != null
                        ? booking.getStyle().getStyleName()
                        : "Tiêu chuẩn";
                String destinationAddress = booking.getDestinationAddress();
                String startedAt = OffsetDateTime.now(ZoneOffset.ofHours(7))
                        .format(DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy"));

                emailService.sendCustomerArtistOnTheWayEmail(
                        toEmail, customerName, bookingCode, bookingType,
                        artistName, artistPhone, artistRating, packageName,
                        styleName, destinationAddress, startedAt
                );
                log.info("[DomainNotification] Triggered ON_THE_WAY email for bookingCode={} to customer={}",
                        bookingCode, toEmail);
            } catch (Exception ex) {
                log.error("[DomainNotification] Failed to send ON_THE_WAY email for bookingId={}: {}",
                        booking.getId(), ex.getMessage(), ex);
            }
        }

        // Phần 3: Khi đơn hàng bị hủy khi thợ đang ở bước di chuyển (từ ON_THE_WAY sang CANCELLED hoặc CANCELLED_EXPIRED)
        if (event.getFromStatus() == BookingStatus.ON_THE_WAY
                && (event.getToStatus() == BookingStatus.CANCELLED || event.getToStatus() == BookingStatus.CANCELLED_EXPIRED)) {
            try {
                String artistName = (booking.getMua() != null && booking.getMua().getUser() != null)
                        ? booking.getMua().getUser().getFullName()
                        : "Chuyên viên trang điểm";
                String destinationAddress = booking.getDestinationAddress();
                String reason = StringUtils.hasText(booking.getCancellationReason())
                        ? booking.getCancellationReason()
                        : (StringUtils.hasText(booking.getEmergencyReason())
                                ? booking.getEmergencyReason()
                                : "Chuyên viên gặp sự cố bất khả kháng trên đường di chuyển");
                BigDecimal refundAmount = booking.getDepositAmount() != null
                        ? booking.getDepositAmount()
                        : BigDecimal.ZERO;

                emailService.sendCustomerBookingCancelledOnTheWayEmail(
                        toEmail, customerName, bookingCode, bookingType,
                        artistName, destinationAddress, reason, refundAmount
                );
                log.info("[DomainNotification] Triggered CANCELLED ON_THE_WAY email for bookingCode={} to customer={}",
                        bookingCode, toEmail);
            } catch (Exception ex) {
                log.error("[DomainNotification] Failed to send CANCELLED ON_THE_WAY email for bookingId={}: {}",
                        booking.getId(), ex.getMessage(), ex);
            }
        }
    }
}
