package com.makeup.platform.service.customer.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.InstantBookingKeys;
import com.makeup.platform.common.constants.TelemetryConstants;
import com.makeup.platform.common.event.booking.BookingStateChangedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.booking.CreateInstantBookingReq;
import com.makeup.platform.dto.response.booking.InstantBookingCreatedRes;
import com.makeup.platform.dto.response.booking.RecentAddressRes;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingPartner;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.booking.BookingType;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.booking.InstantBookingMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.booking.BookingMessagePublisher;
import com.makeup.platform.service.customer.CustomerInstantBookingService;
import com.makeup.platform.service.customer.InstantDispatchLeaseService;
import com.makeup.platform.service.pricing.SurgePricingService;
import com.makeup.platform.service.telemetry.RedisGeoService;
import com.makeup.platform.common.utils.GeoDistanceUtils;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerInstantBookingServiceImpl implements CustomerInstantBookingService {

    private static final int BOOKING_TIMEOUT_SECONDS = 45;
    private static final int OFFER_TIMEOUT_SECONDS = 20;
    private static final Duration DISPATCH_STATE_TTL = Duration.ofMinutes(10);
    private static final Duration OFFER_TIMESTAMP_TTL = Duration.ofMinutes(5);
    private static final BigDecimal MUA_EARNINGS_RATE = new BigDecimal("0.80");
    private static final BigDecimal DEFAULT_BASE_PRICE = new BigDecimal("500000.00");
    private static final BigDecimal EMERGENCY_SURCHARGE = new BigDecimal("150000.00");
    private static final BigDecimal DEPOSIT_RATE = new BigDecimal("0.30");

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final MakeupStyleRepository makeupStyleRepository;
    private final SurgePricingService surgePricingService;
    private final BookingAuditService bookingAuditService;
    private final RedisGeoService redisGeoService;
    private final BookingMessagePublisher messagePublisher;
    private final InstantDispatchLeaseService dispatchLeaseService;
    private final InstantBookingMapper instantBookingMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final MuaProfileRepository muaProfileRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public InstantBookingCreatedRes createInstantBooking(Long customerId, CreateInstantBookingReq req) {
        log.info("[InstantBooking] Customer id={} creating instant booking at address={}", customerId,
                req.getDestinationAddress());

        UserEntity customer = userRepository.findById(customerId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        // 0. Quét dọn và tự động hủy tất cả đơn cũ còn ở trạng thái REQUESTED của khách hàng này
        // Khi khách bấm "Đặt Lại" hoặc tạo yêu cầu mới, các đơn cũ chưa có thợ nhận sẽ được hủy ngay để không chặn khách
        List<Long> customerBookings = bookingRepository.findCustomerPendingIds(
                customerId, BookingType.REALTIME_INSTANT, BookingStatus.REQUESTED);
        for (Long previousBookingId : customerBookings) {
            expireInstantBooking(previousBookingId);
        }

        // Chặn tạo đơn tức thì nếu khách hàng đang có đơn ĐÃ ĐƯỢC THỢ NHẬN VÀ ĐANG THỰC HIỆN
        List<BookingStatus> activeExecutingStatuses = List.of(
                BookingStatus.ACCEPTED,
                BookingStatus.ON_THE_WAY,
                BookingStatus.ARRIVED,
                BookingStatus.IN_PROGRESS);
        if (bookingRepository.existsByCustomerIdAndBookingTypeAndStatusIn(customerId, BookingType.REALTIME_INSTANT,
                activeExecutingStatuses)) {
            log.warn("[InstantBooking] Customer id={} already has an active booking being served", customerId);
            throw new CustomBusinessException(ErrorCodes.ERR_BOOKING_ALREADY_EXISTS,
                    "booking.customer_has_active_instant_booking", HttpStatus.CONFLICT);
        }

        // 1. Tính toán giá dịch vụ & Hệ số Surge thời gian thực (Dynamic Pricing Engine)
        BigDecimal basePrice = DEFAULT_BASE_PRICE;
        if (req.getPackageId() != null) {
            var packageOpt = servicePackageRepository.findById(req.getPackageId());
            if (packageOpt.isPresent() && packageOpt.get().getPrice() != null) {
                basePrice = packageOpt.get().getPrice();
            }
        }

        InvoicePreviewRes.SurgePricingInfo surgeInfo = surgePricingService.calculateSurge(
                basePrice,
                LocalDateTime.now(),
                "ALL",
                req.getDestinationLatitude(),
                req.getDestinationLongitude());

        BigDecimal surgeMultiplier = (surgeInfo != null && surgeInfo.getMultiplier() != null)
                ? surgeInfo.getMultiplier()
                : BigDecimal.ONE;
        BigDecimal surgeAmount = (surgeInfo != null && surgeInfo.getSurgeAmount() != null)
                ? surgeInfo.getSurgeAmount()
                : BigDecimal.ZERO;

        BigDecimal emergencySurchargeFee = EMERGENCY_SURCHARGE; // Phụ phí ca khẩn cấp 30 phút
        BigDecimal totalSurchargeFee = emergencySurchargeFee.add(surgeAmount);

        BigDecimal totalAmount = basePrice.add(totalSurchargeFee).setScale(2, RoundingMode.HALF_UP);
        BigDecimal rawDeposit = totalAmount.multiply(DEPOSIT_RATE);
        BigDecimal depositAmount = rawDeposit.divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(1000))
                .setScale(2, RoundingMode.HALF_UP);

        double effectiveRadiusKm = (req.getRadiusKm() != null && req.getRadiusKm() > 0) ? req.getRadiusKm() : 10.0;
        // 2. Query potential online MUAs in Redis GEO sorted by distance ASC
        List<Long> candidateMuaIds = findAvailableCandidates(req);

        // BẮT BUỘC: Nếu không có thợ nào online trong bán kính quét -> Báo lỗi ngay cho khách hàng, không tạo đơn rác
        if (candidateMuaIds.isEmpty()) {
            log.warn("[InstantBooking] No online available MUA found within {}km for customer id={}", effectiveRadiusKm, customerId);
            throw new CustomBusinessException(ErrorCodes.ERR_MUA_NOT_AVAILABLE,
                    "booking.no_mua_available_in_radius", HttpStatus.BAD_REQUEST);
        }

        int potentialCount = candidateMuaIds.size();

        // 3. Generate unique Booking Code
        String bookingCode = "BK-FAST-" + (System.currentTimeMillis() % 10000000L);

        // 4. Create and persist BookingEntity
        BookingEntity booking = BookingEntity.builder()
                .bookingCode(bookingCode)
                .customer(customer)
                .bookingType(BookingType.REALTIME_INSTANT)
                .bookingPartner(BookingPartner.FREELANCER_DIRECT)
                .status(BookingStatus.REQUESTED)
                .destinationAddress(req.getDestinationAddress())
                .destinationLatitude(req.getDestinationLatitude())
                .destinationLongitude(req.getDestinationLongitude())
                .bookingDate(LocalDate.now())
                .startTime(LocalTime.now())
                .serviceSubtotal(basePrice)
                .distanceFee(BigDecimal.ZERO)
                .surchargeFee(totalSurchargeFee)
                .surgeMultiplier(surgeMultiplier)
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(totalAmount)
                .depositAmount(depositAmount)
                .version(0L)
                .build();

        if (req.getStyleId() != null) {
            makeupStyleRepository.findById(req.getStyleId()).ifPresent(booking::setStyle);
        }

        BookingEntity savedBooking = bookingRepository.save(booking);

        // Lưu metadata của cuốc Instant Booking vào Redis để các worker waterfall đọc được
        String metaVal = (req.getMasterCategoryId() != null ? req.getMasterCategoryId() : "") + ":" + (req.getStyleId() != null ? req.getStyleId() : "");
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.meta(savedBooking.getId()), metaVal, DISPATCH_STATE_TTL);

        // 5. Record Audit log
        bookingAuditService.logTransition(savedBooking, null, BookingStatus.REQUESTED, customerId,
                "Khách hàng tạo đơn khẩn cấp (Instant Booking 30-60 phút)");

        // 6. Sequential Waterfall Dispatch: Queue candidates in Redis & offer to first closest MUA
        Long firstTargetMuaId = null;
        Long firstTargetUserId = null;
        String listKey = InstantBookingKeys.candidates(savedBooking.getId());
        stringRedisTemplate.delete(listKey);
        stringRedisTemplate.delete(InstantBookingKeys.skipped(savedBooking.getId()));
        for (Long cId : candidateMuaIds) {
            stringRedisTemplate.opsForList().rightPush(listKey, String.valueOf(cId));
        }
        stringRedisTemplate.expire(listKey, DISPATCH_STATE_TTL);

        String firstStr;
        while ((firstStr = stringRedisTemplate.opsForList().leftPop(listKey)) != null) {
            if (dispatchLeaseService.tryClaim(savedBooking.getId(), firstStr)) {
                break;
            }
        }
        if (firstStr == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_MUA_NOT_AVAILABLE,
                    "booking.no_mua_available_in_radius", HttpStatus.NOT_FOUND);
        }
        if (firstStr != null) {
            firstTargetMuaId = Long.valueOf(firstStr);
            var muaOpt = muaProfileRepository.findById(firstTargetMuaId);
            firstTargetUserId = muaOpt.map(m -> m.getUser() != null ? m.getUser().getId() : null).orElse(null);

            startCandidateOffer(savedBooking.getId(), firstTargetMuaId, firstStr);
        }

        try {
            Map<String, Object> offerPayload = createOfferPayload(savedBooking, firstTargetMuaId,
                    customer.getFullName(), customer.getPhoneNumber());
            offerPayload.put("targetUserId", firstTargetUserId);
            offerPayload.put("candidateIndex", 1);
            offerPayload.put("totalCandidates", potentialCount);

            if (firstTargetMuaId != null) {
                // CHỈ GỬI VÀO DUY NHẤT KÊNH RIÊNG CỦA THỢ ĐƯỢC CHỌN (KHÔNG GỬI KÊNH CHUNG)
                messagePublisher.send("/topic/mua-offer/" + firstTargetMuaId, offerPayload);
                log.info("[InstantBooking] Dispatched offer strictly to closest MUA id={} (totalCandidates={}) for bookingId={}",
                        firstTargetMuaId, potentialCount, savedBooking.getId());
            }
        } catch (Exception e) {
            log.warn("[InstantBooking] WebSocket send failed: {}", e.getMessage());
        }

        // 7. Store TTL key for 45s countdown auto-expiration
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.expiration(savedBooking.getId()), "ACTIVE", Duration.ofSeconds(BOOKING_TIMEOUT_SECONDS));

        return instantBookingMapper.toCreatedRes(savedBooking, potentialCount, BOOKING_TIMEOUT_SECONDS);
    }

    @Override
    @Transactional
    public boolean dispatchNextCandidate(Long bookingId) {
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.REQUESTED) {
            log.info("[SequentialDispatch] Booking id={} is no longer in REQUESTED status, aborting next dispatch",
                    bookingId);
            return false;
        }

        // 1. Thêm thợ hiện tại vào danh sách đã bỏ qua/hết giờ của bookingId này, đồng thời giải phóng khóa thợ và timer cũ
        String currentMuaIdStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.current(bookingId));
        String skippedSetKey = InstantBookingKeys.skipped(bookingId);
        if (currentMuaIdStr != null) {
            stringRedisTemplate.opsForSet().add(skippedSetKey, currentMuaIdStr);
            stringRedisTemplate.expire(skippedSetKey, DISPATCH_STATE_TTL);

            dispatchLeaseService.release(bookingId, currentMuaIdStr);
            stringRedisTemplate.delete(InstantBookingKeys.timer(bookingId, currentMuaIdStr));
            log.info("[SequentialDispatch] Added MUA id={} to skipped set for bookingId={}", currentMuaIdStr, bookingId);
        }
        stringRedisTemplate.delete(InstantBookingKeys.sentAt(bookingId));

        // 2. Lấy thợ tiếp theo trong hàng đợi (lọc qua các thợ đã bỏ qua hoặc đang bận)
        String listKey = InstantBookingKeys.candidates(bookingId);
        String nextMuaIdStr = null;

        while ((nextMuaIdStr = stringRedisTemplate.opsForList().leftPop(listKey)) != null) {
            Boolean isSkipped = stringRedisTemplate.opsForSet().isMember(skippedSetKey, nextMuaIdStr);
            if (Boolean.TRUE.equals(isSkipped)) {
                log.info("[SequentialDispatch] Candidate MUA id={} already in skipped set for bookingId={}, skipping to next",
                        nextMuaIdStr, bookingId);
                continue;
            }

            if (!dispatchLeaseService.tryClaim(bookingId, nextMuaIdStr)) {
                log.info("[SequentialDispatch] Candidate MUA id={} is currently evaluating another booking, skipping to next",
                        nextMuaIdStr);
                continue;
            }

            break; // Tìm thấy thợ hợp lệ
        }

        if (nextMuaIdStr != null) {
            Long nextMuaId = Long.valueOf(nextMuaIdStr);
            startCandidateOffer(bookingId, nextMuaId, nextMuaIdStr);

            UserEntity customer = booking.getCustomer();
            Map<String, Object> offerPayload = createOfferPayload(booking, nextMuaId,
                    customer != null ? customer.getFullName() : "Khách hàng",
                    customer != null ? customer.getPhoneNumber() : "");

            // CHỈ GỬI VÀO DUY NHẤT KÊNH RIÊNG CỦA THỢ TIẾP THEO
            messagePublisher.send("/topic/mua-offer/" + nextMuaId, offerPayload);
            log.info("[SequentialDispatch] Cascaded bookingId={} strictly to next closest MUA id={}", bookingId, nextMuaId);
            return true;
        } else {
            log.info("[SequentialDispatch] No more candidate MUAs available for bookingId={}", bookingId);
            expireInstantBooking(bookingId);
            return false;
        }
    }

    @Override
    @Transactional
    public boolean skipCurrentCandidate(Long bookingId, Long muaUserId) {
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.REQUESTED) {
            return false;
        }
        MuaProfileEntity muaProfile = muaProfileRepository.findByUserId(muaUserId).orElse(null);
        if (muaProfile == null) {
            log.warn("[SequentialDispatch] User id={} does not have a MUA profile, cannot skip bookingId={}", muaUserId, bookingId);
            return false;
        }

        Long muaId = muaProfile.getId();
        String currentMuaIdStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.current(bookingId));

        // Luôn lưu thợ này vào danh sách đã bỏ qua của bookingId này (TTL 10 phút)
        String skippedSetKey = InstantBookingKeys.skipped(bookingId);
        stringRedisTemplate.opsForSet().add(skippedSetKey, String.valueOf(muaId));
        stringRedisTemplate.expire(skippedSetKey, DISPATCH_STATE_TTL);

        // Giải phóng khóa tạm thời và timer của thợ này
        dispatchLeaseService.release(bookingId, String.valueOf(muaId));
        stringRedisTemplate.delete(InstantBookingKeys.timer(bookingId, muaId));

        if (currentMuaIdStr != null && currentMuaIdStr.equals(String.valueOf(muaId))) {
            log.info("[SequentialDispatch] MUA id={} manually skipped bookingId={}, cascading to next candidate", muaId, bookingId);
            return dispatchNextCandidate(bookingId);
        } else {
            log.info("[SequentialDispatch] MUA id={} clicked skip on bookingId={}, but current target is '{}'. Lock released, avoiding duplicate cascade.",
                    muaId, bookingId, currentMuaIdStr);
            return false;
        }
    }

    @Override
    @Transactional
    public boolean expireInstantBooking(Long bookingId) {
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.REQUESTED) {
            log.info(
                    "[InstantBookingTimeout] Booking id={} is not in REQUESTED status (current={}), skipping auto-cancel",
                    bookingId, booking != null ? booking.getStatus() : "null");
            return false;
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason("Hết thời gian tìm kiếm thợ trang điểm (45s timeout)");
        BookingEntity savedBooking = bookingRepository.save(booking);

        // Giải phóng khóa thợ đang giữ (nếu có) và clear redis keys
        clearDispatchState(bookingId);

        // Audit log
        bookingAuditService.logTransition(savedBooking, BookingStatus.REQUESTED, BookingStatus.CANCELLED, null,
                "Hệ thống tự động hủy đơn sau 45s không có thợ nhận");

        // Publish Spring event
        eventPublisher.publishEvent(new BookingStateChangedEvent(
                this,
                savedBooking.getId(),
                savedBooking.getBookingCode(),
                BookingStatus.REQUESTED,
                BookingStatus.CANCELLED,
                null));

        // Direct STOMP broadcasts to Customer
        Map<String, Object> timeoutPayload = new HashMap<>();
        timeoutPayload.put("type", "BOOKING_TIMEOUT");
        timeoutPayload.put("bookingId", bookingId);
        timeoutPayload.put("bookingCode", savedBooking.getBookingCode());
        timeoutPayload.put("status", "CANCELLED");
        timeoutPayload.put("message", "Đã hết thời gian tìm kiếm (45 giây). Đơn đã tự động hủy do không có thợ nhận.");
        timeoutPayload.put("timestamp", System.currentTimeMillis());

        messagePublisher.send("/topic/booking-matched/" + bookingId, timeoutPayload);
        messagePublisher.send("/topic/booking-status/" + bookingId, timeoutPayload);

        // Dismiss any lingering popup on MUAs
        dismissBookingOffers(bookingId, "TIMEOUT_EXPIRED");

        log.info("[InstantBookingTimeout] Successfully cancelled booking id={} due to 45s timeout", bookingId);
        return true;
    }

    @Override
    @Transactional
    public boolean cancelInstantBookingByCustomer(Long bookingId, Long customerUserId, String reason) {
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }

        if (booking.getStatus() != BookingStatus.REQUESTED && booking.getStatus() != BookingStatus.ACCEPTED) {
            log.warn("[CustomerCancel] Cannot cancel booking id={} in status={}", bookingId, booking.getStatus());
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.invalid_status", HttpStatus.BAD_REQUEST);
        }

        BookingStatus previousStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        String cancelReason = (reason != null && !reason.trim().isEmpty()) ? reason.trim()
                : "Khách hàng chủ động hủy tìm kiếm";
        booking.setCancellationReason(cancelReason);

        // Release MUA busy state if already accepted
        if (booking.getMua() != null) {
            MuaProfileEntity mua = booking.getMua();
            mua.setIsBusy(false);
            muaProfileRepository.save(mua);
        }

        BookingEntity savedBooking = bookingRepository.save(booking);

        // Giải phóng khóa thợ đang giữ (nếu có) và clear redis keys
        clearDispatchState(bookingId);

        // Audit log
        bookingAuditService.logTransition(savedBooking, previousStatus, BookingStatus.CANCELLED, customerUserId,
                cancelReason);

        // Publish Spring event
        eventPublisher.publishEvent(new BookingStateChangedEvent(
                this,
                savedBooking.getId(),
                savedBooking.getBookingCode(),
                previousStatus,
                BookingStatus.CANCELLED,
                customerUserId));

        // STOMP payload
        Map<String, Object> cancelPayload = new HashMap<>();
        cancelPayload.put("type", "BOOKING_CANCELLED");
        cancelPayload.put("bookingId", bookingId);
        cancelPayload.put("bookingCode", savedBooking.getBookingCode());
        cancelPayload.put("status", "CANCELLED");
        cancelPayload.put("message", cancelReason);
        cancelPayload.put("timestamp", System.currentTimeMillis());

        messagePublisher.send("/topic/booking-matched/" + bookingId, cancelPayload);
        messagePublisher.send("/topic/booking-status/" + bookingId, cancelPayload);

        // Dismiss MUAs
        dismissBookingOffers(bookingId, "CUSTOMER_CANCELLED");

        log.info("[CustomerCancel] Booking id={} successfully cancelled by customer userId={}", bookingId,
                customerUserId);
        return true;
    }

    @Override
    @Transactional
    public boolean dispatchNextCandidateIfCurrent(Long bookingId, Long expectedMuaId) {
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.REQUESTED) {
            return false;
        }
        String current = stringRedisTemplate.opsForValue().get(InstantBookingKeys.current(bookingId));
        return String.valueOf(expectedMuaId).equals(current) && dispatchNextCandidate(bookingId);
    }

    @Override
    @Transactional
    public void processPendingBooking(Long bookingId) {
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || booking.getBookingType() != BookingType.REALTIME_INSTANT
                || booking.getStatus() != BookingStatus.REQUESTED) {
            return;
        }
        if (booking.getCreatedAt() != null && booking.getCreatedAt()
                .isBefore(LocalDateTime.now().minusSeconds(BOOKING_TIMEOUT_SECONDS))) {
            expireInstantBooking(bookingId);
            return;
        }
        String sentAt = stringRedisTemplate.opsForValue().get(InstantBookingKeys.sentAt(bookingId));
        if (sentAt == null) {
            return;
        }
        long sentAtMillis;
        try {
            sentAtMillis = Long.parseLong(sentAt);
        } catch (NumberFormatException ex) {
            log.warn("Invalid offer timestamp for booking {}: {}", bookingId, sentAt);
            return;
        }
        if (System.currentTimeMillis() - sentAtMillis >= Duration.ofSeconds(OFFER_TIMEOUT_SECONDS).toMillis()) {
            dispatchNextCandidate(bookingId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecentAddressRes> getRecentAddresses(Long customerId) {
        if (customerId == null) {
            return Collections.emptyList();
        }
        List<Object[]> rows = bookingRepository.findRecentAddressesByCustomerId(customerId, PageRequest.of(0, 5));
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }

        List<RecentAddressRes> result = new ArrayList<>();
        for (Object[] row : rows) {
            String address = (String) row[0];
            BigDecimal lat = (BigDecimal) row[1];
            BigDecimal lng = (BigDecimal) row[2];
            LocalDateTime lastUsed = (LocalDateTime) row[3];
            Long count = row[4] != null ? ((Number) row[4]).longValue() : 1L;

            result.add(RecentAddressRes.builder()
                    .address(address)
                    .latitude(lat)
                    .longitude(lng)
                    .lastUsedAt(lastUsed)
                    .orderCount(count)
                    .build());
        }
        return result;
    }

    private void startCandidateOffer(Long bookingId, Long muaId, String candidateValue) {
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.current(bookingId),
                candidateValue, DISPATCH_STATE_TTL);
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.timer(bookingId, muaId),
                "PENDING", Duration.ofSeconds(OFFER_TIMEOUT_SECONDS));
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.sentAt(bookingId),
                String.valueOf(System.currentTimeMillis()), OFFER_TIMESTAMP_TTL);
    }

    private void clearDispatchState(Long bookingId) {
        String currentMuaIdStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.current(bookingId));
        if (currentMuaIdStr != null) {
            dispatchLeaseService.release(bookingId, currentMuaIdStr);
            stringRedisTemplate.delete(InstantBookingKeys.timer(bookingId, currentMuaIdStr));
        }
        stringRedisTemplate.delete(InstantBookingKeys.candidates(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.current(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.skipped(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.expiration(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.sentAt(bookingId));
    }

    private Map<String, Object> createOfferPayload(BookingEntity booking, Long targetMuaId,
                                                  String customerName, String customerPhone) {
        Map<String, Object> offerPayload = new HashMap<>();
        offerPayload.put("type", "INSTANT_BOOKING_OFFER");
        offerPayload.put("bookingId", booking.getId());
        offerPayload.put("bookingCode", booking.getBookingCode());
        offerPayload.put("targetMuaId", targetMuaId);
        offerPayload.put("customerAddress", booking.getDestinationAddress());
        offerPayload.put("latitude", booking.getDestinationLatitude());
        offerPayload.put("longitude", booking.getDestinationLongitude());
        offerPayload.put("customerName", customerName);
        offerPayload.put("customerPhone", customerPhone);

        BigDecimal basePrice = DEFAULT_BASE_PRICE;
        BigDecimal emergencyFee = EMERGENCY_SURCHARGE;
        BigDecimal platformFee = basePrice.multiply(BigDecimal.valueOf(0.20)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal earnings = basePrice.subtract(platformFee).add(emergencyFee);
        BigDecimal total = basePrice.add(emergencyFee);
        String serviceName = "Trang Điểm Khẩn Cấp";
        int durationMinutes = 60;
        List<String> styleNames = new ArrayList<>();
        List<String> packageItems = new ArrayList<>();

        String meta = stringRedisTemplate.opsForValue().get(InstantBookingKeys.meta(booking.getId()));
        Integer categoryId = null;
        Integer styleId = null;
        if (meta != null && meta.contains(":")) {
            String[] parts = meta.split(":");
            if (parts.length > 0 && !parts[0].isEmpty()) {
                try {
                    categoryId = Integer.valueOf(parts[0]);
                } catch (NumberFormatException ignored) {}
            }
            if (parts.length > 1 && !parts[1].isEmpty()) {
                try {
                    styleId = Integer.valueOf(parts[1]);
                } catch (NumberFormatException ignored) {}
            }
        }

        if (targetMuaId != null && categoryId != null) {
            List<ServicePackageEntity> candidatePackages = servicePackageRepository.findCandidatePackagesForMua(
                    targetMuaId, categoryId, styleId);
            if (!candidatePackages.isEmpty()) {
                ServicePackageEntity pkg = candidatePackages.get(0);
                if (pkg.getPrice() != null) {
                    basePrice = pkg.getPrice();
                }
                if (pkg.getPackageName() != null) {
                    serviceName = pkg.getPackageName();
                }
                if (pkg.getEstimatedDurationMinutes() != null) {
                    durationMinutes = pkg.getEstimatedDurationMinutes();
                }
                if (pkg.getStyles() != null) {
                    styleNames = pkg.getStyles().stream().map(MakeupStyleEntity::getStyleName).toList();
                }
                if (pkg.getPackageItems() != null) {
                    packageItems = pkg.getPackageItems().stream().map(PackageItemEntity::getItemName).toList();
                }
                platformFee = basePrice.multiply(BigDecimal.valueOf(0.20)).setScale(0, RoundingMode.HALF_UP);
                earnings = basePrice.subtract(platformFee).add(emergencyFee);
                total = basePrice.add(emergencyFee);
            }
        }

        double distanceKm = 1.8;
        if (targetMuaId != null) {
            var muaOpt = muaProfileRepository.findById(targetMuaId);
            if (muaOpt.isPresent() && muaOpt.get().getLastKnownLat() != null && muaOpt.get().getLastKnownLng() != null
                    && booking.getDestinationLatitude() != null && booking.getDestinationLongitude() != null) {
                distanceKm = GeoDistanceUtils.calculateDistanceKm(
                        muaOpt.get().getLastKnownLat().doubleValue(),
                        muaOpt.get().getLastKnownLng().doubleValue(),
                        booking.getDestinationLatitude().doubleValue(),
                        booking.getDestinationLongitude().doubleValue());
            }
        }
        int travelMinutes = (int) Math.max(5, Math.round(distanceKm * 3.5));

        offerPayload.put("serviceName", serviceName);
        offerPayload.put("basePrice", basePrice);
        offerPayload.put("emergencySurchargeFee", emergencyFee);
        offerPayload.put("platformFee", platformFee);
        offerPayload.put("earningsAmount", earnings);
        offerPayload.put("totalAmount", total);
        offerPayload.put("estimatedDurationMinutes", durationMinutes);
        offerPayload.put("styleNames", styleNames);
        offerPayload.put("packageItems", packageItems);
        offerPayload.put("distanceKm", Math.round(distanceKm * 10.0) / 10.0);
        offerPayload.put("estimatedTravelMinutes", travelMinutes);
        offerPayload.put("countdownSeconds", OFFER_TIMEOUT_SECONDS);
        offerPayload.put("timestamp", System.currentTimeMillis());
        return offerPayload;
    }

    private void dismissBookingOffers(Long bookingId, String reason) {
        Map<String, Object> dismissPayload = new HashMap<>();
        dismissPayload.put("type", "BOOKING_DISMISSED");
        dismissPayload.put("bookingId", bookingId);
        dismissPayload.put("reason", reason);
        dismissPayload.put("timestamp", System.currentTimeMillis());

        messagePublisher.send("/topic/instant-dismiss/" + bookingId, dismissPayload);
        messagePublisher.send("/topic/instant-dismiss", dismissPayload);
    }

    private List<Long> findAvailableCandidates(CreateInstantBookingReq req) {
        List<Long> candidateMuaIds = new ArrayList<>();
        double radiusKm = (req.getRadiusKm() != null && req.getRadiusKm() > 0) ? req.getRadiusKm() : 10.0;
        try {
            GeoResults<RedisGeoCommands.GeoLocation<String>> geoResults = redisGeoService.searchNearbyActiveMuas(
                    req.getDestinationLatitude().doubleValue(), req.getDestinationLongitude().doubleValue(), radiusKm);
            if (geoResults == null || geoResults.getContent().isEmpty()) {
                return candidateMuaIds;
            }
            List<Long> nearbyIds = new ArrayList<>();
            for (var item : geoResults.getContent()) {
                try {
                    nearbyIds.add(Long.valueOf(item.getContent().getName()));
                } catch (NumberFormatException ex) {
                    log.warn("Ignoring malformed MUA id in GEO index: {}", item.getContent().getName());
                }
            }
            // Fetch in bounded batches; keep the GEO distance order when filtering.
            Map<Long, MuaProfileEntity> profiles = new HashMap<>();
            for (int offset = 0; offset < nearbyIds.size(); offset += 250) {
                List<Long> batch = nearbyIds.subList(offset, Math.min(offset + 250, nearbyIds.size()));
                for (MuaProfileEntity profile : muaProfileRepository.findDispatchCandidatesByIdIn(batch)) {
                    profiles.put(profile.getId(), profile);
                }
            }
            List<String> lockKeys = nearbyIds.stream().map(id -> InstantBookingKeys.candidateLease(id)).toList();
            List<String> leases = lockKeys.isEmpty() ? List.of() : stringRedisTemplate.opsForValue().multiGet(lockKeys);
            for (int index = 0; index < nearbyIds.size(); index++) {
                Long id = nearbyIds.get(index);
                MuaProfileEntity mua = profiles.get(id);
                if (mua == null || mua.getUser() == null || mua.getUser().getRole() == null) {
                    continue;
                }
                boolean freelance = "ROLE_FREELANCE_MUA".equals(mua.getUser().getRole().getName());
                boolean verified = mua.getCertificates() != null && mua.getCertificates().stream()
                        .anyMatch(c -> Boolean.TRUE.equals(c.getIsVerified()) || "VERIFIED".equalsIgnoreCase(c.getStatus()));
                boolean leased = leases != null && leases.get(index) != null;
                if (freelance && verified && Boolean.TRUE.equals(mua.getIsOnline())
                        && !Boolean.TRUE.equals(mua.getIsBusy()) && !leased) {
                    candidateMuaIds.add(id);
                }
            }

            // Lọc thợ bắt buộc phải có gói dịch vụ thuộc Category và Style khách yêu cầu
            if (!candidateMuaIds.isEmpty() && req.getMasterCategoryId() != null) {
                List<Long> qualifiedMuaIds = servicePackageRepository.findMuaIdsByCandidateIdsAndCategoryAndStyle(
                        candidateMuaIds, req.getMasterCategoryId(), req.getStyleId());
                candidateMuaIds.retainAll(qualifiedMuaIds);
                log.info("[CandidateFilter] Filtered by masterCategoryId={}, styleId={}: {} qualified MUAs",
                        req.getMasterCategoryId(), req.getStyleId(), candidateMuaIds.size());
            }

        } catch (RuntimeException ex) {
            log.warn("Unable to load instant booking candidates", ex);
        }
        return candidateMuaIds;
    }
}
