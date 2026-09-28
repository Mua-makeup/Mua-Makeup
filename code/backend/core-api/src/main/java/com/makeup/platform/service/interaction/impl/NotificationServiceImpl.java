package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.notification.NotificationRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.mapper.interaction.NotificationMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.interaction.NotificationRepository;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.common.i18n.JsonMessageSource;
import com.makeup.platform.service.mail.EmailService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final AgencyProfileRepository agencyProfileRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final JsonMessageSource messageSource;
    private final EmailService emailService;

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationRes> getNotificationsForUser(Long userId, Long agencyId, Pageable pageable) {
        Page<NotificationEntity> page;
        if (agencyId != null) {
            page = notificationRepository.findByAgencyIdOrderByCreatedAtDesc(agencyId, pageable);
        } else {
            page = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return page.map(notificationMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, Long agencyId) {
        if (agencyId != null) {
            return notificationRepository.countByAgencyIdAndIsReadFalse(agencyId);
        }
        if (userId != null) {
            return notificationRepository.countByUserIdAndIsReadFalse(userId);
        }
        return 0;
    }

    @Override
    @Transactional
    public NotificationRes markAsRead(Long id, Long currentUserId) {
        NotificationEntity notification = notificationRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND, "Thông báo không tồn tại"));

        notification.setIsRead(true);
        notification = notificationRepository.save(notification);
        return notificationMapper.toResponse(notification);
    }

    @Override
    @Transactional
    public NotificationRes toggleRead(Long id, Long currentUserId) {
        NotificationEntity notification = notificationRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND, "Thông báo không tồn tại"));

        notification.setIsRead(!Boolean.TRUE.equals(notification.getIsRead()));
        notification = notificationRepository.save(notification);
        return notificationMapper.toResponse(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId, Long agencyId) {
        if (agencyId != null) {
            notificationRepository.markAllAsReadByAgencyId(agencyId);
        } else if (userId != null) {
            notificationRepository.markAllAsReadByUserId(userId);
        }
    }

    @Override
    @Transactional
    public void deleteNotification(Long id, Long currentUserId) {
        NotificationEntity notification = notificationRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND, "Thông báo không tồn tại"));
        notificationRepository.delete(notification);
    }

    @Override
    @Transactional
    public void clearAllNotifications(Long userId, Long agencyId) {
        if (agencyId != null) {
            notificationRepository.deleteAllByAgencyId(agencyId);
        } else if (userId != null) {
            notificationRepository.deleteAllByUserId(userId);
        }
    }

    @Override
    @Transactional
    public NotificationEntity createBookingNotification(ScheduledBookingCreatedEvent event) {
        AgencyProfileEntity agency = null;
        if (event.getAgencyId() != null) {
            agency = agencyProfileRepository.findById(event.getAgencyId()).orElse(null);
        }

        BookingEntity booking = null;
        if (event.getBookingId() != null) {
            booking = bookingRepository.findById(event.getBookingId())
                    .orElseGet(() -> bookingRepository.getReferenceById(event.getBookingId()));
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", event.getBookingId());
        metadata.put("bookingCode", event.getBookingCode());
        metadata.put("customerName", event.getCustomerName());
        metadata.put("customerPhone", event.getCustomerPhone());
        metadata.put("servicePackageName", event.getServicePackageName());
        metadata.put("bookingDate", event.getBookingDate() != null ? event.getBookingDate().toString() : null);
        metadata.put("startTime", event.getStartTime() != null ? event.getStartTime().toString() : null);
        metadata.put("totalAmount", event.getTotalAmount());
        metadata.put("depositAmount", event.getDepositAmount());

        Locale locale = Locale.forLanguageTag("vi");
        if (agency != null && agency.getOwner() != null && StringUtils.hasText(agency.getOwner().getLanguage())) {
            locale = Locale.forLanguageTag(agency.getOwner().getLanguage());
        }

        String customerName = event.getCustomerName() != null ? event.getCustomerName() : "";
        String packageName = event.getServicePackageName() != null ? event.getServicePackageName() : "";

        String title = messageSource.getLocalizedMessage("notification.new_booking_title", null, "Có Đơn Đặt Lịch Mới!", locale);
        String content = messageSource.getLocalizedMessage(
                "notification.new_booking_content",
                new Object[]{customerName, packageName},
                "Khách hàng " + customerName + " vừa đặt gói " + packageName + ".",
                locale
        );

        NotificationEntity entity = NotificationEntity.builder()
                .agency(agency)
                .user(agency != null ? agency.getOwner() : null)
                .booking(booking)
                .type("NEW_BOOKING")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created in-app notification ID={} for agencyId={}", saved.getId(), event.getAgencyId());
        return saved;
    }

    @Override
    @Transactional
    public NotificationEntity createStaffApplicationNotification(
            AgencyProfileEntity agency,
            MuaProfileEntity mua,
            String inviteCode,
            Long staffId
    ) {
        if (agency == null || mua == null) {
            return null;
        }

        String muaName = (mua.getUser() != null && StringUtils.hasText(mua.getUser().getFullName()))
                ? mua.getUser().getFullName()
                : "Thợ MUA #" + mua.getId();
        String muaPhone = (mua.getUser() != null) ? mua.getUser().getPhoneNumber() : null;
        String muaAvatar = (mua.getUser() != null) ? mua.getUser().getAvatarUrl() : null;

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("staffId", staffId);
        metadata.put("muaId", mua.getId());
        metadata.put("muaUserId", mua.getUser() != null ? mua.getUser().getId() : null);
        metadata.put("muaName", muaName);
        metadata.put("muaPhone", muaPhone);
        metadata.put("muaAvatar", muaAvatar);
        metadata.put("inviteCode", inviteCode);
        metadata.put("appliedAt", LocalDateTime.now().toString());

        Locale locale = Locale.forLanguageTag("vi");
        if (agency.getOwner() != null && StringUtils.hasText(agency.getOwner().getLanguage())) {
            locale = Locale.forLanguageTag(agency.getOwner().getLanguage());
        }

        String title = messageSource.getLocalizedMessage("notification.staff_application_title", null, "Có Đơn Gia Nhập Mới!", locale);
        String content = messageSource.getLocalizedMessage(
                "notification.staff_application_content",
                new Object[]{muaName, inviteCode},
                "Thợ trang điểm " + muaName + " vừa nộp đơn xin gia nhập Studio qua mã mời " + inviteCode + ". Vui lòng xem xét phê duyệt.",
                locale
        );

        NotificationEntity entity = NotificationEntity.builder()
                .agency(agency)
                .user(agency.getOwner())
                .type("STAFF_APPLICATION")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created staff application notification ID={} for agencyId={}", saved.getId(), agency.getId());

        // Broadcast realtime qua STOMP WebSocket
        try {
            Map<String, Object> payload = new HashMap<>(metadata);
            payload.put("id", saved.getId());
            payload.put("type", "STAFF_APPLICATION");
            payload.put("title", saved.getTitle());
            payload.put("content", saved.getContent());
            payload.put("agencyId", agency.getId());
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/agency/" + agency.getId() + "/staff-applications", payload);
            messagingTemplate.convertAndSend("/topic/agency/" + agency.getId() + "/notifications", payload);
            log.info("[WebSocket] Sent staff application notification to /topic/agency/{}/staff-applications", agency.getId());
        } catch (Exception e) {
            log.error("[WebSocket] Failed to broadcast staff application notification for agencyId={}", agency.getId(), e);
        }

        return saved;
    }

    @Override
    @Transactional
    public void createCertificateUploadedNotification(
            MuaProfileEntity mua,
            String certName,
            String imageUrl
    ) {
        if (mua == null) {
            return;
        }

        String muaName = (mua.getUser() != null && StringUtils.hasText(mua.getUser().getFullName()))
                ? mua.getUser().getFullName()
                : "Thợ MUA #" + mua.getId();
        String muaPhone = (mua.getUser() != null) ? mua.getUser().getPhoneNumber() : null;

        List<UserEntity> superAdmins = userRepository.findAllByRoleName(SecurityConstants.ROLE_SUPER_ADMIN);
        if (superAdmins == null || superAdmins.isEmpty()) {
            log.warn("[Notification] No Super Admin found to receive certificate upload notification");
            return;
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("muaId", mua.getId());
        metadata.put("muaUserId", mua.getUser() != null ? mua.getUser().getId() : null);
        metadata.put("muaName", muaName);
        metadata.put("muaPhone", muaPhone);
        metadata.put("certName", certName);
        metadata.put("imageUrl", imageUrl);
        metadata.put("uploadedAt", LocalDateTime.now().toString());

        for (UserEntity admin : superAdmins) {
            Locale locale = (admin != null && StringUtils.hasText(admin.getLanguage()))
                    ? Locale.forLanguageTag(admin.getLanguage())
                    : Locale.forLanguageTag("vi");

            String title = messageSource.getLocalizedMessage("notification.certificate_upload_title", null, "Chứng Chỉ Mới Cần Duyệt!", locale);
            String content = messageSource.getLocalizedMessage(
                    "notification.certificate_upload_content",
                    new Object[]{muaName, certName},
                    "Thợ trang điểm " + muaName + " vừa tải lên chứng chỉ '" + certName + "' cần được Ban Quản Trị phê duyệt.",
                    locale
            );

            NotificationEntity entity = NotificationEntity.builder()
                    .user(admin)
                    .type("CERTIFICATE_VERIFICATION")
                    .title(title)
                    .content(content)
                    .metadata(metadata)
                    .isRead(false)
                    .build();

            notificationRepository.save(entity);
        }

        // Broadcast realtime qua STOMP WebSocket tới Ban Quản Trị
        try {
            Locale defaultLocale = Locale.forLanguageTag("vi");
            String defaultTitle = messageSource.getLocalizedMessage("notification.certificate_upload_title", null, "Chứng Chỉ Mới Cần Duyệt!", defaultLocale);
            String defaultContent = messageSource.getLocalizedMessage(
                    "notification.certificate_upload_content",
                    new Object[]{muaName, certName},
                    "Thợ trang điểm " + muaName + " vừa tải lên chứng chỉ '" + certName + "' cần được Ban Quản Trị phê duyệt.",
                    defaultLocale
            );

            Map<String, Object> payload = new HashMap<>(metadata);
            payload.put("type", "CERTIFICATE_VERIFICATION");
            payload.put("title", defaultTitle);
            payload.put("content", defaultContent);
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/admin/notifications", payload);
            log.info("[WebSocket] Sent certificate upload notification to /topic/admin/notifications for muaId={}", mua.getId());
        } catch (Exception e) {
            log.error("[WebSocket] Failed to broadcast certificate notification to /topic/admin/notifications", e);
        }

        // Gửi email thông báo tới từng Super Admin
        String uploadedTimeFormatted = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy"));
        for (UserEntity admin : superAdmins) {
            if (admin != null && StringUtils.hasText(admin.getEmail())) {
                try {
                    emailService.sendAdminCertificateUploadNotification(
                            admin.getEmail(),
                            admin.getFullName(),
                            muaName,
                            muaPhone != null ? muaPhone : "Chưa cập nhật",
                            certName,
                            imageUrl,
                            uploadedTimeFormatted
                    );
                } catch (Exception ex) {
                    log.error("[EmailService] Failed to send certificate notification email to {}: {}",
                            admin.getEmail(), ex.getMessage());
                }
            }
        }
    }

    @Override
    @Transactional
    public NotificationEntity createEmergencyNotification(EmergencyReassignmentRequestedEvent event) {
        AgencyProfileEntity agency = null;
        if (event.getAgencyId() != null) {
            agency = agencyProfileRepository.findById(event.getAgencyId()).orElse(null);
        }

        BookingEntity booking = null;
        if (event.getBookingId() != null) {
            booking = bookingRepository.findById(event.getBookingId())
                    .orElseGet(() -> bookingRepository.getReferenceById(event.getBookingId()));
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", event.getBookingId());
        metadata.put("bookingCode", event.getBookingCode());
        metadata.put("staffId", event.getStaffId());
        metadata.put("staffName", event.getStaffName());
        metadata.put("role", event.getRole() != null ? event.getRole().name() : null);
        metadata.put("emergencyReason", event.getEmergencyReason());
        metadata.put("emergencyTier", event.getEmergencyTier());
        metadata.put("hoursUntilBooking", event.getHoursUntilBooking());
        metadata.put("scheduledStartTime", event.getScheduledStartTime() != null ? event.getScheduledStartTime().toString() : null);

        Locale locale = Locale.forLanguageTag("vi");
        if (agency != null && agency.getOwner() != null && StringUtils.hasText(agency.getOwner().getLanguage())) {
            locale = Locale.forLanguageTag(agency.getOwner().getLanguage());
        }

        String staffName = event.getStaffName() != null ? event.getStaffName() : "Thợ";
        String bookingCode = event.getBookingCode() != null ? event.getBookingCode() : "";
        String reason = event.getEmergencyReason() != null ? event.getEmergencyReason() : "";

        String title = messageSource.getLocalizedMessage("notification.emergency_title", null, "Cảnh Báo Báo Bận Đột Xuất!", locale);
        String content = messageSource.getLocalizedMessage(
                "notification.emergency_content",
                new Object[]{staffName, bookingCode, reason},
                "Thợ " + staffName + " báo bận đột xuất cho đơn #" + bookingCode + ": " + reason,
                locale
        );

        NotificationEntity entity = NotificationEntity.builder()
                .agency(agency)
                .user(agency != null ? agency.getOwner() : null)
                .booking(booking)
                .type("EMERGENCY_REASSIGNMENT_ALERT")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created emergency in-app notification ID={} for agencyId={}", saved.getId(), event.getAgencyId());
        return saved;
    }
}
