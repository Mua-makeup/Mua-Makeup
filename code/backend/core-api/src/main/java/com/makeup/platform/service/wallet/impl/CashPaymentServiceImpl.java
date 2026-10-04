package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.wallet.CashPaymentConfirmationReq;
import com.makeup.platform.dto.response.wallet.CashReceiptStatusRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.wallet.BookingCashReceiptRepository;
import com.makeup.platform.service.wallet.BookingSettlementService;
import com.makeup.platform.service.wallet.CashPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashPaymentServiceImpl implements CashPaymentService {

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    @Value("${app.settlement.commission-rate:0.1500}")
    private BigDecimal defaultCommissionRate;

    private final BookingRepository bookingRepository;
    private final BookingCashReceiptRepository cashReceiptRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingSettlementService bookingSettlementService;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public CashReceiptStatusRes confirmByCustomer(Long bookingId, Long customerId, CashPaymentConfirmationReq req) {
        BookingCashReceiptEntity receipt = getOrCreateReceipt(bookingId, customerId, req.getInvoiceVersion());

        // Idempotency: cùng key -> cùng kết quả
        if (req.getIdempotencyKey().equals(receipt.getIdempotencyKeyCustomer())) {
            return mapToRes(receipt, bookingId);
        }

        // Kiểm tra đã xác nhận chưa
        if (receipt.getCustomerConfirmedAt() != null) {
            throw new CustomBusinessException(ErrorCodes.ERR_CASH_RECEIPT_ALREADY_CONFIRMED,
                    "cash_receipt.customer_already_confirmed", HttpStatus.CONFLICT);
        }

        // Kiểm tra invoice_version khớp
        if (!req.getInvoiceVersion().equals(receipt.getInvoiceVersion())) {
            throw new CustomBusinessException(ErrorCodes.ERR_CASH_RECEIPT_INVOICE_VERSION_MISMATCH,
                    "cash_receipt.invoice_version_mismatch", HttpStatus.CONFLICT);
        }

        receipt.setCustomerConfirmedAt(OffsetDateTime.now(VIETNAM_OFFSET));
        receipt.setIdempotencyKeyCustomer(req.getIdempotencyKey());

        receipt = checkAndTriggerSettlement(receipt, bookingId);
        cashReceiptRepository.save(receipt);

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "CUSTOMER_CASH_PAID");
            payload.put("bookingId", bookingId);
            payload.put("bookingCode", receipt.getBooking() != null ? receipt.getBooking().getBookingCode() : null);
            payload.put("expectedAmount", receipt.getExpectedAmount());
            payload.put("status", receipt.getStatus());
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, payload);
            if (receipt.getBooking() != null && receipt.getBooking().getMua() != null) {
                Long muaId = receipt.getBooking().getMua().getId();
                messagingTemplate.convertAndSend("/topic/booking-customer-confirmed/" + muaId, payload);
            }
        } catch (Exception ex) {
            log.warn("[CashReceipt] Failed to broadcast CUSTOMER_CASH_PAID: {}", ex.getMessage());
        }

        log.info("[CashReceipt] Customer {} confirmed cash for booking {}", customerId, bookingId);
        return mapToRes(receipt, bookingId);
    }

    @Override
    @Transactional
    public CashReceiptStatusRes confirmByFreelancer(Long bookingId, Long muaUserId, CashPaymentConfirmationReq req) {
        // Verify MUA is assigned to this booking
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getMua() == null || !booking.getMua().getUser().getId().equals(muaUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN,
                    "cash_receipt.freelancer_not_assigned", HttpStatus.FORBIDDEN);
        }

        BookingCashReceiptEntity receipt = cashReceiptRepository.findByBookingIdWithLock(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_CASH_RECEIPT_NOT_FOUND,
                        "cash_receipt.not_found", HttpStatus.NOT_FOUND));

        // Idempotency
        if (req.getIdempotencyKey().equals(receipt.getIdempotencyKeyFreelancer())) {
            return mapToRes(receipt, bookingId);
        }

        if (receipt.getFreelancerConfirmedAt() != null) {
            throw new CustomBusinessException(ErrorCodes.ERR_CASH_RECEIPT_ALREADY_CONFIRMED,
                    "cash_receipt.freelancer_already_confirmed", HttpStatus.CONFLICT);
        }

        if (!req.getInvoiceVersion().equals(receipt.getInvoiceVersion())) {
            throw new CustomBusinessException(ErrorCodes.ERR_CASH_RECEIPT_INVOICE_VERSION_MISMATCH,
                    "cash_receipt.invoice_version_mismatch", HttpStatus.CONFLICT);
        }

        receipt.setFreelancerConfirmedAt(OffsetDateTime.now(VIETNAM_OFFSET));
        receipt.setFreelancerUser(booking.getMua().getUser());
        receipt.setIdempotencyKeyFreelancer(req.getIdempotencyKey());

        receipt = checkAndTriggerSettlement(receipt, bookingId);
        cashReceiptRepository.save(receipt);

        log.info("[CashReceipt] Freelancer {} confirmed cash for booking {}", muaUserId, bookingId);
        return mapToRes(receipt, bookingId);
    }

    @Override
    @Transactional(readOnly = true)
    public CashReceiptStatusRes getStatus(Long bookingId, Long actorUserId) {
        BookingCashReceiptEntity receipt = cashReceiptRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_CASH_RECEIPT_NOT_FOUND,
                        "cash_receipt.not_found", HttpStatus.NOT_FOUND));
        return mapToRes(receipt, bookingId);
    }

    // === Private helpers ===

    private BookingCashReceiptEntity getOrCreateReceipt(Long bookingId, Long customerId, String invoiceVersion) {
        // Lock để tránh tạo duplicate
        return cashReceiptRepository.findByBookingIdWithLock(bookingId)
                .orElseGet(() -> {
                    BookingEntity booking = bookingRepository.findById(bookingId)
                            .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                                    "booking.not_found", HttpStatus.NOT_FOUND));

                    if (!booking.getCustomer().getId().equals(customerId)) {
                        throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN,
                                "booking.access_denied", HttpStatus.FORBIDDEN);
                    }

                    // Tính C = T - D (tiền mặt kỳ vọng)
                    BigDecimal expectedCash = booking.getTotalAmount()
                            .subtract(booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO);

                    BookingCashReceiptEntity newReceipt = BookingCashReceiptEntity.builder()
                            .booking(booking)
                            .invoiceVersion(invoiceVersion)
                            .expectedAmount(expectedCash.max(BigDecimal.ZERO))
                            .status("PENDING")
                            .customerUser(booking.getCustomer())
                            .build();

                    return cashReceiptRepository.save(newReceipt);
                });
    }

    private BookingCashReceiptEntity checkAndTriggerSettlement(BookingCashReceiptEntity receipt, Long bookingId) {
        if (receipt.getCustomerConfirmedAt() != null && receipt.getFreelancerConfirmedAt() != null) {
            receipt.setStatus("BOTH_CONFIRMED");
            cashReceiptRepository.save(receipt);
            // Trigger settlement
            try {
                bookingSettlementService.settleBooking(bookingId, defaultCommissionRate);
            } catch (Exception e) {
                // Settlement failure không block confirmation — log và retry sau
                log.error("[CashReceipt] Settlement trigger failed for booking {}. Will retry.", bookingId, e);
            }

            try {
                var booking = receipt.getBooking();
                java.math.BigDecimal totalAmount = booking != null && booking.getTotalAmount() != null ? booking.getTotalAmount() : java.math.BigDecimal.ZERO;
                java.math.BigDecimal depositAmount = booking != null && booking.getDepositAmount() != null ? booking.getDepositAmount() : java.math.BigDecimal.ZERO;
                java.math.BigDecimal commission = totalAmount.multiply(defaultCommissionRate).setScale(0, java.math.RoundingMode.HALF_UP);
                java.math.BigDecimal earningsAmount = totalAmount.subtract(commission);

                Map<String, Object> payload = new HashMap<>();
                payload.put("type", "PAYMENT_COMPLETED");
                payload.put("bookingId", bookingId);
                payload.put("bookingCode", booking != null ? booking.getBookingCode() : null);
                payload.put("status", "PAID_OUT");
                payload.put("isDepositPaid", true);
                payload.put("paymentMethod", "CASH");
                payload.put("totalAmount", totalAmount);
                payload.put("depositAmount", depositAmount);
                payload.put("finalAmount", receipt.getExpectedAmount());
                payload.put("paidAmount", receipt.getExpectedAmount());
                payload.put("earningsAmount", earningsAmount);
                payload.put("customerName", booking != null && booking.getCustomer() != null ? booking.getCustomer().getFullName() : null);
                payload.put("customerPhone", booking != null && booking.getCustomer() != null ? booking.getCustomer().getPhoneNumber() : null);
                payload.put("destinationAddress", booking != null ? booking.getDestinationAddress() : null);
                payload.put("timestamp", System.currentTimeMillis());

                messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, payload);
                if (booking != null && booking.getMua() != null) {
                    Long muaId = booking.getMua().getId();
                    messagingTemplate.convertAndSend("/topic/booking-customer-confirmed/" + muaId, payload);
                }
            } catch (Exception ex) {
                log.warn("[CashReceipt] Failed to broadcast BOTH_CONFIRMED: {}", ex.getMessage());
            }
        }
        return receipt;
    }

    private CashReceiptStatusRes mapToRes(BookingCashReceiptEntity receipt, Long bookingId) {
        BookingEntity booking = receipt.getBooking();
        return CashReceiptStatusRes.builder()
                .bookingId(bookingId)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .invoiceVersion(receipt.getInvoiceVersion())
                .expectedAmount(receipt.getExpectedAmount())
                .status(receipt.getStatus())
                .customerConfirmedAt(receipt.getCustomerConfirmedAt())
                .freelancerConfirmedAt(receipt.getFreelancerConfirmedAt())
                .customerConfirmed(receipt.getCustomerConfirmedAt() != null)
                .freelancerConfirmed(receipt.getFreelancerConfirmedAt() != null)
                .disputeReason(receipt.getDisputeReason())
                .build();
    }
}
