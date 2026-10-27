package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import com.makeup.platform.dto.response.admin.AdminDisputeRes;
import com.makeup.platform.dto.response.admin.AdminDisputeStatsRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingPartner;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.mapper.admin.AdminDisputeMapper;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.booking.AdminDisputeService;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.booking.DisputeStageService;
import com.makeup.platform.service.interaction.NotificationService;
import com.makeup.platform.service.mail.EmailService;
import com.makeup.platform.service.mua.MUACalendarService;
import com.makeup.platform.service.wallet.BookingSettlementService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminDisputeServiceImpl implements AdminDisputeService {

    private final BookingRepository bookingRepository;
    private final com.makeup.platform.service.booking.StudioDisputeFinanceService studioFinance;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingAuditService bookingAuditService;
    private final BookingSettlementService bookingSettlementService;
    private final DisputeStageService disputeStageService;
    private final BookingDepositRepository bookingDepositRepository;
    private final AdminDisputeMapper adminDisputeMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MUACalendarService muaCalendarService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminDisputeRes> getAllDisputes(String status, String keyword, Pageable pageable) {
        Specification<BookingEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Admin nền tảng xử lý khiếu nại của đơn Thợ Tự Do (FREELANCER_DIRECT) HOẶC đơn Studio đã leo thang lên Admin
            predicates.add(cb.or(
                    cb.equal(root.get("bookingPartner"), BookingPartner.FREELANCER_DIRECT),
                    cb.like(root.get("cancellationReason"), "%[LEO_THANG_ADMIN]%"),
                    cb.like(root.get("emergencyReason"), "%[LEO_THANG_ADMIN]%")
            ));

            // Filter by dispute context
            if (!StringUtils.hasText(status) || "ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.or(
                        cb.equal(root.get("status"), BookingStatus.DISPUTED),
                        cb.equal(root.get("status"), BookingStatus.DISPUTE_REFUNDED),
                        cb.equal(root.get("status"), BookingStatus.DISPUTE_COMPENSATED),
                        cb.and(
                                cb.equal(root.get("status"), BookingStatus.CANCELLED),
                                cb.isNotNull(root.get("emergencyReason"))
                        ),
                        cb.and(
                                cb.equal(root.get("status"), BookingStatus.PAID_OUT),
                                cb.isNotNull(root.get("emergencyReason"))
                        )
                ));
            } else if ("PENDING".equalsIgnoreCase(status) || "DISPUTED".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("status"), BookingStatus.DISPUTED));
            } else if ("CANCELLED".equalsIgnoreCase(status) || "REFUNDED".equalsIgnoreCase(status) || "APPROVED".equalsIgnoreCase(status) || "DISPUTE_REFUNDED".equalsIgnoreCase(status)) {
                predicates.add(cb.or(
                        cb.equal(root.get("status"), BookingStatus.DISPUTE_REFUNDED),
                        cb.and(
                                cb.equal(root.get("status"), BookingStatus.CANCELLED),
                                cb.isNotNull(root.get("emergencyReason"))
                        )
                ));
            } else if ("PAID_OUT".equalsIgnoreCase(status) || "REJECTED".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status) || "COMPENSATED".equalsIgnoreCase(status) || "DISPUTE_COMPENSATED".equalsIgnoreCase(status)) {
                predicates.add(cb.or(
                        cb.equal(root.get("status"), BookingStatus.DISPUTE_COMPENSATED),
                        cb.and(
                                cb.equal(root.get("status"), BookingStatus.PAID_OUT),
                                cb.isNotNull(root.get("emergencyReason"))
                        )
                ));
            }

            // Keyword filter
            if (StringUtils.hasText(keyword)) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate codeMatch = cb.like(cb.lower(root.get("bookingCode")), pattern);
                Predicate reasonMatch = cb.like(cb.lower(root.get("emergencyReason")), pattern);
                Predicate custNameMatch = cb.like(cb.lower(root.join("customer").get("fullName")), pattern);
                Predicate custPhoneMatch = cb.like(root.join("customer").get("phoneNumber"), pattern);
                predicates.add(cb.or(codeMatch, reasonMatch, custNameMatch, custPhoneMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<BookingEntity> pageResult = bookingRepository.findAll(spec, pageable);
        List<AdminDisputeRes> content = pageResult.getContent().stream()
                .map(adminDisputeMapper::toRes)
                .toList();

        return PageResponse.<AdminDisputeRes>builder()
                .content(content)
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .last(pageResult.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDisputeStatsRes getDisputeStats() {
        long pending = 0;
        long refunded = 0;
        long rejected = 0;
        BigDecimal totalDisputedDeposit = BigDecimal.ZERO;

        List<BookingEntity> disputes = bookingRepository.findAll((root, query, cb) ->
                cb.and(
                        cb.or(
                                cb.equal(root.get("bookingPartner"), BookingPartner.FREELANCER_DIRECT),
                                cb.like(root.get("cancellationReason"), "%[LEO_THANG_ADMIN]%"),
                                cb.like(root.get("emergencyReason"), "%[LEO_THANG_ADMIN]%")
                        ),
                        cb.or(
                                cb.equal(root.get("status"), BookingStatus.DISPUTED),
                                cb.equal(root.get("status"), BookingStatus.DISPUTE_REFUNDED),
                                cb.equal(root.get("status"), BookingStatus.DISPUTE_COMPENSATED),
                                cb.and(
                                        cb.equal(root.get("status"), BookingStatus.CANCELLED),
                                        cb.isNotNull(root.get("emergencyReason"))
                                ),
                                cb.and(
                                        cb.equal(root.get("status"), BookingStatus.PAID_OUT),
                                        cb.isNotNull(root.get("emergencyReason"))
                                )
                        )
                )
        );

        for (BookingEntity b : disputes) {
            if (b.getStatus() == BookingStatus.DISPUTED) {
                pending++;
                if (b.getDepositAmount() != null) {
                    totalDisputedDeposit = totalDisputedDeposit.add(b.getDepositAmount());
                }
            } else if (b.getStatus() == BookingStatus.DISPUTE_REFUNDED || b.getStatus() == BookingStatus.CANCELLED) {
                refunded++;
            } else if (b.getStatus() == BookingStatus.DISPUTE_COMPENSATED || b.getStatus() == BookingStatus.PAID_OUT) {
                rejected++;
            }
        }

        return AdminDisputeStatsRes.builder()
                .pendingDisputes(pending)
                .refundedDisputes(refunded)
                .rejectedDisputes(rejected)
                .totalDisputedDepositAmount(totalDisputedDeposit)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDisputeRes getDisputeDetail(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        return adminDisputeMapper.toRes(booking);
    }

    @Override
    @Transactional
    public AdminDisputeRes resolveDispute(Long bookingId, Long adminUserId, ResolveDisputeReq req) {
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        UserEntity admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        if (booking.getStatus() != BookingStatus.DISPUTED) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "dispute.not_in_disputed_state", HttpStatus.BAD_REQUEST);
        }

        String resolution = req.getResolution();
        String note = req.getNote().trim();
        BookingStatus currentStatus = booking.getStatus();
        BookingStatus targetStatus;

        boolean isCompletedService = disputeStageService.isCompletedService(booking);

        com.makeup.platform.service.booking.StudioDisputeFinanceService.Financials studioFinancials = null;
        if (booking.getAgency() != null) {
            if (!com.makeup.platform.service.booking.StudioDisputeFinanceService.escalated(booking)) {
                throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                        "dispute.studio_not_escalated", HttpStatus.CONFLICT);
            }
            studioFinancials = studioFinance.inspect(booking);
            targetStatus = studioFinance.resolve(booking, resolution, note);
            booking.setCancellationReason("Admin xử lý khiếu nại studio: " + resolution + ". " + note);
        } else if ("APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution)) {
            targetStatus = BookingStatus.DISPUTE_REFUNDED;

            // 1. Xác định số tiền hoàn lại: Nếu khiếu nại sau ca đã hoàn thành thì hoàn 100% tổng tiền đơn (totalAmount), ngược lại hoàn tiền cọc (depositAmount)
            BigDecimal depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
            Optional<BookingDepositEntity> depositOpt = bookingDepositRepository.findByBookingId(bookingId);
            if (depositOpt.isPresent()) {
                BookingDepositEntity dep = depositOpt.get();
                if (dep.getPaidAmount() != null && dep.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                    depositAmount = dep.getPaidAmount();
                }
                dep.setStatus("REFUNDED");
                bookingDepositRepository.save(dep);
            }

            BigDecimal refundAmount = (isCompletedService && booking.getTotalAmount() != null && booking.getTotalAmount().compareTo(BigDecimal.ZERO) > 0)
                    ? booking.getTotalAmount()
                    : depositAmount;

            if (refundAmount.compareTo(BigDecimal.ZERO) > 0 && booking.getCustomer() != null) {
                Long customerId = booking.getCustomer().getId();
                WalletEntity customerWallet = walletRepository.findByUserIdWithLock(customerId)
                        .orElseGet(() -> walletRepository.save(WalletEntity.builder()
                                .user(booking.getCustomer())
                                .availableBalance(BigDecimal.ZERO)
                                .frozenBalance(BigDecimal.ZERO)
                                .currency("VND")
                                .build()));

                BigDecimal currentAvailable = customerWallet.getAvailableBalance() != null ? customerWallet.getAvailableBalance() : BigDecimal.ZERO;
                BigDecimal newBalance = currentAvailable.add(refundAmount);
                customerWallet.setAvailableBalance(newBalance);

                // Release hold
                Optional<WalletHoldEntity> holdOpt = walletHoldRepository.findByBookingIdAndStatus(bookingId, "ACTIVE");
                if (holdOpt.isPresent()) {
                    WalletHoldEntity hold = holdOpt.get();
                    BigDecimal curFrozen = customerWallet.getFrozenBalance() != null ? customerWallet.getFrozenBalance() : BigDecimal.ZERO;
                    customerWallet.setFrozenBalance(curFrozen.subtract(hold.getAmount()).max(BigDecimal.ZERO));
                    hold.setStatus("REFUNDED");
                    hold.setReleasedAt(OffsetDateTime.now());
                    walletHoldRepository.save(hold);
                }
                walletRepository.save(customerWallet);

                // Ghi nhận sổ cái kế toán kép hoàn tiền cho khách
                String idempotencyKey = "dispute_refund:booking:" + bookingId;
                if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKey)) {
                    String desc = isCompletedService
                            ? "Admin chấp thuận khiếu nại sau ca: Hoàn 100% tổng tiền đơn #" + booking.getBookingCode() + " (" + note + ")"
                            : "Admin chấp thuận khiếu nại: Hoàn 100% tiền cọc đơn #" + booking.getBookingCode() + " (" + note + ")";
                    LedgerEntryEntity ledgerEntry = LedgerEntryEntity.builder()
                            .referenceType("BOOKING_REFUND")
                            .referenceId(bookingId)
                            .wallet(customerWallet)
                            .entryType("CREDIT")
                            .amount(refundAmount)
                            .balanceAfter(newBalance)
                            .description(desc)
                            .idempotencyKey(idempotencyKey)
                            .build();
                    ledgerEntryRepository.save(ledgerEntry);
                }

                // Nếu ca đã hoàn thành và thợ/agency đã nhận thù lao trước đó, tiến hành thu hồi từ ví thợ/agency
                if (isCompletedService && disputeStageService.isSettled(bookingId)) {
                    UserEntity payeeUser = (booking.getAgency() != null && booking.getAgency().getOwner() != null)
                            ? booking.getAgency().getOwner()
                            : (booking.getMua() != null && booking.getMua().getUser() != null ? booking.getMua().getUser() : null);

                    if (payeeUser != null) {
                        walletRepository.findByUserIdWithLock(payeeUser.getId()).ifPresent(payeeWallet -> {
                            BigDecimal curAvail = payeeWallet.getAvailableBalance() != null ? payeeWallet.getAvailableBalance() : BigDecimal.ZERO;
                            BigDecimal clawbackBalance = curAvail.subtract(refundAmount).max(BigDecimal.ZERO);
                            payeeWallet.setAvailableBalance(clawbackBalance);
                            walletRepository.save(payeeWallet);

                            String clawbackKey = "dispute_clawback:booking:" + bookingId;
                            if (!ledgerEntryRepository.existsByIdempotencyKey(clawbackKey)) {
                                LedgerEntryEntity clawbackEntry = LedgerEntryEntity.builder()
                                        .referenceType("BOOKING_CLAWBACK")
                                        .referenceId(bookingId)
                                        .wallet(payeeWallet)
                                        .entryType("DEBIT")
                                        .amount(refundAmount)
                                        .balanceAfter(clawbackBalance)
                                        .description("Thu hồi thù lao đơn #" + booking.getBookingCode() + " do Admin chấp thuận khiếu nại của khách hàng (" + note + ")")
                                        .idempotencyKey(clawbackKey)
                                        .build();
                                ledgerEntryRepository.save(clawbackEntry);
                            }
                        });
                    }
                }
            }

            booking.setCancellationReason(isCompletedService
                    ? "Admin phê duyệt khiếu nại sau ca (Hoàn 100% tổng tiền đơn): " + note
                    : "Admin phê duyệt khiếu nại hoàn cọc: " + note);

        } else if ("REJECT_AND_PAYOUT_MUA".equalsIgnoreCase(resolution) || "APPROVE_COMPENSATION_MUA".equalsIgnoreCase(resolution)) {
            if (isCompletedService) {
                targetStatus = BookingStatus.PAID_OUT;
                // Ca đã hoàn tất làm đẹp trước đó -> Settle thông qua Settlement Service
                try {
                    bookingSettlementService.settleBooking(bookingId, null);
                } catch (Exception ex) {
                    log.warn("[AdminDispute] Settlement fallback triggered: {}", ex.getMessage());
                    try {
                        bookingSettlementService.settleBookingOnlinePayment(bookingId, null);
                    } catch (Exception e) {
                        log.error("[AdminDispute] Failed to settle booking payout: {}", e.getMessage());
                    }
                }
            } else {
                targetStatus = BookingStatus.DISPUTE_COMPENSATED;
                // Ca chưa hoàn tất (khách vắng mặt, bỏ hẹn, v.v.) -> Bồi thường 100% TIỀN CỌC cho Thợ (MUA)
                BigDecimal depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
                Optional<BookingDepositEntity> depositOpt = bookingDepositRepository.findByBookingId(bookingId);
                if (depositOpt.isPresent()) {
                    BookingDepositEntity deposit = depositOpt.get();
                    if (deposit.getPaidAmount() != null && deposit.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                        depositAmount = deposit.getPaidAmount();
                    }
                    deposit.setStatus("COMPENSATED_TO_MUA");
                    bookingDepositRepository.save(deposit);
                }

                UserEntity payeeUser = (booking.getAgency() != null && booking.getAgency().getOwner() != null)
                        ? booking.getAgency().getOwner()
                        : (booking.getMua() != null && booking.getMua().getUser() != null ? booking.getMua().getUser() : null);

                if (depositAmount.compareTo(BigDecimal.ZERO) > 0 && payeeUser != null) {
                    Long payeeUserId = payeeUser.getId();
                    WalletEntity payeeWallet = walletRepository.findByUserIdWithLock(payeeUserId)
                            .orElseGet(() -> walletRepository.save(WalletEntity.builder()
                                    .user(payeeUser)
                                    .availableBalance(BigDecimal.ZERO)
                                    .frozenBalance(BigDecimal.ZERO)
                                    .currency("VND")
                                    .build()));

                    BigDecimal currentBalance = payeeWallet.getAvailableBalance() != null ? payeeWallet.getAvailableBalance() : BigDecimal.ZERO;
                    BigDecimal newBalance = currentBalance.add(depositAmount);
                    payeeWallet.setAvailableBalance(newBalance);
                    walletRepository.save(payeeWallet);

                    // Giải phóng frozen balance của khách hàng
                    final BigDecimal finalDepositAmount = depositAmount;
                    if (booking.getCustomer() != null) {
                        walletRepository.findByUserIdWithLock(booking.getCustomer().getId()).ifPresent(cw -> {
                            BigDecimal curFrozen = cw.getFrozenBalance() != null ? cw.getFrozenBalance() : BigDecimal.ZERO;
                            cw.setFrozenBalance(curFrozen.subtract(finalDepositAmount).max(BigDecimal.ZERO));
                            walletRepository.save(cw);
                        });
                    }

                    // Release hold sang CONSUMED
                    Optional<WalletHoldEntity> holdOpt = walletHoldRepository.findByBookingIdAndStatus(bookingId, "ACTIVE");
                    if (holdOpt.isPresent()) {
                        WalletHoldEntity hold = holdOpt.get();
                        hold.setStatus("CONSUMED");
                        hold.setReleasedAt(OffsetDateTime.now());
                        walletHoldRepository.save(hold);
                    }

                    // Ghi sổ cái kế toán kép
                    String idempotencyKey = "dispute_compensation:booking:" + bookingId;
                    if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKey)) {
                        LedgerEntryEntity ledgerEntry = LedgerEntryEntity.builder()
                                .referenceType("BOOKING_COMPENSATION")
                                .referenceId(bookingId)
                                .wallet(payeeWallet)
                                .entryType("CREDIT")
                                .amount(depositAmount)
                                .balanceAfter(newBalance)
                                .description("Admin phê duyệt bồi thường 100% tiền cọc cho thợ: Đơn #" + booking.getBookingCode() + " (" + note + ")")
                                .idempotencyKey(idempotencyKey)
                                .build();
                        ledgerEntryRepository.save(ledgerEntry);
                    }
                }
            }

            booking.setCancellationReason(isCompletedService
                    ? "Admin bác bỏ khiếu nại của khách, công nhận giải trình của thợ. Bảo lưu thù lao ca làm việc: " + note
                    : "Admin phê duyệt bồi thường cọc cho thợ: " + note);

        } else if ("SPLIT_SETTLEMENT_50_50".equalsIgnoreCase(resolution) || "SPLIT_50_50".equalsIgnoreCase(resolution)) {
            if (isCompletedService) {
                throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                        "dispute.split_not_allowed_for_completed_booking", HttpStatus.BAD_REQUEST);
            }
            targetStatus = BookingStatus.DISPUTE_REFUNDED;

            BigDecimal totalDeposit = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
            Optional<BookingDepositEntity> depositOpt = bookingDepositRepository.findByBookingId(bookingId);
            if (depositOpt.isPresent()) {
                BookingDepositEntity dep = depositOpt.get();
                if (dep.getPaidAmount() != null && dep.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                    totalDeposit = dep.getPaidAmount();
                }
                dep.setStatus("SPLIT_SETTLED");
                bookingDepositRepository.save(dep);
            }

            if (totalDeposit.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal halfCustomer = totalDeposit.divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP);
                BigDecimal halfMua = totalDeposit.subtract(halfCustomer);

                // 1. Credit 50% to Customer Wallet
                if (booking.getCustomer() != null && halfCustomer.compareTo(BigDecimal.ZERO) > 0) {
                    Long customerId = booking.getCustomer().getId();
                    WalletEntity customerWallet = walletRepository.findByUserIdWithLock(customerId)
                            .orElseGet(() -> walletRepository.save(WalletEntity.builder()
                                    .user(booking.getCustomer())
                                    .availableBalance(BigDecimal.ZERO)
                                    .frozenBalance(BigDecimal.ZERO)
                                    .currency("VND")
                                    .build()));
                    BigDecimal curAvail = customerWallet.getAvailableBalance() != null ? customerWallet.getAvailableBalance() : BigDecimal.ZERO;
                    BigDecimal newAvail = curAvail.add(halfCustomer);
                    customerWallet.setAvailableBalance(newAvail);
                    BigDecimal curFrozen = customerWallet.getFrozenBalance() != null ? customerWallet.getFrozenBalance() : BigDecimal.ZERO;
                    customerWallet.setFrozenBalance(curFrozen.subtract(totalDeposit).max(BigDecimal.ZERO));
                    walletRepository.save(customerWallet);

                    String idempotencyKeyCust = "dispute_split_cust:booking:" + bookingId;
                    if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKeyCust)) {
                        ledgerEntryRepository.save(LedgerEntryEntity.builder()
                                .referenceType("BOOKING_REFUND")
                                .referenceId(bookingId)
                                .wallet(customerWallet)
                                .entryType("CREDIT")
                                .amount(halfCustomer)
                                .balanceAfter(newAvail)
                                .description("Admin hòa giải 50/50: Hoàn 50% tiền cọc đơn #" + booking.getBookingCode() + " (" + note + ")")
                                .idempotencyKey(idempotencyKeyCust)
                                .build());
                    }
                }

                // 2. Credit 50% to MUA Wallet
                if (booking.getMua() != null && booking.getMua().getUser() != null && halfMua.compareTo(BigDecimal.ZERO) > 0) {
                    Long muaUserId = booking.getMua().getUser().getId();
                    WalletEntity muaWallet = walletRepository.findByUserIdWithLock(muaUserId)
                            .orElseGet(() -> walletRepository.save(WalletEntity.builder()
                                    .user(booking.getMua().getUser())
                                    .availableBalance(BigDecimal.ZERO)
                                    .frozenBalance(BigDecimal.ZERO)
                                    .currency("VND")
                                    .build()));
                    BigDecimal curAvail = muaWallet.getAvailableBalance() != null ? muaWallet.getAvailableBalance() : BigDecimal.ZERO;
                    BigDecimal newAvail = curAvail.add(halfMua);
                    muaWallet.setAvailableBalance(newAvail);
                    walletRepository.save(muaWallet);

                    String idempotencyKeyMua = "dispute_split_mua:booking:" + bookingId;
                    if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKeyMua)) {
                        ledgerEntryRepository.save(LedgerEntryEntity.builder()
                                .referenceType("BOOKING_COMPENSATION")
                                .referenceId(bookingId)
                                .wallet(muaWallet)
                                .entryType("CREDIT")
                                .amount(halfMua)
                                .balanceAfter(newAvail)
                                .description("Admin hòa giải 50/50: Bồi thường 50% tiền cọc cho thợ: Đơn #" + booking.getBookingCode() + " (" + note + ")")
                                .idempotencyKey(idempotencyKeyMua)
                                .build());
                    }
                }

                // Release wallet hold
                Optional<WalletHoldEntity> holdOpt = walletHoldRepository.findByBookingIdAndStatus(bookingId, "ACTIVE");
                if (holdOpt.isPresent()) {
                    WalletHoldEntity hold = holdOpt.get();
                    hold.setStatus("SPLIT_SETTLED");
                    hold.setReleasedAt(OffsetDateTime.now());
                    walletHoldRepository.save(hold);
                }
            }

            booking.setCancellationReason("Admin phê duyệt hòa giải 50/50 (Khách nhận 50% - Thợ nhận 50% cọc): " + note);

        } else {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                    "dispute.invalid_resolution_type", HttpStatus.BAD_REQUEST);
        }

        // 2. Update booking status
        booking.setStatus(targetStatus);
        booking.setNeedsEmergencyReassignment(false);
        BookingEntity savedBooking = bookingRepository.save(booking);

        // 3. Release MUA busy state
        if (savedBooking.getMua() != null) {
            MuaProfileEntity mua = savedBooking.getMua();
            mua.setIsBusy(false);
            if (Boolean.TRUE.equals(mua.getIsOnline())) {
                mua.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
            } else {
                mua.setAvailabilityStatus(AvailabilityStatus.OFFLINE);
            }
            muaProfileRepository.save(mua);
        }

        // 3b. Release calendar slot if dispute resolved (CANCELLED or PAID_OUT)
        try {
            muaCalendarService.releaseSlotByBookingId(savedBooking.getId());
            log.info("[AdminDispute] Released calendar slots for bookingId={} upon dispute resolution {}", bookingId, targetStatus);
        } catch (Exception ex) {
            log.warn("[AdminDispute] Failed to release calendar slots for bookingId={}: {}", bookingId, ex.getMessage());
        }

        // 4. Audit transition
        bookingAuditService.logTransition(savedBooking, currentStatus, targetStatus, adminUserId, "Admin phán quyết khiếu nại: " + note);

        // 5. Broadcast Realtime notifications
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "DISPUTE_RESOLVED");
            payload.put("bookingId", bookingId);
            payload.put("bookingCode", savedBooking.getBookingCode());
            payload.put("resolution", resolution);
            payload.put("targetStatus", targetStatus.name());
            payload.put("note", note);
            payload.put("adminName", admin.getFullName());
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, payload);
            messagingTemplate.convertAndSend("/topic/admin/notifications", payload);
            messagingTemplate.convertAndSend("/topic/admin/disputes", payload);

            if (savedBooking.getAgency() != null) {
                messagingTemplate.convertAndSend("/topic/agency-notifications/" + savedBooking.getAgency().getId(), payload);
            }

            // Gửi In-App Notification & Push cho Khách hàng
            if (savedBooking.getCustomer() != null) {
                String custTitle = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution)
                        ? "Khiếu Nại Đã Được Chấp Thuận: #" + savedBooking.getBookingCode()
                        : "Từ Chối Khiếu Nại Đơn Hàng: #" + savedBooking.getBookingCode();
                String custContent = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution)
                        ? "Ban Quản Trị đã chấp thuận khiếu nại đơn #" + savedBooking.getBookingCode() + ". " + (studioFinancials != null ? "Số tiền thực trả " + studioFinancials.paidAmount() + " VND" : (isCompletedService ? "Toàn bộ 100% tiền đơn hàng" : "Tiền cọc")) + " đã được hoàn về ví của bạn. Ghi chú Admin: " + note
                        : "Căn cứ lời khai giải trình và ảnh minh chứng của chuyên viên, Ban Quản Trị quyết định từ chối khiếu nại đơn #" + savedBooking.getBookingCode() + ". Ghi chú Admin: " + note;
                notificationService.createInAppNotification(
                        savedBooking.getCustomer().getId(),
                        null,
                        bookingId,
                        "DISPUTE_RESOLUTION_RESULT",
                        custTitle,
                        custContent,
                        payload
                );
            }

            // Gửi In-App Notification & Push cho Thợ MUA hoặc Nhân viên Studio
            UserEntity workerUser = (savedBooking.getMua() != null && savedBooking.getMua().getUser() != null)
                    ? savedBooking.getMua().getUser()
                    : null;
            if (workerUser == null && savedBooking.getStaffAssignments() != null) {
                for (var assignment : savedBooking.getStaffAssignments()) {
                    if (assignment.getStaff() != null && assignment.getStaff().getMua() != null && assignment.getStaff().getMua().getUser() != null) {
                        workerUser = assignment.getStaff().getMua().getUser();
                        break;
                    }
                }
            }
            if (workerUser != null) {
                String workerTitle = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution)
                        ? "Kết Quả Phân Xử Khiếu Nại: #" + savedBooking.getBookingCode()
                        : "Giải Trình Khiếu Nại Đã Được Duyệt: #" + savedBooking.getBookingCode();
                String workerContent = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution)
                        ? "Ban Quản Trị đã chấp thuận khiếu nại của khách hàng đơn #" + savedBooking.getBookingCode() + " và bác bỏ giải trình. Toàn bộ tiền đơn đã được hoàn lại cho khách. Ghi chú Admin: " + note
                        : (isCompletedService
                                ? "Ban Quản Trị đã duyệt lời khai giải trình của bạn cho đơn #" + savedBooking.getBookingCode() + " và từ chối khiếu nại của khách hàng. Bạn không bị trừ tiền, toàn bộ thù lao ca làm việc được bảo lưu nguyên vẹn. Ghi chú Admin: " + note
                                : "Ban Quản Trị đã duyệt lời khai giải trình của bạn cho đơn #" + savedBooking.getBookingCode() + " và từ chối khiếu nại của khách hàng. Thù lao bồi thường cọc đã được cộng vào ví của bạn. Ghi chú Admin: " + note);
                if (studioFinancials != null) {
                    workerContent = "Admin đã xử lý khiếu nại đơn #" + savedBooking.getBookingCode()
                            + ". Trạng thái: " + targetStatus.name()
                            + ". Hoàn tiền theo số thực trả; bồi thường cọc thuộc ví chủ studio. Ghi chú: " + note;
                }
                notificationService.createInAppNotification(
                        workerUser.getId(),
                        savedBooking.getAgency() != null ? savedBooking.getAgency().getId() : null,
                        bookingId,
                        "DISPUTE_RESOLUTION_RESULT",
                        workerTitle,
                        workerContent,
                        payload
                );
            }

            // Gửi In-App Notification & Push cho Chủ Studio nếu là đơn Agency
            if (savedBooking.getAgency() != null && savedBooking.getAgency().getOwner() != null) {
                String ownerTitle = "Kết Quả Phân Xử Khiếu Nại Đơn: #" + savedBooking.getBookingCode();
                String ownerContent = "Ban Quản Trị đã ra phán quyết khiếu nại đơn #" + savedBooking.getBookingCode() + " (" + ("APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) ? "Chấp thuận khiếu nại khách" : "Duyệt giải trình nhân viên") + "). Ghi chú Admin: " + note;
                notificationService.createInAppNotification(
                        savedBooking.getAgency().getOwner().getId(),
                        savedBooking.getAgency().getId(),
                        bookingId,
                        "AGENCY_DISPUTE_RESULT",
                        ownerTitle,
                        ownerContent,
                        payload
                );
            }

            // =========================================================================
            // GỬI EMAIL THÔNG BÁO PHÁN QUYẾT KHIẾU NẠI CHO CÁC BÊN
            // =========================================================================
            BigDecimal actualRefund = BigDecimal.ZERO;
            BigDecimal actualPayout = BigDecimal.ZERO;
            BigDecimal depAmount = savedBooking.getDepositAmount() != null ? savedBooking.getDepositAmount() : BigDecimal.ZERO;
            if (studioFinancials != null) depAmount = studioFinancials.paidDeposit();
            BigDecimal totAmount = savedBooking.getTotalAmount() != null ? savedBooking.getTotalAmount() : depAmount;

            if ("APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution)) {
                actualRefund = studioFinancials != null ? studioFinancials.paidAmount() : (isCompletedService ? totAmount : depAmount);
            } else if ("SPLIT_SETTLEMENT_50_50".equalsIgnoreCase(resolution) || "SPLIT_50_50".equalsIgnoreCase(resolution)) {
                actualRefund = depAmount.divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP);
                actualPayout = depAmount.subtract(actualRefund);
            } else {
                actualPayout = isCompletedService ? totAmount : depAmount;
            }

            // 1. Gửi Email kết quả phân xử tới Khách hàng
            if (savedBooking.getCustomer() != null && StringUtils.hasText(savedBooking.getCustomer().getEmail())) {
                try {
                    emailService.sendCustomerDisputeResolutionEmail(
                            savedBooking.getCustomer().getEmail(),
                            savedBooking.getCustomer().getFullName(),
                            savedBooking.getBookingCode(),
                            resolution,
                            note,
                            actualRefund
                    );
                } catch (Exception ex) {
                    log.error("[EmailService] Failed to send dispute resolution email to customer {}: {}", savedBooking.getCustomer().getEmail(), ex.getMessage());
                }
            }

            // 2. Gửi Email kết quả phân xử tới Thợ MUA / Nhân viên Studio
            if (studioFinancials != null) actualPayout = BigDecimal.ZERO;
            if (workerUser != null && StringUtils.hasText(workerUser.getEmail())) {
                try {
                    emailService.sendWorkerDisputeResolutionEmail(
                            workerUser.getEmail(),
                            workerUser.getFullName(),
                            savedBooking.getBookingCode(),
                            resolution,
                            note,
                            actualPayout,
                            isCompletedService
                    );
                } catch (Exception ex) {
                    log.error("[EmailService] Failed to send dispute resolution email to worker {}: {}", workerUser.getEmail(), ex.getMessage());
                }
            }

            // 3. Gửi Email kết quả phân xử tới Chủ Studio (nếu là đơn Agency)
            if (savedBooking.getAgency() != null && savedBooking.getAgency().getOwner() != null && StringUtils.hasText(savedBooking.getAgency().getOwner().getEmail())) {
                try {
                    emailService.sendAgencyDisputeResolutionEmail(
                            savedBooking.getAgency().getOwner().getEmail(),
                            savedBooking.getAgency().getOwner().getFullName(),
                            savedBooking.getAgency().getAgencyName(),
                            workerUser != null ? workerUser.getFullName() : "Nhân viên",
                            savedBooking.getBookingCode(),
                            resolution,
                            note
                    );
                } catch (Exception ex) {
                    log.error("[EmailService] Failed to send dispute resolution email to agency {}: {}", savedBooking.getAgency().getOwner().getEmail(), ex.getMessage());
                }
            }
        } catch (Exception ex) {
            log.error("[AdminDispute] Failed to broadcast dispute resolution STOMP event: {}", ex.getMessage());
        }

        log.info("[AdminDispute] Successfully resolved dispute for bookingId={} as {} by admin={}",
                bookingId, resolution, admin.getEmail());

        return adminDisputeMapper.toRes(savedBooking);
    }
}
