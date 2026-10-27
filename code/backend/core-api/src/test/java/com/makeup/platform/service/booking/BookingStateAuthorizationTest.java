package com.makeup.platform.service.booking;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.booking.TransitionBookingStateReq;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.*;
import com.makeup.platform.service.booking.impl.BookingStateMachineServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingStateAuthorizationTest {
    @Mock BookingRepository bookings;
    @Mock UserRepository users;
    @Mock BookingStaffAssignmentRepository assignments;
    @Mock com.makeup.platform.repository.MuaProfileRepository profiles;
    @Mock com.makeup.platform.repository.payment.BookingDepositRepository deposits;
    @Mock com.makeup.platform.repository.wallet.WalletHoldRepository holds;
    @Mock com.makeup.platform.mapper.booking.BookingMapper mapper;
    @Mock BookingAuditService audit;
    @Mock org.springframework.context.ApplicationEventPublisher events;
    @Mock com.makeup.platform.service.mua.MUACalendarService calendar;
    @InjectMocks BookingStateMachineServiceImpl service;

    @ParameterizedTest @CsvSource({"ACCEPTED,ON_THE_WAY", "ON_THE_WAY,ARRIVED", "ARRIVED,IN_PROGRESS",
        "IN_PROGRESS,COMPLETED", "COMPLETED,PAID_OUT", "REQUESTED,CANCELLED", "ACCEPTED,DISPUTED",
        "PENDING_AGENCY_DISPATCH,AGENCY_ASSIGNED", "PENDING_DEPOSIT,CANCELLED"})
    void unrelatedUserCannotChangeBooking(BookingStatus from, BookingStatus to) {
        var booking = new BookingEntity(); booking.setId(1L); booking.setStatus(from);
        var user = new UserEntity(); user.setId(999L);
        when(bookings.findById(1L)).thenReturn(Optional.of(booking));
        when(users.findById(999L)).thenReturn(Optional.of(user));
        var req = new TransitionBookingStateReq(); req.setTargetStatus(to.name());
        var error = assertThrows(CustomBusinessException.class, () -> service.transitionState(1L, 999L, req));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals(from, booking.getStatus());
        verify(bookings, never()).save(any());
    }
    static Stream<Arguments> terminalTransitions() {
        return Stream.of(BookingStatus.CANCELLED, BookingStatus.CANCELLED_EXPIRED, BookingStatus.DISPUTE_REFUNDED, BookingStatus.DISPUTE_COMPENSATED)
            .flatMap(from -> Arrays.stream(BookingStatus.values()).map(to -> Arguments.of(from, to)));
    }
    @ParameterizedTest @MethodSource("terminalTransitions")
    void terminalBookingCannotBeReopened(BookingStatus from, BookingStatus to) {
        var booking = new BookingEntity(); booking.setStatus(from);
        when(bookings.findById(1L)).thenReturn(Optional.of(booking));
        when(users.findById(2L)).thenReturn(Optional.of(new UserEntity()));
        var req = new TransitionBookingStateReq(); req.setTargetStatus(to.name());
        var error = assertThrows(CustomBusinessException.class, () -> service.transitionState(1L, 2L, req));
        assertEquals("ERR_INVALID_STATE_TRANSITION", error.getErrorCode());
        assertEquals(from, booking.getStatus());
        verify(bookings, never()).save(any());
    }
    BookingEntity ownedBooking(BookingStatus status) {
        var user = new UserEntity(); user.setId(2L);
        var mua = new com.makeup.platform.entity.mua.MuaProfileEntity(); mua.setUser(user); mua.setId(3L); mua.setIsBusy(true);
        var booking = new BookingEntity(); booking.setId(1L); booking.setStatus(status); booking.setMua(mua);
        when(bookings.findById(1L)).thenReturn(Optional.of(booking));
        when(users.findById(2L)).thenReturn(Optional.of(user));
        return booking;
    }
    @ParameterizedTest @CsvSource({"ON_THE_WAY,ARRIVED", "ARRIVED,IN_PROGRESS", "IN_PROGRESS,COMPLETED"})
    void assignedArtistCanAdvanceBookingWithAuditAndEvent(BookingStatus from, BookingStatus to) {
        var booking = ownedBooking(from); booking.setCompletionPhotoUrl("https://example.test/proof.jpg");
        when(bookings.save(booking)).thenReturn(booking);
        var req = new TransitionBookingStateReq(); req.setTargetStatus(to.name());
        service.transitionState(1L,2L,req);
        assertEquals(to,booking.getStatus());
        verify(audit).logTransition(eq(booking),eq(from),eq(to),eq(2L),anyString());
        verify(events).publishEvent(any(com.makeup.platform.common.event.booking.BookingStateChangedEvent.class));
        if(to == BookingStatus.COMPLETED) {
            assertFalse(booking.getMua().getIsBusy()); verify(calendar).releaseSlotByBookingId(1L);
        }
    }
    @Test void cannotStartTravelWithoutDeposit() {
        var booking=ownedBooking(BookingStatus.ACCEPTED);
        var req=new TransitionBookingStateReq(); req.setTargetStatus("ON_THE_WAY");
        assertEquals("ERR_DEPOSIT_NOT_PAID",assertThrows(CustomBusinessException.class,()->service.transitionState(1L,2L,req)).getErrorCode());
        assertEquals(BookingStatus.ACCEPTED,booking.getStatus()); verify(bookings,never()).save(any());
    }
    @Test void completionRequiresPhotoEvidence() {
        ownedBooking(BookingStatus.IN_PROGRESS);
        var req=new TransitionBookingStateReq(); req.setTargetStatus("COMPLETED");
        assertEquals("ERR_COMPLETION_PHOTO_REQUIRED",assertThrows(CustomBusinessException.class,()->service.transitionState(1L,2L,req)).getErrorCode());
        verify(bookings,never()).save(any());
    }
    @Test void optimisticConflictBecomesHttp409AndDoesNotPublishEvent() {
        var booking=ownedBooking(BookingStatus.ARRIVED);
        when(bookings.save(booking)).thenThrow(new org.springframework.orm.ObjectOptimisticLockingFailureException(BookingEntity.class,1L));
        var req=new TransitionBookingStateReq(); req.setTargetStatus("IN_PROGRESS");
        var ex=assertThrows(CustomBusinessException.class,()->service.transitionState(1L,2L,req));
        assertEquals(HttpStatus.CONFLICT,ex.getStatus()); verifyNoInteractions(events,audit);
    }

    @Test void unknownStatusIsValidationError() {
        var booking = new BookingEntity(); booking.setStatus(BookingStatus.REQUESTED);
        when(bookings.findById(1L)).thenReturn(Optional.of(booking));
        when(users.findById(2L)).thenReturn(Optional.of(new UserEntity()));
        var req = new TransitionBookingStateReq(); req.setTargetStatus("NOT_A_STATUS");
        assertEquals("ERR_INVALID_STATE_TRANSITION", assertThrows(CustomBusinessException.class,
            () -> service.transitionState(1L, 2L, req)).getErrorCode());
    }
}
