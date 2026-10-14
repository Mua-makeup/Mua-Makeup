package com.makeup.platform.service.interaction;

import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.dto.response.notification.NotificationRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public interface NotificationService {

    default Page<NotificationRes> getNotificationsForUser(Long userId, Long agencyId, Pageable pageable) {
        return getNotificationsForUser(userId, agencyId, null, null, pageable);
    }

    Page<NotificationRes> getNotificationsForUser(Long userId, Long agencyId, Boolean isRead, String type, Pageable pageable);

    long getUnreadCount(Long userId, Long agencyId);

    NotificationRes markAsRead(Long id, Long currentUserId);

    NotificationRes toggleRead(Long id, Long currentUserId);

    void markAllAsRead(Long userId, Long agencyId);

    void deleteNotification(Long id, Long currentUserId);

    void clearAllNotifications(Long userId, Long agencyId);

    NotificationEntity createBookingNotification(ScheduledBookingCreatedEvent event);

    NotificationEntity createStaffApplicationNotification(
            AgencyProfileEntity agency,
            MuaProfileEntity mua,
            String inviteCode,
            Long staffId
    );

    void createCertificateUploadedNotification(
            MuaProfileEntity mua,
            String certName,
            String imageUrl
    );

    void createCertificateVerificationResultNotification(
            MuaProfileEntity mua,
            String certName,
            boolean isVerified,
            String notes
    );

    void createStaffApplicationResultNotification(
            AgencyProfileEntity agency,
            MuaProfileEntity mua,
            boolean isApproved,
            BigDecimal commissionRate,
            String notes
    );

    NotificationEntity createEmergencyNotification(EmergencyReassignmentRequestedEvent event);

    void createDisputeNotification(BookingEntity booking);

    void createStaffBlockedTimeNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            LocalDate blockDate,
            LocalTime startTime,
            LocalTime endTime,
            String reason
    );

    void createEmergencyReviewResultNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            BookingEntity booking,
            boolean isApproved,
            String adminReviewNote
    );

    void createSoloPromotionOfferNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            BookingEntity booking,
            BigDecimal newCommissionRate,
            String resolutionNote
    );

    void createStaffDispatchedNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            BookingEntity booking,
            String roleName,
            BigDecimal commissionRate
    );

    void createOvertimeReportSubmittedNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            AgencyStaffOvertimeReportEntity report
    );

    void createOvertimeApprovedNotification(
            UserEntity staffUser,
            AgencyProfileEntity agency,
            String bookingCode,
            Integer overtimeMinutes,
            BigDecimal allowanceAmount
    );

    void sendNotification(Long userId, String title, String content, String type, Long bookingId);
}

