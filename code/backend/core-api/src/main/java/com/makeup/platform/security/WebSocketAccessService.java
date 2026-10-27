package com.makeup.platform.security;

import com.makeup.platform.common.utils.JwtUtils;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.service.auth.RedisTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WebSocketAccessService {
    private final JwtUtils jwtUtils;
    private final RedisTokenService redisTokenService;
    private final UserRepository userRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingRepository bookingRepository;
    private final BookingStaffAssignmentRepository assignmentRepository;

    private static final Set<String> USER_TOPICS = Set.of("user-notifications", "customer-bookings",
            "customer-wallet", "staff-leave-status", "booking-customer-confirmed-user");
    private static final Set<String> MUA_TOPICS = Set.of("mua-offer", "mua-offer-revoked",
            "mua-scheduled-offer", "mua-dispatch", "mua-scheduled-revoked", "mua-bookings",
            "booking-customer-confirmed", "booking-customer-addons", "booking-customer-rejected", "mua-broadcast");
    private static final Set<String> BOOKING_TOPICS = Set.of("booking-status", "booking-matched",
            "booking-reminders", "booking-expired", "gps-stream", "instant-dismiss", "booking-cancel-requested");
    private static final Set<String> AGENCY_TOPICS = Set.of("bookings", "staff-applications",
            "dispatch-alerts", "leave-requests", "notifications");

    public UserEntity authenticate(String token) {
        try {
            jwtUtils.validateToken(token);
            if (!jwtUtils.isAccessToken(token) || redisTokenService.isTokenBlacklisted(token)) {
                throw new AccessDeniedException("Invalid WebSocket credentials");
            }
            Long userId = jwtUtils.getUserId(token);
            if (userId == null) {
                throw new AccessDeniedException("Invalid WebSocket credentials");
            }
            return userRepository.findById(userId)
                    .filter(user -> Boolean.TRUE.equals(user.getIsActive()))
                    .orElseThrow(() -> new AccessDeniedException("Invalid WebSocket credentials"));
        } catch (RuntimeException exception) {
            throw new AccessDeniedException("Invalid WebSocket credentials");
        }
    }

    public boolean canSubscribe(UserEntity user, String destination) {
        if (destination == null) return false;
        if (Set.of("/user/queue/notifications", "/user/queue/offers", "/user/queue/telemetry").contains(destination)) return true;
        if (Set.of("/topic/admin/notifications", "/topic/admin/disputes").contains(destination)) {
            return isAdmin(user);
        }
        String[] parts = destination.split("/", -1);
        if (parts.length == 5 && "topic".equals(parts[1]) && "agency".equals(parts[2])
                && AGENCY_TOPICS.contains(parts[4])) {
            Long agencyId = parseId(parts[3]);
            return agencyId != null && managesAgency(user, agencyId);
        }
        if (parts.length == 5 && "topic".equals(parts[1]) && "mua".equals(parts[2])
                && "offers".equals(parts[4])) {
            return user.getId().equals(parseId(parts[3]));
        }
        if (parts.length != 4 || !"topic".equals(parts[1])) return false;
        Long resourceId = parseId(parts[3]);
        if (resourceId == null) return false;
        if (USER_TOPICS.contains(parts[2])) return user.getId().equals(resourceId);
        if (MUA_TOPICS.contains(parts[2])) {
            return muaProfileRepository.findByUserId(user.getId())
                    .map(mua -> resourceId.equals(mua.getId())).orElse(false);
        }
        if (Set.of("agency-notifications", "agency-bookings").contains(parts[2])) {
            return managesAgency(user, resourceId);
        }
        if (BOOKING_TOPICS.contains(parts[2])) {
            return bookingRepository.findById(resourceId).map(booking ->
                    isAdmin(user)
                    || (booking.getCustomer() != null && user.getId().equals(booking.getCustomer().getId()))
                    || isAssigned(user.getId(), booking)
                    || (booking.getAgency() != null && managesAgency(user, booking.getAgency().getId())))
                    .orElse(false);
        }
        return false;
    }

    public boolean canSendTelemetry(Long userId, Long bookingId) {
        if (muaProfileRepository.findByUserId(userId).isEmpty()) return false;
        return bookingId == null || bookingRepository.findById(bookingId)
                .map(booking -> isAssigned(userId, booking)).orElse(false);
    }

    private boolean isAssigned(Long userId, BookingEntity booking) {
        if (booking.getMua() != null && booking.getMua().getUser() != null
                && userId.equals(booking.getMua().getUser().getId())) return true;
        return assignmentRepository.findWithStaffAndUserByBookingIdAndStatus(booking.getId(), AssignmentStatus.ACTIVE)
                .stream().anyMatch(assignment -> Boolean.TRUE.equals(assignment.getStaff().getIsActive())
                        && "ACTIVE".equals(assignment.getStaff().getStatus())
                        && userId.equals(assignment.getStaff().getMua().getUser().getId()));
    }

    private boolean managesAgency(UserEntity user, Long agencyId) {
        return isAdmin(user) || agencyProfileRepository.findByIdWithOwner(agencyId)
                .map(agency -> user.getId().equals(agency.getOwner().getId())).orElse(false);
    }

    private boolean isAdmin(UserEntity user) {
        return user.getRole() != null && "ROLE_SUPER_ADMIN".equals(user.getRole().getName());
    }

    private Long parseId(String value) {
        try {
            if (!value.matches("[1-9][0-9]*")) return null;
            return Long.valueOf(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
