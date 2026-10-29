package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.agency.AssignStaffToBookingReq;
import com.makeup.platform.entity.agency.*;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.repository.StaffMatrixRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.repository.custom.projection.StaffMatrixProjection;
import com.makeup.platform.service.mua.MUACalendarService;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgencyBusyAssignmentTest {
    @Mock AgencyDispatchSupport support;
    @Mock StaffMatrixRepository matrix;
    @Mock BookingStaffAssignmentRepository assignments;
    @Mock MUACalendarService calendar;
    @InjectMocks AgencyDispatchServiceImpl service;

    @ParameterizedTest @ValueSource(booleans = {true, false})
    void busyHistoryBlocksBothPrimaryAndAssistantBeforeAnyMutation(boolean primaryBusy) {
        var agency = new AgencyProfileEntity(); agency.setId(1L);
        var booking = new BookingEntity(); booking.setId(10L);
        booking.setStatus(BookingStatus.AGENCY_ASSIGNED);
        booking.setBookingDate(LocalDate.of(2026, 10, 29)); booking.setStartTime(LocalTime.of(9,15));
        when(support.getBookingAndVerifyOwnership(10L, 1L)).thenReturn(booking);
        when(support.getBookingDurationMinutes(booking)).thenReturn(60);
        var primary = mock(StaffMatrixProjection.class);
        when(primary.getHasShift()).thenReturn(true);
        when(primary.getHasPackage()).thenReturn(true);
        when(primary.getHasStyle()).thenReturn(true);
        when(primary.getHasCalendarFree()).thenReturn(true);
        when(primary.getHasReportedBusy()).thenReturn(primaryBusy);
        when(matrix.getStaffAvailabilityMatrix(any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(List.of(primary));
        when(support.findStaffProjection(any(), eq(2L))).thenReturn(primary);
        when(support.findAgencyStaff(2L, 1L)).thenReturn(new AgencyStaffEntity());
        if (!primaryBusy) {
            var assistant = mock(StaffMatrixProjection.class);
            when(assistant.getHasShift()).thenReturn(true);
            when(assistant.getHasCalendarFree()).thenReturn(true);
            when(assistant.getHasReportedBusy()).thenReturn(true);
            when(support.findStaffProjection(any(), eq(3L))).thenReturn(assistant);
            when(support.findAgencyStaff(3L, 1L)).thenReturn(new AgencyStaffEntity());
        }
        assertThrows(CustomBusinessException.class, () -> service.executeStaffAssignment(
                agency, 10L, 2L, List.of(3L), new AssignStaffToBookingReq()));
        verifyNoInteractions(assignments, calendar);
    }
}
