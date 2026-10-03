package com.makeup.platform.service.payment.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.BookingConfirmationTimeoutHelper;
import com.makeup.platform.dto.request.payment.CreateDepositIntentReq;
import com.makeup.platform.dto.response.payment.BookingDepositStatusRes;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingPartner;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.payment.BookingDepositService;
import com.makeup.platform.service.wallet.BookingSettlementService;
import com.makeup.platform.service.payment.gateway.PaymentGatewayRegistry;
import com.makeup.platform.service.payment.gateway.PaymentGatewayStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.http.HttpStatus;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingDepositServiceImpl implements BookingDepositService {

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);
    private static final BigDecimal DEPOSIT_RATE = new BigDecimal("0.30");
    private static final String LOCK_PREFIX = "deposit:booking:";
    private static final int LOCK_WAIT_SECONDS = 5;
    private static final int LOCK_LEASE_SECONDS = 15;

    private final BookingRepository bookingRepository;
    private final BookingDepositRepository bookingDepositRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final PaymentGatewayRegistry gatewayRegistry;
    private final RedissonClient redissonClient;
    private final SimpMessagingTemplate messagingTemplate;
    private final StringRedisTemplate stringRedisTemplate;
    private final BookingSettlementService bookingSettlementService;
    private final BookingAuditService bookingAuditService;

    @Override
    @Transactional
    public PaymentCheckoutRes createOrResumeDepositIntent(Long bookingId, Long customerId,
                                                           CreateDepositIntentReq req,
                                                           String idempotencyKey, String clientIp) {

        RLock lock = redissonClient.getLock(LOCK_PREFIX + bookingId);
        try {
            if (!lock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)) {
                throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT,
                        "booking.deposit_lock_timeout", HttpStatus.TOO_MANY_REQUESTS);
            }

            BookingEntity booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                            "booking.not_found", HttpStatus.NOT_FOUND));

            // Kiểm tra quyền sở hữu
            if (!booking.getCustomer().getId().equals(customerId)) {
                throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN,
                        "booking.access_denied", HttpStatus.FORBIDDEN);
            }

            // Chỉ áp dụng cho FREELANCER_DIRECT
            if (booking.getBookingPartner() != BookingPartner.FREELANCER_DIRECT) {
                throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_FREELANCER_DIRECT,
                        "booking.deposit_not_freelancer_direct", HttpStatus.BAD_REQUEST);
            }

            // Lấy hoặc tạo booking_deposit
            BookingDepositEntity deposit = bookingDepositRepository.findByBookingIdWithLock(bookingId)
                    .orElseGet(() -> createBookingDeposit(booking));

            // Kiểm tra trạng thái deposit
            if ("PAID".equals(deposit.getStatus())) {
                throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_ALREADY_PAID,
                        "booking.deposit_already_paid", HttpStatus.CONFLICT);
            }

            if ("EXPIRED".equals(deposit.getStatus()) ||
                    OffsetDateTime.now(VIETNAM_OFFSET).isAfter(deposit.getExpiresAt())) {
                throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_EXPIRED,
                        "booking.deposit_expired", HttpStatus.GONE);
            }

            // Kiểm tra pricing_version nếu client có gửi lên
            if (req.getPricingVersion() != null && !req.getPricingVersion().trim().isEmpty()
                    && !req.getPricingVersion().equals(deposit.getPricingVersion())) {
                throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_PRICING_VERSION_MISMATCH,
                        "booking.deposit_pricing_version_mismatch", HttpStatus.CONFLICT);
            }

            // Xử lý idempotency: cùng key -> trả payment hiện tại nếu còn hiệu lực
            if (idempotencyKey != null && deposit.getAppliedPayment() == null) {
                Optional<PaymentTransactionEntity> existingPayment =
                        paymentTransactionRepository.findByUserIdAndIdempotencyKey(customerId, idempotencyKey);

                if (existingPayment.isPresent()) {
                    PaymentTransactionEntity existing = existingPayment.get();
                    // Cùng gateway và còn pending -> trả lại
                    if ("PENDING".equals(existing.getStatus()) && req.getGatewayCode().equals(existing.getPaymentGateway())) {
                        return buildCheckoutResFromExistingPayment(existing);
                    }
                    // Khác payload -> conflict
                    if (!req.getGatewayCode().equals(existing.getPaymentGateway())) {
                        throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_IDEMPOTENCY_CONFLICT,
                                "booking.deposit_idempotency_conflict", HttpStatus.CONFLICT);
                    }
                }
            }

            // Kiểm tra có payment PENDING hiện tại không -> tái sử dụng nếu còn hạn
            List<PaymentTransactionEntity> pendingPayments = paymentTransactionRepository
                    .findByBookingIdAndStatus(bookingId, "PENDING");

            if (!pendingPayments.isEmpty()) {
                PaymentTransactionEntity pending = pendingPayments.get(0);
                if (pending.getExpiresAt() != null &&
                        pending.getExpiresAt().isAfter(OffsetDateTime.now(VIETNAM_OFFSET))) {
                    return buildCheckoutResFromExistingPayment(pending);
                }
                // Payment hết hạn -> đánh dấu FAILED
                pending.setStatus("FAILED");
                paymentTransactionRepository.save(pending);
            }

            // Tạo payment transaction mới (ngoài DB transaction dài để tránh hold lock khi gọi gateway HTTP)
            PaymentGatewayStrategy strategy = gatewayRegistry.getStrategy(req.getGatewayCode());
            String paymentCode = generatePaymentCode();

            PaymentTransactionEntity newPayment = PaymentTransactionEntity.builder()
                    .paymentCode(paymentCode)
                    .user(booking.getCustomer())
                    .booking(booking)
                    .paymentGateway(req.getGatewayCode())
                    .amount(deposit.getRequiredAmount())
                    .status("PENDING")
                    .walletPostingStatus("NOT_POSTED")
                    .purpose("BOOKING_DEPOSIT")
                    .idempotencyKey(idempotencyKey)
                    .pricingVersion(deposit.getPricingVersion())
                    .applicationStatus("PENDING")
                    .build();

            newPayment = paymentTransactionRepository.save(newPayment);

            // Gọi gateway (NGOÀI DB lock chính) và lưu kết quả
            PaymentCheckoutRes checkoutRes = strategy.createCheckout(newPayment, clientIp);
            checkoutRes.setCheckoutUrl(checkoutRes.getPaymentUrl());

            newPayment.setPaymentUrl(checkoutRes.getPaymentUrl());
            newPayment.setQrCodeUrl(checkoutRes.getQrCodeUrl());
            newPayment.setExpiresAt(checkoutRes.getExpiresAt());
            paymentTransactionRepository.save(newPayment);

            // Cập nhật deposit status sang PENDING nếu đang UNPAID
            if ("UNPAID".equals(deposit.getStatus())) {
                deposit.setStatus("PENDING");
                bookingDepositRepository.save(deposit);
            }

            log.info("[Deposit] Created payment {} for booking {} via {}", paymentCode, bookingId, req.getGatewayCode());
            return checkoutRes;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT,
                    "booking.deposit_lock_timeout", HttpStatus.TOO_MANY_REQUESTS);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    @Override
    @Transactional
    public BookingDepositStatusRes getDepositStatus(Long bookingId, Long customerId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (!booking.getCustomer().getId().equals(customerId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN,
                    "booking.access_denied", HttpStatus.FORBIDDEN);
        }

        BookingDepositEntity deposit = bookingDepositRepository.findByBookingId(bookingId)
                .orElseGet(() -> createBookingDeposit(booking));

        // Lấy payment hiện tại (PENDING đầu tiên nếu có)
        List<PaymentTransactionEntity> pendingPayments = paymentTransactionRepository
                .findByBookingIdAndStatus(bookingId, "PENDING");

        PaymentTransactionEntity currentPayment = pendingPayments.isEmpty() ? null : pendingPayments.get(0);

        return BookingDepositStatusRes.builder()
                .depositId(deposit.getId())
                .bookingId(bookingId)
                .bookingCode(booking.getBookingCode())
                .totalAmount(booking.getTotalAmount())
                .requiredDepositAmount(deposit.getRequiredAmount())
                .paidAmount(deposit.getPaidAmount())
                .depositStatus(deposit.getStatus())
                .pricingVersion(deposit.getPricingVersion())
                .expiresAt(deposit.getExpiresAt())
                .paidAt(deposit.getPaidAt())
                .currentPaymentCode(currentPayment != null ? currentPayment.getPaymentCode() : null)
                .currentPaymentUrl(currentPayment != null ? currentPayment.getPaymentUrl() : null)
                .currentQrCodeUrl(currentPayment != null ? currentPayment.getQrCodeUrl() : null)
                .currentPaymentExpiresAt(currentPayment != null ? currentPayment.getExpiresAt() : null)
                .currentGatewayCode(currentPayment != null ? currentPayment.getPaymentGateway() : null)
                .currentApplicationStatus(currentPayment != null ? currentPayment.getApplicationStatus() : null)
                .build();
    }

    @Override
    @Transactional
    public BookingDepositStatusRes syncDepositPayment(Long bookingId, Long customerId) {
        BookingDepositEntity deposit = bookingDepositRepository.findByBookingIdWithLock(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (!deposit.getBooking().getCustomer().getId().equals(customerId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN,
                    "booking.access_denied", HttpStatus.FORBIDDEN);
        }

        if ("PAID".equals(deposit.getStatus())) {
            return getDepositStatus(bookingId, customerId);
        }

        // Kiểm tra xem có payment nào của booking đã được Gateway xác nhận SUCCESS (qua Webhook IPN hoặc Return callback) hay chưa
        List<PaymentTransactionEntity> successList = paymentTransactionRepository
                .findByBookingIdAndStatus(bookingId, "SUCCESS");

        if (!successList.isEmpty()) {
            PaymentTransactionEntity successPayment = successList.get(0);
            log.info("[SyncPayment] Found SUCCESS payment {} for booking {}. Ensuring deposit is applied...",
                    successPayment.getPaymentCode(), bookingId);
            applyDepositFromPayment(successPayment.getId());
        } else {
            log.debug("[SyncPayment] Booking {} deposit is still awaiting gateway payment confirmation", bookingId);
        }

        return getDepositStatus(bookingId, customerId);
    }


    @Override
    @Transactional
    public void applyDepositFromPayment(Long paymentId) {
        PaymentTransactionEntity payment = paymentTransactionRepository.findById(paymentId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_PAYMENT_TRANSACTION_NOT_FOUND,
                        "payment.not_found", HttpStatus.NOT_FOUND));

        if (!"SUCCESS".equals(payment.getStatus())) {
            log.warn("[Deposit] Skipping applyDeposit: payment {} is not SUCCESS (status={})",
                    paymentId, payment.getStatus());
            return;
        }

        if (payment.getBooking() == null) {
            log.warn("[Deposit] Payment {} has no booking linked, cannot apply deposit", paymentId);
            return;
        }

        if (!"BOOKING_DEPOSIT".equals(payment.getPurpose())) {
            log.debug("[Deposit] Payment {} is not BOOKING_DEPOSIT purpose, skipping", paymentId);
            return;
        }

        Long bookingId = payment.getBooking().getId();

        // Idempotency: kiểm tra đã apply chưa
        String applyIdempotencyKey = "deposit:apply:" + paymentId;
        if (ledgerEntryRepository.existsByIdempotencyKey(applyIdempotencyKey)) {
            log.info("[Deposit] Deposit already applied for paymentId={}, skipping", paymentId);
            return;
        }

        // Lấy deposit với lock
        BookingDepositEntity deposit = bookingDepositRepository.findByBookingIdWithLock(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_FOUND,
                        "booking.deposit_not_found", HttpStatus.NOT_FOUND));

        // Đã áp dụng rồi?
        if ("PAID".equals(deposit.getStatus())) {
            log.info("[Deposit] Booking {} deposit already PAID, skipping payment {}", bookingId, paymentId);
            payment.setApplicationStatus("APPLIED");
            paymentTransactionRepository.save(payment);
            return;
        }

        // Kiểm tra số tiền khớp
        if (payment.getAmount().compareTo(deposit.getRequiredAmount()) != 0) {
            log.error("[Deposit] Amount mismatch: payment={} bookingDeposit={}", payment.getAmount(), deposit.getRequiredAmount());
            payment.setApplicationStatus("REVIEW_REQUIRED");
            payment.setApplicationError("amount_mismatch");
            paymentTransactionRepository.save(payment);
            return;
        }

        // Kiểm tra deposit còn trong hạn theo thời điểm payment được ghi
        if ("EXPIRED".equals(deposit.getStatus())) {
            log.warn("[Deposit] Deposit expired for booking {}, payment {} needs refund", bookingId, paymentId);
            payment.setApplicationStatus("REFUND_REQUIRED");
            payment.setApplicationError("deposit_expired");
            paymentTransactionRepository.save(payment);
            return;
        }

        String ledgerCreditKey = applyIdempotencyKey + ":credit";
        BigDecimal holdAmount = deposit.getRequiredAmount();

        WalletEntity customerWallet = walletRepository.findByUserId(payment.getUser().getId())
                .orElseGet(() -> createWalletForUser(payment.getUser().getId(), payment.getUser()));

        if (!ledgerEntryRepository.existsByIdempotencyKey(ledgerCreditKey)) {
            LedgerEntryEntity ledgerCredit = LedgerEntryEntity.builder()
                    .referenceType("BOOKING_DEPOSIT")
                    .referenceId(bookingId)
                    .wallet(customerWallet)
                    .entryType("CREDIT")
                    .amount(holdAmount)
                    .description("Cọc booking #" + payment.getBooking().getBookingCode())
                    .idempotencyKey(ledgerCreditKey)
                    .build();
            ledgerEntryRepository.save(ledgerCredit);
        }

        // Tạo wallet hold
        WalletHoldEntity hold = WalletHoldEntity.builder()
                .wallet(customerWallet)
                .booking(payment.getBooking())
                .deposit(deposit)
                .amount(holdAmount)
                .status("ACTIVE")
                .build();
        walletHoldRepository.save(hold);

        BigDecimal currentFrozen = customerWallet.getFrozenBalance() != null ? customerWallet.getFrozenBalance() : BigDecimal.ZERO;
        customerWallet.setFrozenBalance(currentFrozen.add(holdAmount));
        walletRepository.save(customerWallet);

        // Cập nhật deposit -> PAID
        deposit.setStatus("PAID");
        deposit.setPaidAmount(payment.getAmount());
        deposit.setPaidAt(payment.getPaidAt() != null ? payment.getPaidAt() : OffsetDateTime.now(VIETNAM_OFFSET));
        deposit.setAppliedPayment(payment);
        bookingDepositRepository.save(deposit);

        // Cập nhật payment application_status
        payment.setApplicationStatus("APPLIED");
        payment.setAppliedAt(OffsetDateTime.now(VIETNAM_OFFSET));
        payment.setWalletPostingStatus("POSTED");
        payment.setWalletPostedAt(OffsetDateTime.now(VIETNAM_OFFSET));
        paymentTransactionRepository.save(payment);

        // Chuyển booking status sau khi khách cọc thành công
        BookingEntity booking = payment.getBooking();
        BookingStatus prevStatus = booking.getStatus();
        BookingStatus nextStatus;
        OffsetDateTime confirmDeadline = null;

        if (booking.getBookingType() == BookingType.SCHEDULED) {
            if (booking.getBookingPartner() == BookingPartner.AGENCY_DISPATCH) {
                nextStatus = BookingStatus.PENDING_AGENCY_DISPATCH;
            } else {
                // Thợ tự do: Tính confirm_deadline theo Ma trận Lead Time động, chuyển sang REQUESTED chờ thợ xác nhận
                OffsetDateTime now = OffsetDateTime.now(VIETNAM_OFFSET);
                OffsetDateTime scheduledStartAt = booking.getScheduledStartTime().atOffset(VIETNAM_OFFSET);
                confirmDeadline = BookingConfirmationTimeoutHelper.calculateConfirmDeadline(now, scheduledStartAt);
                booking.setConfirmDeadline(confirmDeadline);
                nextStatus = BookingStatus.REQUESTED;
            }
        } else {
            nextStatus = BookingStatus.ACCEPTED;
        }

        if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT) {
            booking.setStatus(nextStatus);
            booking.setDepositExpiredAt(null);
            bookingRepository.save(booking);
            bookingAuditService.logTransition(booking.getId(), prevStatus, nextStatus,
                    booking.getCustomer().getId(),
                    nextStatus == BookingStatus.REQUESTED
                            ? "Khách hàng thanh toán tiền cọc thành công. Chuyển sang chờ thợ xác nhận tiếp nhận ca."
                            : "Khách hàng thanh toán tiền cọc thành công. Ca làm được xác nhận.");
            log.info("[Deposit] Booking {} transitioned {} -> {} after deposit paid (confirmDeadline={})",
                    bookingId, prevStatus, nextStatus, confirmDeadline);
        } else {
            booking.setDepositExpiredAt(null);
            bookingRepository.save(booking);
        }

        // Lưu Redis flag để các query check tức thì không cần đợi DB lag
        try {
            if (stringRedisTemplate != null) {
                stringRedisTemplate.opsForValue().set("booking:deposit_paid:" + bookingId, "true", Duration.ofDays(7));
            }
        } catch (Exception e) {
            log.warn("[Deposit] Failed to set redis deposit_paid key for booking {}: {}", bookingId, e.getMessage());
        }

        // Tính thu nhập thợ ước tính để gửi kèm realtime
        BigDecimal serviceSubtotal = booking.getServiceSubtotal() != null ? booking.getServiceSubtotal() : BigDecimal.ZERO;
        BigDecimal surchargeFee = booking.getSurchargeFee() != null ? booking.getSurchargeFee() : BigDecimal.ZERO;
        BigDecimal distanceFee = booking.getDistanceFee() != null ? booking.getDistanceFee() : BigDecimal.ZERO;
        BigDecimal platformFee = serviceSubtotal.multiply(new BigDecimal("0.20")).setScale(0, RoundingMode.HALF_UP);
        BigDecimal earningsAmount = serviceSubtotal.subtract(platformFee).add(surchargeFee).add(distanceFee);

        // Bắn WebSocket thông báo Khách & Thợ: ĐÃ CỌC THÀNH CÔNG VÀO QUỸ ESCROW!
        try {
            Long confirmTimeoutSeconds = null;
            if (confirmDeadline != null) {
                long diff = ChronoUnit.SECONDS.between(OffsetDateTime.now(VIETNAM_OFFSET), confirmDeadline);
                confirmTimeoutSeconds = Math.max(0, diff);
            }

            Map<String, Object> depositSuccessPayload = new HashMap<>();
            depositSuccessPayload.put("type", "CUSTOMER_CONFIRMED_DEPOSIT");
            depositSuccessPayload.put("bookingId", bookingId);
            depositSuccessPayload.put("bookingCode", booking.getBookingCode());
            depositSuccessPayload.put("status", booking.getStatus().name());
            depositSuccessPayload.put("isDepositPaid", true);
            depositSuccessPayload.put("depositAmount", deposit.getPaidAmount());
            depositSuccessPayload.put("earningsAmount", earningsAmount);
            depositSuccessPayload.put("confirmDeadline", confirmDeadline != null ? confirmDeadline.toString() : null);
            depositSuccessPayload.put("confirmTimeoutSeconds", confirmTimeoutSeconds);
            depositSuccessPayload.put("timestamp", System.currentTimeMillis());
            depositSuccessPayload.put("customerName", booking.getCustomer() != null ? booking.getCustomer().getFullName() : "Khách hàng");
            depositSuccessPayload.put("customerPhone", booking.getCustomer() != null ? booking.getCustomer().getPhoneNumber() : "");
            depositSuccessPayload.put("destinationAddress", booking.getDestinationAddress());

            messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, depositSuccessPayload);
            messagingTemplate.convertAndSend("/topic/booking-matched/" + bookingId, depositSuccessPayload);

            if (booking.getMua() != null) {
                Long muaId = booking.getMua().getId();
                // Bắn topic xác nhận cọc cho MUA
                messagingTemplate.convertAndSend("/topic/booking-customer-confirmed/" + muaId, depositSuccessPayload);
                log.info("[Deposit] Broadcasted CUSTOMER_CONFIRMED_DEPOSIT to MUA topic /topic/booking-customer-confirmed/{}", muaId);
                if (booking.getMua().getUser() != null) {
                    Long muaUserId = booking.getMua().getUser().getId();
                    messagingTemplate.convertAndSend("/topic/booking-customer-confirmed-user/" + muaUserId, depositSuccessPayload);
                }

                // Nếu là đơn đặt hẹn trước chờ xác nhận: Bắn modal offer nổi bật sang app Thợ
                if (booking.getStatus() == BookingStatus.REQUESTED) {
                    Map<String, Object> scheduledOfferPayload = new HashMap<>();
                    scheduledOfferPayload.put("type", "NEW_SCHEDULED_OFFER");
                    scheduledOfferPayload.put("bookingId", bookingId);
                    scheduledOfferPayload.put("bookingCode", booking.getBookingCode());
                    scheduledOfferPayload.put("customerName", booking.getCustomer() != null ? booking.getCustomer().getFullName() : null);
                    scheduledOfferPayload.put("customerPhone", booking.getCustomer() != null ? booking.getCustomer().getPhoneNumber() : null);
                    scheduledOfferPayload.put("customerAvatar", booking.getCustomer() != null ? booking.getCustomer().getAvatarUrl() : null);
                    scheduledOfferPayload.put("packageName", booking.getServicePackage() != null ? booking.getServicePackage().getPackageName() : null);
                    scheduledOfferPayload.put("styleName", booking.getStyle() != null ? booking.getStyle().getStyleName() : null);
                    scheduledOfferPayload.put("bookingDate", booking.getBookingDate() != null ? booking.getBookingDate().toString() : null);
                    scheduledOfferPayload.put("startTime", booking.getStartTime() != null ? booking.getStartTime().toString() : null);
                    scheduledOfferPayload.put("destinationAddress", booking.getDestinationAddress());
                    scheduledOfferPayload.put("totalAmount", booking.getTotalAmount());
                    scheduledOfferPayload.put("depositAmount", deposit.getPaidAmount());
                    scheduledOfferPayload.put("earningsAmount", earningsAmount);
                    scheduledOfferPayload.put("confirmDeadline", confirmDeadline != null ? confirmDeadline.toString() : null);
                    scheduledOfferPayload.put("confirmTimeoutSeconds", confirmTimeoutSeconds);
                    scheduledOfferPayload.put("timestamp", System.currentTimeMillis());

                    Long muaUserId = (booking.getMua() != null && booking.getMua().getUser() != null)
                            ? booking.getMua().getUser().getId()
                            : null;
                    if (muaUserId != null) {
                        messagingTemplate.convertAndSendToUser(String.valueOf(muaUserId), "/queue/offers", scheduledOfferPayload);
                    }
                    messagingTemplate.convertAndSend("/topic/mua-offer/" + muaId, scheduledOfferPayload);
                    messagingTemplate.convertAndSend("/topic/mua-scheduled-offer/" + muaId, scheduledOfferPayload);
                    log.info("[Deposit] Dispatched NEW_SCHEDULED_OFFER P2P to MUA userId={} (muaId={})", muaUserId, muaId);
                }
            }
            log.info("[Deposit] Broadcasted deposit paid event for bookingId={}", bookingId);
        } catch (Exception e) {
            log.warn("[Deposit] Failed to broadcast deposit paid WebSocket event for booking {}: {}", bookingId, e.getMessage());
        }

        log.info("[Deposit] Deposit applied successfully for booking {} via payment {}", bookingId, paymentId);
    }

    // === Private helpers ===

    private BookingDepositEntity createBookingDeposit(BookingEntity booking) {
        BigDecimal required = booking.getTotalAmount()
                .multiply(DEPOSIT_RATE)
                .setScale(0, RoundingMode.HALF_UP);

        OffsetDateTime expiresAt = OffsetDateTime.now(VIETNAM_OFFSET).plusMinutes(15);
        if (booking.getDepositExpiredAt() != null) {
            expiresAt = booking.getDepositExpiredAt();
        }

        String pricingVersion = LocalDate.now().toString() + ":" + booking.getVersion();

        BookingDepositEntity deposit = BookingDepositEntity.builder()
                .booking(booking)
                .requiredAmount(required)
                .status("UNPAID")
                .pricingVersion(pricingVersion)
                .expiresAt(expiresAt)
                .build();

        return bookingDepositRepository.save(deposit);
    }

    private PaymentCheckoutRes buildCheckoutResFromExistingPayment(PaymentTransactionEntity payment) {
        return PaymentCheckoutRes.builder()
                .paymentCode(payment.getPaymentCode())
                .gatewayCode(payment.getPaymentGateway())
                .amount(payment.getAmount())
                .paymentUrl(payment.getPaymentUrl())
                .checkoutUrl(payment.getPaymentUrl())
                .qrCodeUrl(payment.getQrCodeUrl())
                .expiresAt(payment.getExpiresAt())
                .build();
    }

    @Override
    @Transactional
    public PaymentCheckoutRes createFinalPaymentIntent(Long bookingId, Long customerId,
                                                        CreateDepositIntentReq req,
                                                        String idempotencyKey, String clientIp) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (!booking.getCustomer().getId().equals(customerId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN,
                    "booking.access_denied", HttpStatus.FORBIDDEN);
        }

        BookingDepositEntity deposit = bookingDepositRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_FOUND,
                        "booking.deposit_not_found", HttpStatus.NOT_FOUND));

        if (!"PAID".equals(deposit.getStatus())) {
            throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_PAID,
                    "settlement.deposit_not_paid", HttpStatus.BAD_REQUEST);
        }

        BigDecimal remainingAmount = booking.getTotalAmount().subtract(deposit.getPaidAmount());
        if (remainingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_AMOUNT_MISMATCH,
                    "payment.no_remaining_amount", HttpStatus.BAD_REQUEST);
        }

        // Tái sử dụng payment PENDING nếu có
        List<PaymentTransactionEntity> pendingPayments = paymentTransactionRepository
                .findByBookingIdAndStatus(bookingId, "PENDING");
        for (PaymentTransactionEntity p : pendingPayments) {
            if ("BOOKING_FINAL_PAYMENT".equals(p.getPurpose())) {
                if (p.getExpiresAt() != null && p.getExpiresAt().isAfter(OffsetDateTime.now(VIETNAM_OFFSET))) {
                    return buildCheckoutResFromExistingPayment(p);
                }
                p.setStatus("FAILED");
                paymentTransactionRepository.save(p);
            }
        }

        PaymentGatewayStrategy strategy = gatewayRegistry.getStrategy(req.getGatewayCode());
        String paymentCode = generatePaymentCode();

        PaymentTransactionEntity newPayment = PaymentTransactionEntity.builder()
                .paymentCode(paymentCode)
                .user(booking.getCustomer())
                .booking(booking)
                .paymentGateway(req.getGatewayCode())
                .amount(remainingAmount)
                .status("PENDING")
                .walletPostingStatus("NOT_POSTED")
                .purpose("BOOKING_FINAL_PAYMENT")
                .idempotencyKey(idempotencyKey)
                .pricingVersion(deposit.getPricingVersion())
                .applicationStatus("PENDING")
                .build();

        newPayment = paymentTransactionRepository.save(newPayment);

        PaymentCheckoutRes checkoutRes = strategy.createCheckout(newPayment, clientIp);
        checkoutRes.setCheckoutUrl(checkoutRes.getPaymentUrl());

        newPayment.setPaymentUrl(checkoutRes.getPaymentUrl());
        newPayment.setQrCodeUrl(checkoutRes.getQrCodeUrl());
        newPayment.setExpiresAt(checkoutRes.getExpiresAt());
        paymentTransactionRepository.save(newPayment);

        log.info("[FinalPayment] Created final payment {} for booking {} via {} amount={}",
                paymentCode, bookingId, req.getGatewayCode(), remainingAmount);
        return checkoutRes;
    }

    @Override
    @Transactional
    public void applyFinalPayment(Long paymentId) {
        PaymentTransactionEntity payment = paymentTransactionRepository.findById(paymentId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_PAYMENT_TRANSACTION_NOT_FOUND,
                        "payment.not_found", HttpStatus.NOT_FOUND));

        if (!"SUCCESS".equals(payment.getStatus())) {
            return;
        }

        if (payment.getBooking() == null) {
            return;
        }

        Long bookingId = payment.getBooking().getId();
        BigDecimal defaultCommissionRate = new BigDecimal("0.20");

        bookingSettlementService.settleBookingOnlinePayment(bookingId, defaultCommissionRate);

        payment.setApplicationStatus("APPLIED");
        payment.setAppliedAt(OffsetDateTime.now(VIETNAM_OFFSET));
        paymentTransactionRepository.save(payment);

        try {
            var booking = payment.getBooking();
            java.math.BigDecimal totalAmount = booking.getTotalAmount() != null ? booking.getTotalAmount() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal commission = totalAmount.multiply(defaultCommissionRate).setScale(0, java.math.RoundingMode.HALF_UP);
            java.math.BigDecimal earningsAmount = totalAmount.subtract(commission);

            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "PAYMENT_COMPLETED");
            payload.put("bookingId", bookingId);
            payload.put("bookingCode", booking.getBookingCode());
            payload.put("status", "PAID_OUT");
            payload.put("isDepositPaid", true);
            payload.put("paymentMethod", payment.getPaymentGateway());
            payload.put("totalAmount", totalAmount);
            payload.put("depositAmount", depositAmount);
            payload.put("finalAmount", payment.getAmount());
            payload.put("paidAmount", payment.getAmount());
            payload.put("earningsAmount", earningsAmount);
            payload.put("customerName", booking.getCustomer() != null ? booking.getCustomer().getFullName() : null);
            payload.put("customerPhone", booking.getCustomer() != null ? booking.getCustomer().getPhoneNumber() : null);
            payload.put("destinationAddress", booking.getDestinationAddress());
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, payload);
            messagingTemplate.convertAndSend("/topic/booking-matched/" + bookingId, payload);

            if (booking.getMua() != null) {
                Long muaId = booking.getMua().getId();
                messagingTemplate.convertAndSend("/topic/booking-customer-confirmed/" + muaId, payload);
            }
        } catch (Exception ex) {
            log.warn("[FinalPayment] Failed to broadcast PAYMENT_COMPLETED for booking {}: {}", bookingId, ex.getMessage());
        }

        log.info("[FinalPayment] Successfully settled online final payment for bookingId={}", bookingId);
    }

    private WalletEntity createWalletForUser(Long userId, UserEntity user) {
        WalletEntity wallet = WalletEntity.builder()
                .user(user)
                .availableBalance(BigDecimal.ZERO)
                .frozenBalance(BigDecimal.ZERO)
                .currency("VND")
                .build();
        return walletRepository.save(wallet);
    }

    private String generatePaymentCode() {
        return "DEP-" + LocalDate.now().toString().replace("-", "")
                + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }
}
