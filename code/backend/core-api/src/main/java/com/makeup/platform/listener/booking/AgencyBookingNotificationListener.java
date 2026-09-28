package com.makeup.platform.listener.booking;

import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.interaction.NotificationService;
import com.makeup.platform.service.mail.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgencyBookingNotificationListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final AgencyProfileRepository agencyProfileRepository;
    private final BookingRepository bookingRepository;
    private final EmailService emailService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleScheduledBookingCreated(ScheduledBookingCreatedEvent event) {
        if (event.getAgencyId() == null) {
            return;
        }

        log.info("[WebSocket] Broadcasting new booking notification for agencyId={}, bookingId={}, code={}",
                event.getAgencyId(), event.getBookingId(), event.getBookingCode());

        try {
            // 1. Lưu bền vững vào CSDL interaction_schema.in_app_notifications
            NotificationEntity savedNotif = notificationService.createBookingNotification(event);

            Map<String, Object> payload = new HashMap<>();
            payload.put("id", savedNotif != null ? savedNotif.getId() : null);
            payload.put("type", "NEW_BOOKING");
            payload.put("bookingId", event.getBookingId());
            payload.put("bookingCode", event.getBookingCode());
            payload.put("agencyId", event.getAgencyId());
            payload.put("customerId", event.getCustomerId());
            payload.put("customerName", event.getCustomerName());
            payload.put("customerPhone", event.getCustomerPhone());
            payload.put("servicePackageName", event.getServicePackageName());
            payload.put("bookingDate", event.getBookingDate() != null ? event.getBookingDate().toString() : null);
            payload.put("startTime", event.getStartTime() != null ? event.getStartTime().toString() : null);
            payload.put("totalAmount", event.getTotalAmount());
            payload.put("depositAmount", event.getDepositAmount());
            payload.put("timestamp", System.currentTimeMillis());
            payload.put("message", "Có đơn đặt lịch mới từ " + (event.getCustomerName() != null ? event.getCustomerName() : "khách hàng"));

            // Broadcast specifically to agency topic
            String agencyTopic = "/topic/agency/" + event.getAgencyId() + "/bookings";
            messagingTemplate.convertAndSend(agencyTopic, payload);
            log.info("[WebSocket] Sent notification to {}", agencyTopic);

            // 2. Gửi email thông báo đơn mới (Chờ đặt cọc) tới Studio
            try {
                AgencyProfileEntity agency = agencyProfileRepository.findByIdWithOwner(event.getAgencyId()).orElse(null);
                if (agency != null) {
                    String agencyEmail = (agency.getOwner() != null && agency.getOwner().getEmail() != null)
                            ? agency.getOwner().getEmail() : null;
                    if (agencyEmail != null && !agencyEmail.isBlank()) {
                        String destAddress = bookingRepository.findById(event.getBookingId())
                                .map(b -> b.getDestinationAddress())
                                .orElse(null);
                        emailService.sendAgencyNewBookingNotification(
                                agencyEmail,
                                agency.getAgencyName(),
                                event,
                                destAddress
                        );
                    }
                }
            } catch (Exception ex) {
                log.error("[EmailService] Failed to send new booking notification email for bookingId={}: {}",
                        event.getBookingId(), ex.getMessage());
            }
        } catch (Exception e) {
            log.error("[WebSocket] Failed to broadcast agency booking notification for bookingId={}",
                    event.getBookingId(), e);
        }
    }
}
