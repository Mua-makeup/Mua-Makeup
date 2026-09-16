package com.makeup.platform.listener.booking;

import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.event.booking.InstantBookingAcceptedEvent;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class InstantBookingEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final MuaProfileRepository muaProfileRepository;

    @Async
    @EventListener
    public void handleInstantBookingAccepted(InstantBookingAcceptedEvent event) {
        log.info("[WebSocket] Received InstantBookingAcceptedEvent for bookingId={}, muaId={}",
                event.getBookingId(), event.getMuaId());

        try {
            MuaProfileEntity mua = muaProfileRepository.findById(event.getMuaId()).orElse(null);

            // 1. Broadcast to Customer topic /topic/booking-matched/{bookingId}
            Map<String, Object> matchedPayload = new HashMap<>();
            matchedPayload.put("type", "BOOKING_MATCHED");
            matchedPayload.put("bookingId", event.getBookingId());
            matchedPayload.put("status", "ACCEPTED");
            matchedPayload.put("muaId", event.getMuaId());
            if (mua != null && mua.getUser() != null) {
                matchedPayload.put("muaName", mua.getUser().getFullName());
                matchedPayload.put("muaPhone", mua.getUser().getPhoneNumber());
                matchedPayload.put("rating", mua.getRatingAvg());
            }
            matchedPayload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-matched/" + event.getBookingId(), matchedPayload);
            log.info("[WebSocket] Broadcasted to /topic/booking-matched/{}", event.getBookingId());

            // 2. Broadcast to other MUAs to dismiss the popup
            Map<String, Object> dismissPayload = new HashMap<>();
            dismissPayload.put("type", "BOOKING_DISMISSED");
            dismissPayload.put("bookingId", event.getBookingId());
            dismissPayload.put("reason", "ALREADY_ACCEPTED");
            dismissPayload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/instant-dismiss/" + event.getBookingId(), dismissPayload);
            messagingTemplate.convertAndSend("/topic/instant-dismiss", dismissPayload);
            log.info("[WebSocket] Broadcasted dismiss signal for bookingId={}", event.getBookingId());

        } catch (Exception e) {
            log.error("[WebSocket] Failed to broadcast booking matched/dismiss event: {}", e.getMessage(), e);
        }
    }

    @Async
    @EventListener
    public void handleBookingStateChanged(BookingStateChangedEvent event) {
        log.info("[WebSocket] Received BookingStateChangedEvent for bookingId={}, status={}",
                event.getBookingId(), event.getToStatus());

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "BOOKING_STATUS_CHANGED");
            payload.put("bookingId", event.getBookingId());
            payload.put("bookingCode", event.getBookingCode());
            payload.put("previousStatus", event.getFromStatus().name());
            payload.put("currentStatus", event.getToStatus().name());
            payload.put("status", event.getToStatus().name());
            payload.put("updatedByUserId", event.getChangedByUserId());
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + event.getBookingId(), payload);
            messagingTemplate.convertAndSend("/topic/booking-matched/" + event.getBookingId(), payload);
            log.info("[WebSocket] Broadcasted status update for bookingId={} to /topic/booking-status/{}",
                    event.getBookingId(), event.getBookingId());

        } catch (Exception e) {
            log.warn("[WebSocket] Failed to broadcast BookingStateChangedEvent: {}", e.getMessage());
        }
    }
}
