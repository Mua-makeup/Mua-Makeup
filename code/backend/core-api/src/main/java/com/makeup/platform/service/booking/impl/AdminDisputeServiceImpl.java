package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import com.makeup.platform.dto.response.admin.AdminDisputeRes;
import com.makeup.platform.dto.response.admin.AdminDisputeStatsRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
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
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingAuditService bookingAuditService;
    private final BookingSettlementService bookingSettlementService;
    private final BookingDepositRepository bookingDepositRepository;
    private final AdminDisputeMapper adminDisputeMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MUACalendarService muaCalendarService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminDisputeRes> getAllDisputes(String status, String keyword, Pageable pageable) {
        Specification<BookingEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

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
        BookingEntity booking = bookingRepository.findById(bookingId)
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

        if ("APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution)) {
            targetStatus = BookingStatus.DISPUTE_REFUNDED;

            // 1. Refund deposit escrow to customer wallet
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

            if (depositAmount.compareTo(BigDecimal.ZERO) > 0 && booking.getCustomer() != null) {
                Long customerId = booking.getCustomer().getId();
                WalletEntity customerWallet = walletRepository.findByUserId(customerId)
                        .orElseGet(() -> walletRepository.save(WalletEntity.builder()
                                .user(booking.getCustomer())
                                .availableBalance(BigDecimal.ZERO)
                                .frozenBalance(BigDecimal.ZERO)
                                .currency("VND")
                                .build()));

                BigDecimal currentAvailable = customerWallet.getAvailableBalance() != null ? customerWallet.getAvailableBalance() : BigDecimal.ZERO;
                BigDecimal newBalance = currentAvailable.add(depositAmount);
                customerWallet.setAvailableBalance(newBalance);

                BigDecimal curFrozen = customerWallet.getFrozenBalance() != null ? customerWallet.getFrozenBalance() : BigDecimal.ZERO;
                customerWallet.setFrozenBalance(curFrozen.subtract(depositAmount).max(BigDecimal.ZERO));
                walletRepository.save(customerWallet);

                // Release hold
                Optional<WalletHoldEntity> holdOpt = walletHoldRepository.findByBookingIdAndStatus(bookingId, "ACTIVE");
                if (holdOpt.isPresent()) {
                    WalletHoldEntity hold = holdOpt.get();
                    hold.setStatus("REFUNDED");
                    hold.setReleasedAt(OffsetDateTime.now());
                    walletHoldRepository.save(hold);
                }

                // Double entry ledger
                String idempotencyKey = "dispute_refund:booking:" + bookingId;
                if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKey)) {
                    LedgerEntryEntity ledgerEntry = LedgerEntryEntity.builder()
                            .referenceType("BOOKING_REFUND")
                            .referenceId(bookingId)
                            .wallet(customerWallet)
                            .entryType("CREDIT")
                            .amount(depositAmount)
                            .balanceAfter(newBalance)
                            .description("Admin phê duyệt khiếu nại: Hoàn 100% tiền cọc đơn #" + booking.getBookingCode() + " (" + note + ")")
                            .idempotencyKey(idempotencyKey)
                            .build();
                    ledgerEntryRepository.save(ledgerEntry);
                }
            }

            booking.setCancellationReason("Admin phê duyệt khiếu nại hoàn cọc: " + note);

        } else if ("REJECT_AND_PAYOUT_MUA".equalsIgnoreCase(resolution) || "APPROVE_COMPENSATION_MUA".equalsIgnoreCase(resolution)) {
            boolean isCompletedService = StringUtils.hasText(booking.getCompletionPhotoUrl());
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

                if (depositAmount.compareTo(BigDecimal.ZERO) > 0 && booking.getMua() != null && booking.getMua().getUser() != null) {
                    Long muaUserId = booking.getMua().getUser().getId();
                    WalletEntity muaWallet = walletRepository.findByUserIdWithLock(muaUserId)
                            .orElseGet(() -> walletRepository.save(WalletEntity.builder()
                                    .user(booking.getMua().getUser())
                                    .availableBalance(BigDecimal.ZERO)
                                    .frozenBalance(BigDecimal.ZERO)
                                    .currency("VND")
                                    .build()));

                    BigDecimal currentBalance = muaWallet.getAvailableBalance() != null ? muaWallet.getAvailableBalance() : BigDecimal.ZERO;
                    BigDecimal newBalance = currentBalance.add(depositAmount);
                    muaWallet.setAvailableBalance(newBalance);
                    walletRepository.save(muaWallet);

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
                                .wallet(muaWallet)
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

            booking.setCancellationReason("Admin phê duyệt bồi thường cho thợ: " + note);

        } else if ("SPLIT_SETTLEMENT_50_50".equalsIgnoreCase(resolution) || "SPLIT_50_50".equalsIgnoreCase(resolution)) {
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
        } catch (Exception ex) {
            log.error("[AdminDispute] Failed to broadcast dispute resolution STOMP event: {}", ex.getMessage());
        }

        log.info("[AdminDispute] Successfully resolved dispute for bookingId={} as {} by admin={}",
                bookingId, resolution, admin.getEmail());

        return adminDisputeMapper.toRes(savedBooking);
    }
}
