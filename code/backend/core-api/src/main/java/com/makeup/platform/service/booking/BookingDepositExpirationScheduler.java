package com.makeup.platform.service.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingDepositExpirationScheduler {

    private final BookingRepository bookingRepository;
    private final ScheduledBookingService scheduledBookingService;

    @Scheduled(cron = "0 */1 * * * *")
    public void scanAndExpireUnpaidBookings() {
        List<BookingEntity> expiredBookings = bookingRepository.findExpiredPendingDepositBookings();

        if (expiredBookings.isEmpty()) {
            return;
        }

        log.info("[DepositExpiration] Found {} expired bookings pending deposit cancellation", expiredBookings.size());

        for (BookingEntity booking : expiredBookings) {
            try {
                scheduledBookingService.expireSingleBooking(booking.getId());
            } catch (Exception e) {
                log.error("[DepositExpiration] Failed to expire booking ID: {} during expiration scan", booking.getId(), e);
            }
        }
    }
}
