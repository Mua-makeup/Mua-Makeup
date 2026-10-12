package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.agency.ApproveEmergencyReportReq;
import com.makeup.platform.dto.request.agency.AssignStaffToBookingReq;
import com.makeup.platform.dto.request.agency.ProceedSoloReq;
import com.makeup.platform.dto.request.agency.ReassignStaffReq;
import com.makeup.platform.dto.request.agency.RejectDispatchBookingReq;
import com.makeup.platform.dto.request.agency.ReportEmergencyBusyReq;
import com.makeup.platform.dto.request.agency.StaffCommissionSplitItem;
import com.makeup.platform.dto.request.agency.UpdateStaffCommissionSplitReq;
import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.dto.response.agency.DispatchAssignmentRes;
import com.makeup.platform.dto.response.agency.EmergencyApprovalRes;
import com.makeup.platform.dto.response.agency.EmergencyReassignmentRes;
import com.makeup.platform.dto.response.agency.StaffAssignmentDetailRes;
import com.makeup.platform.dto.response.agency.StaffAvailabilityMatrixRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.mapper.agency.AgencyBookingMapper;
import com.makeup.platform.mapper.agency.DispatchMatrixMapper;
import com.makeup.platform.mapper.booking.BookingStaffAssignmentMapper;
import com.makeup.platform.repository.StaffMatrixRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.repository.custom.projection.StaffMatrixProjection;
import com.makeup.platform.service.agency.AgencyDispatchService;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.mua.MUACalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.makeup.platform.service.booking.BookingStateMachineService;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyDispatchServiceImpl implements AgencyDispatchService {

    private final AgencyEmergencyService emergencyService;
    private final AgencyDispatchSupport support;

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    private final BookingRepository bookingRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final StaffMatrixRepository staffMatrixRepository;
    private final MUACalendarService muaCalendarService;
    private final BookingAuditService bookingAuditService;
    private final BookingStateMachineService bookingStateMachineService;
    private final SimpMessagingTemplate messagingTemplate;
    private final RedissonClient redissonClient;
    private final TransactionTemplate transactionTemplate;
    private final ApplicationEventPublisher eventPublisher;
    private final AgencyBookingMapper agencyBookingMapper;
    private final DispatchMatrixMapper dispatchMatrixMapper;
    private final BookingStaffAssignmentMapper bookingStaffAssignmentMapper;

    @Override
    @Transactional(readOnly = true)
    public List<AgencyBookingRes> getPendingDispatchBookings(Long ownerUserId) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(ownerUserId);

        List<BookingEntity> bookings = bookingRepository.findPendingDispatchBookingsByAgencyId(agency.getId());
        return bookings.stream()
                .map(b -> agencyBookingMapper.toRes(b, agency))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StaffAvailabilityMatrixRes getStaffMatrix(Long ownerUserId, Long bookingId) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());

        LocalDate bookingDate = booking.getBookingDate();
        LocalTime startTime = booking.getStartTime();
        int duration = support.getBookingDurationMinutes(booking);
        LocalTime endTime = startTime.plusMinutes(duration);

        OffsetDateTime startTs = bookingDate.atTime(startTime).atOffset(VIETNAM_OFFSET);
        OffsetDateTime endTs = bookingDate.atTime(endTime).atOffset(VIETNAM_OFFSET);

        Long packageId = booking.getServicePackage() != null ? booking.getServicePackage().getId() : null;
        Long styleId = (booking.getStyle() != null && booking.getStyle().getId() != null) ? booking.getStyle().getId().longValue() : null;

        List<StaffMatrixProjection> projections = staffMatrixRepository.getStaffAvailabilityMatrix(
                agency.getId(),
                booking.getId(),
                packageId,
                styleId,
                bookingDate,
                startTime,
                endTime,
                startTs,
                endTs
        );

        return dispatchMatrixMapper.toMatrixRes(booking, projections);
    }

    @Override
    public DispatchAssignmentRes assignStaff(Long ownerUserId, Long bookingId, AssignStaffToBookingReq req) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(ownerUserId);

        if (req.getPrimaryStaffId() == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_PRIMARY_REQUIRED, "dispatch.primary_required");
        }

        List<Long> assistantIds = req.getAssistantStaffIds() != null
                ? req.getAssistantStaffIds().stream().filter(Objects::nonNull).distinct().toList()
                : Collections.emptyList();

        if (assistantIds.size() > 2) {
            throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_MAX_ASSISTANTS_EXCEEDED, "dispatch.max_assistants_exceeded");
        }

        if (assistantIds.contains(req.getPrimaryStaffId())) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION, "validation.primary_cannot_be_assistant");
        }

        // REDISSON MULTILOCK WITH LOCK ORDERING (ASCENDING ORDER TO PREVENT DEADLOCKS)
        List<Long> allStaffIds = new ArrayList<>();
        allStaffIds.add(req.getPrimaryStaffId());
        allStaffIds.addAll(assistantIds);
        Collections.sort(allStaffIds);

        List<RLock> locks = allStaffIds.stream()
                .map(id -> redissonClient.getLock("lock:agency:staff:" + id))
                .collect(Collectors.toList());

        RLock multiLock = redissonClient.getMultiLock(locks.toArray(new RLock[0]));
        boolean acquired = false;
        try {
            acquired = multiLock.tryLock(5, 10, TimeUnit.SECONDS);
            if (!acquired) {
                throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT, "common.system_busy");
            }

            return transactionTemplate.execute(status -> executeStaffAssignment(agency, bookingId, req.getPrimaryStaffId(), assistantIds, req));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT, "common.system_busy");
        } finally {
            if (acquired && multiLock.isHeldByCurrentThread()) {
                multiLock.unlock();
            }
        }
    }

    @Transactional
    protected DispatchAssignmentRes executeStaffAssignment(AgencyProfileEntity agency, Long bookingId, Long primaryStaffId, List<Long> assistantIds, AssignStaffToBookingReq req) {
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());
        BookingStatus oldStatus = booking.getStatus();

        if (booking.getStatus() != BookingStatus.PENDING_AGENCY_DISPATCH
                && booking.getStatus() != BookingStatus.AGENCY_ASSIGNED
                && !Boolean.TRUE.equals(booking.getNeedsEmergencyReassignment())) {
            throw new CustomBusinessException(ErrorCodes.ERR_CANNOT_DISPATCH_IN_CURRENT_STATUS, "dispatch.cannot_dispatch_in_status");
        }

        LocalDate bookingDate = booking.getBookingDate();
        LocalTime startTime = booking.getStartTime();
        int duration = support.getBookingDurationMinutes(booking);
        LocalTime endTime = startTime.plusMinutes(duration);
        OffsetDateTime startTs = bookingDate.atTime(startTime).atOffset(VIETNAM_OFFSET);
        OffsetDateTime endTs = bookingDate.atTime(endTime).atOffset(VIETNAM_OFFSET);

        // 1. Verify Primary Staff
        Long packageId = booking.getServicePackage() != null ? booking.getServicePackage().getId() : null;
        Long styleId = (booking.getStyle() != null && booking.getStyle().getId() != null) ? booking.getStyle().getId().longValue() : null;

        List<StaffMatrixProjection> projections = staffMatrixRepository.getStaffAvailabilityMatrix(
                agency.getId(),
                booking.getId(),
                packageId,
                styleId,
                bookingDate,
                startTime,
                endTime,
                startTs,
                endTs
        );

        AgencyStaffEntity primaryStaff = support.findAgencyStaff(primaryStaffId, agency.getId());

        support.validateActiveStaff(primaryStaff);

        StaffMatrixProjection primaryProj = support.findStaffProjection(projections, primaryStaffId);

        boolean isPrimaryQualified = Boolean.TRUE.equals(primaryProj.getHasShift())
                && Boolean.TRUE.equals(primaryProj.getHasPackage())
                && Boolean.TRUE.equals(primaryProj.getHasStyle())
                && Boolean.TRUE.equals(primaryProj.getHasCalendarFree());

        if (!isPrimaryQualified) {
            throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified");
        }

        // 2. Verify Assistants
        List<AgencyStaffEntity> assistantStaffList = new ArrayList<>();
        for (Long astId : assistantIds) {
            AgencyStaffEntity astStaff = support.findAgencyStaff(astId, agency.getId());
            support.validateActiveStaff(astStaff);

            StaffMatrixProjection astProj = support.findStaffProjection(projections, astId);

            boolean isAstQualified = Boolean.TRUE.equals(astProj.getHasShift())
                    && Boolean.TRUE.equals(astProj.getHasCalendarFree());

            if (!isAstQualified) {
                throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified");
            }

            assistantStaffList.add(astStaff);
        }

        // 3. Mark previous active assignments and emergency-cancelled assignments as REPLACED
        List<BookingStaffAssignmentEntity> previousActive = bookingStaffAssignmentRepository.findByBookingIdAndStatus(booking.getId(), AssignmentStatus.ACTIVE);
        if (!previousActive.isEmpty()) {
            for (BookingStaffAssignmentEntity pa : previousActive) {
                pa.setStatus(AssignmentStatus.REPLACED);
            }
            bookingStaffAssignmentRepository.saveAllAndFlush(previousActive);
            muaCalendarService.releaseSlotByBookingId(booking.getId());
        }

        List<BookingStaffAssignmentEntity> emergencyAssignments = bookingStaffAssignmentRepository
                .findByBookingIdAndStatus(booking.getId(), AssignmentStatus.EMERGENCY_CANCELLED);
        BigDecimal transferredEmergencyRate = BigDecimal.ZERO;
        BigDecimal transferredEmergencyAmount = BigDecimal.ZERO;
        StringBuilder cancelledStaffNames = new StringBuilder();

        if (!emergencyAssignments.isEmpty()) {
            for (BookingStaffAssignmentEntity ea : emergencyAssignments) {
                if (ea.getCommissionRate() != null && ea.getCommissionRate().compareTo(BigDecimal.ZERO) > 0) {
                    transferredEmergencyRate = transferredEmergencyRate.add(ea.getCommissionRate());
                }
                if (ea.getCommissionAmount() != null && ea.getCommissionAmount().compareTo(BigDecimal.ZERO) > 0) {
                    transferredEmergencyAmount = transferredEmergencyAmount.add(ea.getCommissionAmount());
                }
                String staffName = (ea.getStaff() != null && ea.getStaff().getMua() != null && ea.getStaff().getMua().getUser() != null)
                        ? ea.getStaff().getMua().getUser().getFullName() : "Thợ báo bận";
                if (cancelledStaffNames.length() > 0) {
                    cancelledStaffNames.append(", ");
                }
                cancelledStaffNames.append(staffName);

                ea.setStatus(AssignmentStatus.REPLACED);
                ea.setReplacedByStaff(primaryStaff);
                ea.setCommissionRate(BigDecimal.ZERO);
                ea.setCommissionAmount(BigDecimal.ZERO);
                String oldNote = ea.getCommissionNote() != null ? ea.getCommissionNote() + " | " : "";
                String targetPrimaryName = (primaryStaff.getMua() != null && primaryStaff.getMua().getUser() != null)
                        ? primaryStaff.getMua().getUser().getFullName() : "Thợ chính";
                ea.setCommissionNote(oldNote + "Đã chuyển giao hoa hồng khi điều phối lại: " + targetPrimaryName);
            }
            bookingStaffAssignmentRepository.saveAllAndFlush(emergencyAssignments);
            for (BookingStaffAssignmentEntity ea : emergencyAssignments) {
                if (ea.getStaff() != null && ea.getStaff().getMua() != null) {
                    muaCalendarService.convertSlotToEmergencyBlocked(booking.getId(), ea.getStaff().getMua().getId(), ea.getCancellationReason());
                }
            }
        }

        BigDecimal totalAmount = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;
        boolean isEn = support.isEnglishLocale();

        // 4. Validate tổng hoa hồng nếu client gửi custom splits
        if (req.getCommissionSplits() != null && !req.getCommissionSplits().isEmpty()) {
            BigDecimal totalSplitRate = BigDecimal.ZERO;
            BigDecimal totalSplitAmount = BigDecimal.ZERO;
            for (StaffCommissionSplitItem item : req.getCommissionSplits()) {
                if (item.getCommissionRate() != null) {
                    totalSplitRate = totalSplitRate.add(item.getCommissionRate());
                }
                if (item.getCommissionAmount() != null) {
                    totalSplitAmount = totalSplitAmount.add(item.getCommissionAmount());
                }
            }
            if (totalSplitRate.compareTo(BigDecimal.valueOf(100.0)) > 0 || totalSplitAmount.compareTo(totalAmount) > 0) {
                throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION, "dispatch.total_commission_exceeds_max");
            }
        }

        // 5. Create Primary MUA Assignment & Calendar Lock
        BigDecimal primaryRate = (primaryStaff.getAgreedCommissionRate() != null)
                ? primaryStaff.getAgreedCommissionRate()
                : ((agency.getCommissionRateInternal() != null) ? agency.getCommissionRateInternal() : BigDecimal.valueOf(30.0));

        // Nếu 1 thợ làm hết (không có thợ phụ) và có thợ báo bận trước đó: Chuyển gộp toàn bộ % hoa hồng của thợ báo bận
        if (assistantStaffList.isEmpty() && transferredEmergencyRate.compareTo(BigDecimal.ZERO) > 0) {
            primaryRate = primaryRate.add(transferredEmergencyRate);
            if (primaryRate.compareTo(BigDecimal.valueOf(100.0)) > 0) {
                primaryRate = BigDecimal.valueOf(100.0);
            }
        }

        BigDecimal primaryAmount = totalAmount.multiply(primaryRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        String primaryNote = isEn
                ? ("Lead Artist - Contract Rate (" + primaryRate + "%)")
                : ("Thợ chính - Hợp đồng thỏa thuận (" + primaryRate + "%)");
        if (assistantStaffList.isEmpty() && transferredEmergencyRate.compareTo(BigDecimal.ZERO) > 0) {
            primaryNote += isEn
                    ? (" [Solo: +" + transferredEmergencyRate + "% from " + cancelledStaffNames + "]")
                    : (" [Làm Solo toàn bộ ca: Nhận gộp +" + transferredEmergencyRate + "% hoa hồng từ thợ báo bận: " + cancelledStaffNames + "]");
        }

        if (req.getCommissionSplits() != null) {
            req.getCommissionSplits().stream()
                    .filter(s -> s.getStaffId() != null && s.getStaffId().equals(primaryStaff.getId()))
                    .findFirst()
                    .ifPresent(customSplit -> {
                        // Ghi đè theo tùy chỉnh nếu có
                    });
        }
        StaffCommissionSplitItem primaryCustom = (req.getCommissionSplits() != null)
                ? req.getCommissionSplits().stream()
                .filter(s -> s.getStaffId() != null && s.getStaffId().equals(primaryStaff.getId()))
                .findFirst().orElse(null)
                : null;
        if (primaryCustom != null) {
            if (primaryCustom.getCommissionRate() != null) {
                primaryRate = primaryCustom.getCommissionRate();
            }
            if (primaryCustom.getCommissionAmount() != null) {
                primaryAmount = primaryCustom.getCommissionAmount();
            } else if (primaryCustom.getCommissionRate() != null) {
                primaryAmount = totalAmount.multiply(primaryRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            }
            if (primaryCustom.getCommissionNote() != null && !primaryCustom.getCommissionNote().isBlank()) {
                primaryNote = primaryCustom.getCommissionNote().trim();
            }
        }

        BookingStaffAssignmentEntity primaryAssignment = BookingStaffAssignmentEntity.builder()
                .booking(booking)
                .staff(primaryStaff)
                .assignmentRole(AssignmentRole.PRIMARY_MUA)
                .status(AssignmentStatus.ACTIVE)
                .assignedAt(OffsetDateTime.now())
                .commissionRate(primaryRate)
                .commissionAmount(primaryAmount)
                .commissionNote(primaryNote)
                .payoutStatus("PENDING")
                .build();
        BookingStaffAssignmentEntity savedPrimary = bookingStaffAssignmentRepository.save(primaryAssignment);

        muaCalendarService.lockSlotForBooking(
                primaryStaff.getMua().getId(),
                booking.getId(),
                bookingDate,
                startTs,
                endTs,
                "ASSIGNED_PRIMARY_MUA"
        );

        List<BookingStaffAssignmentEntity> allSaved = new ArrayList<>();
        allSaved.add(savedPrimary);

        // 6. Create Assistant MUAs Assignments & Calendar Locks
        for (AgencyStaffEntity astStaff : assistantStaffList) {
            BigDecimal astRate = (astStaff.getAgreedCommissionRate() != null)
                    ? astStaff.getAgreedCommissionRate()
                    : BigDecimal.valueOf(10.0);
            BigDecimal astAmount = totalAmount.multiply(astRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            String astNote = isEn
                    ? ("Assistant Artist - Service Support (" + astRate + "%)")
                    : ("Thợ phụ - Hỗ trợ dịch vụ (" + astRate + "%)");

            StaffCommissionSplitItem astCustom = (req.getCommissionSplits() != null)
                    ? req.getCommissionSplits().stream()
                    .filter(s -> s.getStaffId() != null && s.getStaffId().equals(astStaff.getId()))
                    .findFirst().orElse(null)
                    : null;
            if (astCustom != null) {
                if (astCustom.getCommissionRate() != null) {
                    astRate = astCustom.getCommissionRate();
                }
                if (astCustom.getCommissionAmount() != null) {
                    astAmount = astCustom.getCommissionAmount();
                } else if (astCustom.getCommissionRate() != null) {
                    astAmount = totalAmount.multiply(astRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                }
                if (astCustom.getCommissionNote() != null && !astCustom.getCommissionNote().isBlank()) {
                    astNote = astCustom.getCommissionNote().trim();
                }
            }

            BookingStaffAssignmentEntity astAssignment = BookingStaffAssignmentEntity.builder()
                    .booking(booking)
                    .staff(astStaff)
                    .assignmentRole(AssignmentRole.ASSISTANT_MUA)
                    .status(AssignmentStatus.ACTIVE)
                    .assignedAt(OffsetDateTime.now())
                    .commissionRate(astRate)
                    .commissionAmount(astAmount)
                    .commissionNote(astNote)
                    .payoutStatus("PENDING")
                    .build();
            BookingStaffAssignmentEntity savedAst = bookingStaffAssignmentRepository.save(astAssignment);
            allSaved.add(savedAst);

            muaCalendarService.lockSlotForBooking(
                    astStaff.getMua().getId(),
                    booking.getId(),
                    bookingDate,
                    startTs,
                    endTs,
                    "ASSIGNED_ASSISTANT_MUA"
            );
        }

        // 6. Update Booking
        booking.setMua(primaryStaff.getMua());
        booking.setStatus(BookingStatus.AGENCY_ASSIGNED);
        booking.setNeedsEmergencyReassignment(false);
        booking.setEmergencyReason(null);
        if (booking.getStaffAssignments() != null) {
            booking.getStaffAssignments().clear();
            booking.getStaffAssignments().addAll(allSaved);
        }
        BookingEntity savedBooking = bookingRepository.save(booking);

        log.info("Assigned {} staff members to booking {} (Primary: {})",
                allSaved.size(), savedBooking.getBookingCode(), primaryStaff.getId());

        // 7. Audit log transition into booking_history
        String primaryName = (primaryStaff.getMua() != null && primaryStaff.getMua().getUser() != null)
                ? primaryStaff.getMua().getUser().getFullName() : (isEn ? "Primary Artist" : "Thợ chính");
        StringBuilder noteBuilder = new StringBuilder(isEn ? "Studio assigned primary artist: " : "Studio đã phân công thợ chính: ")
                .append(primaryName);
        if (!assistantStaffList.isEmpty()) {
            List<String> astNames = assistantStaffList.stream()
                    .map(a -> (a.getMua() != null && a.getMua().getUser() != null) ? a.getMua().getUser().getFullName() : (isEn ? "Assistant" : "Thợ phụ"))
                    .toList();
            noteBuilder.append(isEn ? " (Assistants: " : " (Trợ lý: ")
                    .append(String.join(", ", astNames))
                    .append(")");
        }
        bookingAuditService.logTransition(
                savedBooking,
                oldStatus,
                BookingStatus.AGENCY_ASSIGNED,
                agency.getOwner().getId(),
                noteBuilder.toString()
        );

        // 8. Publish state change event & broadcast STOMP updates
        eventPublisher.publishEvent(new BookingStateChangedEvent(
                this,
                savedBooking.getId(),
                savedBooking.getBookingCode(),
                oldStatus,
                BookingStatus.AGENCY_ASSIGNED,
                agency.getOwner().getId()
        ));
        support.broadcastDispatchUpdate(agency.getId(), savedBooking);

        List<StaffAssignmentDetailRes> assignmentDetails = bookingStaffAssignmentMapper.toDetailResList(allSaved);

        return DispatchAssignmentRes.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .bookingStatus(booking.getStatus().name())
                .agencyId(agency.getId())
                .assignedAt(LocalDateTime.now())
                .assignedStaff(assignmentDetails)
                .build();
    }

    @Override
    public EmergencyReassignmentRes reassignStaff(Long ownerUserId, Long bookingId, ReassignStaffReq req) {
        return emergencyService.reassignStaff(ownerUserId, bookingId, req);
    }

    @Override
    @Transactional
    public void proceedSolo(Long ownerUserId, Long bookingId, ProceedSoloReq req) {
        emergencyService.proceedSolo(ownerUserId, bookingId, req);
    }

    @Override
    @Transactional
    public void rejectBooking(Long ownerUserId, Long bookingId, RejectDispatchBookingReq req) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());

        if (booking.getStatus() == BookingStatus.COMPLETED
                || booking.getStatus() == BookingStatus.PAID_OUT
                || booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.CANCELLED_EXPIRED
                || booking.getStatus() == BookingStatus.DISPUTED
                || booking.getStatus() == BookingStatus.DISPUTE_REFUNDED
                || booking.getStatus() == BookingStatus.DISPUTE_COMPENSATED) {
            throw new CustomBusinessException(ErrorCodes.ERR_CANNOT_DISPATCH_IN_CURRENT_STATUS, "dispatch.cannot_dispatch_in_status");
        }

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setNeedsEmergencyReassignment(false);
        boolean isEnReject = support.isEnglishLocale();
        String prefix = isEnReject ? "Studio rejected: " : "Studio từ chối: ";
        String reason = prefix + req.getRejectionReason() +
                (req.getRejectionNote() != null ? " - " + req.getRejectionNote() : "");
        booking.setCancellationReason(reason);
        BookingEntity savedBooking = bookingRepository.save(booking);

        // Release any slots
        muaCalendarService.releaseSlotByBookingId(savedBooking.getId());

        // Hoàn 100% tiền ký quỹ / tiền cọc vào ví khách hàng
        bookingStateMachineService.refundDepositToCustomer(savedBooking, reason);

        log.warn("Agency {} rejected booking {}: {}", agency.getId(), savedBooking.getBookingCode(), req.getRejectionReason());

        // Audit log transition into booking_history
        bookingAuditService.logTransition(
                savedBooking,
                oldStatus,
                BookingStatus.CANCELLED,
                agency.getOwner().getId(),
                reason
        );

        // Broadcast WebSocket to Customer: Studio từ chối ca & hoàn cọc vào ví
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "AGENCY_REJECTED_BOOKING");
            payload.put("bookingId", savedBooking.getId());
            payload.put("bookingCode", savedBooking.getBookingCode());
            payload.put("status", "CANCELLED");
            payload.put("message", isEnReject
                    ? "Studio could not fulfill your booking. Your deposit has been 100% refunded to your wallet."
                    : "Studio không thể tiếp nhận ca hẹn. Tiền ký quỹ/cọc đã được hoàn 100% về ví của bạn.");
            payload.put("timestamp", System.currentTimeMillis());
            if (savedBooking.getCustomer() != null) {
                messagingTemplate.convertAndSend("/topic/customer-bookings/" + savedBooking.getCustomer().getId(), payload);
            }
            messagingTemplate.convertAndSend("/topic/booking-status/" + savedBooking.getId(), payload);
        } catch (Exception ex) {
            log.warn("[AgencyDispatch] Failed to broadcast AGENCY_REJECTED_BOOKING: {}", ex.getMessage());
        }

        // Publish state change event & broadcast STOMP updates
        eventPublisher.publishEvent(new BookingStateChangedEvent(
                this,
                savedBooking.getId(),
                savedBooking.getBookingCode(),
                oldStatus,
                BookingStatus.CANCELLED,
                agency.getOwner().getId()
        ));
        support.broadcastDispatchUpdate(agency.getId(), savedBooking);
    }

    @Override
    @Transactional
    public void reportEmergencyBusy(Long muaUserId, Long bookingId, ReportEmergencyBusyReq req) {
        emergencyService.reportEmergencyBusy(muaUserId, bookingId, req);
    }

    @Override
    @Transactional
    public EmergencyApprovalRes reviewEmergencyReport(Long ownerUserId, Long bookingId, Long staffId, ApproveEmergencyReportReq req) {
        return emergencyService.reviewEmergencyReport(ownerUserId, bookingId, staffId, req);
    }

    @Override
    @Transactional
    public void confirmAssignment(Long muaUserId, Long assignmentId) {
        BookingStaffAssignmentEntity assignment = bookingStaffAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ASSIGNMENT_NOT_FOUND, "dispatch.assignment_not_found"));

        if (!assignment.getStaff().getMua().getUser().getId().equals(muaUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION, "common.unauthorized");
        }
        assignment.setIsConfirmedByStaff(true);
        assignment.setConfirmedAt(OffsetDateTime.now());
        bookingStaffAssignmentRepository.save(assignment);

        log.info("Staff {} confirmed assignment {}", muaUserId, assignmentId);

        BookingEntity booking = assignment.getBooking();
        BookingStatus previousStatus = booking.getStatus();

        if (assignment.getAssignmentRole() == AssignmentRole.PRIMARY_MUA
                && previousStatus == BookingStatus.AGENCY_ASSIGNED) {
            booking.setStatus(BookingStatus.ACCEPTED);
            bookingRepository.save(booking);

            eventPublisher.publishEvent(new BookingStateChangedEvent(
                    this,
                    booking.getId(),
                    booking.getBookingCode(),
                    previousStatus,
                    BookingStatus.ACCEPTED,
                    muaUserId
            ));
        }

        String staffName = (assignment.getStaff() != null && assignment.getStaff().getMua() != null && assignment.getStaff().getMua().getUser() != null)
                ? assignment.getStaff().getMua().getUser().getFullName() : (support.isEnglishLocale() ? "Artist" : "Chuyên viên");
        boolean isEnConfirm = support.isEnglishLocale();
        String confirmNote = isEnConfirm
                ? ("Artist (" + staffName + ") confirmed assignment (" + assignment.getAssignmentRole().name() + ")")
                : ("Thợ (" + staffName + ") xác nhận nhận ca (" + assignment.getAssignmentRole().name() + ")");
        bookingAuditService.logTransition(
                booking,
                previousStatus,
                booking.getStatus(),
                muaUserId,
                confirmNote
        );
    }

    @Override
    @Transactional
    public void confirmAssignmentByBooking(Long muaUserId, Long bookingId) {
        BookingStaffAssignmentEntity assignment = bookingStaffAssignmentRepository
                .findWithStaffAndUserByBookingIdAndStatus(bookingId, AssignmentStatus.ACTIVE)
                .stream()
                .filter(a -> a.getStaff() != null
                        && a.getStaff().getMua() != null
                        && a.getStaff().getMua().getUser() != null
                        && a.getStaff().getMua().getUser().getId().equals(muaUserId))
                .findFirst()
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ASSIGNMENT_NOT_FOUND, "dispatch.assignment_not_found"));

        confirmAssignment(muaUserId, assignment.getId());
    }

    @Override
    @Transactional
    public AgencyBookingRes updateStaffCommissions(Long ownerUserId, Long bookingId, UpdateStaffCommissionSplitReq req) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());

        List<BookingStaffAssignmentEntity> activeAssignments = bookingStaffAssignmentRepository
                .findByBookingIdAndStatus(bookingId, AssignmentStatus.ACTIVE);

        if (activeAssignments.isEmpty()) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION, "dispatch.no_active_staff_to_update_commission");
        }

        BigDecimal totalAmount = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;

        for (StaffCommissionSplitItem item : req.getSplits()) {
            for (BookingStaffAssignmentEntity sa : activeAssignments) {
                if (sa.getStaff() != null && sa.getStaff().getId().equals(item.getStaffId())) {
                    if (item.getCommissionRate() != null) {
                        sa.setCommissionRate(item.getCommissionRate());
                    }
                    if (item.getCommissionAmount() != null) {
                        sa.setCommissionAmount(item.getCommissionAmount());
                    } else if (item.getCommissionRate() != null) {
                        BigDecimal calculated = totalAmount.multiply(item.getCommissionRate())
                                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                        sa.setCommissionAmount(calculated);
                    }
                    if (item.getCommissionNote() != null && !item.getCommissionNote().isBlank()) {
                        sa.setCommissionNote(item.getCommissionNote().trim());
                    }
                    bookingStaffAssignmentRepository.save(sa);
                }
            }
        }

        bookingStaffAssignmentRepository.flush();
        BookingEntity refreshedBooking = bookingRepository.findById(bookingId).orElse(booking);
        return agencyBookingMapper.toRes(refreshedBooking, agency);
    }
}
