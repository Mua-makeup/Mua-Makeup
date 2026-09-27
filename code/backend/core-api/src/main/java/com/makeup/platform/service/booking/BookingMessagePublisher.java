package com.makeup.platform.service.booking;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.HashMap;
import java.util.Map;

/** Sends a snapshot only after the booking transaction has committed. */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingMessagePublisher {
    private final SimpMessagingTemplate messagingTemplate;

    public void send(String destination, Map<String, Object> payload) {
        Map<String, Object> snapshot = new HashMap<>(payload);
        Runnable delivery = () -> {
            try {
                messagingTemplate.convertAndSend(destination, snapshot);
            } catch (RuntimeException ex) {
                log.error("Failed to deliver committed booking message to {}", destination, ex);
            }
        };
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    delivery.run();
                }
            });
        } else {
            delivery.run();
        }
    }
}
