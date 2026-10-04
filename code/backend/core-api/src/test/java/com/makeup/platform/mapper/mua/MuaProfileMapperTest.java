package com.makeup.platform.mapper.mua;

import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class MuaProfileMapperTest {
    @Test
    void completedJobsUseBookingsInsteadOfStaleProfileCounter() {
        var bookings = mock(BookingRepository.class);
        var styles = mock(MuaStyleMapper.class);
        var mapper = new MuaProfileMapper(styles, bookings);
        var mua = new MuaProfileEntity();
        mua.setId(19L);
        mua.setTotalCompletedJobs(0);
        when(bookings.countByMuaIdAndStatusIn(19L,
                List.of(BookingStatus.COMPLETED, BookingStatus.PAID_OUT))).thenReturn(12L);

        assertEquals(12, mapper.toProfileRes(mua, List.of()).getTotalCompletedJobs());
        verify(bookings).countByMuaIdAndStatusIn(19L,
                List.of(BookingStatus.COMPLETED, BookingStatus.PAID_OUT));
    }
}
