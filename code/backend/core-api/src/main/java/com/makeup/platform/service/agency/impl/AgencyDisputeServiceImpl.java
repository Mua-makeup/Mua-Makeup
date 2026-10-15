package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import com.makeup.platform.dto.response.agency.AgencyDisputeRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.mapper.agency.AgencyDisputeMapper;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.agency.AgencyDisputeService;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.mua.MUACalendarService;
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
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyDisputeServiceImpl implements AgencyDisputeService {

    private final BookingRepository bookingRepository;
    private final AgencyDispatchSupport support;
    private final AgencyDisputeMapper agencyDisputeMapper;
    private final BookingDepositRepository bookingDepositRepository;
    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BookingAuditService bookingAuditService;
    private final SimpMessagingTemplate messagingTemplate;
    private final MUACalendarService muaCalendarService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AgencyDisputeRes> getAgencyDisputes(Long agencyOwnerId, String status, String keyword, Pageable pageable) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(agencyOwnerId);

        Specification<BookingEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Chỉ lấy các đơn thuộc Studio của agency này
            predicates.add(cb.equal(root.get("agency").get("id"), agency.getId()));

            // Lọc theo bối cảnh khiếu nại / sự cố
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
            } else if ("RESOLVED".equalsIgnoreCase(status) || "REFUNDED".equalsIgnoreCase(status) || "DISPUTE_REFUNDED".equalsIgnoreCase(status)) {
                predicates.add(cb.or(
                        cb.equal(root.get("status"), BookingStatus.DISPUTE_REFUNDED),
                        cb.equal(root.get("status"), BookingStatus.DISPUTE_COMPENSATED),
                        cb.and(
                                cb.equal(root.get("status"), BookingStatus.CANCELLED),
                                cb.isNotNull(root.get("emergencyReason"))
                        )
                ));
            }

            // Keyword filter
            if (StringUtils.hasText(keyword)) {
                String searchPattern = "%" + keyword.toLowerCase().trim() + "%";
                Predicate bookingCodeMatch = cb.like(cb.lower(root.get("bookingCode")), searchPattern);
                Predicate emergencyReasonMatch = cb.like(cb.lower(root.get("emergencyReason")), searchPattern);
                predicates.add(cb.or(bookingCodeMatch, emergencyReasonMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<BookingEntity> bookingPage = bookingRepository.findAll(spec, pageable);
        List<AgencyDisputeRes> content = bookingPage.getContent().stream()
                .map(agencyDisputeMapper::toRes)
                .toList();

        return PageResponse.<AgencyDisputeRes>builder()
                .content(content)
                .page(bookingPage.getNumber())
                .size(bookingPage.getSize())
                .totalElements(bookingPage.getTotalElements())
                .totalPages(bookingPage.getTotalPages())
                .last(bookingPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyDisputeRes getAgencyDisputeDetail(Long agencyOwnerId, Long bookingId) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(agencyOwnerId);
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());
        return agencyDisputeMapper.toRes(booking);
    }

    @Override
    @Transactional
    public AgencyDisputeRes resolveAgencyDispute(Long agencyOwnerId, Long bookingId, ResolveDisputeReq req) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(agencyOwnerId);
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());

        if (booking.getStatus() != BookingStatus.DISPUTED) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "dispute.not_in_disputed_state", HttpStatus.BAD_REQUEST);
        }

        String resolution = req.getResolution();
        String note = req.getNote() != null ? req.getNote().trim() : "";
        BookingStatus currentStatus = booking.getStatus();
        BookingStatus targetStatus;

        if ("APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) || "REFUND".equalsIgnoreCase(resolution)) {
            targetStatus = BookingStatus.DISPUTE_REFUNDED;

            // Hoàn cọc cho khách hàng từ Escrow vào ví khách
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
                String idempotencyKey = "agency_dispute_refund:booking:" + bookingId;
                if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKey)) {
                    LedgerEntryEntity ledgerEntry = LedgerEntryEntity.builder()
                            .referenceType("BOOKING_REFUND")
                            .referenceId(bookingId)
                            .wallet(customerWallet)
                            .entryType("CREDIT")
                            .amount(depositAmount)
                            .balanceAfter(newBalance)
                            .description("Studio (" + agency.getAgencyName() + ") duyệt khiếu nại hoàn cọc đơn #" + booking.getBookingCode() + " (" + note + ")")
                            .idempotencyKey(idempotencyKey)
                            .build();
                    ledgerEntryRepository.save(ledgerEntry);
                }
            }

            booking.setCancellationReason("Studio phê duyệt khiếu nại hoàn cọc: " + note);
            try {
                muaCalendarService.releaseSlotByBookingId(bookingId);
            } catch (Exception ex) {
                log.warn("[AgencyDispute] Failed to release slot for bookingId={}: {}", bookingId, ex.getMessage());
            }

        } else {
            // Studio từ chối hoàn cọc -> Vẫn giữ trạng thái DISPUTED để khách có quyền chấp nhận hoặc leo thang lên Admin sàn
            targetStatus = BookingStatus.DISPUTED;
            booking.setCancellationReason("[STUDIO_TU_CHOI]: " + (StringUtils.hasText(note) ? note : "Studio không đồng ý hoàn cọc"));
        }

        booking.setStatus(targetStatus);
        BookingEntity savedBooking = bookingRepository.save(booking);

        // Audit log
        bookingAuditService.logTransition(
                savedBooking,
                currentStatus,
                targetStatus,
                agencyOwnerId,
                "Studio (" + agency.getAgencyName() + ") giải quyết sự cố/khiếu nại: " + note
        );

        // Realtime notification & broadcast
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "AGENCY_DISPUTE_RESOLVED");
            payload.put("bookingId", savedBooking.getId());
            payload.put("bookingCode", savedBooking.getBookingCode());
            payload.put("status", savedBooking.getStatus().name());
            payload.put("resolution", resolution);
            payload.put("note", note);
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + savedBooking.getId(), payload);
            messagingTemplate.convertAndSend("/topic/agency/" + agency.getId() + "/bookings", payload);
        } catch (Exception ex) {
            log.warn("[AgencyDispute] Failed to broadcast dispute resolved: {}", ex.getMessage());
        }

        return agencyDisputeMapper.toRes(savedBooking);
    }
}
