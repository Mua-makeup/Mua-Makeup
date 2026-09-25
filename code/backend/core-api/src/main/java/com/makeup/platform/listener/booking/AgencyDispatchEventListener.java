package com.makeup.platform.listener.booking;

import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
import com.makeup.platform.common.i18n.JsonMessageSource;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgencyDispatchEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final JsonMessageSource messageSource;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleEmergencyReassignmentRequested(EmergencyReassignmentRequestedEvent event) {
        if (event.getAgencyId() == null) {
            return;
        }

        log.warn("[WebSocket] Emergency reassignment requested for agencyId={}, bookingId={}, staff={}, tier={}",
                event.getAgencyId(), event.getBookingId(), event.getStaffName(), event.getEmergencyTier());

        try {
            // 1. Lưu bền vững vào CSDL interaction_schema.in_app_notifications
            NotificationEntity savedNotif = notificationService.createEmergencyNotification(event);

            Locale locale = LocaleContextHolder.getLocale();
            String staffName = event.getStaffName() != null ? event.getStaffName() : "Thợ";
            String bookingCode = event.getBookingCode() != null ? event.getBookingCode() : "";
            String broadcastMsg = messageSource.getLocalizedMessage(
                    "notification.emergency_broadcast",
                    new Object[]{staffName, bookingCode},
                    "CẢNH BÁO KHẨN: Thợ " + staffName + " báo bận đột xuất cho đơn " + bookingCode + "! Cần đổi thợ gấp.",
                    locale
            );

            Map<String, Object> payload = new HashMap<>();
            payload.put("id", savedNotif != null ? savedNotif.getId() : null);
            payload.put("type", "EMERGENCY_REASSIGNMENT_ALERT");
            payload.put("bookingId", event.getBookingId());
            payload.put("bookingCode", event.getBookingCode());
            payload.put("agencyId", event.getAgencyId());
            payload.put("staffId", event.getStaffId());
            payload.put("staffName", event.getStaffName());
            payload.put("role", event.getRole() != null ? event.getRole().name() : null);
            payload.put("emergencyReason", event.getEmergencyReason());
            payload.put("emergencyTier", event.getEmergencyTier());
            payload.put("hoursUntilBooking", event.getHoursUntilBooking());
            payload.put("scheduledStartTime", event.getScheduledStartTime() != null ? event.getScheduledStartTime().toString() : null);
            payload.put("proofDocumentUrl", event.getProofDocumentUrl());
            payload.put("timestamp", System.currentTimeMillis());
            payload.put("message", broadcastMsg);

            String topic = "/topic/agency/" + event.getAgencyId() + "/dispatch-alerts";
            messagingTemplate.convertAndSend(topic, payload);
            messagingTemplate.convertAndSend("/topic/agency/" + event.getAgencyId() + "/bookings", payload);
            log.info("[WebSocket] Sent emergency dispatch alert to {}", topic);
        } catch (Exception e) {
            log.error("[WebSocket] Failed to broadcast emergency dispatch alert for bookingId={}",
                    event.getBookingId(), e);
        }
    }
}
