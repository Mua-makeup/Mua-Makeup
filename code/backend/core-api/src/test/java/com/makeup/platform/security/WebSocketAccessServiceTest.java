package com.makeup.platform.security;

import com.makeup.platform.common.utils.JwtUtils;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.auth.RoleEntity;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.repository.*;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.service.auth.RedisTokenService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebSocketAccessServiceTest {
    @Mock JwtUtils jwtUtils;
    @Mock RedisTokenService redisTokenService;
    @Mock UserRepository userRepository;
    @Mock AgencyProfileRepository agencyProfileRepository;
    @Mock MuaProfileRepository muaProfileRepository;
    @Mock BookingRepository bookingRepository;
    @Mock BookingStaffAssignmentRepository assignmentRepository;
    @InjectMocks WebSocketAccessService service;

    private UserEntity user(long id) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setIsActive(true);
        return user;
    }

    @Test
    void rejectsInvalidJwt() {
        when(jwtUtils.validateToken("invalid")).thenThrow(new IllegalArgumentException());
        assertThrows(AccessDeniedException.class, () -> service.authenticate("invalid"));
        verifyNoInteractions(userRepository);
    }

    @Test
    void rejectsRefreshToken() {
        assertThrows(AccessDeniedException.class, () -> service.authenticate("refresh"));
        verifyNoInteractions(userRepository);
    }

    @Test
    void rejectsRevokedAccessToken() {
        when(jwtUtils.isAccessToken("access")).thenReturn(true);
        when(redisTokenService.isTokenBlacklisted("access")).thenReturn(true);
        assertThrows(AccessDeniedException.class, () -> service.authenticate("access"));
    }

    @Test
    void checksAccountActivityOnEveryAuthentication() {
        UserEntity account = user(1);
        when(jwtUtils.isAccessToken("access")).thenReturn(true);
        when(jwtUtils.getUserId("access")).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(account));
        assertSame(account, service.authenticate("access"));
        account.setIsActive(false);
        assertThrows(AccessDeniedException.class, () -> service.authenticate("access"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/topic/agency/bookings", "/topic/instant-dismiss", "/topic/**",
            "/queue/notifications", "/user/2/queue/notifications", "/topic/user-notifications/2",
            "/topic/user-notifications/1/", "/topic/user-notifications/01", "/app/telemetry/location",
            "/topic/admin/notifications", "/topic/unknown/1", "/topic/user-notifications/999999999999999999999"})
    void deniesUnknownGlobalAndOtherUsersDestinations(String destination) {
        assertFalse(service.canSubscribe(user(1), destination));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/user/queue/offers", "/user/queue/notifications", "/user/queue/telemetry",
            "/topic/user-notifications/1", "/topic/staff-leave-status/1", "/topic/customer-bookings/1"})
    void allowsOwnDestinations(String destination) {
        assertTrue(service.canSubscribe(user(1), destination));
    }

    @Test
    void checksMuaIdRatherThanAssumingItEqualsUserId() {
        MuaProfileEntity mua = new MuaProfileEntity();
        mua.setId(42L);
        when(muaProfileRepository.findByUserId(1L)).thenReturn(Optional.of(mua));
        assertTrue(service.canSubscribe(user(1), "/topic/mua-offer/42"));
        assertFalse(service.canSubscribe(user(1), "/topic/mua-offer/1"));
    }

    @Test
    void agencyOwnerCannotReadAnotherAgency() {
        AgencyProfileEntity agency = new AgencyProfileEntity();
        agency.setOwner(user(1));
        when(agencyProfileRepository.findByIdWithOwner(5L)).thenReturn(Optional.of(agency));
        assertTrue(service.canSubscribe(user(1), "/topic/agency/5/bookings"));
        assertFalse(service.canSubscribe(user(2), "/topic/agency/5/bookings"));
    }

    @Test
    void customerCanReadOnlyTheirBookingAndCannotPublishGps() {
        BookingEntity booking = new BookingEntity();
        booking.setId(10L);
        booking.setCustomer(user(1));
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        assertTrue(service.canSubscribe(user(1), "/topic/booking-status/10"));
        assertFalse(service.canSubscribe(user(2), "/topic/gps-stream/10"));
        assertFalse(service.canSendTelemetry(1L, 10L));
    }

    @Test
    void assignedMuaCanPublishOnlyTheirBooking() {
        MuaProfileEntity mua = new MuaProfileEntity();
        mua.setUser(user(2));
        BookingEntity booking = new BookingEntity();
        booking.setId(10L);
        booking.setMua(mua);
        when(muaProfileRepository.findByUserId(2L)).thenReturn(Optional.of(mua));
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        assertTrue(service.canSendTelemetry(2L, 10L));
        assertFalse(service.canSendTelemetry(2L, 11L));
    }

    @Test
    void activeAssignedStaffLosesAccessWhenMembershipEnds() {
        MuaProfileEntity mua = new MuaProfileEntity();
        mua.setUser(user(2));
        AgencyStaffEntity staff = new AgencyStaffEntity();
        staff.setMua(mua);
        staff.setIsActive(true);
        staff.setStatus("ACTIVE");
        BookingStaffAssignmentEntity assignment = new BookingStaffAssignmentEntity();
        assignment.setStaff(staff);
        BookingEntity booking = new BookingEntity();
        booking.setId(10L);
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(assignmentRepository.findWithStaffAndUserByBookingIdAndStatus(10L, AssignmentStatus.ACTIVE))
                .thenReturn(List.of(assignment));
        assertTrue(service.canSubscribe(user(2), "/topic/gps-stream/10"));
        staff.setIsActive(false);
        assertFalse(service.canSubscribe(user(2), "/topic/gps-stream/10"));
    }

    @Test
    void administratorStillCannotSubscribeToUnknownTopics() {
        UserEntity admin = user(1);
        admin.setRole(RoleEntity.builder().name("ROLE_SUPER_ADMIN").build());
        assertTrue(service.canSubscribe(admin, "/topic/admin/notifications"));
        assertFalse(service.canSubscribe(admin, "/topic/anything"));
        assertFalse(service.canSubscribe(admin, "/topic/user-notifications/2"));
    }
}
