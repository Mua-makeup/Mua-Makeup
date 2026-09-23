package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.event.booking.BookingDepositExpiredEvent;
import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.booking.CreateScheduledBookingReq;
import com.makeup.platform.dto.request.catalog.CalculateSurchargeReq;
import com.makeup.platform.dto.response.booking.ScheduledBookingCreatedRes;
import com.makeup.platform.dto.response.catalog.SurchargeCalculationRes;
import com.makeup.platform.service.catalog.SurchargeService;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingPartner;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.booking.ScheduledBookingMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.catalog.PackageItemRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.agency.AgencyStaffCapacityService;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.booking.ScheduledBookingService;
import com.makeup.platform.service.mua.MUACalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledBookingServiceImpl implements ScheduledBookingService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final PackageItemRepository packageItemRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final MUACalendarService muaCalendarService;
    private final AgencyStaffCapacityService agencyStaffCapacityService;
    private final BookingAuditService bookingAuditService;
    private final ScheduledBookingMapper scheduledBookingMapper;
    private final SurchargeService surchargeService;
    private final RedissonClient redissonClient;
    private final ApplicationEventPublisher eventPublisher;

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);
    private static final int DEFAULT_BUFFER_MINUTES = 30;
    private static final int HOLD_DEPOSIT_MINUTES = 15;
    private static final BigDecimal DEPOSIT_PERCENTAGE = new BigDecimal("0.30"); // 30% tiền cọc
    private static final int MAX_ADVANCE_BOOKING_DAYS = 90;

    @Override
    @Transactional
    public ScheduledBookingCreatedRes createScheduledBooking(Long customerId, CreateScheduledBookingReq req) {
        LocalDate maxAllowedDate = LocalDate.now().plusDays(MAX_ADVANCE_BOOKING_DAYS);
        if (req.getBookingDate().isAfter(maxAllowedDate)) {
            throw new CustomBusinessException(ErrorCodes.ERR_BOOKING_DATE_TOO_FAR, "booking.date_too_far");
        }

        UserEntity customer = userRepository.findById(customerId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND, "auth.user_not_found"));

        ServicePackageEntity servicePackage = servicePackageRepository.findById(req.getPackageId())
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_PACKAGE_NOT_FOUND, "catalog.package_not_found"));

        int baseDuration = (servicePackage.getEstimatedDurationMinutes() != null && servicePackage.getEstimatedDurationMinutes() > 0)
                ? servicePackage.getEstimatedDurationMinutes()
                : 90;

        BigDecimal addOnsTotal = BigDecimal.ZERO;
        int addOnsDuration = 0;

        if (req.getAddOnItemIds() != null && !req.getAddOnItemIds().isEmpty()) {
            List<PackageItemEntity> addOns = packageItemRepository.findAllById(req.getAddOnItemIds());
            for (PackageItemEntity item : addOns) {
                if (item.getServicePackage() == null || !item.getServicePackage().getId().equals(servicePackage.getId())) {
                    throw new CustomBusinessException(
                            ErrorCodes.ERR_ADDON_NOT_IN_PACKAGE,
                            "pricing.addon_not_in_package",
                            HttpStatus.BAD_REQUEST
                    );
                }
                if (item.getItemPrice() != null) {
                    addOnsTotal = addOnsTotal.add(item.getItemPrice());
                }
                if (item.getDurationMinutes() != null) {
                    addOnsDuration += item.getDurationMinutes();
                }
            }
        }

        int durationMinutes = baseDuration + addOnsDuration;

        MuaProfileEntity muaProfile = null;
        AgencyProfileEntity agencyProfile = null;
        String lockKey;

        if (req.getBookingPartner() == BookingPartner.FREELANCER_DIRECT) {
            if (req.getMuaId() == null) {
                throw new CustomBusinessException(ErrorCodes.ERR_MUA_DETAILS_REQUIRED, "validation.mua_required");
            }
            muaProfile = muaProfileRepository.findById(req.getMuaId())
                    .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND, "mua.profile_not_found"));

            lockKey = "lock:mua:calendar:" + req.getMuaId() + ":" + req.getBookingDate();
        } else {
            if (req.getAgencyId() == null) {
                throw new CustomBusinessException(ErrorCodes.ERR_AGENCY_DETAILS_REQUIRED, "validation.agency_required");
            }
            agencyProfile = agencyProfileRepository.findById(req.getAgencyId())
                    .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND, "agency.profile_not_found"));

            lockKey = "lock:agency:capacity:" + req.getAgencyId() + ":" + req.getBookingDate() + ":" + req.getStartTime();
        }

        RLock lock = redissonClient.getLock(lockKey);
        boolean acquired = false;
        try {
            acquired = lock.tryLock(3, 10, TimeUnit.SECONDS);
            if (!acquired) {
                throw new CustomBusinessException(ErrorCodes.ERR_LOCK_ACQUISITION_TIMEOUT, "common.system_busy");
            }

            OffsetDateTime startAt = req.getBookingDate().atTime(req.getStartTime()).atOffset(VIETNAM_OFFSET);
            OffsetDateTime endAt = startAt.plusMinutes(durationMinutes);
            LocalTime endTime = req.getStartTime().plusMinutes(durationMinutes);

            if (req.getBookingPartner() == BookingPartner.FREELANCER_DIRECT) {
                boolean isAvailable = muaCalendarService.isSlotAvailableWithBuffer(
                        req.getMuaId(), startAt, endAt, DEFAULT_BUFFER_MINUTES);
                if (!isAvailable) {
                    throw new CustomBusinessException(ErrorCodes.ERR_SLOT_ALREADY_BOOKED, "booking.slot_already_booked");
                }
            } else {
                boolean hasStaff = agencyStaffCapacityService.hasAvailableStaffForAgency(
                        req.getAgencyId(), req.getBookingDate(), req.getStartTime(), endTime);
                if (!hasStaff) {
                    throw new CustomBusinessException(ErrorCodes.ERR_NO_AVAILABLE_STAFF, "booking.no_available_staff");
                }
            }

            // 6. Tính phụ phí từ CSDL qua SurchargeService
            CalculateSurchargeReq surchargeReq = CalculateSurchargeReq.builder()
                    .agencyId(req.getBookingPartner() == BookingPartner.AGENCY_DISPATCH ? req.getAgencyId() : null)
                    .muaId(req.getBookingPartner() == BookingPartner.FREELANCER_DIRECT ? req.getMuaId() : null)
                    .bookingTime(req.getBookingDate().atTime(req.getStartTime()))
                    .distanceKm(BigDecimal.ZERO)
                    .build();

            SurchargeCalculationRes surchargeCalc = surchargeService.calculateSurcharges(surchargeReq);
            BigDecimal surchargeFee = (surchargeCalc != null && surchargeCalc.getTotalSurcharge() != null)
                    ? surchargeCalc.getTotalSurcharge()
                    : BigDecimal.ZERO;

            BigDecimal basePrice = servicePackage.getPrice() != null ? servicePackage.getPrice() : BigDecimal.ZERO;
            BigDecimal serviceSubtotal = basePrice.add(addOnsTotal).setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalAmount = serviceSubtotal.add(surchargeFee);
            BigDecimal depositAmount = totalAmount.multiply(DEPOSIT_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);

            String bookingCode = "BK-SCHED-" + (System.currentTimeMillis() % 10000000L);
            OffsetDateTime depositExpiredAt = OffsetDateTime.now(VIETNAM_OFFSET).plusMinutes(HOLD_DEPOSIT_MINUTES);

            BookingEntity booking = BookingEntity.builder()
                    .bookingCode(bookingCode)
                    .customer(customer)
                    .agency(agencyProfile)
                    .mua(muaProfile)
                    .servicePackage(servicePackage)
                    .bookingType(BookingType.SCHEDULED)
                    .bookingPartner(req.getBookingPartner())
                    .status(BookingStatus.PENDING_DEPOSIT)
                    .destinationAddress(req.getDestinationAddress())
                    .destinationLatitude(req.getDestinationLatitude())
                    .destinationLongitude(req.getDestinationLongitude())
                    .bookingDate(req.getBookingDate())
                    .startTime(req.getStartTime())
                    .serviceSubtotal(serviceSubtotal)
                    .distanceFee(BigDecimal.ZERO)
                    .surchargeFee(surchargeFee)
                    .surgeMultiplier(BigDecimal.ONE)
                    .discountAmount(BigDecimal.ZERO)
                    .totalAmount(totalAmount)
                    .depositAmount(depositAmount)
                    .depositExpiredAt(depositExpiredAt)
                    .reminder24hSent(false)
                    .reminder2hSent(false)
                    .build();

            BookingEntity savedBooking = bookingRepository.save(booking);

            if (req.getBookingPartner() == BookingPartner.FREELANCER_DIRECT) {
                muaCalendarService.lockSlotForBooking(
                        req.getMuaId(),
                        savedBooking.getId(),
                        req.getBookingDate(),
                        startAt,
                        endAt,
                        "HELD_" + bookingCode
                );
            }

            bookingAuditService.logTransition(
                    savedBooking.getId(),
                    null,
                    BookingStatus.PENDING_DEPOSIT,
                    customerId,
                    "Tạo đơn đặt lịch hẹn trước, tạm giữ chỗ 15 phút để thanh toán cọc"
            );

            Long targetAgencyId = (agencyProfile != null) ? agencyProfile.getId() : req.getAgencyId();
            if (targetAgencyId == null && servicePackage.getAgency() != null) {
                targetAgencyId = servicePackage.getAgency().getId();
            }

            eventPublisher.publishEvent(new ScheduledBookingCreatedEvent(
                    this,
                    savedBooking.getId(),
                    bookingCode,
                    depositAmount,
                    targetAgencyId,
                    customer.getId(),
                    customer.getFullName(),
                    customer.getPhoneNumber(),
                    servicePackage.getPackageName(),
                    req.getBookingDate(),
                    req.getStartTime(),
                    totalAmount
            ));

            String scheduleSummary = String.format("Lịch hẹn lúc %s ngày %s (%d phút)",
                    req.getStartTime(), req.getBookingDate(), durationMinutes);

            OffsetDateTime reminder24hAt = startAt.minusHours(24);
            OffsetDateTime reminder2hAt = startAt.minusHours(2);

            log.info("[ScheduledBooking] Successfully created booking ID: {}, code: {}, deposit: {} VND",
                    savedBooking.getId(), bookingCode, depositAmount);

            return scheduledBookingMapper.toCreatedResponse(
                    savedBooking,
                    servicePackage.getPackageName(),
                    endTime,
                    scheduleSummary,
                    reminder24hAt,
                    reminder2hAt
            );

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CustomBusinessException(ErrorCodes.ERR_INTERNAL, "common.internal_error");
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    @Override
    @Transactional
    public void confirmDepositPayment(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found"));

        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION, "booking.invalid_status");
        }

        if (booking.getDepositExpiredAt() != null && booking.getDepositExpiredAt().isBefore(OffsetDateTime.now(VIETNAM_OFFSET))) {
            throw new CustomBusinessException(ErrorCodes.ERR_DEPOSIT_PAYMENT_TIMEOUT, "booking.deposit_payment_timeout");
        }

        BookingStatus nextStatus = booking.getBookingPartner() == BookingPartner.AGENCY_DISPATCH
                ? BookingStatus.PENDING_AGENCY_DISPATCH
                : BookingStatus.ACCEPTED;

        BookingStatus prevStatus = booking.getStatus();
        booking.setStatus(nextStatus);
        bookingRepository.save(booking);

        bookingAuditService.logTransition(
                booking.getId(),
                prevStatus,
                nextStatus,
                booking.getCustomer().getId(),
                "Khách hàng thanh toán tiền cọc thành công"
        );

        log.info("[ScheduledBooking] Deposit confirmed for booking ID: {}, new status: {}", bookingId, nextStatus);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void expireSingleBooking(Long bookingId) {
        int rowsUpdated = bookingRepository.cancelExpiredBookingIfPendingDeposit(bookingId);
        if (rowsUpdated > 0) {
            bookingAuditService.logTransition(
                    bookingId,
                    BookingStatus.PENDING_DEPOSIT,
                    BookingStatus.CANCELLED_EXPIRED,
                    null,
                    "Đơn bị hủy do quá hạn 15 phút không thanh toán tiền cọc"
            );
            muaCalendarService.releaseSlotByBookingId(bookingId);
            eventPublisher.publishEvent(new BookingDepositExpiredEvent(this, bookingId));
            log.info("[DepositExpiration] Expired booking ID: {} successfully cancelled and slot released", bookingId);
        }
    }

    @Override
    @Transactional
    public void expireUnpaidScheduledBookings() {
        List<BookingEntity> expiredList = bookingRepository.findExpiredPendingDepositBookings();
        for (BookingEntity b : expiredList) {
            try {
                expireSingleBooking(b.getId());
            } catch (Exception e) {
                log.error("[DepositExpiration] Failed to expire booking ID: {}", b.getId(), e);
            }
        }
    }
}
