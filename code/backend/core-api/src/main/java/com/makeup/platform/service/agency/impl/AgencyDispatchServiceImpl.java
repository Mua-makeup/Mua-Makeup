package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
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
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
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
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Locale;

import java.time.Duration;
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

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    private final BookingRepository bookingRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final StaffMatrixRepository staffMatrixRepository;
    private final MUACalendarService muaCalendarService;
    private final BookingAuditService bookingAuditService;
    private final RedissonClient redissonClient;
    private final TransactionTemplate transactionTemplate;
    private final ApplicationEventPublisher eventPublisher;
    private final SimpMessagingTemplate messagingTemplate;
    private final AgencyBookingMapper agencyBookingMapper;
    private final DispatchMatrixMapper dispatchMatrixMapper;
    private final BookingStaffAssignmentMapper bookingStaffAssignmentMapper;

    private boolean isEnglishLocale() {
        Locale locale = LocaleContextHolder.getLocale();
        return locale != null && locale.getLanguage().equalsIgnoreCase("en");
    }

    @Override
    @Transactional(readOnly = true)
    public List<AgencyBookingRes> getPendingDispatchBookings(Long ownerUserId) {
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);

        List<BookingEntity> bookings = bookingRepository.findPendingDispatchBookingsByAgencyId(agency.getId());
        return bookings.stream()
                .map(b -> agencyBookingMapper.toRes(b, agency))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StaffAvailabilityMatrixRes getStaffMatrix(Long ownerUserId, Long bookingId) {
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = getBookingAndVerifyOwnership(bookingId, agency.getId());

        LocalDate bookingDate = booking.getBookingDate();
        LocalTime startTime = booking.getStartTime();
        int duration = (booking.getServicePackage() != null && booking.getServicePackage().getEstimatedDurationMinutes() != null)
                ? booking.getServicePackage().getEstimatedDurationMinutes() : 60;
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
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);

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
        BookingEntity booking = getBookingAndVerifyOwnership(bookingId, agency.getId());
        BookingStatus oldStatus = booking.getStatus();

        if (booking.getStatus() != BookingStatus.PENDING_AGENCY_DISPATCH
                && booking.getStatus() != BookingStatus.AGENCY_ASSIGNED
                && !Boolean.TRUE.equals(booking.getNeedsEmergencyReassignment())) {
            throw new CustomBusinessException(ErrorCodes.ERR_CANNOT_DISPATCH_IN_CURRENT_STATUS, "dispatch.cannot_dispatch_in_status");
        }

        LocalDate bookingDate = booking.getBookingDate();
        LocalTime startTime = booking.getStartTime();
        int duration = (booking.getServicePackage() != null && booking.getServicePackage().getEstimatedDurationMinutes() != null)
                ? booking.getServicePackage().getEstimatedDurationMinutes() : 60;
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

        AgencyStaffEntity primaryStaff = agencyStaffRepository.findByIdAndAgencyIdWithMuaAndUser(primaryStaffId, agency.getId())
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_STAFF_NOT_FOUND, "agency.staff_not_found"));

        if (!Boolean.TRUE.equals(primaryStaff.getIsActive()) || !"ACTIVE".equals(primaryStaff.getStatus())) {
            throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified");
        }

        StaffMatrixProjection primaryProj = projections.stream()
                .filter(p -> p.getStaffId().equals(primaryStaffId))
                .findFirst()
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified"));

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
            AgencyStaffEntity astStaff = agencyStaffRepository.findByIdAndAgencyIdWithMuaAndUser(astId, agency.getId())
                    .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_STAFF_NOT_FOUND, "agency.staff_not_found"));
            if (!Boolean.TRUE.equals(astStaff.getIsActive()) || !"ACTIVE".equals(astStaff.getStatus())) {
                throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified");
            }

            StaffMatrixProjection astProj = projections.stream()
                    .filter(p -> p.getStaffId().equals(astId))
                    .findFirst()
                    .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified"));

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
        boolean isEn = isEnglishLocale();
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
        broadcastDispatchUpdate(agency.getId(), savedBooking);

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
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);

        RLock lock = redissonClient.getLock("lock:agency:staff:" + req.getNewStaffId());
        boolean acquired = false;
        try {
            acquired = lock.tryLock(5, 10, TimeUnit.SECONDS);
            if (!acquired) {
                throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT, "common.system_busy");
            }

            return transactionTemplate.execute(status -> executeStaffReassignment(agency, bookingId, req));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT, "common.system_busy");
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    @Transactional
    protected EmergencyReassignmentRes executeStaffReassignment(AgencyProfileEntity agency, Long bookingId, ReassignStaffReq req) {
        BookingEntity booking = getBookingAndVerifyOwnership(bookingId, agency.getId());

        LocalDate bookingDate = booking.getBookingDate();
        LocalTime startTime = booking.getStartTime();
        int duration = (booking.getServicePackage() != null && booking.getServicePackage().getEstimatedDurationMinutes() != null)
                ? booking.getServicePackage().getEstimatedDurationMinutes() : 60;
        LocalTime endTime = startTime.plusMinutes(duration);
        OffsetDateTime startTs = bookingDate.atTime(startTime).atOffset(VIETNAM_OFFSET);
        OffsetDateTime endTs = bookingDate.atTime(endTime).atOffset(VIETNAM_OFFSET);

        AgencyStaffEntity newStaff = agencyStaffRepository.findByIdAndAgencyIdWithMuaAndUser(req.getNewStaffId(), agency.getId())
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_STAFF_NOT_FOUND, "agency.staff_not_found"));

        if (!Boolean.TRUE.equals(newStaff.getIsActive()) || !"ACTIVE".equals(newStaff.getStatus())) {
            throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified");
        }

        // Prevent assigning to the same staff
        if (req.getOldStaffId() != null && req.getOldStaffId().equals(req.getNewStaffId())) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION, "dispatch.cannot_reassign_to_same_staff");
        }

        // Prevent assigning a staff who reported emergency busy for this booking
        boolean wasCancelledOnThisBooking = bookingStaffAssignmentRepository.existsByBookingIdAndStaffIdAndStatus(
                booking.getId(), newStaff.getId(), AssignmentStatus.EMERGENCY_CANCELLED
        );
        if (wasCancelledOnThisBooking) {
            throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_reported_busy");
        }

        // Prevent assigning a staff who is already active on this booking
        boolean isAlreadyActive = bookingStaffAssignmentRepository.existsByBookingIdAndStaffIdAndStatus(
                booking.getId(), newStaff.getId(), AssignmentStatus.ACTIVE
        );
        if (isAlreadyActive) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION, "dispatch.staff_already_assigned");
        }

        // Replace old assignment if exists
        String oldStaffName = "Chưa có";
        AssignmentRole roleToAssign = AssignmentRole.PRIMARY_MUA;
        BookingStaffAssignmentEntity oldAssignment = null;

        if (req.getOldStaffId() != null) {
            oldAssignment = bookingStaffAssignmentRepository.findByBookingIdAndStaffIdAndStatus(
                    booking.getId(), req.getOldStaffId(), AssignmentStatus.EMERGENCY_CANCELLED
            ).orElse(null);
            if (oldAssignment == null) {
                oldAssignment = bookingStaffAssignmentRepository.findByBookingIdAndStaffIdAndStatus(
                        booking.getId(), req.getOldStaffId(), AssignmentStatus.ACTIVE
                ).orElse(null);
            }
        }

        if (oldAssignment == null) {
            oldAssignment = bookingStaffAssignmentRepository.findByBookingIdAndStatus(
                    booking.getId(), AssignmentStatus.EMERGENCY_CANCELLED
            ).stream().findFirst().orElse(null);
        }

        if (oldAssignment == null) {
            oldAssignment = bookingStaffAssignmentRepository.findByBookingIdAndStatus(
                    booking.getId(), AssignmentStatus.ACTIVE
            ).stream().filter(a -> a.getAssignmentRole() == AssignmentRole.PRIMARY_MUA).findFirst().orElse(null);
        }

        // Reject if this new staff already reported busy for this specific booking
        boolean alreadyReportedBusy = bookingStaffAssignmentRepository.existsByBookingIdAndStaffIdAndStatus(
                booking.getId(), newStaff.getId(), AssignmentStatus.EMERGENCY_CANCELLED
        );
        if (alreadyReportedBusy) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION, "dispatch.staff_reported_busy");
        }

        if (oldAssignment != null) {
            roleToAssign = oldAssignment.getAssignmentRole();
            if (oldAssignment.getStaff() != null && oldAssignment.getStaff().getMua() != null && oldAssignment.getStaff().getMua().getUser() != null) {
                oldStaffName = oldAssignment.getStaff().getMua().getUser().getFullName();
            }
            if (oldAssignment.getStaff() != null && oldAssignment.getStaff().getId().equals(newStaff.getId())) {
                throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION, "dispatch.cannot_reassign_to_same_staff");
            }
            oldAssignment.setStatus(AssignmentStatus.REPLACED);
            oldAssignment.setReplacedByStaff(newStaff);
            bookingStaffAssignmentRepository.saveAndFlush(oldAssignment);

            // Release old staff's calendar slot if still present
            if (oldAssignment.getStaff() != null && oldAssignment.getStaff().getMua() != null) {
                muaCalendarService.releaseSlotByBookingIdAndMuaId(booking.getId(), oldAssignment.getStaff().getMua().getId());
            }
        }

        // Verify qualification of new staff against matrix
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

        StaffMatrixProjection newStaffProj = projections.stream()
                .filter(p -> p.getStaffId().equals(newStaff.getId()))
                .findFirst()
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified"));

        boolean isNewStaffQualified = Boolean.TRUE.equals(newStaffProj.getHasShift())
                && Boolean.TRUE.equals(newStaffProj.getHasCalendarFree())
                && !Boolean.TRUE.equals(newStaffProj.getHasReportedBusy())
                && (roleToAssign != AssignmentRole.PRIMARY_MUA
                    || (Boolean.TRUE.equals(newStaffProj.getHasPackage()) && Boolean.TRUE.equals(newStaffProj.getHasStyle())));

        if (!isNewStaffQualified) {
            throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified");
        }

        // Create new active assignment
        BookingStaffAssignmentEntity newAssignment = BookingStaffAssignmentEntity.builder()
                .booking(booking)
                .staff(newStaff)
                .assignmentRole(roleToAssign)
                .status(AssignmentStatus.ACTIVE)
                .assignedAt(OffsetDateTime.now())
                .build();
        bookingStaffAssignmentRepository.save(newAssignment);

        // Lock calendar slot for new staff
        muaCalendarService.lockSlotForBooking(
                newStaff.getMua().getId(),
                booking.getId(),
                bookingDate,
                startTs,
                endTs,
                "EMERGENCY_REASSIGNMENT_" + roleToAssign.name()
        );

        if (roleToAssign == AssignmentRole.PRIMARY_MUA) {
            booking.setMua(newStaff.getMua());
        }

        // Check if there are other unfulfilled emergency roles
        boolean hasRemainingEmergency = bookingStaffAssignmentRepository.findByBookingIdAndStatus(
                booking.getId(), AssignmentStatus.EMERGENCY_CANCELLED
        ).stream().anyMatch(ea -> !bookingStaffAssignmentRepository.existsByBookingIdAndStaffIdAndStatus(
                booking.getId(), ea.getStaff().getId(), AssignmentStatus.ACTIVE
        ));

        if (!hasRemainingEmergency) {
            booking.setNeedsEmergencyReassignment(false);
            booking.setEmergencyReason(null);
        }

        BookingEntity savedBooking = bookingRepository.save(booking);

        log.info("Reassigned staff {} for booking {} with role {}",
                newStaff.getId(), savedBooking.getBookingCode(), roleToAssign);

        // Audit log transition into booking_history
        boolean isEnReassign = isEnglishLocale();
        String newStaffFullName = (newStaff.getMua() != null && newStaff.getMua().getUser() != null)
                ? newStaff.getMua().getUser().getFullName() : (isEnReassign ? "New Artist" : "Chuyên viên mới");
        String reassignNote = isEnReassign
                ? ("Studio reassigned staff from " + oldStaffName + " to " + newStaffFullName + " (Reason: " + req.getReassignmentReason() + ")")
                : ("Studio đổi thợ từ " + oldStaffName + " sang " + newStaffFullName + " (Lý do: " + req.getReassignmentReason() + ")");
        bookingAuditService.logTransition(
                savedBooking,
                savedBooking.getStatus(),
                savedBooking.getStatus(),
                agency.getOwner().getId(),
                reassignNote
        );

        broadcastDispatchUpdate(agency.getId(), savedBooking);

        return EmergencyReassignmentRes.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .oldStaffId(req.getOldStaffId())
                .oldStaffName(oldStaffName)
                .newStaffId(newStaff.getId())
                .newStaffName(newStaff.getMua().getUser().getFullName())
                .role(roleToAssign)
                .emergencyReason(req.getReassignmentReason())
                .emergencyTier("REASSIGNED")
                .reassignedAt(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional
    public void proceedSolo(Long ownerUserId, Long bookingId, ProceedSoloReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = getBookingAndVerifyOwnership(bookingId, agency.getId());

        List<BookingStaffAssignmentEntity> activeAssignments = bookingStaffAssignmentRepository
                .findByBookingIdAndStatus(booking.getId(), AssignmentStatus.ACTIVE);

        if (activeAssignments.isEmpty()) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_CANNOT_DISPATCH_IN_CURRENT_STATUS,
                    "dispatch.cannot_proceed_solo_no_active_staff"
            );
        }

        // Find active primary staff, or promote first active staff to primary
        BookingStaffAssignmentEntity primaryAssignment = activeAssignments.stream()
                .filter(a -> a.getAssignmentRole() == AssignmentRole.PRIMARY_MUA)
                .findFirst()
                .orElse(null);

        if (primaryAssignment == null) {
            primaryAssignment = activeAssignments.get(0);
            primaryAssignment.setAssignmentRole(AssignmentRole.PRIMARY_MUA);
            bookingStaffAssignmentRepository.save(primaryAssignment);
            if (primaryAssignment.getStaff() != null && primaryAssignment.getStaff().getMua() != null) {
                booking.setMua(primaryAssignment.getStaff().getMua());
            }
        }

        AgencyStaffEntity primaryStaff = primaryAssignment.getStaff();
        String primaryStaffName = (primaryStaff != null && primaryStaff.getMua() != null && primaryStaff.getMua().getUser() != null)
                ? primaryStaff.getMua().getUser().getFullName() : "Thợ chính";

        // Mark previous emergency-cancelled staff assignments as REPLACED by solo primary staff
        List<BookingStaffAssignmentEntity> emergencyAssignments = bookingStaffAssignmentRepository
                .findByBookingIdAndStatus(booking.getId(), AssignmentStatus.EMERGENCY_CANCELLED);
        for (BookingStaffAssignmentEntity ea : emergencyAssignments) {
            ea.setStatus(AssignmentStatus.REPLACED);
            ea.setReplacedByStaff(primaryStaff);
            bookingStaffAssignmentRepository.save(ea);

            if (ea.getStaff() != null && ea.getStaff().getMua() != null) {
                muaCalendarService.releaseSlotByBookingIdAndMuaId(booking.getId(), ea.getStaff().getMua().getId());
            }
        }

        // Clear emergency flag on booking
        booking.setNeedsEmergencyReassignment(false);
        booking.setEmergencyReason(null);
        booking.setEmergencyProofUrl(null);
        booking.setEmergencyReportedAt(null);
        BookingEntity savedBooking = bookingRepository.save(booking);

        boolean isEn = isEnglishLocale();
        String noteSuffix = (req != null && req.getResolutionNote() != null && !req.getResolutionNote().isBlank())
                ? (isEn ? " Note: " + req.getResolutionNote().trim() : " Ghi chú: " + req.getResolutionNote().trim())
                : "";
        String auditNote = isEn
                ? ("Studio confirmed artist " + primaryStaffName + " will fulfill the booking solo (no replacement needed)." + noteSuffix)
                : ("Studio xác nhận để thợ " + primaryStaffName + " đảm nhiệm toàn bộ đơn hàng (không cần phân công thêm thợ thay thế)." + noteSuffix);

        bookingAuditService.logTransition(
                savedBooking,
                savedBooking.getStatus(),
                savedBooking.getStatus(),
                agency.getOwner().getId(),
                auditNote
        );

        broadcastDispatchUpdate(agency.getId(), savedBooking);
        log.info("Booking {} emergency resolved as solo assignment for staff {}", savedBooking.getBookingCode(), primaryStaffName);
    }

    @Override
    @Transactional
    public void rejectBooking(Long ownerUserId, Long bookingId, RejectDispatchBookingReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = getBookingAndVerifyOwnership(bookingId, agency.getId());

        if (booking.getStatus() != BookingStatus.PENDING_AGENCY_DISPATCH) {
            throw new CustomBusinessException(ErrorCodes.ERR_CANNOT_DISPATCH_IN_CURRENT_STATUS, "dispatch.cannot_dispatch_in_status");
        }

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setNeedsEmergencyReassignment(false);
        boolean isEnReject = isEnglishLocale();
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
        broadcastDispatchUpdate(agency.getId(), savedBooking);
    }

    @Override
    @Transactional
    public void reportEmergencyBusy(Long muaUserId, Long bookingId, ReportEmergencyBusyReq req) {
        AgencyStaffEntity staff = agencyStaffRepository.findActiveStaffByUserId(muaUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_STAFF_NOT_FOUND, "agency.staff_not_found"));

        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found"));

        BookingStaffAssignmentEntity assignment = bookingStaffAssignmentRepository.findByBookingIdAndStaffIdAndStatus(
                booking.getId(), staff.getId(), AssignmentStatus.ACTIVE
        ).orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ASSIGNMENT_NOT_FOUND, "dispatch.assignment_not_found"));

        LocalDateTime scheduledStart = booking.getScheduledStartTime();
        if (scheduledStart == null && booking.getBookingDate() != null && booking.getStartTime() != null) {
            scheduledStart = booking.getBookingDate().atTime(booking.getStartTime());
        }

        double hoursUntilBooking = 0.0;
        if (scheduledStart != null) {
            hoursUntilBooking = Duration.between(LocalDateTime.now(), scheduledStart).toMinutes() / 60.0;
        }

        String tier;
        if (hoursUntilBooking >= 4.0) {
            tier = "TIER_1_STANDARD";
        } else if (hoursUntilBooking >= 2.0) {
            tier = "TIER_2_URGENT";
        } else {
            tier = "TIER_3_CRITICAL";
        }

        // Critical emergency (< 2 hours) strictly requires incident proof document
        if (hoursUntilBooking < 2.0 && (req.getProofDocumentUrl() == null || req.getProofDocumentUrl().isBlank())) {
            log.warn("Staff {} attempted to report critical emergency for booking {} without proof document (hours remaining: {})",
                    staff.getId(), booking.getBookingCode(), hoursUntilBooking);
            throw new CustomBusinessException(
                    ErrorCodes.ERR_EMERGENCY_PROOF_REQUIRED_CRITICAL,
                    "dispatch.emergency_proof_required_critical",
                    HttpStatus.BAD_REQUEST
            );
        }

        // Cancel staff assignment
        assignment.setStatus(AssignmentStatus.EMERGENCY_CANCELLED);
        assignment.setCancellationReason(req.getEmergencyReason());
        assignment.setProofDocumentUrl(req.getProofDocumentUrl());
        assignment.setCancelledAt(OffsetDateTime.now());
        bookingStaffAssignmentRepository.save(assignment);

        // Immediately release staff's calendar slot for this booking so they are not blocked or causing conflicts
        if (staff.getMua() != null) {
            muaCalendarService.releaseSlotByBookingIdAndMuaId(booking.getId(), staff.getMua().getId());
        }

        // Update booking to trigger emergency reassignment
        booking.setNeedsEmergencyReassignment(true);
        booking.setEmergencyReason(req.getEmergencyReason());
        booking.setEmergencyProofUrl(req.getProofDocumentUrl());
        booking.setEmergencyReportedAt(OffsetDateTime.now());
        BookingEntity savedBooking = bookingRepository.save(booking);

        log.warn("Staff {} reported emergency busy for booking {} (Tier: {}, Hours remaining: {})",
                staff.getId(), savedBooking.getBookingCode(), tier, hoursUntilBooking);

        // Audit log transition into booking_history
        boolean isEnReport = isEnglishLocale();
        String proofUrlPart = (req.getProofDocumentUrl() != null && !req.getProofDocumentUrl().isBlank())
                ? (isEnReport ? " [Proof: " + req.getProofDocumentUrl() + "]" : " [Minh chứng: " + req.getProofDocumentUrl() + "]")
                : "";
        String emergencyNote = (isEnReport ? "Staff reported emergency unavailability: " : "Thợ báo bận đột xuất: ")
                + req.getEmergencyReason() + proofUrlPart;
        bookingAuditService.logTransition(
                savedBooking,
                savedBooking.getStatus(),
                savedBooking.getStatus(),
                muaUserId,
                emergencyNote
        );

        // Publish event for WebSocket alert to Agency
        eventPublisher.publishEvent(EmergencyReassignmentRequestedEvent.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .agencyId(staff.getAgency().getId())
                .staffId(staff.getId())
                .staffName(staff.getMua().getUser().getFullName())
                .role(assignment.getAssignmentRole())
                .emergencyReason(req.getEmergencyReason())
                .emergencyTier(tier)
                .hoursUntilBooking(hoursUntilBooking)
                .scheduledStartTime(scheduledStart)
                .proofDocumentUrl(req.getProofDocumentUrl())
                .build());
    }

    @Override
    @Transactional
    public EmergencyApprovalRes reviewEmergencyReport(Long ownerUserId, Long bookingId, Long staffId, ApproveEmergencyReportReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = getBookingAndVerifyOwnership(bookingId, agency.getId());

        BookingStaffAssignmentEntity assignment = null;
        if (staffId != null) {
            assignment = bookingStaffAssignmentRepository.findByBookingIdAndStaffIdAndStatus(
                    booking.getId(), staffId, AssignmentStatus.EMERGENCY_CANCELLED
            ).orElse(null);
        }
        if (assignment == null) {
            List<BookingStaffAssignmentEntity> emergencyAssignments = bookingStaffAssignmentRepository
                    .findByBookingIdAndStatus(booking.getId(), AssignmentStatus.EMERGENCY_CANCELLED);
            if (emergencyAssignments.isEmpty()) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_ASSIGNMENT_NOT_FOUND, "dispatch.assignment_not_found"
                );
            }
            assignment = emergencyAssignments.stream()
                    .sorted((a1, a2) -> {
                        if (a1.getCancelledAt() != null && a2.getCancelledAt() != null) {
                            return a2.getCancelledAt().compareTo(a1.getCancelledAt());
                        }
                        return Long.compare(a2.getId() != null ? a2.getId() : 0L, a1.getId() != null ? a1.getId() : 0L);
                    })
                    .findFirst()
                    .orElse(emergencyAssignments.get(0));
        }

        AgencyStaffEntity staff = assignment.getStaff();
        String staffName = (staff != null && staff.getMua() != null && staff.getMua().getUser() != null)
                ? staff.getMua().getUser().getFullName() : "Thợ trang điểm";

        boolean isEn = isEnglishLocale();
        String reportedReason = assignment.getCancellationReason() != null ? assignment.getCancellationReason() : booking.getEmergencyReason();
        String proofUrl = assignment.getProofDocumentUrl() != null ? assignment.getProofDocumentUrl() : booking.getEmergencyProofUrl();
        String reviewNote = (req.getAdminReviewNote() != null && !req.getAdminReviewNote().isBlank()) ? req.getAdminReviewNote().trim() : null;
        String proofSuffix = (proofUrl != null && !proofUrl.isBlank())
                ? (isEn ? " [Proof: " + proofUrl + "]" : " [Minh chứng: " + proofUrl + "]")
                : "";

        if (Boolean.TRUE.equals(req.getApproved())) {
            // Chấp thuận báo bận: Giữ cờ emergency, ghi nhận note duyệt
            if (reviewNote != null) {
                String existingNote = assignment.getDispatchNotes() != null ? assignment.getDispatchNotes() + " | " : "";
                assignment.setDispatchNotes(existingNote + "Studio duyệt: " + reviewNote);
                bookingStaffAssignmentRepository.save(assignment);
            }

            String auditNote = isEn
                    ? ("Studio APPROVED emergency unavailability for artist: " + staffName + ". Reason: " + (reportedReason != null ? reportedReason : "N/A") + proofSuffix + ". Review Note: " + (reviewNote != null ? reviewNote : "None"))
                    : ("Studio CHẤP THUẬN đơn báo bận của thợ: " + staffName + ". Lý do: " + (reportedReason != null ? reportedReason : "Không rõ") + proofSuffix + ". Ghi chú duyệt: " + (reviewNote != null ? reviewNote : "Không"));
            bookingAuditService.logTransition(
                    booking,
                    booking.getStatus(),
                    booking.getStatus(),
                    ownerUserId,
                    auditNote
            );
        } else {
            // Từ chối báo bận: Khôi phục thợ về trạng thái ACTIVE, khóa lại lịch, tắt cờ emergency
            assignment.setStatus(AssignmentStatus.ACTIVE);
            if (reviewNote != null) {
                String existingNote = assignment.getDispatchNotes() != null ? assignment.getDispatchNotes() + " | " : "";
                assignment.setDispatchNotes(existingNote + "Studio từ chối duyệt: " + reviewNote);
            }
            assignment.setCancellationReason(null);
            assignment.setProofDocumentUrl(null);
            assignment.setCancelledAt(null);
            bookingStaffAssignmentRepository.save(assignment);

            // Re-lock calendar slot for staff
            if (staff != null && staff.getMua() != null) {
                LocalDate bookingDate = booking.getBookingDate();
                LocalTime startTime = booking.getStartTime();
                int duration = (booking.getServicePackage() != null && booking.getServicePackage().getEstimatedDurationMinutes() != null)
                        ? booking.getServicePackage().getEstimatedDurationMinutes() : 60;
                LocalTime endTime = startTime.plusMinutes(duration);
                OffsetDateTime startTs = bookingDate.atTime(startTime).atOffset(VIETNAM_OFFSET);
                OffsetDateTime endTs = bookingDate.atTime(endTime).atOffset(VIETNAM_OFFSET);

                muaCalendarService.lockSlotForBooking(
                        staff.getMua().getId(),
                        booking.getId(),
                        bookingDate,
                        startTs,
                        endTs,
                        "ASSIGNED_" + assignment.getAssignmentRole().name()
                );
            }

            booking.setNeedsEmergencyReassignment(false);
            booking.setEmergencyReason(null);
            booking.setEmergencyProofUrl(null);
            booking.setEmergencyReportedAt(null);
            bookingRepository.save(booking);

            String auditNote = isEn
                    ? ("Studio REJECTED emergency unavailability for artist: " + staffName + ". Artist restored to active duty. Reason: " + (reportedReason != null ? reportedReason : "N/A") + proofSuffix + ". Rejection Note: " + (reviewNote != null ? reviewNote : "None"))
                    : ("Studio TỪ CHỐI đơn báo bận của thợ: " + staffName + ". Thợ được khôi phục về ca trực. Lý do báo bận: " + (reportedReason != null ? reportedReason : "Không rõ") + proofSuffix + ". Ghi chú từ chối: " + (reviewNote != null ? reviewNote : "Không"));
            bookingAuditService.logTransition(
                    booking,
                    booking.getStatus(),
                    booking.getStatus(),
                    ownerUserId,
                    auditNote
            );
        }

        log.info("Agency {} reviewed emergency report for booking {}, staffId={}: approved={}, note={}",
                agency.getId(), booking.getBookingCode(), staff.getId(), req.getApproved(), req.getAdminReviewNote());

        return EmergencyApprovalRes.builder()
                .bookingId(booking.getId())
                .staffId(staff.getId())
                .approved(req.getApproved())
                .adminReviewNote(req.getAdminReviewNote())
                .reviewedAt(LocalDateTime.now())
                .build();
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
                ? assignment.getStaff().getMua().getUser().getFullName() : (isEnglishLocale() ? "Artist" : "Chuyên viên");
        boolean isEnConfirm = isEnglishLocale();
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

    private AgencyProfileEntity getAgencyByOwnerUserId(Long ownerUserId) {
        return agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND, "agency.profile_not_found", HttpStatus.NOT_FOUND));
    }

    private BookingEntity getBookingAndVerifyOwnership(Long bookingId, Long agencyId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getAgency() == null || !booking.getAgency().getId().equals(agencyId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_AGENCY_ACCESS_DENIED, "agency.access_denied", HttpStatus.FORBIDDEN);
        }
        return booking;
    }

    private void broadcastDispatchUpdate(Long agencyId, BookingEntity booking) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "DISPATCH_STATUS_UPDATED");
            payload.put("bookingId", booking.getId());
            payload.put("bookingCode", booking.getBookingCode());
            payload.put("status", booking.getStatus().name());
            payload.put("needsEmergencyReassignment", booking.getNeedsEmergencyReassignment());
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/agency/" + agencyId + "/bookings", payload);
        } catch (Exception e) {
            log.error("Failed to broadcast dispatch update for bookingId={}", booking.getId(), e);
        }
    }
}
