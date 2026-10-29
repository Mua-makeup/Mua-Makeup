package com.makeup.platform.service.mua;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.mua.*;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.mua.MUACalendarRepository;
import com.makeup.platform.service.mua.impl.MUACalendarServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmergencyCalendarTest {
    @Mock MUACalendarRepository calendar;
    @Mock MuaProfileRepository profiles;
    @Mock BookingRepository bookings;
    @InjectMocks MUACalendarServiceImpl service;
    final OffsetDateTime start = OffsetDateTime.parse("2026-10-29T09:15:00+07:00");

    void setupSlot(MUACalendarEntity slot) {
        var mua = new MuaProfileEntity(); mua.setId(2L);
        var booking = new BookingEntity(); booking.setId(10L);
        when(profiles.findById(2L)).thenReturn(Optional.of(mua));
        when(bookings.findById(10L)).thenReturn(Optional.of(booking));
        when(calendar.findOverlappingSlots(2L, start, start.plusHours(1))).thenReturn(List.of(slot));
    }

    @Test void personalBusyCannotBeErasedByAssignment() {
        var slot = MUACalendarEntity.builder().slotType(CalendarSlotType.PERSONAL_BLOCKED)
                .isLocked(true).startAt(start).endAt(start.plusHours(1)).build();
        setupSlot(slot);
        assertThrows(CustomBusinessException.class, () -> service.lockSlotForBooking(
                2L, 10L, start.toLocalDate(), start, start.plusHours(1), "ASSIGNED_PRIMARY_MUA"));
        verify(calendar, never()).delete(slot);
        verify(calendar, never()).save(any());
    }

    @Test void emergencyBusySurvivesOriginalBookingCompletion() {
        var oldBooking = new BookingEntity(); oldBooking.setId(9L); oldBooking.setStatus(BookingStatus.COMPLETED);
        var slot = MUACalendarEntity.builder().booking(oldBooking).slotType(CalendarSlotType.PERSONAL_BLOCKED)
                .reason("EMERGENCY_UNAVAILABLE").isLocked(true).startAt(start).endAt(start.plusHours(1)).build();
        setupSlot(slot);
        assertThrows(CustomBusinessException.class, () -> service.lockSlotForBooking(
                2L, 10L, start.toLocalDate(), start, start.plusHours(1), "ASSIGNED_PRIMARY_MUA"));
        verify(calendar, never()).delete(slot);
    }

    @Test void adjacentBusyIntervalDoesNotPreventAssignment() {
        var slot = MUACalendarEntity.builder().slotType(CalendarSlotType.PERSONAL_BLOCKED)
                .isLocked(true).startAt(start.minusHours(1)).endAt(start).build();
        setupSlot(slot);
        service.lockSlotForBooking(2L, 10L, start.toLocalDate(), start, start.plusHours(1), "ASSIGNED_PRIMARY_MUA");
        verify(calendar, never()).delete(slot);
        verify(calendar).save(any(MUACalendarEntity.class));
    }

    @Test void replacementReleasesOnlyAssignmentSlots() {
        service.releaseSlotByBookingIdAndMuaId(10L, 2L);
        verify(calendar).deleteAssignmentSlots(10L, 2L);
        verify(calendar, never()).deleteByBookingIdAndMuaId(any(), any());
    }
}
