package com.makeup.platform.service.booking;

import com.makeup.platform.common.event.booking.BookingReminderEvent;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingReminderScheduler {

    private final BookingRepository bookingRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final StringRedisTemplate redisTemplate;

    private static final int BATCH_SIZE = 100;

    @Scheduled(cron = "0 */15 * * * *")
    public void scanAndSendBookingReminders() {
        LocalDateTime now = LocalDateTime.now();

        LocalDateTime max24h = now.plusHours(24);
        List<BookingEntity> batch24h;
        do {
            batch24h = bookingRepository.findPending24hRemindersBatch(max24h, PageRequest.of(0, BATCH_SIZE));
            batch24h.forEach(this::processReminder24h);
        } while (!batch24h.isEmpty());

        // 2. Quét đơn nhắc trước 2 giờ (Zero-Offset Pagination Batching)
        LocalDateTime max2h = now.plusHours(2);
        List<BookingEntity> batch2h;
        do {
            batch2h = bookingRepository.findPending2hRemindersBatch(max2h, PageRequest.of(0, BATCH_SIZE));
            batch2h.forEach(this::processReminder2h);
        } while (!batch2h.isEmpty());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processReminder24h(BookingEntity booking) {
        String lockKey = "reminder:lock:24h:" + booking.getId();
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "SENT", Duration.ofHours(48));
        if (Boolean.TRUE.equals(acquired)) {
            booking.setReminder24hSent(true);
            bookingRepository.save(booking);
            // Bắn event: Đẩy sang Transactional Event Listener xử lý AFTER_COMMIT
            eventPublisher.publishEvent(new BookingReminderEvent(this, booking.getId(), "REMINDER_24H"));
            log.info("Queued 24h reminder event for scheduled booking ID: {}", booking.getId());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processReminder2h(BookingEntity booking) {
        String lockKey = "reminder:lock:2h:" + booking.getId();
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "SENT", Duration.ofHours(24));
        if (Boolean.TRUE.equals(acquired)) {
            booking.setReminder2hSent(true);
            bookingRepository.save(booking);
            // Bắn event: Đẩy sang Transactional Event Listener xử lý AFTER_COMMIT
            eventPublisher.publishEvent(new BookingReminderEvent(this, booking.getId(), "REMINDER_2H"));
            log.info("Queued 2h reminder event for scheduled booking ID: {}", booking.getId());
        }
    }
}
