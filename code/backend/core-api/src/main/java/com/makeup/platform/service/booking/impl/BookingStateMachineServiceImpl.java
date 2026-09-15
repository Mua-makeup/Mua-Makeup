package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.booking.TransitionBookingStateReq;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.booking.BookingStateMachineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingStateMachineServiceImpl implements BookingStateMachineService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final BookingAuditService bookingAuditService;
    private final BookingMapper bookingMapper;
    private final ApplicationEventPublisher eventPublisher;

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
        if (targetStatus == BookingStatus.COMPLETED) {
            if (req.getCompletionPhotoUrl() == null || req.getCompletionPhotoUrl().trim().isEmpty()) {
                log.warn("[StateMachine] Completion photo required for bookingId={}", bookingId);
                throw new CustomBusinessException(ErrorCodes.ERR_COMPLETION_PHOTO_REQUIRED,
                        "booking.completion_photo_required", HttpStatus.BAD_REQUEST);
            }
            booking.setCompletionPhotoUrl(req.getCompletionPhotoUrl().trim());
        }

        if (targetStatus == BookingStatus.CANCELLED) {
            if (req.getReason() == null || req.getReason().trim().isEmpty()) {
                log.warn("[StateMachine] Cancellation reason required for bookingId={}", bookingId);
                throw new CustomBusinessException(ErrorCodes.ERR_CANCELLATION_REASON_REQUIRED,
                        "booking.cancellation_reason_required", HttpStatus.BAD_REQUEST);
            }
            booking.setCancellationReason(req.getReason().trim());
        }

        try {
            // 4. Update status & save entity
            booking.setStatus(targetStatus);
            BookingEntity savedBooking = bookingRepository.save(booking);

            // 5. Log audit trail in the same transaction
            String note = req.getReason() != null ? req.getReason() : "Chuyển trạng thái sang " + targetStatus.name();
            bookingAuditService.logTransition(savedBooking, currentStatus, targetStatus, userId, note);

            // 6. Publish in-memory event
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
                    || to == BookingStatus.PENDING_AGENCY_DISPATCH;
            case ACCEPTED -> to == BookingStatus.ON_THE_WAY
                    || to == BookingStatus.CANCELLED;
            case ON_THE_WAY -> to == BookingStatus.ARRIVED;
            case ARRIVED -> to == BookingStatus.IN_PROGRESS;
            case IN_PROGRESS -> to == BookingStatus.COMPLETED;
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
                } else if (booking.getStatus() == BookingStatus.PENDING_AGENCY_DISPATCH) {
                    if (!isCustomer && !isAgencyOwner) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                } else if (booking.getStatus() == BookingStatus.ACCEPTED) {
                    if (!isCustomer && !isAssignedMua) {
                        throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                                "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                    }
                } else {
                    throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                            "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
                }
                break;

            case DISPUTED:
                if (!isCustomer) {
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
}
