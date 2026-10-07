package com.makeup.platform.service.payment.impl;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingSlotCancelHelper {

    private final BookingRepository bookingRepository;
    private final BookingDepositRepository bookingDepositRepository;
    private final BookingAuditService bookingAuditService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cancelBookingDueToSlotTaken(Long bookingId, Long customerId, String bookingCode, String reason) {
        try {
            Optional<BookingEntity> bookingOpt = bookingRepository.findById(bookingId);
            if (bookingOpt.isPresent()) {
                BookingEntity booking = bookingOpt.get();
                BookingStatus prevStatus = booking.getStatus();
                if (prevStatus == BookingStatus.PENDING_DEPOSIT) {
                    booking.setStatus(BookingStatus.CANCELLED);
                    booking.setCancellationReason(reason);
                    booking.setDepositExpiredAt(null);
                    bookingRepository.save(booking);

                    Optional<BookingDepositEntity> depositOpt = bookingDepositRepository.findByBookingId(bookingId);
                    if (depositOpt.isPresent()) {
                        BookingDepositEntity deposit = depositOpt.get();
                        deposit.setStatus("SLOT_TAKEN");
                        bookingDepositRepository.save(deposit);
                    }

                    bookingAuditService.logTransition(bookingId, prevStatus, BookingStatus.CANCELLED,
                            customerId, "Slot đã bị khách hàng khác hoàn tất đặt trước.");

                    // Bắn STOMP WebSocket thông báo cập nhật ngay lập tức cho Khách hàng & Thợ
                    Map<String, Object> wsPayload = new HashMap<>();
                    wsPayload.put("type", "BOOKING_SLOT_TAKEN");
                    wsPayload.put("bookingId", bookingId);
                    wsPayload.put("bookingCode", bookingCode != null ? bookingCode : booking.getBookingCode());
                    wsPayload.put("status", "CANCELLED");
                    wsPayload.put("depositStatus", "SLOT_TAKEN");
                    wsPayload.put("isSlotTaken", true);
                    wsPayload.put("cancellationReason", reason);
                    wsPayload.put("message", reason);
                    wsPayload.put("timestamp", System.currentTimeMillis());

                    messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, wsPayload);
                    messagingTemplate.convertAndSend("/topic/customer-bookings/" + customerId, wsPayload);
                    if (booking.getMua() != null) {
                        messagingTemplate.convertAndSend("/topic/mua-bookings/" + booking.getMua().getId(), wsPayload);
                    }
                    if (booking.getAgency() != null) {
                        messagingTemplate.convertAndSend("/topic/agency-bookings/" + booking.getAgency().getId(), wsPayload);
                    }
                    log.info("[BookingSlotCancelHelper] Successfully committed cancellation for booking {} due to slot taken", bookingId);
                }
            }
        } catch (Exception ex) {
            log.error("[BookingSlotCancelHelper] Failed to cancel booking {} due to slot taken: {}", bookingId, ex.getMessage(), ex);
        }
    }
}
