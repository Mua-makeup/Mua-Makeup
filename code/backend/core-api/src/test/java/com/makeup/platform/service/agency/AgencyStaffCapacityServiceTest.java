package com.makeup.platform.service.agency;

import com.makeup.platform.entity.agency.*;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.*;
import com.makeup.platform.repository.mua.MUACalendarRepository;
import com.makeup.platform.service.agency.impl.AgencyStaffCapacityServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgencyStaffCapacityServiceTest {
    @Mock AgencyStaffRepository staff;
    @Mock AgencyStaffShiftRepository shifts;
    @Mock MUACalendarRepository calendar;
    @InjectMocks AgencyStaffCapacityServiceImpl service;
    final LocalDate day = LocalDate.of(2026, 10, 26);
    @Test void emptyStudioHasNoCapacity() {
        assertFalse(service.hasAvailableStaffForAgency(1L, day, LocalTime.of(8,0), LocalTime.of(9,0)));
        verifyNoInteractions(shifts, calendar);
    }
    @ParameterizedTest @CsvSource({"07:59,false", "08:00,true", "11:59,true", "12:00,false"})
    void shiftStartInclusiveEndExclusive(LocalTime time, boolean expected) {
        var mua = new MuaProfileEntity(); mua.setId(3L);
        var member = AgencyStaffEntity.builder().mua(mua).build(); member.setId(2L);
        when(staff.findByAgencyIdAndIsActiveTrue(1L)).thenReturn(List.of(member));
        when(shifts.findActiveShiftsForStaffOnDate(2L, day, 2)).thenReturn(List.of(
            AgencyStaffShiftEntity.builder().startTime(LocalTime.of(8,0)).endTime(LocalTime.of(12,0)).build()));
        assertEquals(expected, service.hasAvailableStaffForAgency(1L, day, time, time.plusHours(2)));
        if (!expected) verifyNoInteractions(calendar);
    }
    @Test void overlappingCalendarRemovesCapacity() {
        var mua = new MuaProfileEntity(); mua.setId(3L);
        var member = AgencyStaffEntity.builder().mua(mua).build(); member.setId(2L);
        when(staff.findByAgencyIdAndIsActiveTrue(1L)).thenReturn(List.of(member));
        when(shifts.findActiveShiftsForStaffOnDate(2L, day, 2)).thenReturn(List.of(
            AgencyStaffShiftEntity.builder().startTime(LocalTime.of(8,0)).endTime(LocalTime.of(12,0)).build()));
        when(calendar.existsOverlappingSlot(eq(3L), any(), any())).thenReturn(true);
        assertFalse(service.hasAvailableStaffForAgency(1L, day, LocalTime.of(9,0), LocalTime.of(10,0)));
        verify(calendar).existsOverlappingSlot(3L, day.atTime(9,0).atOffset(ZoneOffset.ofHours(7)), day.atTime(10,0).atOffset(ZoneOffset.ofHours(7)));
    }
}
