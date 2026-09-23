package com.makeup.platform.controller.notification;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.notification.NotificationRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController extends BaseController {

    private final NotificationService notificationService;
    private final AgencyProfileRepository agencyProfileRepository;

    private Long resolveAgencyId(Long userId) {
        if (userId == null) {
            return null;
        }
        return agencyProfileRepository.findByOwnerId(userId)
                .map(AgencyProfileEntity::getId)
                .orElse(null);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationRes>>> getNotifications(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long agencyId = resolveAgencyId(userId);
        Pageable pageable = PageRequest.of(page, size);
        Page<NotificationRes> result = notificationService.getNotificationsForUser(userId, agencyId, pageable);
        return ok(result);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @AuthenticationPrincipal Long userId) {
        Long agencyId = resolveAgencyId(userId);
        long count = notificationService.getUnreadCount(userId, agencyId);
        return ok(Map.of("unreadCount", count));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationRes>> markAsRead(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        NotificationRes res = notificationService.markAsRead(id, userId);
        return ok(res);
    }

    @PatchMapping("/{id}/toggle-read")
    public ResponseEntity<ApiResponse<NotificationRes>> toggleRead(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        NotificationRes res = notificationService.toggleRead(id, userId);
        return ok(res);
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal Long userId) {
        Long agencyId = resolveAgencyId(userId);
        notificationService.markAllAsRead(userId, agencyId);
        return ok(null);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        notificationService.deleteNotification(id, userId);
        return ok(null);
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<Void>> clearAllNotifications(
            @AuthenticationPrincipal Long userId) {
        Long agencyId = resolveAgencyId(userId);
        notificationService.clearAllNotifications(userId, agencyId);
        return ok(null);
    }
}
