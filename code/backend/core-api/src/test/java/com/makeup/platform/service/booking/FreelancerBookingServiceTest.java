package com.makeup.platform.service.booking;

import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.impl.FreelancerBookingServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FreelancerBookingServiceTest {
    @Mock BookingRepository bookings;
    @Mock MuaProfileRepository profiles;
    @Mock BookingMapper mapper;
    @InjectMocks FreelancerBookingServiceImpl service;
    @Test void nonMuaHasNoAssignedBookings() {
        assertTrue(service.getMyAssignedBookings(1L,null,"ALL").isEmpty()); verifyNoInteractions(bookings);
    }
    @Test void upcomingFilterDoesNotExposeCompletedBookingsOrDuplicates() {
        var mua = new MuaProfileEntity(); mua.setId(7L); when(profiles.findByUserId(1L)).thenReturn(Optional.of(mua));
        var active = new BookingEntity(); active.setId(2L); active.setStatus(BookingStatus.ACCEPTED);
        var completed = new BookingEntity(); completed.setId(3L); completed.setStatus(BookingStatus.COMPLETED);
        when(bookings.findAllFreelancerBookings(7L)).thenReturn(List.of(active,active,completed));
        assertEquals(1, service.getMyAssignedBookings(1L,null,"UPCOMING").size());
        verify(mapper).toFreelancerBookingRes(active,7L); verify(mapper,never()).toFreelancerBookingRes(completed,7L);
    }
}
