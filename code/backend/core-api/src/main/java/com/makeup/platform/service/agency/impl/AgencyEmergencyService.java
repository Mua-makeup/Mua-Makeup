package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.agency.ApproveEmergencyReportReq;
import com.makeup.platform.dto.request.agency.ProceedSoloReq;
import com.makeup.platform.dto.request.agency.ReassignStaffReq;
import com.makeup.platform.dto.request.agency.ReportEmergencyBusyReq;
import com.makeup.platform.dto.response.agency.EmergencyApprovalRes;
import com.makeup.platform.dto.response.agency.EmergencyReassignmentRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.StaffMatrixRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.repository.custom.projection.StaffMatrixProjection;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.mua.MUACalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyEmergencyService {
    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);
    private final BookingRepository bookingRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final StaffMatrixRepository staffMatrixRepository;
    private final MUACalendarService muaCalendarService;
    private final BookingAuditService bookingAuditService;
    private final RedissonClient redissonClient;
    private final TransactionTemplate transactionTemplate;
    private final ApplicationEventPublisher eventPublisher;
    private final AgencyDispatchSupport support;

    public EmergencyReassignmentRes reassignStaff(Long ownerUserId, Long bookingId, ReassignStaffReq req) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(ownerUserId);

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
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());

        LocalDate bookingDate = booking.getBookingDate();
        LocalTime startTime = booking.getStartTime();
        int duration = support.getBookingDurationMinutes(booking);
        LocalTime endTime = startTime.plusMinutes(duration);
        OffsetDateTime startTs = bookingDate.atTime(startTime).atOffset(VIETNAM_OFFSET);
        OffsetDateTime endTs = bookingDate.atTime(endTime).atOffset(VIETNAM_OFFSET);

        AgencyStaffEntity newStaff = support.findAgencyStaff(req.getNewStaffId(), agency.getId());

        support.validateActiveStaff(newStaff);

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
        BookingStaffAssignmentEntity oldAssignment = support.findAssignmentToReplace(booking.getId(), req.getOldStaffId());

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

        StaffMatrixProjection newStaffProj = support.findStaffProjection(projections, newStaff.getId());

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
        boolean isEnReassign = support.isEnglishLocale();
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

        support.broadcastDispatchUpdate(agency.getId(), savedBooking);

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

    @Transactional
    public void proceedSolo(Long ownerUserId, Long bookingId, ProceedSoloReq req) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());

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

        boolean isEn = support.isEnglishLocale();
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

        support.broadcastDispatchUpdate(agency.getId(), savedBooking);
        log.info("Booking {} emergency resolved as solo assignment for staff {}", savedBooking.getBookingCode(), primaryStaffName);
    }

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
        boolean isEnReport = support.isEnglishLocale();
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

    @Transactional
    public EmergencyApprovalRes reviewEmergencyReport(Long ownerUserId, Long bookingId, Long staffId, ApproveEmergencyReportReq req) {
        AgencyProfileEntity agency = support.getAgencyByOwnerUserId(ownerUserId);
        BookingEntity booking = support.getBookingAndVerifyOwnership(bookingId, agency.getId());

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

        boolean isEn = support.isEnglishLocale();
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
}
