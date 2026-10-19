package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.admin.ResolveDisputeReq;
import com.makeup.platform.dto.response.agency.AgencyDisputeRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.UserEntity;
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
import com.makeup.platform.service.interaction.NotificationService;
import com.makeup.platform.service.mail.EmailService;
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
    private final NotificationService notificationService;
    private final EmailService emailService;

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

        boolean isCompletedService = StringUtils.hasText(booking.getCompletionPhotoUrl())
                || (booking.getTotalAmount() != null && booking.getTotalAmount().compareTo(BigDecimal.ZERO) > 0
                    && booking.getDepositAmount() != null && booking.getTotalAmount().compareTo(booking.getDepositAmount()) > 0);

        BigDecimal depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
        Optional<BookingDepositEntity> depositOpt = bookingDepositRepository.findByBookingId(bookingId);
        if (depositOpt.isPresent()) {
            BookingDepositEntity dep = depositOpt.get();
            if (dep.getPaidAmount() != null && dep.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                depositAmount = dep.getPaidAmount();
            }
        }

        BigDecimal refundAmount = (isCompletedService && booking.getTotalAmount() != null && booking.getTotalAmount().compareTo(BigDecimal.ZERO) > 0)
                ? booking.getTotalAmount()
                : depositAmount;

        if ("APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) || "REFUND".equalsIgnoreCase(resolution)) {
            targetStatus = BookingStatus.DISPUTE_REFUNDED;

            if (depositOpt.isPresent()) {
                BookingDepositEntity dep = depositOpt.get();
                dep.setStatus("REFUNDED");
                bookingDepositRepository.save(dep);
            }

            if (refundAmount.compareTo(BigDecimal.ZERO) > 0 && booking.getCustomer() != null) {
                Long customerId = booking.getCustomer().getId();
                WalletEntity customerWallet = walletRepository.findByUserId(customerId)
                        .orElseGet(() -> walletRepository.save(WalletEntity.builder()
                                .user(booking.getCustomer())
                                .availableBalance(BigDecimal.ZERO)
                                .frozenBalance(BigDecimal.ZERO)
                                .currency("VND")
                                .build()));

                BigDecimal currentAvailable = customerWallet.getAvailableBalance() != null ? customerWallet.getAvailableBalance() : BigDecimal.ZERO;
                BigDecimal newBalance = currentAvailable.add(refundAmount);
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

                // Double entry ledger for customer
                String idempotencyKey = "agency_dispute_refund:booking:" + bookingId;
                if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKey)) {
                    String desc = isCompletedService
                            ? "Studio (" + agency.getAgencyName() + ") duyệt khiếu nại sau ca: Hoàn 100% tổng tiền đơn #" + booking.getBookingCode() + " (" + note + ")"
                            : "Studio (" + agency.getAgencyName() + ") duyệt khiếu nại hoàn cọc đơn #" + booking.getBookingCode() + " (" + note + ")";
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

                // Nếu ca đã hoàn thành, tiến hành thu hồi từ ví của chủ Studio
                if (isCompletedService && agency.getOwner() != null) {
                    walletRepository.findByUserIdWithLock(agency.getOwner().getId()).ifPresent(agencyWallet -> {
                        BigDecimal curAvail = agencyWallet.getAvailableBalance() != null ? agencyWallet.getAvailableBalance() : BigDecimal.ZERO;
                        BigDecimal clawbackBalance = curAvail.subtract(refundAmount).max(BigDecimal.ZERO);
                        agencyWallet.setAvailableBalance(clawbackBalance);
                        walletRepository.save(agencyWallet);

                        String clawbackKey = "agency_dispute_clawback:booking:" + bookingId;
                        if (!ledgerEntryRepository.existsByIdempotencyKey(clawbackKey)) {
                            LedgerEntryEntity clawbackEntry = LedgerEntryEntity.builder()
                                    .referenceType("BOOKING_CLAWBACK")
                                    .referenceId(bookingId)
                                    .wallet(agencyWallet)
                                    .entryType("DEBIT")
                                    .amount(refundAmount)
                                    .balanceAfter(clawbackBalance)
                                    .description("Thu hồi thù lao đơn #" + booking.getBookingCode() + " do Studio chấp thuận khiếu nại của khách hàng (" + note + ")")
                                    .idempotencyKey(clawbackKey)
                                    .build();
                            ledgerEntryRepository.save(clawbackEntry);
                        }
                    });
                }
            }

            booking.setCancellationReason(isCompletedService
                    ? "Studio phê duyệt khiếu nại sau ca (Hoàn 100% tổng tiền đơn): " + note
                    : "Studio phê duyệt khiếu nại hoàn cọc: " + note);

            try {
                muaCalendarService.releaseSlotByBookingId(bookingId);
            } catch (Exception ex) {
                log.warn("[AgencyDispute] Failed to release slot for bookingId={}: {}", bookingId, ex.getMessage());
            }

        } else {
            // Studio từ chối hoàn cọc / bác bỏ khiếu nại -> Giữ trạng thái DISPUTED để khách có quyền chấp nhận hoặc leo thang lên Admin sàn
            targetStatus = BookingStatus.DISPUTED;
            booking.setCancellationReason(isCompletedService
                    ? "[STUDIO_TU_CHOI]: Studio bác bỏ khiếu nại sau ca (Bảo lưu thù lao ca làm): " + (StringUtils.hasText(note) ? note : "Studio không chấp thuận khiếu nại")
                    : "[STUDIO_TU_CHOI]: " + (StringUtils.hasText(note) ? note : "Studio không đồng ý hoàn cọc"));
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
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "AGENCY_DISPUTE_RESOLVED");
        payload.put("bookingId", savedBooking.getId());
        payload.put("bookingCode", savedBooking.getBookingCode());
        payload.put("status", savedBooking.getStatus().name());
        payload.put("resolution", resolution);
        payload.put("targetStatus", targetStatus.name());
        payload.put("isCompletedService", isCompletedService);
        payload.put("note", note);
        payload.put("timestamp", System.currentTimeMillis());

        try {
            messagingTemplate.convertAndSend("/topic/booking-status/" + savedBooking.getId(), payload);
            messagingTemplate.convertAndSend("/topic/agency/" + agency.getId() + "/bookings", payload);
            messagingTemplate.convertAndSend("/topic/admin/disputes", payload);
        } catch (Exception ex) {
            log.warn("[AgencyDispute] Failed to broadcast dispute resolved: {}", ex.getMessage());
        }

        // 1. In-App Notification cho Khách hàng
        if (savedBooking.getCustomer() != null) {
            boolean isApproved = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) || "REFUND".equalsIgnoreCase(resolution);
            String custTitle = isApproved
                    ? "Studio Đã Chấp Thuận Khiếu Nại: #" + savedBooking.getBookingCode()
                    : "Studio Từ Chối Khiếu Nại Đơn Hàng: #" + savedBooking.getBookingCode();
            String custContent = isApproved
                    ? "Studio " + agency.getAgencyName() + " đã chấp thuận khiếu nại đơn #" + savedBooking.getBookingCode() + ". " + (isCompletedService ? "Toàn bộ 100% tiền đơn hàng" : "Tiền cọc") + " đã được hoàn về ví của bạn. Ghi chú Studio: " + note
                    : "Studio " + agency.getAgencyName() + " đã từ chối yêu cầu khiếu nại của bạn cho đơn #" + savedBooking.getBookingCode() + ". Bạn có thể đồng ý với quyết định này hoặc khiếu nại lên Ban Quản Trị Sàn để được phân xử. Ghi chú Studio: " + note;
            try {
                notificationService.createInAppNotification(
                        savedBooking.getCustomer().getId(),
                        null,
                        bookingId,
                        "DISPUTE_RESOLUTION_RESULT",
                        custTitle,
                        custContent,
                        payload
                );
            } catch (Exception ex) {
                log.error("[AgencyDispute] Failed to create in-app notification for customer: {}", ex.getMessage());
            }
        }

        // 2. In-App Notification cho Chuyên viên Staff MUA phụ trách
        UserEntity staffUser = null;
        if (savedBooking.getStaffAssignments() != null) {
            for (var assignment : savedBooking.getStaffAssignments()) {
                if (assignment.getStaff() != null && assignment.getStaff().getMua() != null && assignment.getStaff().getMua().getUser() != null) {
                    staffUser = assignment.getStaff().getMua().getUser();
                    break;
                }
            }
        }
        if (staffUser != null) {
            boolean isApproved = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) || "REFUND".equalsIgnoreCase(resolution);
            String staffTitle = isApproved
                    ? "Studio Đã Phê Duyệt Khiếu Nại Ca Làm: #" + savedBooking.getBookingCode()
                    : "Studio Bác Bỏ Khiếu Nại Ca Làm: #" + savedBooking.getBookingCode();
            String staffContent = isApproved
                    ? "Studio " + agency.getAgencyName() + " đã chấp thuận khiếu nại đơn #" + savedBooking.getBookingCode() + ". Toàn bộ tiền đơn đã được hoàn lại cho khách hàng. Ghi chú: " + note
                    : "Studio " + agency.getAgencyName() + " đã bảo vệ kết quả ca làm đơn #" + savedBooking.getBookingCode() + " và bác bỏ khiếu nại của khách hàng. Ghi chú: " + note;
            try {
                notificationService.createInAppNotification(
                        staffUser.getId(),
                        agency.getId(),
                        bookingId,
                        "AGENCY_DISPUTE_RESULT",
                        staffTitle,
                        staffContent,
                        payload
                );
            } catch (Exception ex) {
                log.error("[AgencyDispute] Failed to create in-app notification for staff: {}", ex.getMessage());
            }
        }

        // 3. In-App Notification xác nhận cho Chủ Studio
        try {
            boolean isApproved = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) || "REFUND".equalsIgnoreCase(resolution);
            String agencyOwnerTitle = "Đã Xử Lý Khiếu Nại Đơn: #" + savedBooking.getBookingCode();
            String agencyOwnerContent = "Bạn đã xử lý khiếu nại đơn #" + savedBooking.getBookingCode() + " (" + (isApproved ? "Chấp thuận hoàn tiền" : "Từ chối khiếu nại") + "). Ghi chú: " + note;
            notificationService.createInAppNotification(
                    agencyOwnerId,
                    agency.getId(),
                    bookingId,
                    "AGENCY_DISPUTE_RESULT",
                    agencyOwnerTitle,
                    agencyOwnerContent,
                    payload
            );
        } catch (Exception ex) {
            log.error("[AgencyDispute] Failed to create in-app notification for agency owner: {}", ex.getMessage());
        }

        // 4. Gửi EMAIL thông báo cho các bên
        // 4.1. Email Khách hàng
        if (savedBooking.getCustomer() != null && StringUtils.hasText(savedBooking.getCustomer().getEmail())) {
            try {
                boolean isApproved = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) || "REFUND".equalsIgnoreCase(resolution);
                emailService.sendCustomerDisputeResolutionEmail(
                        savedBooking.getCustomer().getEmail(),
                        savedBooking.getCustomer().getFullName(),
                        savedBooking.getBookingCode(),
                        resolution,
                        note,
                        isApproved ? refundAmount : BigDecimal.ZERO
                );
            } catch (Exception ex) {
                log.error("[AgencyDispute] Failed to send dispute resolution email to customer {}: {}", savedBooking.getCustomer().getEmail(), ex.getMessage());
            }
        }

        // 4.2. Email Chuyên viên Staff MUA
        if (staffUser != null && StringUtils.hasText(staffUser.getEmail())) {
            try {
                boolean isApproved = "APPROVE_REFUND_CUSTOMER".equalsIgnoreCase(resolution) || "REFUND".equalsIgnoreCase(resolution);
                BigDecimal staffPayout = isApproved ? BigDecimal.ZERO : refundAmount;
                emailService.sendWorkerDisputeResolutionEmail(
                        staffUser.getEmail(),
                        staffUser.getFullName(),
                        savedBooking.getBookingCode(),
                        resolution,
                        note,
                        staffPayout,
                        isCompletedService
                );
            } catch (Exception ex) {
                log.error("[AgencyDispute] Failed to send dispute resolution email to staff {}: {}", staffUser.getEmail(), ex.getMessage());
            }
        }

        // 4.3. Email Chủ Studio
        if (agency.getOwner() != null && StringUtils.hasText(agency.getOwner().getEmail())) {
            try {
                emailService.sendAgencyDisputeResolutionEmail(
                        agency.getOwner().getEmail(),
                        agency.getOwner().getFullName(),
                        agency.getAgencyName(),
                        staffUser != null ? staffUser.getFullName() : "Nhân viên phụ trách",
                        savedBooking.getBookingCode(),
                        resolution,
                        note
                );
            } catch (Exception ex) {
                log.error("[AgencyDispute] Failed to send dispute resolution email to agency owner {}: {}", agency.getOwner().getEmail(), ex.getMessage());
            }
        }

        return agencyDisputeMapper.toRes(savedBooking);
    }
}
