package com.makeup.platform.service.customer;

import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
import com.makeup.platform.repository.booking.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class InstantBookingExpirationScheduler {
    private static final int BATCH_SIZE = 100;
    private final BookingRepository bookingRepository;
    private final CustomerInstantBookingService bookingService;

    @Scheduled(fixedDelay = 30000)
    public void scanPendingBookings() {
        Long maxId = bookingRepository.findPendingScanUpperBound(BookingType.REALTIME_INSTANT, BookingStatus.REQUESTED);
        if (maxId == null) return;
        long afterId = 0;
        List<Long> ids;
        do {
            ids = bookingRepository.findPendingInstantIds(BookingType.REALTIME_INSTANT,
                    BookingStatus.REQUESTED, afterId, maxId, PageRequest.of(0, BATCH_SIZE));
            for (Long id : ids) {
                try {
                    // Each booking gets its own transaction through the service proxy.
                    bookingService.processPendingBooking(id);
                } catch (RuntimeException ex) {
                    log.error("Failed to process pending instant booking {}", id, ex);
                }
                afterId = id;
            }
        } while (ids.size() == BATCH_SIZE);
    }
}
