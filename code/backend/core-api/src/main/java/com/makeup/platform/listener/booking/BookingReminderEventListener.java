package com.makeup.platform.listener.booking;

import com.makeup.platform.common.event.booking.BookingDepositExpiredEvent;
import com.makeup.platform.common.event.booking.BookingReminderEvent;
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
public class BookingReminderEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBookingReminder(BookingReminderEvent event) {
        log.info("[Reminder Notification] Dispatching async reminder [{}] for bookingId: {}",
                event.getReminderType(), event.getBookingId());

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", event.getReminderType());
            payload.put("bookingId", event.getBookingId());
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-reminders/" + event.getBookingId(), payload);
            log.info("[WebSocket] Broadcasted reminder to /topic/booking-reminders/{}", event.getBookingId());
        } catch (Exception e) {
            log.error("[WebSocket] Failed to send reminder notification for bookingId: {}", event.getBookingId(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBookingDepositExpired(BookingDepositExpiredEvent event) {
        log.info("[Deposit Expired] Dispatching expiration notice for bookingId: {}", event.getBookingId());

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "DEPOSIT_EXPIRED");
            payload.put("bookingId", event.getBookingId());
            payload.put("status", "CANCELLED_EXPIRED");
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-expired/" + event.getBookingId(), payload);
            log.info("[WebSocket] Broadcasted expiration signal to /topic/booking-expired/{}", event.getBookingId());
        } catch (Exception e) {
            log.error("[WebSocket] Failed to send deposit expired notice for bookingId: {}", event.getBookingId(), e);
        }
    }
}
