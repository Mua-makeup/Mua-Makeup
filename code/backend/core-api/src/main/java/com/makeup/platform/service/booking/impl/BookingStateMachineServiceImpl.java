package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.InstantBookingKeys;
import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.constants.MediaConstants;
import com.makeup.platform.common.utils.FileValidationUtils;
import com.makeup.platform.dto.request.booking.TransitionBookingStateReq;
import com.makeup.platform.dto.response.booking.BookingCompletionPhotoRes;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.dto.response.booking.BookingStatusDetailRes;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.dto.response.media.CloudMediaUploadResult;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
import com.makeup.platform.entity.catalog.PackageItemType;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.wallet.BookingCashReceiptRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.booking.BookingStateMachineService;
import com.makeup.platform.service.media.MediaStorageService;
import com.makeup.platform.service.mua.MUACalendarService;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.dto.response.booking.CandidatePackageRes;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingStateMachineServiceImpl implements BookingStateMachineService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final BookingAuditService bookingAuditService;
    private final BookingMapper bookingMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final MediaStorageService mediaStorageService;
    private final MUACalendarService muaCalendarService;
    private final StringRedisTemplate stringRedisTemplate;
    private final BookingDepositRepository bookingDepositRepository;
    private final BookingCashReceiptRepository cashReceiptRepository;
    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    @Override
    @Transactional
    public BookingStateTransitionRes transitionState(Long bookingId, Long userId, TransitionBookingStateReq req) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        BookingStatus currentStatus = booking.getStatus();
        BookingStatus targetStatus;
        try {
            targetStatus = BookingStatus.valueOf(req.getTargetStatus());
        } catch (IllegalArgumentException e) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.invalid_state_transition", HttpStatus.BAD_REQUEST);
        }

        // 1. Check valid transition matrix
        if (!isValidTransition(currentStatus, targetStatus)) {
            // Xử lý kịch bản: Cả hai bên cùng báo cáo khiếu nại (hoặc bên thứ hai gửi thêm khiếu nại/minh chứng khi đơn đã ở DISPUTED)
            if (currentStatus == BookingStatus.DISPUTED && targetStatus == BookingStatus.DISPUTED) {
                log.info("[StateMachine] BookingId={} is already in DISPUTED state. Recording secondary dispute statement from userId={}", bookingId, userId);
                validateActorAuthorization(booking, user, targetStatus);
                String userRole = user.getRole() != null ? user.getRole().getName() : "";
                boolean isCustomer = "ROLE_CUSTOMER".equals(userRole)
                        || (booking.getCustomer() != null && booking.getCustomer().getId().equals(userId));
                String roleTag = isCustomer ? "[Khách hàng]" : "[Chuyên viên MUA]";
                String existingReason = StringUtils.hasText(booking.getEmergencyReason())
                        ? booking.getEmergencyReason()
                        : (booking.getCancellationReason() != null ? booking.getCancellationReason() : "");

                String formattedPart = roleTag + ": " + (req.getReason() != null ? req.getReason().trim() : "");
                if (req.getReason() != null && !existingReason.contains(req.getReason().trim())) {
                    String updatedReason = StringUtils.hasText(existingReason)
                            ? existingReason + " | " + formattedPart
                            : formattedPart;
                    booking.setCancellationReason(updatedReason);
                    booking.setEmergencyReason(updatedReason);
                }

                if (StringUtils.hasText(req.getEmergencyProofUrl())) {
                    String incomingProof = req.getEmergencyProofUrl().trim();
                    String formattedProof = incomingProof.startsWith("[") ? incomingProof : (roleTag + ":" + incomingProof);
                    String currentProofs = booking.getEmergencyProofUrl();
                    if (StringUtils.hasText(currentProofs)) {
                        if (!currentProofs.contains(incomingProof)) {
                            booking.setEmergencyProofUrl(currentProofs.trim() + " | " + formattedProof);
                        }
                    } else {
                        booking.setEmergencyProofUrl(formattedProof);
                    }
                }

                BookingEntity saved = bookingRepository.save(booking);

                // Ghi audit log
                bookingAuditService.logTransition(saved, currentStatus, BookingStatus.DISPUTED, userId,
                        "Bổ sung lời khai & minh chứng đối chất từ " + (isCustomer ? "Khách hàng" : "Chuyên viên MUA"));

                // Bắn in-memory event và thông báo tới Admin & STOMP
                eventPublisher.publishEvent(new BookingStateChangedEvent(
                        this,
                        saved.getId(),
                        saved.getBookingCode(),
                        currentStatus,
                        BookingStatus.DISPUTED,
                        userId
                ));
                try {
                    notificationService.createDisputeNotification(saved);
                    log.info("[StateMachine] Broadcast secondary dispute update notification for bookingId={}", bookingId);
                } catch (Exception ex) {
                    log.error("[StateMachine] Failed to broadcast secondary dispute notification: {}", ex.getMessage());
                }

                return bookingMapper.toTransitionRes(saved, currentStatus, userId);
            }

            log.warn("[StateMachine] Invalid state transition from {} to {} for bookingId={}",
                    currentStatus, targetStatus, bookingId);
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.invalid_state_transition", HttpStatus.BAD_REQUEST);
        }

        // 2. Validate actor authorization (IDOR / Role guard)
        validateActorAuthorization(booking, user, targetStatus);

        // 3. Validate condition prerequisites
        if (targetStatus == BookingStatus.ON_THE_WAY) {
            if (!isDepositPaidInternal(booking)) {
                log.warn("[StateMachine] Cannot start trip: Deposit not paid for bookingId={}", bookingId);
                throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_NOT_PAID,
                        "booking.deposit_not_paid", HttpStatus.BAD_REQUEST);
            }
        }

        if (targetStatus == BookingStatus.COMPLETED) {
            String photoUrl = req.getEffectiveCompletionPhotoUrl();
            if (StringUtils.hasText(photoUrl)) {
                booking.setCompletionPhotoUrl(photoUrl.trim());
            } else if (!StringUtils.hasText(booking.getCompletionPhotoUrl())) {
                log.warn("[StateMachine] Completion photo required for bookingId={}", bookingId);
                throw new CustomBusinessException(ErrorCodes.ERR_COMPLETION_PHOTO_REQUIRED,
                        "booking.completion_photo_required", HttpStatus.BAD_REQUEST);
            }
        }

        if (targetStatus == BookingStatus.CANCELLED) {
            if (req.getReason() == null || req.getReason().trim().isEmpty()) {
                log.warn("[StateMachine] Cancellation reason required for bookingId={}", bookingId);
                throw new CustomBusinessException(ErrorCodes.ERR_CANCELLATION_REASON_REQUIRED,
                        "booking.cancellation_reason_required", HttpStatus.BAD_REQUEST);
            }

            boolean isCustomer = booking.getCustomer() != null && booking.getCustomer().getId().equals(userId);
            if (isCustomer) {
                // Khách không được hủy khi thợ đã bắt đầu di chuyển, đã đến nơi hoặc đang làm việc
                if (booking.getStatus() == BookingStatus.ON_THE_WAY
                        || booking.getStatus() == BookingStatus.ARRIVED
                        || booking.getStatus() == BookingStatus.IN_PROGRESS) {
                    log.warn("[StateMachine] Customer id={} attempted to cancel bookingId={} while MUA is on the way/arrived/in progress",
                            userId, bookingId);
                    throw new CustomBusinessException(
                            ErrorCodes.ERR_CANNOT_CANCEL_WHILE_ON_THE_WAY,
                            "booking.cannot_cancel_while_mua_on_the_way",
                            HttpStatus.BAD_REQUEST
                    );
                }

                // Đối với đơn REALTIME_INSTANT: Khách chỉ được hủy khi thợ nhận đơn và CHƯA thanh toán cọc. Đã cọc thì không được hủy.
                if (booking.getBookingType() == BookingType.REALTIME_INSTANT && isDepositPaidInternal(booking)) {
                    log.warn("[StateMachine] Customer id={} attempted to cancel REALTIME_INSTANT bookingId={} after deposit was paid",
                            userId, bookingId);
                    throw new CustomBusinessException(
                            ErrorCodes.ERR_CANNOT_CANCEL_AFTER_DEPOSIT,
                            "booking.cannot_cancel_after_deposit",
                            HttpStatus.BAD_REQUEST
                    );
                }

                // Đối với đơn SCHEDULED:
                if (booking.getBookingType() == BookingType.SCHEDULED) {
                    boolean depositPaid = isDepositPaidInternal(booking);
                    if (!depositPaid) {
                        // Chưa cọc tiền -> Hủy bình thường, không hoàn tiền
                        log.info("[StateMachine] Customer id={} cancelled unpaid scheduled bookingId={}", userId, bookingId);
                    } else if (booking.getStatus() == BookingStatus.REQUESTED
                            || booking.getStatus() == BookingStatus.PENDING_AGENCY_DISPATCH
                            || booking.getStatus() == BookingStatus.AGENCY_ASSIGNED) {
                        // Thợ CHƯA xác nhận -> Hoàn 100% tiền cọc về ví khách hàng ngay lập tức
                        log.info("[StateMachine] Customer id={} cancelled unaccepted scheduled bookingId={}, 100% deposit refunded", userId, bookingId);
                        refundDepositToCustomer(booking, req.getReason() != null ? req.getReason().trim() : "Khách hủy khi chuyên viên chưa xác nhận");
                    } else if (booking.getStatus() == BookingStatus.ACCEPTED) {
                        // Thợ ĐÃ xác nhận -> Áp dụng điều kiện thời gian hoàn tiền cấu hình
                        LocalDateTime scheduledStart = booking.getScheduledStartTime();
                        if (scheduledStart != null) {
                            LocalDateTime nowVN = OffsetDateTime.now(VIETNAM_OFFSET).toLocalDateTime();
                            // Nếu đã đến hoặc quá thời gian hẹn bắt đầu -> Chặn không cho khách tự hủy, bắt buộc gửi khiếu nại lên Admin
                            if (!nowVN.isBefore(scheduledStart)) {
                                log.warn("[StateMachine] Customer id={} cannot unilaterally cancel ACCEPTED bookingId={} past scheduled start time ({})",
                                        userId, bookingId, scheduledStart);
                                throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                                        "booking.cannot_cancel_past_start_time", HttpStatus.BAD_REQUEST);
                            }

                            double hoursUntilBooking = Duration.between(nowVN, scheduledStart).toMinutes() / 60.0;
                            if (hoursUntilBooking <= 2.0) {
                                // Hủy sát giờ (<= 2 tiếng): bồi thường 100% tiền cọc cho thợ (MUA)
                                log.info("[StateMachine] Customer id={} cancelled ACCEPTED bookingId={} within 2 hours, 100% deposit compensated to MUA", userId, bookingId);
                                compensateDepositToMua(booking, req.getReason() != null ? req.getReason().trim() : "Khách hủy sát giờ hẹn (<= 2 tiếng), tiền cọc bồi thường cho thợ");
                            } else {
                                // Hủy trước > 2 tiếng: hoàn 100% cọc về ví khách
                                log.info("[StateMachine] Customer id={} cancelled ACCEPTED bookingId={} > 2 hours in advance, 100% deposit refunded", userId, bookingId);
                                refundDepositToCustomer(booking, req.getReason() != null ? req.getReason().trim() : "Khách hủy lịch trước 2 tiếng");
                            }
                        }
                    }
                }
            } else {
                if (isDepositPaidInternal(booking)) {
                    refundDepositToCustomer(booking, req.getReason() != null ? req.getReason().trim() : "Thợ hủy ca hẹn");
                }
            }

            booking.setCancellationReason(req.getReason().trim());
        }

        if (targetStatus == BookingStatus.DISPUTED) {
            if (req.getReason() == null || req.getReason().trim().isEmpty()) {
                log.warn("[StateMachine] Dispute/Cancellation reason required for bookingId={}", bookingId);
                throw new CustomBusinessException(ErrorCodes.ERR_CANCELLATION_REASON_REQUIRED,
                        "booking.cancellation_reason_required", HttpStatus.BAD_REQUEST);
            }

            // Kiểm tra: Nếu là thợ (MUA) hoặc Agency báo cáo khách vắng mặt / bỏ hẹn -> BẮT BUỘC có minh chứng (ảnh hiện trường / cuộc gọi)
            boolean isMuaOrAgency = (booking.getMua() != null && booking.getMua().getUser() != null && booking.getMua().getUser().getId().equals(userId))
                    || (booking.getAgency() != null && booking.getAgency().getOwner() != null && booking.getAgency().getOwner().getId().equals(userId));
            if (isMuaOrAgency && !StringUtils.hasText(req.getEmergencyProofUrl())) {
                log.warn("[StateMachine] MUA dispute report requires proof photo for bookingId={}", bookingId);
                throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION,
                        "booking.dispute_proof_required", HttpStatus.BAD_REQUEST);
            }

            String userRole = user.getRole() != null ? user.getRole().getName() : "";
            boolean isCustomer = "ROLE_CUSTOMER".equals(userRole)
                    || (booking.getCustomer() != null && booking.getCustomer().getId().equals(userId));
            boolean isMua = "ROLE_FREELANCE_MUA".equals(userRole)
                    || "ROLE_AGENCY_STAFF".equals(userRole)
                    || (booking.getMua() != null && booking.getMua().getUser() != null && booking.getMua().getUser().getId().equals(userId))
                    || (booking.getAgency() != null && booking.getAgency().getOwner() != null && booking.getAgency().getOwner().getId().equals(userId));

            String roleTag = isCustomer ? "[Khách hàng]" : (isMua ? "[Chuyên viên MUA]" : "[Khách hàng]");
            String cleanReason = req.getReason().trim();
            String formattedReason = cleanReason.startsWith("[") ? cleanReason : (roleTag + ": " + cleanReason);

            booking.setEmergencyReason(formattedReason);
            booking.setEmergencyReportedAt(OffsetDateTime.now());
            if (StringUtils.hasText(req.getEmergencyProofUrl())) {
                String incomingProof = req.getEmergencyProofUrl().trim();
                String formattedProof = incomingProof.startsWith("[") ? incomingProof : (roleTag + ":" + incomingProof);
                booking.setEmergencyProofUrl(formattedProof);
            }
            booking.setCancellationReason(formattedReason);
        }

        // Reset emergency reassignment flags if booking is cancelled, completed, or paid out
        if (targetStatus == BookingStatus.CANCELLED || targetStatus == BookingStatus.COMPLETED
                || targetStatus == BookingStatus.CANCELLED_EXPIRED || targetStatus == BookingStatus.PAID_OUT) {
            booking.setNeedsEmergencyReassignment(false);
            booking.setEmergencyReason(null);
        }

        try {
            // 4. Update status & save entity
            booking.setStatus(targetStatus);
            BookingEntity savedBooking = bookingRepository.save(booking);

            // 5. Release MUA busy status upon completion, cancellation, or dispute
            if (targetStatus == BookingStatus.COMPLETED || targetStatus == BookingStatus.CANCELLED || targetStatus == BookingStatus.DISPUTED) {
                if (savedBooking.getMua() != null) {
                    MuaProfileEntity mua = savedBooking.getMua();
                    mua.setIsBusy(false);
                    if (Boolean.TRUE.equals(mua.getIsOnline())) {
                        mua.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
                    } else {
                        mua.setAvailabilityStatus(AvailabilityStatus.OFFLINE);
                    }
                    muaProfileRepository.save(mua);
                    log.info("[StateMachine] Released busy status for MUA id={} after bookingId={} reached {}",
                            mua.getId(), bookingId, targetStatus);
                }
            }

            // 5a. Khi hoàn tất ca làm (COMPLETED), giải phóng hold ký quỹ
            if (targetStatus == BookingStatus.COMPLETED) {
                walletHoldRepository.findActiveHoldByBookingId(savedBooking.getId()).ifPresent(hold -> {
                    hold.setStatus("CONSUMED");
                    hold.setReleasedAt(OffsetDateTime.now());
                    walletHoldRepository.save(hold);
                    log.info("[StateMachine] Released wallet hold {} for completed booking {}", hold.getId(), savedBooking.getId());
                });
            }

            // 5b. Release calendar slot upon cancellation
            if (targetStatus == BookingStatus.CANCELLED || targetStatus == BookingStatus.DISPUTED) {
                try {
                    muaCalendarService.releaseSlotByBookingId(savedBooking.getId());
                    log.info("[StateMachine] Released calendar slots for bookingId={} upon reaching status {}",
                            bookingId, targetStatus);
                } catch (Exception ex) {
                    log.warn("[StateMachine] Failed to release calendar slots for bookingId={}: {}", bookingId, ex.getMessage());
                }
            }

            // 6. Log audit trail in the same transaction
            String note = req.getReason() != null ? req.getReason() : "Chuyển trạng thái sang " + targetStatus.name();
            bookingAuditService.logTransition(savedBooking, currentStatus, targetStatus, userId, note);

            // 7. Publish in-memory event
            eventPublisher.publishEvent(new BookingStateChangedEvent(
                    this,
                    savedBooking.getId(),
                    savedBooking.getBookingCode(),
                    currentStatus,
                    targetStatus,
                    userId
            ));

            // 7b. Create database notification and broadcast to Admin if DISPUTED
            if (targetStatus == BookingStatus.DISPUTED) {
                try {
                    notificationService.createDisputeNotification(savedBooking);
                    log.info("[StateMachine] Dispatched dispute notification to Admin for bookingId={}", bookingId);
                } catch (Exception ex) {
                    log.error("[StateMachine] Failed to create and broadcast dispute notification: {}", ex.getMessage());
                }
            }

            log.info("[StateMachine] Successfully transitioned bookingId={} from {} to {} by userId={}",
                    bookingId, currentStatus, targetStatus, userId);

            return bookingMapper.toTransitionRes(savedBooking, currentStatus, userId);

        } catch (ObjectOptimisticLockingFailureException e) {
            log.error("[StateMachine] Optimistic lock conflict for bookingId={}", bookingId, e);
            throw new CustomBusinessException(ErrorCodes.ERR_OPTIMISTIC_LOCK_CONFLICT,
                    "booking.optimistic_lock_conflict", HttpStatus.CONFLICT);
        }
    }

    private boolean isValidTransition(BookingStatus from, BookingStatus to) {
        if (from == null || to == null) {
            return false;
        }

        return switch (from) {
            case PENDING_DEPOSIT -> to == BookingStatus.CANCELLED
                    || to == BookingStatus.REQUESTED
                    || to == BookingStatus.PENDING_AGENCY_DISPATCH;
            case REQUESTED -> to == BookingStatus.ACCEPTED
                    || to == BookingStatus.PENDING_AGENCY_DISPATCH
                    || to == BookingStatus.CANCELLED;
            case PENDING_AGENCY_DISPATCH -> to == BookingStatus.AGENCY_ASSIGNED
                    || to == BookingStatus.CANCELLED;
            case AGENCY_ASSIGNED -> to == BookingStatus.ACCEPTED
                    || to == BookingStatus.PENDING_AGENCY_DISPATCH
                    || to == BookingStatus.CANCELLED;
            case ACCEPTED -> to == BookingStatus.ON_THE_WAY
                    || to == BookingStatus.CANCELLED
                    || to == BookingStatus.DISPUTED;
            case ON_THE_WAY -> to == BookingStatus.ARRIVED
                    || to == BookingStatus.CANCELLED
                    || to == BookingStatus.DISPUTED;
            case ARRIVED -> to == BookingStatus.IN_PROGRESS
                    || to == BookingStatus.DISPUTED;
            case IN_PROGRESS -> to == BookingStatus.COMPLETED
                    || to == BookingStatus.DISPUTED;
            case COMPLETED -> to == BookingStatus.PAID_OUT
                    || to == BookingStatus.DISPUTED;
            case DISPUTED -> to == BookingStatus.PAID_OUT
                    || to == BookingStatus.CANCELLED;
            default -> false;
        };
    }

    private void validateActorAuthorization(BookingEntity booking, UserEntity user, BookingStatus toStatus) {
        String role = user.getRole() != null ? user.getRole().getName() : "";
        Long userId = user.getId();

        // SUPER_ADMIN has full authority
        if ("ROLE_SUPER_ADMIN".equals(role)) {
            return;
        }

        boolean isCustomer = booking.getCustomer() != null && booking.getCustomer().getId().equals(userId);
        boolean isAssignedMua = booking.getMua() != null && booking.getMua().getUser() != null
                && booking.getMua().getUser().getId().equals(userId);
        boolean isAgencyOwner = booking.getAgency() != null && booking.getAgency().getOwner() != null
                && booking.getAgency().getOwner().getId().equals(userId);

        switch (toStatus) {
            case ACCEPTED:
                if (booking.getStatus() == BookingStatus.AGENCY_ASSIGNED) {
                    if (!isAssignedMua) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                } else if (booking.getStatus() == BookingStatus.REQUESTED) {
                    if (!"ROLE_FREELANCE_MUA".equals(role) && !"ROLE_AGENCY_STAFF".equals(role)) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                }
                break;

            case ON_THE_WAY:
            case ARRIVED:
            case IN_PROGRESS:
            case COMPLETED:
                if (!isAssignedMua) {
                    throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                            "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                }
                break;

            case PENDING_AGENCY_DISPATCH:
                if (booking.getStatus() == BookingStatus.AGENCY_ASSIGNED) {
                    if (!isAssignedMua) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                } else if (booking.getStatus() == BookingStatus.REQUESTED) {
                    if (!isCustomer) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                }
                break;

            case AGENCY_ASSIGNED:
                if (!isAgencyOwner) {
                    throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                            "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                }
                break;

            case CANCELLED:
                if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT) {
                    if (!isCustomer && !isAgencyOwner) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                } else if (booking.getStatus() == BookingStatus.REQUESTED) {
                    if (!isCustomer) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                } else if (booking.getStatus() == BookingStatus.PENDING_AGENCY_DISPATCH
                        || booking.getStatus() == BookingStatus.AGENCY_ASSIGNED) {
                    if (!isCustomer && !isAgencyOwner) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                } else if (booking.getStatus() == BookingStatus.ACCEPTED
                        || booking.getStatus() == BookingStatus.ON_THE_WAY) {
                    if (!isCustomer && !isAssignedMua && !isAgencyOwner) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                } else {
                    throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                            "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                }
                break;

            case DISPUTED:
                if (!isCustomer && !isAssignedMua) {
                    throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                            "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                }
                break;

            case PAID_OUT:
                if (!isAssignedMua) {
                    throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                            "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                }
                break;

            default:
                throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                        "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }
    }

    @Override
    @Transactional
    public BookingCompletionPhotoRes uploadCompletionPhoto(Long bookingId, Long userId, MultipartFile file) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        // Authorization check: only assigned MUA or SUPER_ADMIN
        boolean isSuperAdmin = user.getRole() != null && "ROLE_SUPER_ADMIN".equals(user.getRole().getName());
        boolean isAssignedMua = booking.getMua() != null && booking.getMua().getUser() != null
                && booking.getMua().getUser().getId().equals(userId);

        if (!isSuperAdmin && !isAssignedMua) {
            log.warn("[StateMachine] Unauthorized completion photo upload attempt for bookingId={} by userId={}",
                    bookingId, userId);
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }

        if (booking.getStatus() != BookingStatus.IN_PROGRESS) {
            log.warn("[StateMachine] Cannot upload completion photo for bookingId={} because current status is {} (must be IN_PROGRESS)",
                    bookingId, booking.getStatus());
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.completion_photo_only_in_progress", HttpStatus.BAD_REQUEST);
        }

        // Validate image file (size, format, magic bytes)
        FileValidationUtils.validateImageFile(file, MediaConstants.MAX_MAIN_IMAGE_SIZE);

        // Upload to Cloudinary under folder bookings/{bookingId}/completion
        CloudMediaUploadResult uploadResult = mediaStorageService.uploadImage(file, "bookings/" + bookingId + "/completion");

        // Update booking entity with Cloudinary secure URL
        booking.setCompletionPhotoUrl(uploadResult.getImageUrl());
        BookingEntity savedBooking = bookingRepository.save(booking);

        log.info("[StateMachine] Successfully uploaded completion photo to Cloudinary for bookingId={}, publicId={}",
                bookingId, uploadResult.getPublicId());

        return bookingMapper.toCompletionPhotoRes(savedBooking, uploadResult.getThumbnailUrl(), uploadResult.getPublicId());
    }

    @Override
    @Transactional
    public BookingCompletionPhotoRes uploadDisputeProof(Long bookingId, Long userId, MultipartFile file) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        // Authorization check: only assigned MUA, customer, or SUPER_ADMIN
        boolean isSuperAdmin = user.getRole() != null && "ROLE_SUPER_ADMIN".equals(user.getRole().getName());
        boolean isAssignedMua = booking.getMua() != null && booking.getMua().getUser() != null
                && booking.getMua().getUser().getId().equals(userId);
        boolean isCustomer = booking.getCustomer() != null && booking.getCustomer().getId().equals(userId);

        if (!isSuperAdmin && !isAssignedMua && !isCustomer) {
            log.warn("[StateMachine] Unauthorized dispute proof upload attempt for bookingId={} by userId={}",
                    bookingId, userId);
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }

        // Validate image file (size, format, magic bytes)
        FileValidationUtils.validateImageFile(file, MediaConstants.MAX_MAIN_IMAGE_SIZE);

        // Upload to Cloudinary under folder bookings/{bookingId}/dispute-proof
        CloudMediaUploadResult uploadResult = mediaStorageService.uploadImage(file, "bookings/" + bookingId + "/dispute-proof");

        // Save URL with role-tag to booking emergencyProofUrl without overwriting existing other-party proofs
        String roleTag = isCustomer ? "[Khách hàng]" : "[Chuyên viên MUA]";
        String formattedProof = roleTag + ":" + uploadResult.getImageUrl();
        String currentProofs = booking.getEmergencyProofUrl();
        if (StringUtils.hasText(currentProofs)) {
            if (!currentProofs.contains(uploadResult.getImageUrl())) {
                booking.setEmergencyProofUrl(currentProofs.trim() + " | " + formattedProof);
            }
        } else {
            booking.setEmergencyProofUrl(formattedProof);
        }
        BookingEntity savedBooking = bookingRepository.save(booking);

        log.info("[StateMachine] Successfully uploaded dispute proof to Cloudinary for bookingId={}, publicId={}",
                bookingId, uploadResult.getPublicId());

        return BookingCompletionPhotoRes.builder()
                .bookingId(savedBooking.getId())
                .bookingCode(savedBooking.getBookingCode())
                .completionPhotoUrl(uploadResult.getImageUrl())
                .thumbnailUrl(uploadResult.getThumbnailUrl())
                .publicId(uploadResult.getPublicId())
                .uploadedAt(LocalDateTime.now())
                .build();
    }

    private BigDecimal getFreelancerCommissionRate() {
        try {
            if (stringRedisTemplate != null) {
                String val = stringRedisTemplate.opsForValue().get("settings:freelancer_commission_rate");
                if (val != null) {
                    return new BigDecimal(val);
                }
            }
        } catch (Exception ignored) {}
        return new BigDecimal("0.20"); // Mặc định 20%
    }

    @Override
    @Transactional
    public BookingStatusDetailRes getBookingStatusDetail(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        // Self-healing: nếu đơn đang COMPLETED nhưng đã có biên lai tiền mặt BOTH_CONFIRMED, tự động chuyển sang PAID_OUT
        if (booking.getStatus() == BookingStatus.COMPLETED) {
            boolean isCashBothConfirmed = cashReceiptRepository.findByBookingId(bookingId)
                    .map(r -> "BOTH_CONFIRMED".equals(r.getStatus()) || (r.getCustomerConfirmedAt() != null && r.getFreelancerConfirmedAt() != null))
                    .orElse(false);
            if (isCashBothConfirmed) {
                booking.setStatus(BookingStatus.PAID_OUT);
                booking = bookingRepository.save(booking);
                log.info("[SelfHealing] Booking {} upgraded from COMPLETED to PAID_OUT based on cash confirmation", bookingId);
            }
        }

        String muaName = null;
        String muaPhone = null;
        String muaAvatar = null;
        BigDecimal rating = null;
        Long muaId = null;

        if (booking.getMua() != null) {
            muaId = booking.getMua().getId();
            rating = booking.getMua().getRatingAvg();
            if (booking.getMua().getUser() != null) {
                muaName = booking.getMua().getUser().getFullName();
                muaPhone = booking.getMua().getUser().getPhoneNumber();
                muaAvatar = booking.getMua().getUser().getAvatarUrl();
            }
        }

        BigDecimal serviceSubtotal = booking.getServiceSubtotal() != null ? booking.getServiceSubtotal() : BigDecimal.ZERO;
        BigDecimal surchargeFee = booking.getSurchargeFee() != null ? booking.getSurchargeFee() : BigDecimal.ZERO;
        BigDecimal distanceFee = booking.getDistanceFee() != null ? booking.getDistanceFee() : BigDecimal.ZERO;
        BigDecimal totalAmount = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
        if (bookingDepositRepository != null) {
            Optional<BookingDepositEntity> depositOpt = bookingDepositRepository.findByBookingId(bookingId);
            if (depositOpt.isPresent()) {
                BookingDepositEntity dep = depositOpt.get();
                if (dep.getPaidAmount() != null && dep.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                    depositAmount = dep.getPaidAmount();
                } else if (dep.getRequiredAmount() != null && dep.getRequiredAmount().compareTo(BigDecimal.ZERO) > 0) {
                    depositAmount = dep.getRequiredAmount();
                }
            }
        }

        BigDecimal commissionRate = getFreelancerCommissionRate();
        BigDecimal platformFee = totalAmount.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal earningsAmount = totalAmount.subtract(platformFee);

        boolean isDepositPaid = isDepositPaidInternal(booking);
        Integer depositTimeoutSeconds = null;
        if (!isDepositPaid && booking.getStatus() == BookingStatus.ACCEPTED) {
            if (booking.getDepositExpiredAt() != null) {
                long remaining = Duration.between(OffsetDateTime.now(), booking.getDepositExpiredAt()).getSeconds();
                depositTimeoutSeconds = (int) Math.max(0, remaining);
            } else {
                depositTimeoutSeconds = 0;
            }
        }

        String styleName = null;
        if (booking.getStyle() != null) {
            styleName = booking.getStyle().getStyleName();
        }

        List<String> packageItems = new ArrayList<>();
        List<String> componentItems = new ArrayList<>();
        List<PackageItemRes> availableAddons = new ArrayList<>();
        Long packageId = null;
        Integer estimatedDuration = 60;
        if (booking.getServicePackage() != null) {
            packageId = booking.getServicePackage().getId();
            if (booking.getServicePackage().getEstimatedDurationMinutes() != null) {
                estimatedDuration = booking.getServicePackage().getEstimatedDurationMinutes();
            }
            if (booking.getServicePackage().getPackageItems() != null) {
                for (var item : booking.getServicePackage().getPackageItems()) {
                    if (item != null && item.getItemName() != null) {
                        if (item.getItemType() == PackageItemType.ADD_ON) {
                            availableAddons.add(PackageItemRes.builder()
                                    .id(item.getId())
                                    .itemType(item.getItemType())
                                    .itemName(item.getItemName())
                                    .stepOrder(item.getStepOrder())
                                    .itemPrice(item.getItemPrice())
                                    .durationMinutes(item.getDurationMinutes())
                                    .isRequired(item.getIsRequired())
                                    .isActive(item.getIsActive())
                                    .build());
                        } else {
                            componentItems.add(item.getItemName());
                            packageItems.add(item.getItemName());
                        }
                    }
                }
            }
        }

        // Tách riêng các dịch vụ add-on mà khách ĐÃ CHỌN THÊM (từ booking.selectedAddons hoặc Redis)
        List<String> addonItems = new ArrayList<>();
        String selectedAddons = booking.getSelectedAddons();
        if (!StringUtils.hasText(selectedAddons) && stringRedisTemplate != null) {
            try {
                selectedAddons = stringRedisTemplate.opsForValue().get("booking:selected_addons:" + booking.getId());
            } catch (Exception ignored) {}
        }
        if (StringUtils.hasText(selectedAddons)) {
            String[] parts = selectedAddons.split(",,,");
            for (String part : parts) {
                if (StringUtils.hasText(part)) {
                    addonItems.add(part.trim());
                    packageItems.add(part.trim());
                }
            }
        }

        Integer inProgressElapsedSeconds = null;
        if (booking.getStatus() == BookingStatus.IN_PROGRESS) {
            LocalDateTime startedAt = booking.getUpdatedAt() != null ? booking.getUpdatedAt() : booking.getCreatedAt();
            if (startedAt != null) {
                long elapsed = Duration.between(startedAt, LocalDateTime.now()).getSeconds();
                inProgressElapsedSeconds = (int) Math.max(0, elapsed);
            } else {
                inProgressElapsedSeconds = 0;
            }
        }

        Integer confirmTimeoutSeconds = null;
        if (booking.getStatus() == BookingStatus.REQUESTED && booking.getConfirmDeadline() != null) {
            long remaining = Duration.between(OffsetDateTime.now(VIETNAM_OFFSET), booking.getConfirmDeadline()).getSeconds();
            confirmTimeoutSeconds = (int) Math.max(0, remaining);
        }

        boolean isCancelRequested = false;
        String cancelRequestedReason = null;
        if (stringRedisTemplate != null && Boolean.TRUE.equals(stringRedisTemplate.hasKey("booking:cancel_request:" + booking.getId()))) {
            isCancelRequested = true;
            cancelRequestedReason = stringRedisTemplate.opsForValue().get("booking:cancel_request:" + booking.getId());
        }

        List<CandidatePackageRes> availablePackages = new ArrayList<>();
        if (booking.getMua() != null) {
            Integer catId = null;
            if (booking.getServicePackage() != null && booking.getServicePackage().getMasterCategory() != null) {
                catId = booking.getServicePackage().getMasterCategory().getId();
            }
            Integer stId = booking.getStyle() != null ? booking.getStyle().getId().intValue() : null;
            List<ServicePackageEntity> candidates = List.of();
            if (catId != null) {
                candidates = servicePackageRepository.findCandidatePackagesForMua(booking.getMua().getId(), catId, stId);
                if ((candidates == null || candidates.isEmpty()) && stId != null) {
                    candidates = servicePackageRepository.findCandidatePackagesForMua(booking.getMua().getId(), catId, null);
                }
            }
            if (candidates == null || candidates.isEmpty()) {
                candidates = servicePackageRepository.findByMuaIdAndIsAvailableTrue(booking.getMua().getId());
            }
            if (candidates != null) {
                for (ServicePackageEntity p : candidates) {
                    List<PackageItemRes> pAddons = new ArrayList<>();
                    List<String> pItems = new ArrayList<>();
                    if (p.getPackageItems() != null) {
                        for (var it : p.getPackageItems()) {
                            if (it != null && it.getItemName() != null) {
                                if (it.getItemType() == com.makeup.platform.entity.catalog.PackageItemType.ADD_ON) {
                                    pAddons.add(PackageItemRes.builder()
                                            .id(it.getId())
                                            .itemType(it.getItemType())
                                            .itemName(it.getItemName())
                                            .stepOrder(it.getStepOrder())
                                            .itemPrice(it.getItemPrice())
                                            .durationMinutes(it.getDurationMinutes())
                                            .isRequired(it.getIsRequired())
                                            .isActive(it.getIsActive())
                                            .build());
                                } else {
                                    pItems.add(it.getItemName());
                                }
                            }
                        }
                    }
                    availablePackages.add(CandidatePackageRes.builder()
                            .id(p.getId())
                            .packageName(p.getPackageName())
                            .description(p.getDescription())
                            .price(p.getPrice())
                            .estimatedDurationMinutes(p.getEstimatedDurationMinutes())
                            .items(pItems)
                            .availableAddons(pAddons)
                            .build());
                }
            }
        }

        boolean isDirectBooking = false;
        if (stringRedisTemplate != null) {
            String targetMua = stringRedisTemplate.opsForValue().get(InstantBookingKeys.meta(booking.getId()) + ":target_mua");
            String targetPkg = stringRedisTemplate.opsForValue().get(InstantBookingKeys.meta(booking.getId()) + ":target_package");
            if ((targetMua != null && !targetMua.isEmpty()) || (targetPkg != null && !targetPkg.isEmpty())) {
                isDirectBooking = true;
            }
        }

        return BookingStatusDetailRes.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .status(booking.getStatus().name())
                .destinationAddress(booking.getDestinationAddress())
                .destinationLatitude(booking.getDestinationLatitude())
                .destinationLongitude(booking.getDestinationLongitude())
                .muaId(muaId)
                .muaName(muaName)
                .muaPhone(muaPhone)
                .muaAvatar(muaAvatar)
                .customerName(booking.getCustomer() != null ? booking.getCustomer().getFullName() : null)
                .customerPhone(booking.getCustomer() != null ? booking.getCustomer().getPhoneNumber() : null)
                .customerAvatar(booking.getCustomer() != null ? booking.getCustomer().getAvatarUrl() : null)
                .packageId(packageId)
                .packageName(booking.getServicePackage() != null ? booking.getServicePackage().getPackageName() : "Trang Điểm Khẩn Cấp")
                .styleName(styleName)
                .bookingType(booking.getBookingType() != null ? booking.getBookingType().name() : null)
                .bookingDate(booking.getBookingDate())
                .startTime(booking.getStartTime())
                .estimatedDurationMinutes(estimatedDuration)
                .packageItems(packageItems)
                .componentItems(componentItems)
                .addonItems(addonItems)
                .availableAddons(availableAddons)
                .availablePackages(availablePackages)
                .isDirectBooking(isDirectBooking)
                .rating(rating)
                .serviceSubtotal(serviceSubtotal)
                .surchargeFee(surchargeFee)
                .distanceFee(distanceFee)
                .totalAmount(totalAmount)
                .depositAmount(depositAmount)
                .platformFee(platformFee)
                .earningsAmount(earningsAmount)
                .completionPhotoUrl(booking.getCompletionPhotoUrl())
                .emergencyProofUrl(booking.getEmergencyProofUrl())
                .emergencyReason(booking.getEmergencyReason())
                .emergencyReportedAt(booking.getEmergencyReportedAt())
                .cancellationReason(booking.getCancellationReason())
                .disputeOrigin(resolveDisputeOrigin(booking.getEmergencyReason(), booking.getCancellationReason()))
                .isDepositPaid(isDepositPaid)
                .depositTimeoutSeconds(depositTimeoutSeconds)
                .confirmDeadline(booking.getConfirmDeadline())
                .confirmTimeoutSeconds(confirmTimeoutSeconds)
                .inProgressElapsedSeconds(inProgressElapsedSeconds)
                .isCancelRequested(isCancelRequested)
                .cancelRequestedReason(cancelRequestedReason)
                .updatedAt(booking.getUpdatedAt() != null ? booking.getUpdatedAt() : booking.getCreatedAt())
                .build();
    }

    private String resolveDisputeOrigin(String emergencyReason, String cancellationReason) {
        String rawReason = emergencyReason != null ? emergencyReason : cancellationReason;
        if (rawReason == null) return "CUSTOMER";
        String lower = rawReason.toLowerCase();
        boolean hasCustomerTag = rawReason.contains("[Khách hàng]");
        boolean hasMuaTag = rawReason.contains("[Chuyên viên MUA]");
        if (hasCustomerTag && hasMuaTag) {
            return "DUAL";
        }
        if (hasCustomerTag) {
            return "CUSTOMER";
        }
        if (hasMuaTag) {
            return "MUA";
        }
        if (lower.contains("vắng mặt") || lower.contains("no-show") || lower.contains("không gặp khách") || lower.contains("khách không có mặt")) {
            return "MUA";
        }
        return "CUSTOMER";
    }

    private boolean isDepositPaidInternal(BookingEntity booking) {
        if (booking.getStatus() == BookingStatus.ON_THE_WAY
                || booking.getStatus() == BookingStatus.ARRIVED
                || booking.getStatus() == BookingStatus.IN_PROGRESS
                || booking.getStatus() == BookingStatus.COMPLETED
                || booking.getStatus() == BookingStatus.PAID_OUT) {
            return true;
        }
        if (bookingDepositRepository != null) {
            var depositOpt = bookingDepositRepository.findByBookingId(booking.getId());
            if (depositOpt.isPresent()) {
                String depositStatus = depositOpt.get().getStatus();
                return "PAID".equals(depositStatus) || "REFUNDED".equals(depositStatus);
            }
        }
        if (stringRedisTemplate != null && Boolean.TRUE.equals(stringRedisTemplate.hasKey("booking:deposit_paid:" + booking.getId()))) {
            return true;
        }
        return false;
    }

    @Override
    @Transactional
    public void refundDepositToCustomer(BookingEntity booking, String reason) {
        if (booking == null || booking.getCustomer() == null) {
            return;
        }
        Long bookingId = booking.getId();
        Long customerId = booking.getCustomer().getId();
        String refundIdempotencyKey = "refund:booking:" + bookingId;

        if (ledgerEntryRepository.existsByIdempotencyKey(refundIdempotencyKey)) {
            log.warn("[RefundDeposit] Booking ID {} already has refund ledger entry (key={}). Skipping duplicate refund.",
                    bookingId, refundIdempotencyKey);
            return;
        }

        if (bookingDepositRepository != null) {
            var depCheckOpt = bookingDepositRepository.findByBookingId(bookingId);
            if (depCheckOpt.isPresent() && "REFUNDED".equalsIgnoreCase(depCheckOpt.get().getStatus())) {
                log.warn("[RefundDeposit] Booking ID {} deposit is already marked as REFUNDED. Skipping duplicate refund.",
                        bookingId);
                return;
            }
        }

        // 2. KHÓA DÒNG VÍ KHÁCH HÀNG ĐỂ CHỐNG RACE CONDITION
        WalletEntity customerWallet = walletRepository.findByUserIdWithLock(customerId)
                .orElseGet(() -> {
                    WalletEntity newWallet = WalletEntity.builder()
                            .user(booking.getCustomer())
                            .availableBalance(BigDecimal.ZERO)
                            .frozenBalance(BigDecimal.ZERO)
                            .currency("VND")
                            .build();
                    return walletRepository.save(newWallet);
                });

        Optional<WalletHoldEntity> holdOpt = walletHoldRepository.findActiveHoldByBookingId(bookingId);
        BigDecimal refundAmount = BigDecimal.ZERO;

        if (holdOpt.isPresent()) {
            WalletHoldEntity hold = holdOpt.get();
            refundAmount = hold.getAmount();
            hold.setStatus("REFUNDED");
            hold.setReleasedAt(OffsetDateTime.now());
            walletHoldRepository.save(hold);
        }

        // Fallback tra cứu số tiền cọc nếu holdOpt không tìm thấy
        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            if (bookingDepositRepository != null) {
                var depOpt = bookingDepositRepository.findByBookingId(bookingId);
                if (depOpt.isPresent()) {
                    if (depOpt.get().getPaidAmount() != null && depOpt.get().getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                        refundAmount = depOpt.get().getPaidAmount();
                    } else if (depOpt.get().getRequiredAmount() != null) {
                        refundAmount = depOpt.get().getRequiredAmount();
                    }
                }
            }
            if ((refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) && booking.getDepositAmount() != null) {
                refundAmount = booking.getDepositAmount();
            }
        }

        // Đảm bảo tất cả các holds của booking chuyển sang REFUNDED
        List<WalletHoldEntity> allHolds = walletHoldRepository.findByBookingIdOrderByIdDesc(bookingId);
        for (WalletHoldEntity h : allHolds) {
            if ("ACTIVE".equalsIgnoreCase(h.getStatus())) {
                h.setStatus("REFUNDED");
                h.setReleasedAt(OffsetDateTime.now());
                walletHoldRepository.save(h);
            }
        }

        if (refundAmount != null && refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal currentFrozen = customerWallet.getFrozenBalance() != null ? customerWallet.getFrozenBalance() : BigDecimal.ZERO;
            customerWallet.setFrozenBalance(currentFrozen.subtract(refundAmount).max(BigDecimal.ZERO));

            BigDecimal currentBalance = customerWallet.getAvailableBalance() != null ? customerWallet.getAvailableBalance() : BigDecimal.ZERO;
            BigDecimal newBalance = currentBalance.add(refundAmount);
            customerWallet.setAvailableBalance(newBalance);
            walletRepository.save(customerWallet);

            String desc = (reason != null && !reason.isBlank())
                    ? "Hoàn tiền cọc #" + booking.getBookingCode() + ": " + reason
                    : "Hoàn 100% tiền cọc booking #" + booking.getBookingCode();

            LedgerEntryEntity ledgerEntry = LedgerEntryEntity.builder()
                    .referenceType("BOOKING_REFUND")
                    .referenceId(bookingId)
                    .wallet(customerWallet)
                    .entryType("CREDIT")
                    .amount(refundAmount)
                    .balanceAfter(newBalance)
                    .description(desc)
                    .idempotencyKey(refundIdempotencyKey)
                    .build();
            ledgerEntryRepository.save(ledgerEntry);

            if (bookingDepositRepository != null) {
                var depositOpt = bookingDepositRepository.findByBookingId(bookingId);
                if (depositOpt.isPresent()) {
                    BookingDepositEntity deposit = depositOpt.get();
                    deposit.setStatus("REFUNDED");
                    bookingDepositRepository.save(deposit);
                }
            }

            try {
                if (stringRedisTemplate != null) {
                    stringRedisTemplate.delete("booking:deposit_paid:" + bookingId);
                }
            } catch (Exception ex) {
                log.warn("[StateMachine] Failed to delete redis key booking:deposit_paid:{}: {}", bookingId, ex.getMessage());
            }

            try {
                if (messagingTemplate != null) {
                    Map<String, Object> refundPayload = new HashMap<>();
                    refundPayload.put("type", "CUSTOMER_DEPOSIT_REFUNDED");
                    refundPayload.put("bookingId", bookingId);
                    refundPayload.put("bookingCode", booking.getBookingCode());
                    refundPayload.put("refundAmount", refundAmount);
                    refundPayload.put("newBalance", newBalance);
                    refundPayload.put("reason", reason);
                    refundPayload.put("message", "Khoản tiền cọc đã được hoàn về Ví của bạn.");
                    refundPayload.put("timestamp", System.currentTimeMillis());

                    messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, refundPayload);
                    messagingTemplate.convertAndSend("/topic/customer-wallet/" + customerId, refundPayload);
                    messagingTemplate.convertAndSend("/topic/customer-bookings/" + customerId, refundPayload);
                    log.info("[StateMachine] Successfully refunded {} VND to customer {} for cancelled bookingId {}",
                            refundAmount, customerId, bookingId);
                }
            } catch (Exception ex) {
                log.error("[StateMachine] Failed to broadcast refund notification via WebSocket: {}", ex.getMessage());
            }
        }
    }

    private void compensateDepositToMua(BookingEntity booking, String reason) {
        if (booking.getMua() == null || booking.getMua().getUser() == null) {
            log.warn("[CompensateDeposit] Booking ID {} has no assigned MUA, skipping MUA compensation", booking.getId());
            return;
        }

        Long muaUserId = booking.getMua().getUser().getId();
        BigDecimal compensationAmount = BigDecimal.ZERO;
        Optional<BookingDepositEntity> depositOpt = bookingDepositRepository != null
                ? bookingDepositRepository.findByBookingId(booking.getId())
                : Optional.empty();

        if (depositOpt.isPresent()) {
            BookingDepositEntity deposit = depositOpt.get();
            compensationAmount = deposit.getPaidAmount() != null ? deposit.getPaidAmount() : deposit.getRequiredAmount();
            deposit.setStatus("COMPENSATED_TO_MUA");
            bookingDepositRepository.save(deposit);
        } else if (booking.getDepositAmount() != null) {
            compensationAmount = booking.getDepositAmount();
        }

        if (walletHoldRepository != null) {
            List<WalletHoldEntity> allHolds = walletHoldRepository.findByBookingIdOrderByIdDesc(booking.getId());
            for (WalletHoldEntity h : allHolds) {
                if ("ACTIVE".equalsIgnoreCase(h.getStatus())) {
                    h.setStatus("CONSUMED");
                    h.setReleasedAt(OffsetDateTime.now());
                    walletHoldRepository.save(h);
                }
            }
        }

        // Giải phóng frozenBalance của khách hàng (vì khoản cọc này đã chuyển thành tiền bồi thường cho thợ)
        final BigDecimal finalCompAmount = compensationAmount;
        if (booking.getCustomer() != null && finalCompAmount != null && finalCompAmount.compareTo(BigDecimal.ZERO) > 0) {
            walletRepository.findByUserIdWithLock(booking.getCustomer().getId()).ifPresent(cw -> {
                BigDecimal currentFrozen = cw.getFrozenBalance() != null ? cw.getFrozenBalance() : BigDecimal.ZERO;
                cw.setFrozenBalance(currentFrozen.subtract(finalCompAmount).max(BigDecimal.ZERO));
                walletRepository.save(cw);
            });
        }

        if (compensationAmount != null && compensationAmount.compareTo(BigDecimal.ZERO) > 0) {
            WalletEntity muaWallet = walletRepository.findByUserIdWithLock(muaUserId)
                    .orElseGet(() -> {
                        WalletEntity newWallet = WalletEntity.builder()
                                .user(booking.getMua().getUser())
                                .availableBalance(BigDecimal.ZERO)
                                .frozenBalance(BigDecimal.ZERO)
                                .currency("VND")
                                .build();
                        return walletRepository.save(newWallet);
                    });

            BigDecimal currentBalance = muaWallet.getAvailableBalance() != null ? muaWallet.getAvailableBalance() : BigDecimal.ZERO;
            BigDecimal newBalance = currentBalance.add(compensationAmount);
            muaWallet.setAvailableBalance(newBalance);
            walletRepository.save(muaWallet);

            String idempotencyKey = "compensation:booking:" + booking.getId();
            if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKey)) {
                LedgerEntryEntity ledgerEntry = LedgerEntryEntity.builder()
                        .referenceType("BOOKING_COMPENSATION")
                        .referenceId(booking.getId())
                        .wallet(muaWallet)
                        .entryType("CREDIT")
                        .amount(compensationAmount)
                        .balanceAfter(newBalance)
                        .description("Bồi thường 100% tiền cọc do khách hủy trong vòng 2 tiếng #" + booking.getBookingCode())
                        .idempotencyKey(idempotencyKey)
                        .build();
                ledgerEntryRepository.save(ledgerEntry);
            }

            try {
                if (stringRedisTemplate != null) {
                    stringRedisTemplate.delete("booking:deposit_paid:" + booking.getId());
                }
            } catch (Exception ex) {
                log.warn("[CompensateDeposit] Failed to delete redis key booking:deposit_paid:{}: {}", booking.getId(), ex.getMessage());
            }

            if (messagingTemplate != null) {
                try {
                    Map<String, Object> compPayload = new HashMap<>();
                    compPayload.put("type", "MUA_DEPOSIT_COMPENSATED");
                    compPayload.put("bookingId", booking.getId());
                    compPayload.put("bookingCode", booking.getBookingCode());
                    compPayload.put("compensationAmount", compensationAmount);
                    compPayload.put("newBalance", newBalance);
                    compPayload.put("reason", reason);
                    compPayload.put("message", "Khách hàng hủy sát giờ hẹn. Bạn nhận được bồi thường " + compensationAmount + " VND vào ví.");
                    compPayload.put("timestamp", System.currentTimeMillis());
                    messagingTemplate.convertAndSend("/topic/mua-wallet/" + muaUserId, compPayload);
                    messagingTemplate.convertAndSend("/topic/booking-status/" + booking.getId(), compPayload);
                    if (booking.getMua() != null) {
                        messagingTemplate.convertAndSend("/topic/mua-bookings/" + booking.getMua().getId(), compPayload);
                    }

                    if (booking.getCustomer() != null) {
                        Map<String, Object> custPayload = new HashMap<>();
                        custPayload.put("type", "CUSTOMER_CANCELLED_WITHIN_2H");
                        custPayload.put("bookingId", booking.getId());
                        custPayload.put("bookingCode", booking.getBookingCode());
                        custPayload.put("status", "CANCELLED");
                        custPayload.put("depositAmount", compensationAmount);
                        custPayload.put("message", "Đã hủy ca hẹn trong vòng 2 tiếng. Tiền cọc đã được chuyển bồi thường cho thợ make-up.");
                        custPayload.put("timestamp", System.currentTimeMillis());
                        messagingTemplate.convertAndSend("/topic/customer-bookings/" + booking.getCustomer().getId(), custPayload);
                        messagingTemplate.convertAndSend("/topic/customer-wallet/" + booking.getCustomer().getId(), custPayload);
                    }
                } catch (Exception ex) {
                    log.warn("[CompensateDeposit] Failed to broadcast STOMP notification: {}", ex.getMessage());
                }
            }
        }
    }

    @Override
    public void requestCancelTripByCustomer(Long bookingId, Long customerUserId, String reason) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }

        if (booking.getStatus() != BookingStatus.ON_THE_WAY && booking.getStatus() != BookingStatus.ARRIVED) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.cannot_request_cancel_in_current_status", HttpStatus.BAD_REQUEST);
        }

        String cancelReason = StringUtils.hasText(reason) ? reason.trim() : "Khách yêu cầu hủy khi thợ đang di chuyển";

        if (stringRedisTemplate != null) {
            stringRedisTemplate.opsForValue().set("booking:cancel_request:" + bookingId, cancelReason, 1, TimeUnit.HOURS);
        }

        if (messagingTemplate != null) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "CANCEL_REQUESTED");
            payload.put("bookingId", bookingId);
            payload.put("bookingCode", booking.getBookingCode());
            payload.put("customerName", booking.getCustomer().getFullName());
            payload.put("customerPhone", booking.getCustomer().getPhoneNumber());
            payload.put("reason", cancelReason);
            payload.put("depositAmount", booking.getDepositAmount());
            payload.put("isCancelRequested", true);
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, payload);
            messagingTemplate.convertAndSend("/topic/booking-cancel-requested/" + bookingId, payload);
        }

        log.info("[StateMachine] Customer {} requested cancellation for bookingId={} reason={}",
                customerUserId, bookingId, cancelReason);
    }

    @Override
    @Transactional
    public BookingStateTransitionRes confirmCancelCompensationByMua(Long bookingId, Long muaUserId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getMua() == null || booking.getMua().getUser() == null || !booking.getMua().getUser().getId().equals(muaUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }

        if (booking.getStatus() != BookingStatus.ON_THE_WAY && booking.getStatus() != BookingStatus.ARRIVED && booking.getStatus() != BookingStatus.ACCEPTED) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.invalid_transition", HttpStatus.BAD_REQUEST);
        }

        BookingStatus previousStatus = booking.getStatus();

        // 1. Lấy số tiền cọc 30% để bồi thường cho thợ
        BigDecimal compensationAmount = BigDecimal.ZERO;
        Optional<BookingDepositEntity> depositOpt = bookingDepositRepository != null
                ? bookingDepositRepository.findByBookingId(bookingId)
                : Optional.empty();

        if (depositOpt.isPresent()) {
            BookingDepositEntity deposit = depositOpt.get();
            compensationAmount = deposit.getPaidAmount() != null ? deposit.getPaidAmount() : deposit.getRequiredAmount();
            deposit.setStatus("COMPENSATED_TO_MUA");
            bookingDepositRepository.save(deposit);
        } else if (booking.getDepositAmount() != null) {
            compensationAmount = booking.getDepositAmount();
        }

        // 2. Chuyển tiền cọc vào Ví Thợ (MUA)
        if (compensationAmount != null && compensationAmount.compareTo(BigDecimal.ZERO) > 0) {
            WalletEntity muaWallet = walletRepository.findByUserIdWithLock(muaUserId)
                    .orElseGet(() -> {
                        WalletEntity newWallet = WalletEntity.builder()
                                .user(booking.getMua().getUser())
                                .availableBalance(BigDecimal.ZERO)
                                .frozenBalance(BigDecimal.ZERO)
                                .currency("VND")
                                .build();
                        return walletRepository.save(newWallet);
                    });

            BigDecimal currentBalance = muaWallet.getAvailableBalance() != null ? muaWallet.getAvailableBalance() : BigDecimal.ZERO;
            BigDecimal newBalance = currentBalance.add(compensationAmount);
            muaWallet.setAvailableBalance(newBalance);
            walletRepository.save(muaWallet);

            // Ghi sổ cái kế toán kép Ledger
            String idempotencyKey = "compensation:booking:" + bookingId;
            if (!ledgerEntryRepository.existsByIdempotencyKey(idempotencyKey)) {
                LedgerEntryEntity ledgerEntry = LedgerEntryEntity.builder()
                        .referenceType("BOOKING_COMPENSATION")
                        .referenceId(bookingId)
                        .wallet(muaWallet)
                        .entryType("CREDIT")
                        .amount(compensationAmount)
                        .balanceAfter(newBalance)
                        .description("Bồi thường 100% tiền cọc do khách hủy ca #" + booking.getBookingCode())
                        .idempotencyKey(idempotencyKey)
                        .build();
                ledgerEntryRepository.save(ledgerEntry);
            }

            // Giải phóng hold khách (nếu có hold từ ví khách)
            walletHoldRepository.findActiveHoldByBookingId(bookingId).ifPresent(hold -> {
                hold.setStatus("CONSUMED");
                hold.setReleasedAt(OffsetDateTime.now());
                walletHoldRepository.save(hold);
            });
        }

        // 3. Cập nhật trạng thái booking thành CANCELLED
        String cancelReason = "Khách hủy khi thợ đang di chuyển. Thợ đã xác nhận hủy và nhận bồi thường 100% cọc.";
        if (stringRedisTemplate != null && Boolean.TRUE.equals(stringRedisTemplate.hasKey("booking:cancel_request:" + bookingId))) {
            String clientReason = stringRedisTemplate.opsForValue().get("booking:cancel_request:" + bookingId);
            if (StringUtils.hasText(clientReason)) {
                cancelReason = clientReason + " (Thợ đã chấp nhận hủy & nhận bồi thường cọc)";
            }
            stringRedisTemplate.delete("booking:cancel_request:" + bookingId);
            stringRedisTemplate.delete("booking:deposit_paid:" + bookingId);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(cancelReason);
        BookingEntity savedBooking = bookingRepository.save(booking);

        // 4. Giải phóng lịch & trạng thái bận của thợ
        try {
            muaCalendarService.releaseSlotByBookingId(bookingId);
        } catch (Exception ex) {
            log.warn("[StateMachine] Failed to release slot for bookingId={}: {}", bookingId, ex.getMessage());
        }

        if (savedBooking.getMua() != null) {
            MuaProfileEntity mua = savedBooking.getMua();
            mua.setIsBusy(false);
            muaProfileRepository.save(mua);
        }

        // 5. Broadcast WebSocket STOMP
        if (messagingTemplate != null) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "CANCEL_COMPENSATED");
            payload.put("status", "CANCELLED");
            payload.put("currentStatus", "CANCELLED");
            payload.put("isCancelRequested", false);
            payload.put("bookingId", bookingId);
            payload.put("bookingCode", booking.getBookingCode());
            payload.put("compensationAmount", compensationAmount);
            payload.put("message", "Thợ đã xác nhận hủy. Đơn hàng kết thúc và tiền cọc đã bồi thường cho thợ.");
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, payload);
            messagingTemplate.convertAndSend("/topic/freelancer-wallet/" + muaUserId, payload);
        }

        log.info("[StateMachine] MUA {} confirmed cancel compensation for bookingId={}, compensatedAmount={}",
                muaUserId, bookingId, compensationAmount);

        return bookingMapper.toTransitionRes(savedBooking, previousStatus, muaUserId);
    }

    @Override
    public void rejectCancelCompensationByMua(Long bookingId, Long muaUserId, String reason) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getMua() == null || booking.getMua().getUser() == null || !booking.getMua().getUser().getId().equals(muaUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }

        if (stringRedisTemplate != null) {
            stringRedisTemplate.delete("booking:cancel_request:" + bookingId);
        }

        if (messagingTemplate != null) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "CANCEL_REQUEST_REJECTED");
            payload.put("bookingId", bookingId);
            payload.put("bookingCode", booking.getBookingCode());
            payload.put("message", "Chuyên viên đã từ chối yêu cầu hủy và đang tiếp tục di chuyển tới bạn.");
            payload.put("reason", reason);
            payload.put("isCancelRequested", false);
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, payload);
        }

        log.info("[StateMachine] MUA {} rejected cancel request for bookingId={}", muaUserId, bookingId);
    }
}

