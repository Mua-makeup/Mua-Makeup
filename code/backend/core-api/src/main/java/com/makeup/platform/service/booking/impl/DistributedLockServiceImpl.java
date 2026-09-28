package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.InstantBookingKeys;

import com.makeup.platform.common.constants.BookingConstants;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.InstantBookingAcceptedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.customer.InstantDispatchLeaseService;
import com.makeup.platform.service.booking.DistributedLockService;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class DistributedLockServiceImpl implements DistributedLockService {

    private final RedissonClient redissonClient;
    private final TransactionTemplate transactionTemplate;
    private final BookingRepository bookingRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final BookingAuditService bookingAuditService;
    private final BookingMapper bookingMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final StringRedisTemplate stringRedisTemplate;
    private final InstantDispatchLeaseService dispatchLeaseService;

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
                BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId)
                        .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                                "booking.not_found", HttpStatus.NOT_FOUND));

                if (booking.getStatus() != BookingStatus.REQUESTED) {
                    log.warn("[Redlock] Booking id={} is already taken or not in REQUESTED status. Current status={}",
                            bookingId, booking.getStatus());
                    throw new CustomBusinessException(ErrorCodes.ERR_BOOKING_ALREADY_TAKEN,
                            "booking.already_taken", HttpStatus.CONFLICT);
                }

                MuaProfileEntity muaProfile = muaProfileRepository.findByUserIdForUpdate(userId)
                        .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                                "mua.profile_not_found", HttpStatus.NOT_FOUND));

                // 1. Kiểm tra xem thợ này đã từng bấm bỏ qua hoặc bị hết giờ đơn này chưa
                Boolean isSkipped = stringRedisTemplate.opsForSet().isMember(
                        InstantBookingKeys.skipped(bookingId), String.valueOf(muaProfile.getId()));
                if (Boolean.TRUE.equals(isSkipped)) {
                    log.warn("[Redlock] MUA id={} attempted to accept booking id={} which they already skipped or timed out",
                            muaProfile.getId(), bookingId);
                    throw new CustomBusinessException(ErrorCodes.ERR_BOOKING_ALREADY_TAKEN,
                            "booking.already_taken", HttpStatus.CONFLICT);
                }

                // 2. Kiểm tra xem thợ này có đúng là thợ đang được gửi đơn tới (current target) hay không
                String currentTargetMuaId = stringRedisTemplate.opsForValue().get(InstantBookingKeys.current(bookingId));
                if (currentTargetMuaId != null && !currentTargetMuaId.equals(String.valueOf(muaProfile.getId()))) {
                    log.warn("[Redlock] MUA id={} attempted to accept booking id={} but current target is muaId={}",
                            muaProfile.getId(), bookingId, currentTargetMuaId);
                    throw new CustomBusinessException(ErrorCodes.ERR_BOOKING_ALREADY_TAKEN,
                            "booking.already_taken", HttpStatus.CONFLICT);
                }

                boolean hasVerifiedCert = muaProfile.getCertificates() != null && muaProfile.getCertificates().stream()
                        .anyMatch(c -> Boolean.TRUE.equals(c.getIsVerified()) || "VERIFIED".equalsIgnoreCase(c.getStatus()));
                if (!hasVerifiedCert) {
                    log.warn("[Redlock] MUA id={} attempted to accept booking id={} without verified certificate", muaProfile.getId(), bookingId);
                    throw new CustomBusinessException(ErrorCodes.ERR_MUA_CERTIFICATE_NOT_VERIFIED,
                            "mua.certificate_not_verified_cannot_accept", HttpStatus.FORBIDDEN);
                }

                if (!Boolean.TRUE.equals(muaProfile.getIsOnline())) {
                    log.warn("[Redlock] MUA id={} attempted to accept booking id={} while OFFLINE", muaProfile.getId(), bookingId);
                    throw new CustomBusinessException(ErrorCodes.ERR_MUA_MUST_BE_ONLINE,
                            "booking.mua_must_be_online", HttpStatus.BAD_REQUEST);
                }

                if (Boolean.TRUE.equals(muaProfile.getIsBusy())) {
                    log.warn("[Redlock] MUA id={} attempted to accept booking id={} while already BUSY", muaProfile.getId(), bookingId);
                    throw new CustomBusinessException(ErrorCodes.ERR_MUA_ALREADY_BUSY,
                            "booking.mua_already_busy", HttpStatus.CONFLICT);
                }

                // Gán gói dịch vụ và giá niêm yết thật của thợ này
                String meta = stringRedisTemplate.opsForValue().get(InstantBookingKeys.meta(bookingId));
                Integer categoryId = null;
                Integer styleId = null;
                if (meta != null && meta.contains(":")) {
                    String[] parts = meta.split(":");
                    if (parts.length > 0 && !parts[0].isEmpty()) {
                        try { categoryId = Integer.valueOf(parts[0]); } catch (NumberFormatException ignored) {}
                    }
                    if (parts.length > 1 && !parts[1].isEmpty()) {
                        try { styleId = Integer.valueOf(parts[1]); } catch (NumberFormatException ignored) {}
                    }
                }

                if (categoryId != null) {
                    List<ServicePackageEntity> candidatePackages = servicePackageRepository.findCandidatePackagesForMua(
                            muaProfile.getId(), categoryId, styleId);
                    if (!candidatePackages.isEmpty()) {
                        ServicePackageEntity pkg = candidatePackages.get(0);
                        booking.setServicePackage(pkg);
                        booking.setServiceSubtotal(pkg.getPrice());
                        BigDecimal emergencyFee = new BigDecimal("150000.00");
                        booking.setSurchargeFee(emergencyFee);
                        BigDecimal total = pkg.getPrice().add(emergencyFee);
                        booking.setTotalAmount(total);
                        BigDecimal rawDeposit = total.multiply(new BigDecimal("0.30"));
                        BigDecimal deposit = rawDeposit.divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(1000));
                        booking.setDepositAmount(deposit);
                    }
                }

                booking.setStatus(BookingStatus.ACCEPTED);
                booking.setMua(muaProfile);
                BookingEntity savedBooking = bookingRepository.save(booking);

                // Mark MUA as busy so no other instant bookings are dispatched
                muaProfile.setIsBusy(true);
                muaProfile.setAvailabilityStatus(AvailabilityStatus.BUSY);
                muaProfileRepository.save(muaProfile);

                // Record Audit log inside same transaction
                bookingAuditService.logTransition(savedBooking, BookingStatus.REQUESTED, BookingStatus.ACCEPTED,
                        userId, "Thợ nhận đơn qua Redlock");

                // Publish event to other subsystems (WebSocket, Escrow)
                eventPublisher.publishEvent(new InstantBookingAcceptedEvent(this, bookingId, muaProfile.getId()));

                // Cancel 45s countdown timer, dispatch timer, candidate queues and release dispatch lock
                stringRedisTemplate.delete(InstantBookingKeys.expiration(bookingId));
                stringRedisTemplate.delete(InstantBookingKeys.candidates(bookingId));
                stringRedisTemplate.delete(InstantBookingKeys.current(bookingId));
                stringRedisTemplate.delete(InstantBookingKeys.skipped(bookingId));
                stringRedisTemplate.delete(InstantBookingKeys.sentAt(bookingId));
                stringRedisTemplate.delete(InstantBookingKeys.timer(bookingId, muaProfile.getId()));
                stringRedisTemplate.delete(InstantBookingKeys.meta(bookingId));
                dispatchLeaseService.release(bookingId, String.valueOf(muaProfile.getId()));

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
