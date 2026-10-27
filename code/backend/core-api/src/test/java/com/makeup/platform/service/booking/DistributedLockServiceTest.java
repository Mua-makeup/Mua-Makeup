package com.makeup.platform.service.booking;

import com.makeup.platform.common.constants.BookingConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.impl.DistributedLockServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.*;
import org.springframework.transaction.support.*;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DistributedLockServiceTest {
    @Mock RedissonClient redisson;
    @Mock RLock lock;
    @Mock TransactionTemplate transaction;
    @Mock BookingRepository bookings;
    @InjectMocks DistributedLockServiceImpl service;

    @BeforeEach void setUp() {
        when(redisson.getLock(BookingConstants.REDLOCK_KEY_PREFIX + 1L)).thenReturn(lock);
    }
    @AfterEach void clearInterrupt() { Thread.interrupted(); }

    @Test void timeoutDoesNotStartDatabaseTransaction() throws Exception {
        var ex = assertThrows(CustomBusinessException.class, () -> service.acceptBookingWithLock(1L, 2L));
        assertEquals("ERR_LOCK_ACQUISITION_TIMEOUT", ex.getErrorCode());
        verifyNoInteractions(transaction, bookings);
        verify(lock, never()).unlock();
    }
    @Test void interruptionRestoresInterruptFlag() throws Exception {
        when(lock.tryLock(anyLong(), anyLong(), eq(TimeUnit.MILLISECONDS))).thenThrow(new InterruptedException());
        assertThrows(CustomBusinessException.class, () -> service.acceptBookingWithLock(1L, 2L));
        assertTrue(Thread.currentThread().isInterrupted());
        verifyNoInteractions(transaction);
        verify(lock, never()).unlock();
    }
    @Test void databaseFailureStillReleasesOwnedLock() throws Exception {
        when(lock.tryLock(anyLong(), anyLong(), eq(TimeUnit.MILLISECONDS))).thenReturn(true);
        when(lock.isHeldByCurrentThread()).thenReturn(true);
        when(transaction.execute(any())).thenThrow(new IllegalStateException("rollback"));
        assertThrows(IllegalStateException.class, () -> service.acceptBookingWithLock(1L, 2L));
        var order = inOrder(transaction, lock);
        order.verify(transaction).execute(any());
        order.verify(lock).isHeldByCurrentThread();
        order.verify(lock).unlock();
    }
    @Test void expiredLeaseDoesNotUnlockAnotherOwnersLock() throws Exception {
        when(lock.tryLock(anyLong(), anyLong(), eq(TimeUnit.MILLISECONDS))).thenReturn(true);
        service.acceptBookingWithLock(1L, 2L);
        verify(lock, never()).unlock();
    }
    @ParameterizedTest @EnumSource(value=BookingStatus.class, names="REQUESTED", mode=EnumSource.Mode.EXCLUDE)
    void onlyRequestedBookingsCanBeClaimed(BookingStatus status) throws Exception {
        when(lock.tryLock(anyLong(), anyLong(), eq(TimeUnit.MILLISECONDS))).thenReturn(true);
        when(lock.isHeldByCurrentThread()).thenReturn(true);
        when(transaction.execute(any())).thenAnswer(i -> ((TransactionCallback<?>)i.getArgument(0)).doInTransaction(mock(org.springframework.transaction.TransactionStatus.class)));
        var booking = new BookingEntity(); booking.setStatus(status);
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        var ex = assertThrows(CustomBusinessException.class, () -> service.acceptBookingWithLock(1L, 2L));
        assertEquals("ERR_BOOKING_ALREADY_TAKEN", ex.getErrorCode());
        verify(bookings, never()).save(any());
        verify(lock).unlock();
    }
}
