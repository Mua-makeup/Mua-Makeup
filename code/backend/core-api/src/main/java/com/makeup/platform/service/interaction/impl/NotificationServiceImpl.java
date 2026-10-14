package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.notification.NotificationRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.mapper.interaction.NotificationMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.interaction.NotificationRepository;
import com.makeup.platform.service.interaction.NotificationService;
import java.time.LocalDate;
import java.time.LocalTime;
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
import com.makeup.platform.service.interaction.UserWebSocketNotificationService;
import com.makeup.platform.service.interaction.ExpoPushNotificationService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
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
    private final UserWebSocketNotificationService userWebSocketNotificationService;
    private final ExpoPushNotificationService expoPushNotificationService;

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationRes> getNotificationsForUser(Long userId, Long agencyId, Pageable pageable) {
        return getNotificationsForUser(userId, agencyId, null, null, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationRes> getNotificationsForUser(Long userId, Long agencyId, Boolean isRead, String type, Pageable pageable) {
        Page<NotificationEntity> page;
        if (isRead != null || StringUtils.hasText(type)) {
            String filterType = StringUtils.hasText(type) ? type.trim() : null;
            page = notificationRepository.findFilteredNotifications(userId, agencyId, isRead, filterType, pageable);
        } else if (agencyId != null) {
            page = notificationRepository.findByAgencyIdAndIsDeletedFalseOrderByCreatedAtDesc(agencyId, pageable);
        } else {
            page = notificationRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId, pageable);
        }
        return page.map(notificationMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, Long agencyId) {
        if (agencyId != null) {
            return notificationRepository.countByAgencyIdAndIsReadFalseAndIsDeletedFalse(agencyId);
        }
        if (userId != null) {
            return notificationRepository.countByUserIdAndIsReadFalseAndIsDeletedFalse(userId);
        }
        return 0;
    }

    private void validateNotificationOwnership(NotificationEntity notification, Long currentUserId) {
        if (currentUserId == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED, "Chưa xác thực người dùng");
        }
        boolean isUserOwner = notification.getUser() != null && currentUserId.equals(notification.getUser().getId());
        boolean isAgencyOwner = notification.getAgency() != null && notification.getAgency().getOwner() != null
                && currentUserId.equals(notification.getAgency().getOwner().getId());
        if (!isUserOwner && !isAgencyOwner) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN, "Bạn không có quyền thao tác trên thông báo này");
        }
    }

    @Override
    @Transactional
    public NotificationRes markAsRead(Long id, Long currentUserId) {
        NotificationEntity notification = notificationRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND, "Thông báo không tồn tại"));

        validateNotificationOwnership(notification, currentUserId);

        notification.setIsRead(true);
        notification = notificationRepository.save(notification);
        return notificationMapper.toResponse(notification);
    }

    @Override
    @Transactional
    public NotificationRes toggleRead(Long id, Long currentUserId) {
        NotificationEntity notification = notificationRepository.findById(id)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND, "Thông báo không tồn tại"));

        validateNotificationOwnership(notification, currentUserId);

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

        validateNotificationOwnership(notification, currentUserId);
        notification.setIsDeleted(true);
        notificationRepository.save(notification);
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

        // Gửi email thông báo tới Chủ Studio (Agency Owner)
        if (agency.getOwner() != null && StringUtils.hasText(agency.getOwner().getEmail())) {
            try {
                emailService.sendAgencyStaffApplicationEmail(
                        agency.getOwner().getEmail(),
                        agency.getOwner().getFullName(),
                        agency.getAgencyName(),
                        muaName,
                        muaPhone != null ? muaPhone : "Chưa cập nhật",
                        inviteCode
                );
            } catch (Exception ex) {
                log.error("[EmailService] Failed to send staff application email to agency owner {}: {}",
                        agency.getOwner().getEmail(), ex.getMessage());
            }
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
    public void createCertificateVerificationResultNotification(
            MuaProfileEntity mua,
            String certName,
            boolean isVerified,
            String notes
    ) {
        if (mua == null || mua.getUser() == null) {
            return;
        }

        UserEntity muaUser = mua.getUser();
        Locale locale = StringUtils.hasText(muaUser.getLanguage())
                ? Locale.forLanguageTag(muaUser.getLanguage())
                : Locale.forLanguageTag("vi");

        String titleKey = isVerified ? "notification.cert_approved_title" : "notification.cert_rejected_title";
        String contentKey = isVerified ? "notification.cert_approved_content" : "notification.cert_rejected_content";

        String defaultTitle = isVerified
                ? "Chứng Chỉ Của Bạn Đã Được Phê Duyệt!"
                : "Chứng Chỉ Chưa Được Phê Duyệt";
        String defaultContent = isVerified
                ? "Chúc mừng! Chứng chỉ '" + certName + "' của bạn đã được Ban Quản Trị phê duyệt. Bạn đã có thể kích hoạt tính năng nhận ca trực tuyến."
                : "Chứng chỉ '" + certName + "' của bạn chưa được phê duyệt. Lý do: " + (StringUtils.hasText(notes) ? notes : "Hồ sơ chưa đạt tiêu chuẩn");

        String title = messageSource.getLocalizedMessage(titleKey, null, defaultTitle, locale);
        String content = messageSource.getLocalizedMessage(
                contentKey,
                new Object[]{certName, notes != null ? notes : ""},
                defaultContent,
                locale
        );

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("muaId", mua.getId());
        metadata.put("certName", certName);
        metadata.put("isVerified", isVerified);
        metadata.put("status", isVerified ? "VERIFIED" : "REJECTED");
        metadata.put("notes", notes);
        metadata.put("verifiedAt", LocalDateTime.now().toString());

        NotificationEntity entity = NotificationEntity.builder()
                .user(muaUser)
                .type(isVerified ? "CERTIFICATE_APPROVED" : "CERTIFICATE_REJECTED")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created certificate verification result notification ID={} for muaUserId={}",
                saved.getId(), muaUser.getId());

        // 1. Gửi WebSocket realtime P2P đích danh (/user/queue/notifications)
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(muaUser.getId());
        userWebSocketNotificationService.sendNotificationToUser(muaUser.getId(), saved, unreadCount);

        // 2. Gửi Email thông báo tới Thợ MUA
        if (StringUtils.hasText(muaUser.getEmail())) {
            try {
                emailService.sendCertificateVerificationResultEmail(
                        muaUser.getEmail(),
                        muaUser.getFullName(),
                        certName,
                        isVerified,
                        notes
                );
            } catch (Exception ex) {
                log.error("[EmailService] Failed to send certificate result email to {}: {}", muaUser.getEmail(), ex.getMessage());
            }
        }

        // 3. Gửi Remote Push Notification tới Màn hình khóa khi thợ tắt app / rời app
        if (StringUtils.hasText(muaUser.getPushToken())) {
            expoPushNotificationService.sendPushNotification(
                    muaUser.getPushToken(),
                    title,
                    content,
                    metadata
            );
        }
    }

    @Override
    @Transactional
    public void createStaffApplicationResultNotification(
            AgencyProfileEntity agency,
            MuaProfileEntity mua,
            boolean isApproved,
            BigDecimal commissionRate,
            String notes
    ) {
        if (mua == null || mua.getUser() == null || agency == null) {
            return;
        }

        UserEntity muaUser = mua.getUser();
        Locale locale = StringUtils.hasText(muaUser.getLanguage())
                ? Locale.forLanguageTag(muaUser.getLanguage())
                : Locale.forLanguageTag("vi");

        String agencyName = agency.getAgencyName() != null ? agency.getAgencyName() : "Studio";
        String titleKey = isApproved ? "notification.staff_app_approved_title" : "notification.staff_app_rejected_title";
        String contentKey = isApproved ? "notification.staff_app_approved_content" : "notification.staff_app_rejected_content";

        String defaultTitle = isApproved
                ? "Chào Mừng Gia Nhập " + agencyName + "!"
                : "Kết Quả Đơn Xin Gia Nhập " + agencyName;
        String commissionStr = commissionRate != null ? commissionRate.stripTrailingZeros().toPlainString() + "%" : "";
        String defaultContent = isApproved
                ? "Chúc mừng bạn đã được Studio " + agencyName + " phê duyệt gia nhập với tỷ lệ hoa hồng " + commissionStr + "."
                : "Studio " + agencyName + " đã từ chối đơn gia nhập của bạn. Ghi chú: " + (StringUtils.hasText(notes) ? notes : "Chưa đáp ứng yêu cầu");

        String title = messageSource.getLocalizedMessage(titleKey, new Object[]{agencyName}, defaultTitle, locale);
        String content = messageSource.getLocalizedMessage(
                contentKey,
                new Object[]{agencyName, commissionStr, notes != null ? notes : ""},
                defaultContent,
                locale
        );

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("agencyId", agency.getId());
        metadata.put("agencyName", agencyName);
        metadata.put("muaId", mua.getId());
        metadata.put("isApproved", isApproved);
        metadata.put("commissionRate", commissionRate);
        metadata.put("notes", notes);
        metadata.put("reviewedAt", LocalDateTime.now().toString());

        NotificationEntity entity = NotificationEntity.builder()
                .user(muaUser)
                .type(isApproved ? "STAFF_APPLICATION_APPROVED" : "STAFF_APPLICATION_REJECTED")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created staff application result notification ID={} for muaUserId={}",
                saved.getId(), muaUser.getId());

        // 1. Gửi WebSocket realtime P2P đích danh (/user/queue/notifications)
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(muaUser.getId());
        userWebSocketNotificationService.sendNotificationToUser(muaUser.getId(), saved, unreadCount);

        // 2. Gửi Email thông báo tới Thợ MUA
        if (StringUtils.hasText(muaUser.getEmail())) {
            try {
                emailService.sendStaffApplicationResultEmail(
                        muaUser.getEmail(),
                        muaUser.getFullName(),
                        agencyName,
                        isApproved,
                        commissionRate,
                        notes
                );
            } catch (Exception ex) {
                log.error("[EmailService] Failed to send staff application result email to {}: {}", muaUser.getEmail(), ex.getMessage());
            }
        }

        // 3. Gửi Remote Push Notification tới Màn hình khóa khi thợ tắt app / rời app
        if (StringUtils.hasText(muaUser.getPushToken())) {
            expoPushNotificationService.sendPushNotification(
                    muaUser.getPushToken(),
                    title,
                    content,
                    metadata
            );
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

    @Override
    @Transactional
    public void createDisputeNotification(BookingEntity booking) {
        if (booking == null) {
            return;
        }

        List<UserEntity> superAdmins = userRepository.findAllByRoleName(SecurityConstants.ROLE_SUPER_ADMIN);
        if (superAdmins == null || superAdmins.isEmpty()) {
            log.warn("[Notification] No Super Admin found to receive dispute notification for bookingId={}", booking.getId());
            return;
        }

        String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "Khách hàng";
        String customerPhone = booking.getCustomer() != null ? booking.getCustomer().getPhoneNumber() : "";
        String muaName = (booking.getMua() != null && booking.getMua().getUser() != null)
                ? booking.getMua().getUser().getFullName()
                : "Chuyên viên make-up";
        String muaPhone = (booking.getMua() != null && booking.getMua().getUser() != null)
                ? booking.getMua().getUser().getPhoneNumber()
                : "";
        String reason = StringUtils.hasText(booking.getEmergencyReason())
                ? booking.getEmergencyReason()
                : "Báo cáo sự cố từ khách hàng/thợ";

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", booking.getId());
        metadata.put("bookingCode", booking.getBookingCode());
        metadata.put("customerName", customerName);
        metadata.put("customerPhone", customerPhone);
        metadata.put("muaName", muaName);
        metadata.put("muaPhone", muaPhone);
        metadata.put("reason", reason);
        metadata.put("proofUrl", booking.getEmergencyProofUrl());
        metadata.put("depositAmount", booking.getDepositAmount());
        metadata.put("totalAmount", booking.getTotalAmount());
        metadata.put("reportedAt", LocalDateTime.now().toString());

        for (UserEntity admin : superAdmins) {
            String title = "Báo Cáo Khiếu Nại: #" + booking.getBookingCode();
            String content = "Đơn #" + booking.getBookingCode() + " có khiếu nại sự cố: " + reason + ". Cần Ban Quản Trị xem xét phân xử.";

            NotificationEntity entity = NotificationEntity.builder()
                    .user(admin)
                    .booking(booking)
                    .type("BOOKING_DISPUTE")
                    .title(title)
                    .content(content)
                    .metadata(metadata)
                    .isRead(false)
                    .build();

            notificationRepository.save(entity);
        }

        // Broadcast realtime qua STOMP WebSocket tới Ban Quản Trị
        try {
            Map<String, Object> payload = new HashMap<>(metadata);
            payload.put("type", "BOOKING_DISPUTE");
            payload.put("id", "dispute-" + booking.getId() + "-" + System.currentTimeMillis());
            payload.put("title", "Báo Cáo Khiếu Nại: #" + booking.getBookingCode());
            payload.put("content", "Đơn #" + booking.getBookingCode() + " có khiếu nại sự cố: " + reason + ".");
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/admin/notifications", payload);
            messagingTemplate.convertAndSend("/topic/admin/disputes", payload);
            log.info("[WebSocket] Sent dispute notification to /topic/admin/notifications for bookingId={}", booking.getId());
        } catch (Exception e) {
            log.error("[WebSocket] Failed to broadcast dispute notification to /topic/admin/notifications", e);
        }
    }

    @Override
    @Transactional
    public void createStaffBlockedTimeNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            LocalDate blockDate,
            LocalTime startTime,
            LocalTime endTime,
            String reason
    ) {
        if (agency == null || staff == null) return;

        UserEntity owner = agency.getOwner();
        UserEntity staffUser = (staff.getMua() != null) ? staff.getMua().getUser() : null;
        String staffName = (staffUser != null && staffUser.getFullName() != null) ? staffUser.getFullName() : "Nhân viên";
        String staffPhone = (staffUser != null && staffUser.getPhoneNumber() != null) ? staffUser.getPhoneNumber() : "Chưa cập nhật";

        String timeStr = startTime.toString().substring(0, 5) + " - " + endTime.toString().substring(0, 5);
        String dateStr = blockDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String title = "Nhân Viên Báo Bận Lịch Cá Nhân";
        String content = "Nhân viên " + staffName + " vừa đăng ký khóa khung giờ bận ngày " + dateStr + " (" + timeStr + "). Lý do: " + (reason != null ? reason : "Bận việc cá nhân");

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("staffId", staff.getId());
        metadata.put("staffName", staffName);
        metadata.put("blockDate", blockDate.toString());
        metadata.put("startTime", startTime.toString());
        metadata.put("endTime", endTime.toString());
        metadata.put("reason", reason);

        NotificationEntity entity = NotificationEntity.builder()
                .agency(agency)
                .user(owner)
                .type("STAFF_BLOCKED_TIME")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);

        // Gửi WebSocket realtime cho Agency
        try {
            Map<String, Object> payload = new HashMap<>(metadata);
            payload.put("id", saved.getId());
            payload.put("type", "STAFF_BLOCKED_TIME");
            payload.put("title", saved.getTitle());
            payload.put("content", saved.getContent());
            payload.put("agencyId", agency.getId());
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/agency-notifications/" + agency.getId(), payload);
            if (owner != null) {
                messagingTemplate.convertAndSendToUser(
                        String.valueOf(owner.getId()),
                        "/queue/notifications",
                        payload
                );
            }
        } catch (Exception e) {
            log.warn("[Notification] Lỗi broadcast WebSocket cho ca bận: {}", e.getMessage());
        }

        // Gửi Email thông báo cho Agency Owner
        if (owner != null && owner.getEmail() != null) {
            try {
                log.info("[Notification] Đang gửi email thông báo nhân viên báo bận tới chủ Studio: {}", owner.getEmail());
                emailService.sendAgencyStaffBlockedTimeNotification(
                        owner.getEmail(),
                        owner.getFullName(),
                        agency.getAgencyName(),
                        staffName,
                        staffPhone,
                        blockDate,
                        startTime,
                        endTime,
                        reason
                );
            } catch (Exception ex) {
                log.error("[Notification] Lỗi gửi email thông báo nhân viên báo bận: {}", ex.getMessage());
            }
        } else {
            log.warn("[Notification] Không thể gửi email: Chủ Studio hoặc email chủ Studio bị thiếu cho agency id={}", agency.getId());
        }
    }

    @Override
    @Transactional
    public NotificationEntity createInAppNotification(
            Long userId,
            Long agencyId,
            Long bookingId,
            String type,
            String title,
            String content,
            Map<String, Object> metadata
    ) {
        UserEntity user = null;
        if (userId != null) {
            user = userRepository.findById(userId).orElse(null);
        }

        AgencyProfileEntity agency = null;
        if (agencyId != null) {
            agency = agencyProfileRepository.findById(agencyId).orElse(null);
        }

        BookingEntity booking = null;
        if (bookingId != null) {
            booking = bookingRepository.findById(bookingId).orElse(null);
        }

        if (user == null && agency != null) {
            user = agency.getOwner();
        }

        NotificationEntity entity = NotificationEntity.builder()
                .user(user)
                .agency(agency)
                .booking(booking)
                .type(type != null ? type : "GENERAL")
                .title(title)
                .content(content)
                .metadata(metadata != null ? new HashMap<>(metadata) : new HashMap<>())
                .isRead(false)
                .isDeleted(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created generic in-app notification ID={}, type={} for userId={}, agencyId={}",
                saved.getId(), type, userId, agencyId);

        // 1. Gửi WebSocket realtime P2P đích danh và Push Notification tới User
        if (user != null) {
            long unreadCount = notificationRepository.countByUserIdAndIsReadFalseAndIsDeletedFalse(user.getId());
            userWebSocketNotificationService.sendNotificationToUser(user.getId(), saved, unreadCount);

            if (StringUtils.hasText(user.getPushToken())) {
                try {
                    expoPushNotificationService.sendPushNotification(
                            user.getPushToken(),
                            title,
                            content,
                            saved.getMetadata()
                    );
                } catch (Exception e) {
                    log.error("[PushNotification] Failed to send push notification to userId={}: {}", user.getId(), e.getMessage());
                }
            }
        }

        // 2. Broadcast realtime qua STOMP WebSocket cho Agency (nếu có)
        if (agency != null) {
            try {
                Map<String, Object> payload = new HashMap<>(saved.getMetadata() != null ? saved.getMetadata() : Map.of());
                payload.put("id", saved.getId());
                payload.put("type", saved.getType());
                payload.put("title", saved.getTitle());
                payload.put("content", saved.getContent());
                payload.put("agencyId", agency.getId());
                payload.put("timestamp", System.currentTimeMillis());

                messagingTemplate.convertAndSend("/topic/agency-notifications/" + agency.getId(), payload);
            } catch (Exception e) {
                log.warn("[WebSocket] Lỗi broadcast WebSocket cho agency id={}: {}", agency.getId(), e.getMessage());
            }
        }

        return saved;
    }

    @Override
    @Transactional
    public void createEmergencyReviewResultNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            BookingEntity booking,
            boolean isApproved,
            String adminReviewNote
    ) {
        if (staff == null || staff.getMua() == null || staff.getMua().getUser() == null || booking == null) {
            return;
        }

        UserEntity staffUser = staff.getMua().getUser();
        Locale locale = StringUtils.hasText(staffUser.getLanguage())
                ? Locale.forLanguageTag(staffUser.getLanguage())
                : Locale.forLanguageTag("vi");

        String agencyName = (agency != null && agency.getAgencyName() != null) ? agency.getAgencyName() : "Studio";
        String bookingCode = booking.getBookingCode() != null ? booking.getBookingCode() : String.valueOf(booking.getId());

        String titleKey = isApproved ? "notification.emergency_review_approved_title" : "notification.emergency_review_rejected_title";
        String contentKey = isApproved ? "notification.emergency_review_approved_content" : "notification.emergency_review_rejected_content";

        String defaultTitle = isApproved
                ? "Studio Đã Duyệt Báo Bận #" + bookingCode
                : "Studio Từ Chối Đơn Báo Bận #" + bookingCode;

        String noteStr = StringUtils.hasText(adminReviewNote) ? adminReviewNote : (isApproved ? "Chấp thuận" : "Vui lòng hoàn thành ca trực");
        String defaultContent = isApproved
                ? "Studio " + agencyName + " đã chấp thuận đơn báo bận của bạn cho đơn #" + bookingCode + ". Bạn được miễn nhiệm ca làm này. Ghi chú: " + noteStr
                : "Studio " + agencyName + " đã từ chối đơn báo bận cho đơn #" + bookingCode + ". Bạn được khôi phục về ca làm việc. Ghi chú: " + noteStr;

        String title = messageSource.getLocalizedMessage(titleKey, new Object[]{bookingCode}, defaultTitle, locale);
        String content = messageSource.getLocalizedMessage(
                contentKey,
                new Object[]{agencyName, bookingCode, noteStr},
                defaultContent,
                locale
        );

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", booking.getId());
        metadata.put("bookingCode", bookingCode);
        metadata.put("agencyId", agency != null ? agency.getId() : null);
        metadata.put("agencyName", agencyName);
        metadata.put("staffId", staff.getId());
        metadata.put("isApproved", isApproved);
        metadata.put("adminReviewNote", adminReviewNote);
        metadata.put("reviewedAt", LocalDateTime.now().toString());

        NotificationEntity entity = NotificationEntity.builder()
                .user(staffUser)
                .booking(booking)
                .agency(agency)
                .type(isApproved ? "EMERGENCY_REPORT_APPROVED" : "EMERGENCY_REPORT_REJECTED")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created emergency review result notification ID={} for staffUserId={}, isApproved={}",
                saved.getId(), staffUser.getId(), isApproved);

        // 1. Gửi WebSocket STOMP P2P đích danh cho Thợ (/user/queue/notifications)
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(staffUser.getId());
        userWebSocketNotificationService.sendNotificationToUser(staffUser.getId(), saved, unreadCount);

        // 2. Gửi Remote Push Notification
        if (StringUtils.hasText(staffUser.getPushToken())) {
            expoPushNotificationService.sendPushNotification(
                    staffUser.getPushToken(),
                    title,
                    content,
                    metadata
            );
        }
    }

    @Override
    @Transactional
    public void createSoloPromotionOfferNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            BookingEntity booking,
            BigDecimal newCommissionRate,
            String resolutionNote
    ) {
        if (staff == null || staff.getMua() == null || staff.getMua().getUser() == null || booking == null) {
            return;
        }

        UserEntity staffUser = staff.getMua().getUser();
        Locale locale = StringUtils.hasText(staffUser.getLanguage())
                ? Locale.forLanguageTag(staffUser.getLanguage())
                : Locale.forLanguageTag("vi");

        String agencyName = (agency != null && agency.getAgencyName() != null) ? agency.getAgencyName() : "Studio";
        String bookingCode = booking.getBookingCode() != null ? booking.getBookingCode() : String.valueOf(booking.getId());
        String rateStr = newCommissionRate != null ? newCommissionRate.stripTrailingZeros().toPlainString() + "%" : "Toàn bộ";

        String title = messageSource.getLocalizedMessage(
                "notification.solo_promotion_offer_title",
                new Object[]{bookingCode},
                "Đề Xuất Đảm Nhiệm Thợ Chính Đơn #" + bookingCode,
                locale
        );
        String content = messageSource.getLocalizedMessage(
                "notification.solo_promotion_offer_content",
                new Object[]{agencyName, bookingCode, rateStr},
                "Studio " + agencyName + " đề xuất bạn đảm nhiệm vai trò Thợ chính cho đơn #" + bookingCode + " với tỷ lệ hoa hồng mới " + rateStr + ". Vui lòng xác nhận bạn có đồng ý làm hay không!",
                locale
        );

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", booking.getId());
        metadata.put("bookingCode", bookingCode);
        metadata.put("agencyId", agency != null ? agency.getId() : null);
        metadata.put("agencyName", agencyName);
        metadata.put("staffId", staff.getId());
        metadata.put("newCommissionRate", newCommissionRate);
        metadata.put("resolutionNote", resolutionNote);
        metadata.put("proposedAt", LocalDateTime.now().toString());

        NotificationEntity entity = NotificationEntity.builder()
                .user(staffUser)
                .booking(booking)
                .agency(agency)
                .type("SOLO_PROMOTION_OFFERED")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created solo promotion offer notification ID={} for staffUserId={}, rate={}",
                saved.getId(), staffUser.getId(), newCommissionRate);

        // 1. Gửi WebSocket STOMP P2P đích danh cho Thợ (/user/queue/notifications)
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(staffUser.getId());
        userWebSocketNotificationService.sendNotificationToUser(staffUser.getId(), saved, unreadCount);

        // 2. Gửi Remote Push Notification
        if (StringUtils.hasText(staffUser.getPushToken())) {
            expoPushNotificationService.sendPushNotification(
                    staffUser.getPushToken(),
                    title,
                    content,
                    metadata
            );
        }
    }

    @Override
    @Transactional
    public void createStaffDispatchedNotification(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            BookingEntity booking,
            String roleName,
            BigDecimal commissionRate
    ) {
        if (staff == null || staff.getMua() == null || staff.getMua().getUser() == null || booking == null) {
            return;
        }

        UserEntity staffUser = staff.getMua().getUser();
        Locale locale = "en".equalsIgnoreCase(staffUser.getLanguage())
                ? Locale.ENGLISH
                : Locale.forLanguageTag("vi");

        String agencyName = (agency != null && agency.getAgencyName() != null) ? agency.getAgencyName() : "Studio";
        String bookingCode = booking.getBookingCode() != null ? booking.getBookingCode() : String.valueOf(booking.getId());
        String rateStr = commissionRate != null ? commissionRate.stripTrailingZeros().toPlainString() + "%" : "tiêu chuẩn";
        String friendlyRole = "PRIMARY_MUA".equalsIgnoreCase(roleName) ? "Thợ chính" : "Thợ phụ (Trợ lý)";

        String title = messageSource.getLocalizedMessage(
                "notification.staff_dispatched_title",
                new Object[]{bookingCode},
                "Phân Công Ca Làm Mới #" + bookingCode,
                locale
        );
        String content = messageSource.getLocalizedMessage(
                "notification.staff_dispatched_content",
                new Object[]{agencyName, bookingCode, friendlyRole, rateStr},
                agencyName + " đã phân công bạn vào ca làm #" + bookingCode + " với vai trò " + friendlyRole + " (Hoa hồng " + rateStr + "). Vui lòng vào xác nhận nhận việc!",
                locale
        );

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", booking.getId());
        metadata.put("bookingCode", bookingCode);
        metadata.put("agencyId", agency != null ? agency.getId() : null);
        metadata.put("agencyName", agencyName);
        metadata.put("staffId", staff.getId());
        metadata.put("role", roleName);
        metadata.put("commissionRate", commissionRate);
        metadata.put("assignedAt", LocalDateTime.now().toString());

        NotificationEntity entity = NotificationEntity.builder()
                .user(staffUser)
                .booking(booking)
                .agency(agency)
                .type("AGENCY_ASSIGNED")
                .title(title)
                .content(content)
                .metadata(metadata)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        log.info("[Notification] Created staff dispatched notification ID={} for staffUserId={}, role={}",
                saved.getId(), staffUser.getId(), roleName);

        // 1. Gửi WebSocket STOMP P2P đích danh cho Thợ (/user/queue/notifications)
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(staffUser.getId());
        userWebSocketNotificationService.sendNotificationToUser(staffUser.getId(), saved, unreadCount);

        // 2. Gửi Remote Push Notification
        if (StringUtils.hasText(staffUser.getPushToken())) {
            expoPushNotificationService.sendPushNotification(
                    staffUser.getPushToken(),
                    title,
                    content,
                    metadata
            );
        }
    }
}
