package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.repository.custom.projection.StaffMatrixProjection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import com.makeup.platform.service.booking.BookingMessagePublisher;
import org.springframework.stereotype.Service;

import java.util.Locale;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyDispatchSupport {
    private final BookingRepository bookingRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final BookingMessagePublisher messagePublisher;

    public boolean isEnglishLocale() {
        Locale locale = LocaleContextHolder.getLocale();
        return locale != null && locale.getLanguage().equalsIgnoreCase("en");
    }

    public AgencyStaffEntity findAgencyStaff(Long staffId, Long agencyId) {
        return agencyStaffRepository.findByIdAndAgencyIdWithMuaAndUser(staffId, agencyId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_STAFF_NOT_FOUND, "agency.staff_not_found"));
    }

    public void validateActiveStaff(AgencyStaffEntity staff) {
        if (!Boolean.TRUE.equals(staff.getIsActive()) || !"ACTIVE".equals(staff.getStatus())) {
            throw new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified");
        }
    }

    public StaffMatrixProjection findStaffProjection(List<StaffMatrixProjection> projections, Long staffId) {
        return projections.stream()
                .filter(projection -> projection.getStaffId().equals(staffId))
                .findFirst()
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_DISPATCH_STAFF_UNQUALIFIED, "dispatch.staff_unqualified"));
    }

    public BookingStaffAssignmentEntity findAssignmentToReplace(Long bookingId, Long oldStaffId) {
        BookingStaffAssignmentEntity oldAssignment = null;

        if (oldStaffId != null) {
            oldAssignment = bookingStaffAssignmentRepository.findByBookingIdAndStaffIdAndStatus(
                    bookingId, oldStaffId, AssignmentStatus.EMERGENCY_CANCELLED
            ).orElse(null);
            if (oldAssignment == null) {
                oldAssignment = bookingStaffAssignmentRepository.findByBookingIdAndStaffIdAndStatus(
                        bookingId, oldStaffId, AssignmentStatus.ACTIVE
                ).orElse(null);
            }
        }

        if (oldAssignment == null) {
            oldAssignment = bookingStaffAssignmentRepository.findByBookingIdAndStatus(
                    bookingId, AssignmentStatus.EMERGENCY_CANCELLED
            ).stream().findFirst().orElse(null);
        }

        if (oldAssignment == null) {
            oldAssignment = bookingStaffAssignmentRepository.findByBookingIdAndStatus(
                    bookingId, AssignmentStatus.ACTIVE
            ).stream().filter(a -> a.getAssignmentRole() == AssignmentRole.PRIMARY_MUA).findFirst().orElse(null);
        }
        return oldAssignment;
    }

    public int getBookingDurationMinutes(BookingEntity booking) {
        return booking.getServicePackage() != null && booking.getServicePackage().getEstimatedDurationMinutes() != null
                ? booking.getServicePackage().getEstimatedDurationMinutes() : 60;
    }

    public AgencyProfileEntity getAgencyByOwnerUserId(Long ownerUserId) {
        return agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND, "agency.profile_not_found", HttpStatus.NOT_FOUND));
    }

    public BookingEntity getBookingAndVerifyOwnership(Long bookingId, Long agencyId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getAgency() == null || !booking.getAgency().getId().equals(agencyId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_AGENCY_ACCESS_DENIED, "agency.access_denied", HttpStatus.FORBIDDEN);
        }
        return booking;
    }

    public void broadcastDispatchUpdate(Long agencyId, BookingEntity booking) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "DISPATCH_STATUS_UPDATED");
            payload.put("bookingId", booking.getId());
            payload.put("bookingCode", booking.getBookingCode());
            payload.put("status", booking.getStatus().name());
            payload.put("needsEmergencyReassignment", booking.getNeedsEmergencyReassignment());
            payload.put("timestamp", System.currentTimeMillis());

            messagePublisher.send("/topic/agency/" + agencyId + "/bookings", payload);
        } catch (Exception e) {
            log.error("Failed to broadcast dispatch update for bookingId={}", booking.getId(), e);
        }
    }
}
