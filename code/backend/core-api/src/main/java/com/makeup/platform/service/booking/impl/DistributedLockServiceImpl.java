package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.BookingConstants;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.InstantBookingAcceptedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.booking.DistributedLockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class DistributedLockServiceImpl implements DistributedLockService {

    private final RedissonClient redissonClient;
    private final TransactionTemplate transactionTemplate;
    private final BookingRepository bookingRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingAuditService bookingAuditService;
    private final BookingMapper bookingMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public BookingAcceptanceRes acceptBookingWithLock(Long bookingId, Long userId) {
        String lockKey = BookingConstants.REDLOCK_KEY_PREFIX + bookingId;
        RLock lock = redissonClient.getLock(lockKey);
        boolean isLocked = false;

        try {
            log.info("[Redlock] Trying to acquire lock for key={} by userId={}", lockKey, userId);
            isLocked = lock.tryLock(BookingConstants.LOCK_WAIT_TIME_MS, BookingConstants.LOCK_LEASE_TIME_MS, TimeUnit.MILLISECONDS);

            if (!isLocked) {
                log.warn("[Redlock] Lock acquisition timeout for key={} by userId={}", lockKey, userId);
                throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT,
                        "booking.lock_timeout", HttpStatus.CONFLICT);
            }

            log.info("[Redlock] Acquired lock for key={} successfully. Executing DB transaction.", lockKey);

            // Execute database transaction and commit BEFORE releasing the lock in finally block
            return transactionTemplate.execute(status -> {
                BookingEntity booking = bookingRepository.findById(bookingId)
                        .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                                "booking.not_found", HttpStatus.NOT_FOUND));

                if (booking.getStatus() != BookingStatus.REQUESTED) {
                    log.warn("[Redlock] Booking id={} is already taken or not in REQUESTED status. Current status={}",
                            bookingId, booking.getStatus());
                    throw new CustomBusinessException(ErrorCodes.ERR_BOOKING_ALREADY_TAKEN,
                            "booking.already_taken", HttpStatus.CONFLICT);
                }

                MuaProfileEntity muaProfile = muaProfileRepository.findByUserId(userId)
                        .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                                "mua.profile_not_found", HttpStatus.NOT_FOUND));

                booking.setStatus(BookingStatus.ACCEPTED);
                booking.setMua(muaProfile);
                BookingEntity savedBooking = bookingRepository.save(booking);

                // Record Audit log inside same transaction
                bookingAuditService.logTransition(savedBooking, BookingStatus.REQUESTED, BookingStatus.ACCEPTED,
                        userId, "Thợ nhận đơn qua Redlock");

                // Publish event to other subsystems (WebSocket, Escrow)
                eventPublisher.publishEvent(new InstantBookingAcceptedEvent(this, bookingId, muaProfile.getId()));

                log.info("[Redlock] Booking id={} successfully accepted by muaId={}", bookingId, muaProfile.getId());
                return bookingMapper.toAcceptanceRes(savedBooking);
            });

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("[Redlock] Thread interrupted while waiting for lock key={}", lockKey, e);
            throw new CustomBusinessException(ErrorCodes.ERR_INTERNAL,
                    "booking.concurrency_interrupted", HttpStatus.INTERNAL_SERVER_ERROR);
        } finally {
            if (isLocked && lock.isHeldByCurrentThread()) {
                lock.unlock();
                log.info("[Redlock] Released lock for key={}", lockKey);
            }
        }
    }
}
