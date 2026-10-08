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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
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

            return transactionTemplate.execute(status -> executeStaffAssignment(agency, bookingId, req.getPrimaryStaffId(), assistantIds));
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
    protected DispatchAssignmentRes executeStaffAssignment(AgencyProfileEntity agency, Long bookingId, Long primaryStaffId, List<Long> assistantIds) {
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

        // 3. Mark previous active assignments as REPLACED and flush immediately so partial unique index is not violated
        List<BookingStaffAssignmentEntity> previousActive = bookingStaffAssignmentRepository.findByBookingIdAndStatus(booking.getId(), AssignmentStatus.ACTIVE);
        if (!previousActive.isEmpty()) {
            for (BookingStaffAssignmentEntity pa : previousActive) {
                pa.setStatus(AssignmentStatus.REPLACED);
            }
            bookingStaffAssignmentRepository.saveAllAndFlush(previousActive);
            muaCalendarService.releaseSlotByBookingId(booking.getId());
        }

        // 4. Create Primary MUA Assignment & Calendar Lock
        BookingStaffAssignmentEntity primaryAssignment = BookingStaffAssignmentEntity.builder()
                .booking(booking)
                .staff(primaryStaff)
                .assignmentRole(AssignmentRole.PRIMARY_MUA)
                .status(AssignmentStatus.ACTIVE)
                .assignedAt(OffsetDateTime.now())
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

        // 5. Create Assistant MUAs Assignments & Calendar Locks
        for (AgencyStaffEntity astStaff : assistantStaffList) {
            BookingStaffAssignmentEntity astAssignment = BookingStaffAssignmentEntity.builder()
                    .booking(booking)
                    .staff(astStaff)
                    .assignmentRole(AssignmentRole.ASSISTANT_MUA)
                    .status(AssignmentStatus.ACTIVE)
                    .assignedAt(OffsetDateTime.now())
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
        BookingEntity savedBooking = bookingRepository.save(booking);

        log.info("Assigned {} staff members to booking {} (Primary: {})",
                allSaved.size(), savedBooking.getBookingCode(), primaryStaff.getId());

        // 7. Audit log transition into booking_history
        boolean isEn = support.isEnglishLocale();
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

        if (booking.getStatus() != BookingStatus.PENDING_AGENCY_DISPATCH) {
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

        log.warn("Agency {} rejected booking {}: {}", agency.getId(), savedBooking.getBookingCode(), req.getRejectionReason());

        // Audit log transition into booking_history
        bookingAuditService.logTransition(
                savedBooking,
                oldStatus,
                BookingStatus.CANCELLED,
                agency.getOwner().getId(),
                reason
        );

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

        String staffName = (assignment.getStaff() != null && assignment.getStaff().getMua() != null && assignment.getStaff().getMua().getUser() != null)
                ? assignment.getStaff().getMua().getUser().getFullName() : (support.isEnglishLocale() ? "Artist" : "Chuyên viên");
        boolean isEnConfirm = support.isEnglishLocale();
        String confirmNote = isEnConfirm
                ? ("Artist (" + staffName + ") confirmed assignment (" + assignment.getAssignmentRole().name() + ")")
                : ("Thợ (" + staffName + ") xác nhận nhận ca (" + assignment.getAssignmentRole().name() + ")");
        bookingAuditService.logTransition(
                assignment.getBooking(),
                assignment.getBooking().getStatus(),
                assignment.getBooking().getStatus(),
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

}
