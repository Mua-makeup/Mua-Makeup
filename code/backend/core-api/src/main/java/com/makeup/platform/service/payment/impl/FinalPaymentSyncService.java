package com.makeup.platform.service.payment.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinalPaymentSyncService {
    private final BookingRepository bookings;
    private final PaymentTransactionRepository payments;
    private final FinalPaymentReconciliationService reconciliation;
    private String reconciliationCursor = "";

    public void syncBooking(Long bookingId, Long customerId) {
        if (!bookings.existsByIdAndCustomerId(bookingId, customerId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN, "booking.access_denied", org.springframework.http.HttpStatus.FORBIDDEN);
        }
        for (String code : payments.findFinalPaymentOwner(bookingId, customerId)) reconciliation.reconcile(code);
    }

    // Continue recovering payments even when the customer closes the app or ngrok is offline.
    @Scheduled(fixedDelayString = "${payment.final-reconciliation-delay-ms:30000}")
    public void reconcilePendingPayments() {
        var codes = payments.findFinalPaymentsToReconcile(LocalDateTime.now().minusDays(30), reconciliationCursor, PageRequest.of(0, 100));
        // Keyset pagination prevents unpaid attempts from starving older recoverable payments.
        reconciliationCursor = codes.size() < 100 ? "" : codes.get(codes.size() - 1);
        for (String code : codes) {
            try {
                reconciliation.reconcile(code);
            } catch (Exception ex) {
                log.warn("Final payment reconciliation deferred for {}: {}", code, ex.getMessage());
            }
        }
    }
}
