package com.makeup.platform.service.wallet.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.wallet.CashPaymentConfirmationReq;
import com.makeup.platform.dto.response.wallet.CashReceiptStatusRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.repository.wallet.BookingCashReceiptRepository;
import com.makeup.platform.service.interaction.NotificationService;
import com.makeup.platform.service.mail.EmailService;
import com.makeup.platform.service.wallet.BookingSettlementService;
import com.makeup.platform.service.wallet.CashPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
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
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final UserRepository userRepository;
    private final BookingSettlementService bookingSettlementService;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public CashReceiptStatusRes confirmByCustomer(Long bookingId, Long customerId, CashPaymentConfirmationReq req) {
        BookingCashReceiptEntity receipt = getOrCreateReceipt(bookingId, customerId, req.getInvoiceVersion());

        // Idempotency: cùng key -> cùng kết quả
        if (req.getIdempotencyKey() != null && req.getIdempotencyKey().equals(receipt.getIdempotencyKeyCustomer())) {
            return mapToRes(receipt, bookingId);
        }

        // Nếu khách đã xác nhận rồi thì trả về kết quả
        if (receipt.getCustomerConfirmedAt() != null) {
            if (receipt.getFreelancerConfirmedAt() != null && !"BOTH_CONFIRMED".equals(receipt.getStatus())) {
                receipt = checkAndTriggerSettlement(receipt, bookingId);
                cashReceiptRepository.save(receipt);
            }
            log.info("[CashReceipt] Customer {} already confirmed cash for booking {}, returning existing receipt", customerId, bookingId);
            return mapToRes(receipt, bookingId);
        }

        if (req.getInvoiceVersion() != null && receipt.getInvoiceVersion() != null
                && !req.getInvoiceVersion().equals(receipt.getInvoiceVersion())) {
            receipt.setInvoiceVersion(req.getInvoiceVersion());
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
            payload.put("cashAmount", receipt.getExpectedAmount());
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
        return confirmByWorker(bookingId, muaUserId, req);
    }

    @Override
    @Transactional
    public CashReceiptStatusRes confirmByWorker(Long bookingId, Long workerUserId, CashPaymentConfirmationReq req) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        boolean isPrimaryMua = booking.getMua() != null && booking.getMua().getUser() != null
                && booking.getMua().getUser().getId().equals(workerUserId);
        boolean isAssignedPrimaryStaff = false;
        if (!isPrimaryMua && booking.getAgency() != null) {
            isAssignedPrimaryStaff = bookingStaffAssignmentRepository.findWithStaffAndUserByBookingIdAndStatus(bookingId, AssignmentStatus.ACTIVE)
                    .stream()
                    .filter(a -> a.getAssignmentRole() == AssignmentRole.PRIMARY_MUA)
                    .anyMatch(a -> a.getStaff() != null && a.getStaff().getMua() != null
                            && a.getStaff().getMua().getUser() != null
                            && a.getStaff().getMua().getUser().getId().equals(workerUserId));
        }

        if (!isPrimaryMua && !isAssignedPrimaryStaff) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN,
                    "cash_receipt.only_primary_worker_allowed", HttpStatus.FORBIDDEN);
        }

        UserEntity workerUser = userRepository.findById(workerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        BookingCashReceiptEntity receipt = cashReceiptRepository.findByBookingIdWithLock(bookingId)
                .orElseGet(() -> {
                    BigDecimal expectedCash = booking.getTotalAmount()
                            .subtract(booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO);

                    BookingCashReceiptEntity newReceipt = BookingCashReceiptEntity.builder()
                            .booking(booking)
                            .invoiceVersion(req.getInvoiceVersion() != null ? req.getInvoiceVersion() : "v1")
                            .expectedAmount(expectedCash.max(BigDecimal.ZERO))
                            .status("PENDING")
                            .customerUser(booking.getCustomer())
                            .freelancerUser(workerUser)
                            .build();

                    return cashReceiptRepository.save(newReceipt);
                });

        // Idempotency: nếu thợ đã xác nhận rồi, vẫn đảm bảo settlement và booking sang PAID_OUT
        if (receipt.getFreelancerConfirmedAt() != null) {
            if (receipt.getCustomerConfirmedAt() == null) {
                receipt.setCustomerConfirmedAt(OffsetDateTime.now(VIETNAM_OFFSET));
            }
            receipt = checkAndTriggerSettlement(receipt, bookingId);
            cashReceiptRepository.save(receipt);
            log.info("[CashReceipt] Worker {} confirmed cash for booking {}, returning settled receipt", workerUserId, bookingId);
            return mapToRes(receipt, bookingId);
        }

        if (req.getInvoiceVersion() != null && receipt.getInvoiceVersion() != null
                && !req.getInvoiceVersion().equals(receipt.getInvoiceVersion())) {
            receipt.setInvoiceVersion(req.getInvoiceVersion());
        }

        receipt.setFreelancerConfirmedAt(OffsetDateTime.now(VIETNAM_OFFSET));
        receipt.setFreelancerUser(workerUser);
        receipt.setIdempotencyKeyFreelancer(req.getIdempotencyKey());

        if (receipt.getCustomerConfirmedAt() == null) {
            receipt.setCustomerConfirmedAt(OffsetDateTime.now(VIETNAM_OFFSET));
        }

        receipt = checkAndTriggerSettlement(receipt, bookingId);
        cashReceiptRepository.save(receipt);

        log.info("[CashReceipt] Worker {} confirmed cash for booking {}", workerUserId, bookingId);
        return mapToRes(receipt, bookingId);
    }

    @Override
    @Transactional
    public CashReceiptStatusRes declineByWorker(Long bookingId, Long workerUserId, String reason) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        boolean isPrimaryMua = booking.getMua() != null && booking.getMua().getUser() != null
                && booking.getMua().getUser().getId().equals(workerUserId);
        boolean isAssignedPrimaryStaff = false;
        if (!isPrimaryMua && booking.getAgency() != null) {
            isAssignedPrimaryStaff = bookingStaffAssignmentRepository.findWithStaffAndUserByBookingIdAndStatus(bookingId, AssignmentStatus.ACTIVE)
                    .stream()
                    .filter(a -> a.getAssignmentRole() == AssignmentRole.PRIMARY_MUA)
                    .anyMatch(a -> a.getStaff() != null && a.getStaff().getMua() != null
                            && a.getStaff().getMua().getUser() != null
                            && a.getStaff().getMua().getUser().getId().equals(workerUserId));
        }

        if (!isPrimaryMua && !isAssignedPrimaryStaff) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN,
                    "cash_receipt.only_primary_worker_allowed", HttpStatus.FORBIDDEN);
        }

        BookingCashReceiptEntity receipt = cashReceiptRepository.findByBookingIdWithLock(bookingId).orElse(null);
        if (receipt != null) {
            receipt.setCustomerConfirmedAt(null);
            receipt.setFreelancerConfirmedAt(null);
            receipt.setStatus("DECLINED_BY_WORKER");
            cashReceiptRepository.save(receipt);
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "WORKER_CASH_DECLINED");
            payload.put("bookingId", bookingId);
            payload.put("bookingCode", booking.getBookingCode());
            payload.put("reason", StringUtils.hasText(reason) ? reason : "Chuyên viên báo chưa nhận được tiền mặt");
            payload.put("status", "DECLINED_BY_WORKER");
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, payload);
        } catch (Exception ex) {
            log.warn("[CashReceipt] Failed to broadcast WORKER_CASH_DECLINED: {}", ex.getMessage());
        }

        if (booking.getCustomer() != null && notificationService != null) {
            try {
                notificationService.sendNotification(
                        booking.getCustomer().getId(),
                        "Chưa nhận được tiền mặt",
                        "Chuyên viên báo chưa nhận được tiền mặt cho ca làm #" + booking.getBookingCode() + ". Vui lòng kiểm tra lại hoặc trao tiền trực tiếp cho chuyên viên.",
                        "CASH_DECLINED",
                        bookingId
                );
            } catch (Exception ex) {
                log.warn("[CashReceipt] Failed to send notification for cash decline: {}", ex.getMessage());
            }
        }

        log.info("[CashReceipt] Worker {} declined cash confirmation for booking {}", workerUserId, bookingId);
        return receipt != null ? mapToRes(receipt, bookingId) : null;
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
        BookingEntity studioBooking = bookingRepository.findById(bookingId).orElse(null);
        if (studioBooking != null && studioBooking.getAgency() != null) {
            studioBooking = bookingRepository.findByIdForUpdate(bookingId).orElseThrow();
            if (studioBooking.getStatus() != BookingStatus.COMPLETED && studioBooking.getStatus() != BookingStatus.PAID_OUT) {
                throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION, "dispute.payment_reconciliation_required", HttpStatus.CONFLICT);
            }
        }
        if (receipt.getCustomerConfirmedAt() != null && receipt.getFreelancerConfirmedAt() != null) {
            receipt.setStatus("BOTH_CONFIRMED");
            cashReceiptRepository.save(receipt);

            // Cập nhật trạng thái booking sang PAID_OUT ngay lập tức
            BookingEntity booking = receipt.getBooking();
            if (booking == null) {
                booking = bookingRepository.findById(bookingId).orElse(null);
            }
            if (booking != null && booking.getStatus() != BookingStatus.PAID_OUT) {
                booking.setStatus(BookingStatus.PAID_OUT);
                booking = bookingRepository.save(booking);
                log.info("[CashReceipt] Booking {} status updated to PAID_OUT", bookingId);
            }

            // Trigger settlement kế toán đúp
            try {
                bookingSettlementService.settleBooking(bookingId, defaultCommissionRate);
            } catch (Exception e) {
                if (studioBooking != null && studioBooking.getAgency() != null) throw e;
                log.error("[CashReceipt] Settlement trigger error for booking {}: {}", bookingId, e.getMessage(), e);
            }

            try {
                BigDecimal totalAmount = booking != null && booking.getTotalAmount() != null ? booking.getTotalAmount() : java.math.BigDecimal.ZERO;
                BigDecimal depositAmount = booking != null && booking.getDepositAmount() != null ? booking.getDepositAmount() : java.math.BigDecimal.ZERO;
                BigDecimal commission = totalAmount.multiply(defaultCommissionRate).setScale(0, java.math.RoundingMode.HALF_UP);
                BigDecimal earningsAmount = totalAmount.subtract(commission);

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

            // Phần 2: Gửi mail cảm ơn & biên lai thanh toán tiền mặt thành công cho khách hàng đơn khẩn cấp
            if (booking != null && booking.getBookingType() == BookingType.REALTIME_INSTANT
                    && booking.getCustomer() != null && StringUtils.hasText(booking.getCustomer().getEmail())) {
                try {
                    String toEmail = booking.getCustomer().getEmail().trim();
                    String customerName = booking.getCustomer().getFullName();
                    String bookingCode = booking.getBookingCode() != null ? booking.getBookingCode() : String.valueOf(bookingId);
                    String bookingType = booking.getBookingType() != null ? booking.getBookingType().name() : "REALTIME_INSTANT";
                    String artistName = (booking.getMua() != null && booking.getMua().getUser() != null)
                            ? booking.getMua().getUser().getFullName()
                            : "Chuyên viên trang điểm";
                    String packageName = booking.getServicePackage() != null
                            ? booking.getServicePackage().getPackageName()
                            : "Dịch vụ Make-up Khẩn cấp";
                    String styleName = booking.getStyle() != null
                            ? booking.getStyle().getStyleName()
                            : "Tiêu chuẩn";
                    String destinationAddress = booking.getDestinationAddress();
                    String paymentCode = "CASH-" + bookingCode;
                    String completedAt = OffsetDateTime.now(VIETNAM_OFFSET)
                            .format(DateTimeFormatter.ofPattern("HH:mm:ss - dd/MM/yyyy"));
                    BigDecimal totalAmount = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;
                    BigDecimal depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
                    BigDecimal finalAmount = receipt.getExpectedAmount() != null ? receipt.getExpectedAmount() : BigDecimal.ZERO;

                    emailService.sendCustomerBookingCompletedReceiptEmail(
                            toEmail, customerName, bookingCode, bookingType,
                            artistName, packageName, styleName, destinationAddress,
                            totalAmount, depositAmount, finalAmount,
                            "Tiền mặt (CASH)", paymentCode, completedAt
                    );
                    log.info("[CashReceipt] Dispatched customer receipt email for bookingCode={} to {}", bookingCode, toEmail);
                } catch (Exception ex) {
                    log.error("[CashReceipt] Failed to send receipt email for bookingId={}: {}", bookingId, ex.getMessage(), ex);
                }
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
