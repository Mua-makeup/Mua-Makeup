package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.constants.MediaConstants;
import com.makeup.platform.common.utils.FileValidationUtils;
import com.makeup.platform.dto.request.booking.TransitionBookingStateReq;
import com.makeup.platform.dto.response.booking.BookingCompletionPhotoRes;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.dto.response.booking.BookingStatusDetailRes;
import com.makeup.platform.dto.response.media.CloudMediaUploadResult;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.booking.BookingStateMachineService;
import com.makeup.platform.service.media.MediaStorageService;
import com.makeup.platform.service.mua.MUACalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletHoldRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingStateMachineServiceImpl implements BookingStateMachineService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingAuditService bookingAuditService;
    private final BookingMapper bookingMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final MediaStorageService mediaStorageService;
    private final MUACalendarService muaCalendarService;
    private final StringRedisTemplate stringRedisTemplate;
    private final BookingDepositRepository bookingDepositRepository;
    private final WalletRepository walletRepository;
    private final WalletHoldRepository walletHoldRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final SimpMessagingTemplate messagingTemplate;

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

                // Đối với đơn SCHEDULED đã cọc: không được hủy trong vòng 2 tiếng
                if (booking.getBookingType() == BookingType.SCHEDULED && isDepositPaidInternal(booking)) {
                    LocalDateTime scheduledStart = booking.getScheduledStartTime();
                    if (scheduledStart != null) {
                        double hoursUntilBooking = Duration.between(LocalDateTime.now(), scheduledStart).toMinutes() / 60.0;
                        if (hoursUntilBooking < 2.0 && hoursUntilBooking >= 0) {
                            log.warn("[StateMachine] Customer id={} attempted to cancel bookingId={} within 2 hours (hours remaining: {})",
                                    userId, bookingId, hoursUntilBooking);
                            throw new CustomBusinessException(
                                    ErrorCodes.ERR_CANNOT_CANCEL_WITHIN_TWO_HOURS,
                                    "booking.cannot_cancel_within_two_hours",
                                    HttpStatus.BAD_REQUEST
                            );
                        }
                    }
                }
            } else {
                if (isDepositPaidInternal(booking)) {
                    refundDepositToCustomer(booking, req.getReason().trim());
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
            booking.setEmergencyReason(req.getReason().trim());
            booking.setEmergencyReportedAt(OffsetDateTime.now());
            if (StringUtils.hasText(req.getEmergencyProofUrl())) {
                booking.setEmergencyProofUrl(req.getEmergencyProofUrl().trim());
            }
            booking.setCancellationReason(req.getReason().trim());
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

            // 5b. Release calendar slot upon cancellation
            if (targetStatus == BookingStatus.CANCELLED) {
                try {
                    muaCalendarService.releaseSlotByBookingId(savedBooking.getId());
                    log.info("[StateMachine] Released calendar slots for bookingId={} upon cancellation", bookingId);
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
            case REQUESTED -> to == BookingStatus.ACCEPTED
                    || to == BookingStatus.PENDING_AGENCY_DISPATCH
                    || to == BookingStatus.CANCELLED;
            case PENDING_AGENCY_DISPATCH -> to == BookingStatus.AGENCY_ASSIGNED
                    || to == BookingStatus.CANCELLED;
            case AGENCY_ASSIGNED -> to == BookingStatus.ACCEPTED
                    || to == BookingStatus.PENDING_AGENCY_DISPATCH
                    || to == BookingStatus.CANCELLED;
            case ACCEPTED -> to == BookingStatus.ON_THE_WAY
                    || to == BookingStatus.CANCELLED;
            case ON_THE_WAY -> to == BookingStatus.ARRIVED
                    || to == BookingStatus.CANCELLED;
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
                if (booking.getStatus() == BookingStatus.REQUESTED) {
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
                throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                        "booking.unauthorized_transition", HttpStatus.FORBIDDEN);

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
    @Transactional(readOnly = true)
    public BookingStatusDetailRes getBookingStatusDetail(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

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

        BigDecimal commissionRate = getFreelancerCommissionRate();
        BigDecimal platformFee = serviceSubtotal.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal earningsAmount = serviceSubtotal.subtract(platformFee).add(surchargeFee).add(distanceFee);

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
        Integer estimatedDuration = 60;
        if (booking.getServicePackage() != null) {
            if (booking.getServicePackage().getEstimatedDurationMinutes() != null) {
                estimatedDuration = booking.getServicePackage().getEstimatedDurationMinutes();
            }
            if (booking.getServicePackage().getPackageItems() != null) {
                for (var item : booking.getServicePackage().getPackageItems()) {
                    if (item != null && item.getItemName() != null) {
                        packageItems.add(item.getItemName());
                    }
                }
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
                .packageName(booking.getServicePackage() != null ? booking.getServicePackage().getPackageName() : "Trang Điểm Khẩn Cấp")
                .styleName(styleName)
                .bookingType(booking.getBookingType() != null ? booking.getBookingType().name() : null)
                .bookingDate(booking.getBookingDate())
                .startTime(booking.getStartTime())
                .estimatedDurationMinutes(estimatedDuration)
                .packageItems(packageItems)
                .rating(rating)
                .serviceSubtotal(serviceSubtotal)
                .surchargeFee(surchargeFee)
                .distanceFee(distanceFee)
                .totalAmount(totalAmount)
                .depositAmount(depositAmount)
                .platformFee(platformFee)
                .earningsAmount(earningsAmount)
                .completionPhotoUrl(booking.getCompletionPhotoUrl())
                .cancellationReason(booking.getCancellationReason())
                .isDepositPaid(isDepositPaid)
                .depositTimeoutSeconds(depositTimeoutSeconds)
                .updatedAt(booking.getUpdatedAt() != null ? booking.getUpdatedAt() : booking.getCreatedAt())
                .build();
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
                return "PAID".equals(depositOpt.get().getStatus());
            }
        }
        if (booking.getDepositExpiredAt() == null && booking.getStatus() == BookingStatus.ACCEPTED) {
            return true;
        }
        if (stringRedisTemplate != null && Boolean.TRUE.equals(stringRedisTemplate.hasKey("booking:deposit_paid:" + booking.getId()))) {
            return true;
        }
        return false;
    }

    private void refundDepositToCustomer(BookingEntity booking, String reason) {
        if (booking == null || booking.getCustomer() == null) {
            return;
        }
        Long bookingId = booking.getId();
        Long customerId = booking.getCustomer().getId();

        Optional<WalletHoldEntity> holdOpt = walletHoldRepository.findActiveHoldByBookingId(bookingId);
        BigDecimal refundAmount = BigDecimal.ZERO;

        WalletEntity customerWallet = walletRepository.findByUserId(customerId)
                .orElseGet(() -> {
                    WalletEntity newWallet = WalletEntity.builder()
                            .user(booking.getCustomer())
                            .availableBalance(BigDecimal.ZERO)
                            .frozenBalance(BigDecimal.ZERO)
                            .currency("VND")
                            .build();
                    return walletRepository.save(newWallet);
                });

        if (holdOpt.isPresent()) {
            WalletHoldEntity hold = holdOpt.get();
            refundAmount = hold.getAmount();
            hold.setStatus("REFUNDED");
            hold.setReleasedAt(OffsetDateTime.now());
            walletHoldRepository.save(hold);
        } else if (booking.getDepositAmount() != null && booking.getDepositAmount().compareTo(BigDecimal.ZERO) > 0) {
            refundAmount = booking.getDepositAmount();
        }

        if (refundAmount != null && refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal currentBalance = customerWallet.getAvailableBalance() != null ? customerWallet.getAvailableBalance() : BigDecimal.ZERO;
            BigDecimal newBalance = currentBalance.add(refundAmount);
            customerWallet.setAvailableBalance(newBalance);
            walletRepository.save(customerWallet);

            String refundIdempotencyKey = "refund:booking:" + bookingId;
            if (!ledgerEntryRepository.existsByIdempotencyKey(refundIdempotencyKey)) {
                LedgerEntryEntity ledgerEntry = LedgerEntryEntity.builder()
                        .referenceType("BOOKING_REFUND")
                        .referenceId(bookingId)
                        .wallet(customerWallet)
                        .entryType("CREDIT")
                        .amount(refundAmount)
                        .balanceAfter(newBalance)
                        .description("Hoàn tiền cọc do Thợ hủy ca #" + booking.getBookingCode())
                        .idempotencyKey(refundIdempotencyKey)
                        .build();
                ledgerEntryRepository.save(ledgerEntry);
            }

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
                    refundPayload.put("message", "Thợ đã hủy ca. Khoản tiền cọc đã được hoàn về Ví của bạn.");
                    refundPayload.put("timestamp", System.currentTimeMillis());

                    messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, refundPayload);
                    messagingTemplate.convertAndSend("/topic/customer-wallet/" + customerId, refundPayload);
                    log.info("[StateMachine] Successfully refunded {} VND to customer {} for cancelled bookingId {}",
                            refundAmount, customerId, bookingId);
                }
            } catch (Exception ex) {
                log.error("[StateMachine] Failed to broadcast refund notification via WebSocket: {}", ex.getMessage());
            }
        }
    }
}

