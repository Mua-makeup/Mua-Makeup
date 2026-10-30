package com.makeup.platform.service.agency;

import com.makeup.platform.service.agency.impl.*;
import com.makeup.platform.repository.*;
import com.makeup.platform.repository.custom.projection.StaffLeaderboardProjection;
import com.makeup.platform.mapper.agency.DispatchMatrixMapper;
import com.makeup.platform.dto.response.agency.*;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.time.LocalDate;
import java.time.LocalTime;
import java.math.BigDecimal;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AgencyDispatchRatingTest {
    @Mock AgencyDispatchSupport support;
    @Mock StaffMatrixRepository staffMatrixRepository;
    @Mock AgencyStaffRepository agencyStaffRepository;
    @Mock AgencyOvertimeRuleRepository agencyOvertimeRuleRepository;
    @Mock DispatchMatrixMapper dispatchMatrixMapper;
    @InjectMocks AgencyDispatchServiceImpl service;

    @Test void usesSharedStudioReviewsAndJobsInsteadOfPersonalProfileCounters() {
        var agency = new AgencyProfileEntity(); agency.setId(1L);
        var booking = new BookingEntity(); booking.setId(2L);
        booking.setBookingDate(LocalDate.now()); booking.setStartTime(LocalTime.NOON);
        when(support.getAgencyByOwnerUserId(9L)).thenReturn(agency);
        when(support.getBookingAndVerifyOwnership(2L, 1L)).thenReturn(booking);
        var assistant = StaffMatrixItemRes.builder().staffId(3L).totalReviews(0).totalCompletedJobs(2).build();
        var unrated = StaffMatrixItemRes.builder().staffId(4L).totalReviews(20).ratingAvg(BigDecimal.valueOf(5)).build();
        when(dispatchMatrixMapper.toMatrixRes(eq(booking), anyList(), anyList()))
                .thenReturn(StaffAvailabilityMatrixRes.builder().staffList(List.of(assistant, unrated)).build());
        var stats = mock(StaffLeaderboardProjection.class);
        when(stats.getStaffId()).thenReturn(3L);
        when(stats.getTotalReviews()).thenReturn(9);
        when(stats.getRatingAvg()).thenReturn(new BigDecimal("3.8"));
        when(stats.getTotalCompletedJobs()).thenReturn(9);
        when(agencyStaffRepository.findStaffLeaderboard(1L, null, null)).thenReturn(List.of(stats));
        var result = service.getStaffMatrix(9L, 2L);
        assertEquals(9, result.getStaffList().get(0).getTotalReviews());
        assertEquals(new BigDecimal("3.8"), assistant.getRatingAvg());
        assertEquals(9, assistant.getTotalCompletedJobs());
        assertNull(unrated.getRatingAvg()); assertEquals(0, unrated.getTotalReviews());
    }
}
