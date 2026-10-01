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
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.mapper.booking.InstantBookingMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
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
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
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
    private final BookingDepositRepository bookingDepositRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public InstantBookingCreatedRes createInstantBooking(Long customerId, CreateInstantBookingReq req) {
        log.info("[InstantBooking] Customer id={} creating instant booking at address={}", customerId,
                req.getDestinationAddress());

        UserEntity customer = userRepository.findById(customerId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        // 0. Quét dọn và tự động hủy tất cả đơn cũ còn ở trạng thái REQUESTED của khách hàng này
        List<Long> customerBookings = bookingRepository.findCustomerPendingIds(
                customerId, BookingType.REALTIME_INSTANT, BookingStatus.REQUESTED);
        for (Long previousBookingId : customerBookings) {
            expireInstantBooking(previousBookingId, "Hủy do khách hàng tạo yêu cầu tìm thợ mới.");
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
        } else if (req.getTargetMuaId() != null && req.getMasterCategoryId() != null) {
            List<ServicePackageEntity> packages = servicePackageRepository.findCandidatePackagesForMua(
                    req.getTargetMuaId(), req.getMasterCategoryId(), req.getStyleId());
            if (!packages.isEmpty() && packages.get(0).getPrice() != null) {
                basePrice = packages.get(0).getPrice();
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
                .bookingDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))
                .startTime(LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh")))
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
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.meta(savedBooking.getId()) + ":total", String.valueOf(potentialCount), DISPATCH_STATE_TTL);
        if (req.getTargetMuaId() != null) {
            stringRedisTemplate.opsForValue().set(InstantBookingKeys.meta(savedBooking.getId()) + ":target_mua", String.valueOf(req.getTargetMuaId()), DISPATCH_STATE_TTL);
        }

        // 5. Record Audit log
        bookingAuditService.logTransition(savedBooking, null, BookingStatus.REQUESTED, customerId,
                "Khách hàng tạo đơn khẩn cấp (Instant Booking 30-60 phút)");

        // 6. Sequential Waterfall Dispatch: Queue candidates in Redis & offer to first closest MUA
        Long firstTargetMuaId = null;
        Long firstTargetUserId = null;
        String listKey = InstantBookingKeys.queue(savedBooking.getId());
        String candidatesKey = InstantBookingKeys.candidates(savedBooking.getId());

        stringRedisTemplate.delete(listKey);
        stringRedisTemplate.delete(InstantBookingKeys.skipped(savedBooking.getId()));

        // Lưu snapshot danh sách candidates đầy đủ vào Redis key 'booking:dispatch:candidates:{id}'
        try {
            stringRedisTemplate.opsForValue().set(candidatesKey, objectMapper.writeValueAsString(candidateMuaIds), DISPATCH_STATE_TTL);
            log.info("[InstantBooking] Successfully saved candidates snapshot to Redis key {}: {}", candidatesKey, candidateMuaIds);
        } catch (Exception e) {
            stringRedisTemplate.opsForValue().set(candidatesKey, candidateMuaIds.toString(), DISPATCH_STATE_TTL);
        }

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

        // 7. Store TTL key for countdown auto-expiration (Đích danh 20s, ngẫu nhiên 45s)
        int searchTimeout = (req.getTargetMuaId() != null) ? OFFER_TIMEOUT_SECONDS : BOOKING_TIMEOUT_SECONDS;
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.expiration(savedBooking.getId()), "ACTIVE", Duration.ofSeconds(searchTimeout));

        return instantBookingMapper.toCreatedRes(savedBooking, potentialCount, searchTimeout);
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

            // Bắn tín hiệu thu hồi ngay lập tức cho riêng thợ cũ để đóng modal trên thiết bị thợ cũ
            Map<String, Object> revokePayload = new HashMap<>();
            revokePayload.put("type", "OFFER_REVOKED");
            revokePayload.put("bookingId", bookingId);
            revokePayload.put("targetMuaId", Long.valueOf(currentMuaIdStr));
            revokePayload.put("reason", "Ca làm việc đã được chuyển tiếp sang thợ tiếp theo.");
            messagePublisher.send("/topic/mua-offer-revoked/" + currentMuaIdStr, revokePayload);
        }
        
        stringRedisTemplate.delete(InstantBookingKeys.sentAt(bookingId));

        // 2. Lấy thợ tiếp theo trong hàng đợi (lọc qua các thợ đã bỏ qua hoặc đang bận)
        String listKey = InstantBookingKeys.queue(bookingId);
        String nextMuaIdStr = null;

        while ((nextMuaIdStr = stringRedisTemplate.opsForList().leftPop(listKey)) != null) {
            Boolean isSkipped = stringRedisTemplate.opsForSet().isMember(skippedSetKey, nextMuaIdStr);
            if (Boolean.TRUE.equals(isSkipped)) {
                log.info("[SequentialDispatch] Candidate MUA id={} already in skipped set for bookingId={}, skipping to next",
                        nextMuaIdStr, bookingId);
                continue;
            }

            if (!dispatchLeaseService.tryClaim(bookingId, nextMuaIdStr)) {
                log.warn("[SequentialDispatch] tryClaim FAILED for MUA id={} bookingId={} — MUA is locked by another booking (candidateLease key exists)",
                        nextMuaIdStr, bookingId);
                // Đọc giá trị hiện tại để debug
                String existingLease = stringRedisTemplate.opsForValue().get(
                        com.makeup.platform.common.constants.InstantBookingKeys.candidateLease(nextMuaIdStr));
                log.warn("[SequentialDispatch] Current lease for MUA id={}: bookingId={}", nextMuaIdStr, existingLease);
                continue;
            }
            log.info("[SequentialDispatch] tryClaim OK for MUA id={} bookingId={}", nextMuaIdStr, bookingId);

            break; // Tìm thấy thợ hợp lệ
        }

        if (nextMuaIdStr != null) {
            Long nextMuaId = Long.valueOf(nextMuaIdStr);
            startCandidateOffer(bookingId, nextMuaId, nextMuaIdStr);

            UserEntity customer = booking.getCustomer();
            Map<String, Object> offerPayload = createOfferPayload(booking, nextMuaId,
                    customer != null ? customer.getFullName() : "Khách hàng",
                    customer != null ? customer.getPhoneNumber() : "");

            String totalStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.meta(bookingId) + ":total");
            int totalCandidates = 1;
            if (totalStr != null) {
                try {
                    totalCandidates = Integer.parseInt(totalStr);
                } catch (NumberFormatException ignored) {}
            }
            Long remainingInList = stringRedisTemplate.opsForList().size(listKey);
            int candidateIndex = Math.max(1, totalCandidates - (remainingInList != null ? remainingInList.intValue() : 0));

            offerPayload.put("candidateIndex", candidateIndex);
            offerPayload.put("totalCandidates", totalCandidates);

            // CHỈ GỬI VÀO DUY NHẤT KÊNH RIÊNG CỦA THỢ TIẾP THEO
            messagePublisher.send("/topic/mua-offer/" + nextMuaId, offerPayload);
            log.info("[SequentialDispatch] Cascaded bookingId={} strictly to next closest MUA id={} (candidateIndex={}/{})",
                    bookingId, nextMuaId, candidateIndex, totalCandidates);
            return true;
        } else {
            log.info("[SequentialDispatch] No more candidate MUAs available for bookingId={}", bookingId);
            String targetedMuaStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.meta(bookingId) + ":target_mua");
            String timeoutMsg = (targetedMuaStr != null && !targetedMuaStr.isEmpty())
                    ? "Chuyên viên trang điểm bạn chọn hiện không phản hồi. Vui lòng thử lại sau hoặc đặt tìm thợ tự động."
                    : "Hiện không có chuyên viên trang điểm nào khả dụng trong khu vực để nhận ca.";
            expireInstantBooking(bookingId, timeoutMsg);
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

        // Giải phóng khóa tạm thời, timer, current và sentAt của thợ này
        dispatchLeaseService.release(bookingId, String.valueOf(muaId));
        stringRedisTemplate.delete(InstantBookingKeys.timer(bookingId, muaId));
        stringRedisTemplate.delete(InstantBookingKeys.current(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.sentAt(bookingId));

        if (currentMuaIdStr != null && currentMuaIdStr.equals(String.valueOf(muaId))) {
            log.info("[SequentialDispatch] MUA id={} manually skipped bookingId={}", muaId, bookingId);
            String targetedMuaStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.meta(bookingId) + ":target_mua");
            if (targetedMuaStr != null && !targetedMuaStr.isEmpty()) {
                log.info("[SequentialDispatch] Targeted MUA id={} rejected bookingId={}, cancelling immediately without cascading", muaId, bookingId);
                expireInstantBooking(bookingId, "Chuyên viên trang điểm bạn chọn hiện bận và đã từ chối yêu cầu.");
                return true;
            }
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
        return expireInstantBooking(bookingId, null);
    }

    @Transactional
    public boolean expireInstantBooking(Long bookingId, String timeoutMessage) {
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.REQUESTED) {
            log.info(
                    "[InstantBookingTimeout] Booking id={} is not in REQUESTED status (current={}), skipping auto-cancel",
                    bookingId, booking != null ? booking.getStatus() : "null");
            return false;
        }

        if (timeoutMessage == null) {
            String currentMua = stringRedisTemplate.opsForValue().get(InstantBookingKeys.current(bookingId));
            if (currentMua != null) {
                String sentAtStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.sentAt(bookingId));
                if (sentAtStr != null) {
                    try {
                        long sentAt = Long.parseLong(sentAtStr);
                        long elapsed = System.currentTimeMillis() - sentAt;
                        if (elapsed < 18_000) {
                            log.warn("[InstantBookingTimeout] Postponing booking expiration for bookingId={} because current MUA {} offer is still active ({}ms elapsed)",
                                    bookingId, currentMua, elapsed);
                            return false;
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        String effectiveMessage = (timeoutMessage != null && !timeoutMessage.trim().isEmpty())
                ? timeoutMessage.trim()
                : "Hết thời gian tìm kiếm thợ trang điểm (45s timeout)";

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(effectiveMessage);
        BookingEntity savedBooking = bookingRepository.save(booking);

        // Giải phóng khóa thợ đang giữ (nếu có) và clear redis keys
        clearDispatchState(bookingId);

        // Audit log
        bookingAuditService.logTransition(savedBooking, BookingStatus.REQUESTED, BookingStatus.CANCELLED, null,
                effectiveMessage);

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
        timeoutPayload.put("message", effectiveMessage);
        timeoutPayload.put("timestamp", System.currentTimeMillis());

        messagePublisher.send("/topic/booking-matched/" + bookingId, timeoutPayload);
        messagePublisher.send("/topic/booking-status/" + bookingId, timeoutPayload);

        // Dismiss any lingering popup on MUAs
        dismissBookingOffers(bookingId, "TIMEOUT_EXPIRED");

        log.info("[InstantBookingTimeout] Successfully cancelled booking id={} with message: {}", bookingId, effectiveMessage);
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

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            log.info("[CustomerCancel] Booking id={} is already CANCELLED, returning success (idempotent)", bookingId);
            return true;
        }

        if (booking.getStatus() != BookingStatus.REQUESTED && booking.getStatus() != BookingStatus.ACCEPTED) {
            log.warn("[CustomerCancel] Cannot cancel booking id={} in status={}", bookingId, booking.getStatus());
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.invalid_status", HttpStatus.BAD_REQUEST);
        }

        BookingStatus previousStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        String defaultReason = (previousStatus == BookingStatus.ACCEPTED)
                ? "Khách hàng đã hủy yêu cầu làm đẹp"
                : "Khách hàng chủ động hủy tìm kiếm";
        String cancelReason = (reason != null && !reason.trim().isEmpty() && !reason.contains("chủ động hủy tìm kiếm"))
                ? reason.trim() : defaultReason;
        booking.setCancellationReason(cancelReason);

        // Release MUA busy state if already accepted
        Long acceptedMuaId = null;
        if (booking.getMua() != null) {
            MuaProfileEntity mua = booking.getMua();
            acceptedMuaId = mua.getId();
            mua.setIsBusy(false);
            if (Boolean.TRUE.equals(mua.getIsOnline())) {
                mua.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
            } else {
                mua.setAvailabilityStatus(AvailabilityStatus.OFFLINE);
            }
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
        if (acceptedMuaId != null) {
            messagePublisher.send("/topic/booking-customer-rejected/" + acceptedMuaId, cancelPayload);
        }

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

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPendingOfferForMua(Long muaUserId) {
        if (muaUserId == null) {
            return null;
        }
        MuaProfileEntity mua = muaProfileRepository.findByUserId(muaUserId).orElse(null);
        if (mua == null) {
            return null;
        }
        Long muaId = mua.getId();
        String bookingIdStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.candidateLease(muaId));
        if (bookingIdStr == null) {
            return null;
        }

        Long bookingId;
        try {
            bookingId = Long.parseLong(bookingIdStr);
        } catch (NumberFormatException e) {
            return null;
        }

        String currentTargetStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.current(bookingId));
        if (currentTargetStr == null || !currentTargetStr.equals(String.valueOf(muaId))) {
            return null;
        }

        BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.REQUESTED) {
            return null;
        }

        String sentAtStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.sentAt(bookingId));
        int remainingSeconds = OFFER_TIMEOUT_SECONDS;
        long sentAtMs = System.currentTimeMillis(); // default fallback
        if (sentAtStr != null) {
            try {
                sentAtMs = Long.parseLong(sentAtStr);
                long elapsed = (System.currentTimeMillis() - sentAtMs) / 1000;
                remainingSeconds = Math.max(1, (int) (OFFER_TIMEOUT_SECONDS - elapsed));
            } catch (NumberFormatException ignored) {
            }
        }

        UserEntity customer = booking.getCustomer();
        Map<String, Object> offerPayload = createOfferPayload(
                booking,
                muaId,
                customer != null ? customer.getFullName() : "Khách hàng",
                customer != null ? customer.getPhoneNumber() : ""
        );
        offerPayload.put("timestamp", sentAtMs);
        offerPayload.put("countdownSeconds", OFFER_TIMEOUT_SECONDS);
        return offerPayload;
    }

    @Override
    @Transactional
    public boolean rejectMatchedProvider(Long bookingId, Long customerUserId, String reason) {
        log.info("[RejectMatchedProvider] Customer userId={} rejecting current MUA for bookingId={}, reason={}",
                customerUserId, bookingId, reason);
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }

        if (booking.getStatus() != BookingStatus.ACCEPTED) {
            log.warn("[RejectMatchedProvider] Cannot reject provider for booking id={} in status={}",
                    bookingId, booking.getStatus());
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.invalid_status", HttpStatus.BAD_REQUEST);
        }

        String effectiveReason = (reason != null && !reason.trim().isEmpty())
                ? reason.trim() : "Khách hàng từ chối thợ và yêu cầu tìm kiếm thợ khác";

        MuaProfileEntity rejectedMua = booking.getMua();
        if (rejectedMua != null) {
            rejectedMua.setIsBusy(false);
            if (Boolean.TRUE.equals(rejectedMua.getIsOnline())) {
                rejectedMua.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
            } else {
                rejectedMua.setAvailabilityStatus(AvailabilityStatus.OFFLINE);
            }
            muaProfileRepository.save(rejectedMua);

            // Ghi nhận MUA bị từ chối vào Set trong Redis để không điều phối lại cho đơn này
            stringRedisTemplate.opsForSet().add(InstantBookingKeys.skipped(bookingId),
                    String.valueOf(rejectedMua.getId()));

            // Bắn WebSocket thông báo thợ bị từ chối
            Map<String, Object> rejectedPayload = new HashMap<>();
            rejectedPayload.put("type", "BOOKING_REJECTED_BY_CUSTOMER");
            rejectedPayload.put("bookingId", bookingId);
            rejectedPayload.put("bookingCode", booking.getBookingCode());
            rejectedPayload.put("reason", effectiveReason);
            rejectedPayload.put("message", "Khách hàng đã từ chối nhận dịch vụ (" + effectiveReason + ") và chuyển tìm thợ khác.");
            rejectedPayload.put("timestamp", System.currentTimeMillis());

            messagePublisher.send("/topic/booking-customer-rejected/" + rejectedMua.getId(), rejectedPayload);
            messagePublisher.send("/topic/booking-status/" + bookingId, rejectedPayload);
        }

        BookingStatus previousStatus = booking.getStatus();
        booking.setMua(null);
        booking.setStatus(BookingStatus.REQUESTED);
        BookingEntity savedBooking = bookingRepository.save(booking);

        // Audit log
        bookingAuditService.logTransition(savedBooking, previousStatus, BookingStatus.REQUESTED, customerUserId, effectiveReason);

        // Publish Spring event
        eventPublisher.publishEvent(new BookingStateChangedEvent(
                this,
                savedBooking.getId(),
                savedBooking.getBookingCode(),
                previousStatus,
                BookingStatus.REQUESTED,
                customerUserId));

        // STOMP thông báo phía Khách hàng tiếp tục tìm kiếm
        Map<String, Object> resetPayload = new HashMap<>();
        resetPayload.put("type", "BOOKING_SEARCHING_AGAIN");
        resetPayload.put("bookingId", bookingId);
        resetPayload.put("status", "REQUESTED");
        resetPayload.put("message", "Đang tiếp tục tìm kiếm thợ trang điểm khác...");
        resetPayload.put("timestamp", System.currentTimeMillis());
        messagePublisher.send("/topic/booking-status/" + bookingId, resetPayload);
        messagePublisher.send("/topic/booking-matched/" + bookingId, resetPayload);

        // Tiếp tục gọi chu trình điều phối thợ tiếp theo trong hàng đợi
        dispatchNextCandidate(bookingId);
        return true;
    }

    @Override
    @Transactional
    public boolean confirmDeposit(Long bookingId, Long customerUserId, List<String> addOnNames, BigDecimal addOnTotal) {
        log.info("[ConfirmDeposit] Customer userId={} confirming deposit for bookingId={}, addOns={}, addOnTotal={}",
                customerUserId, bookingId, addOnNames, addOnTotal);
        BookingEntity booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found", HttpStatus.NOT_FOUND));

        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerUserId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED_TRANSITION,
                    "booking.unauthorized_transition", HttpStatus.FORBIDDEN);
        }

        if (booking.getStatus() != BookingStatus.ACCEPTED) {
            log.warn("[ConfirmDeposit] Cannot confirm deposit for booking id={} in status={}",
                    bookingId, booking.getStatus());
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_STATE_TRANSITION,
                    "booking.invalid_status", HttpStatus.BAD_REQUEST);
        }

        BigDecimal extra = (addOnTotal != null && addOnTotal.compareTo(BigDecimal.ZERO) > 0)
                ? addOnTotal : BigDecimal.ZERO;
        if (extra.compareTo(BigDecimal.ZERO) > 0) {
            booking.setServiceSubtotal((booking.getServiceSubtotal() != null ? booking.getServiceSubtotal() : BigDecimal.ZERO).add(extra));
            booking.setTotalAmount(booking.getTotalAmount().add(extra));
            BigDecimal extraDeposit = extra.multiply(DEPOSIT_RATE).setScale(0, RoundingMode.HALF_UP);
            booking.setDepositAmount(booking.getDepositAmount().add(extraDeposit));
        }

        BookingEntity savedBooking = bookingRepository.save(booking);

        // Tạo hoặc cập nhật nghĩa vụ cọc trong booking_deposits (chưa đánh dấu PAID, chờ IPN MoMo/VNPay)
        if (bookingDepositRepository != null) {
            BookingDepositEntity deposit = bookingDepositRepository.findByBookingId(bookingId)
                    .orElseGet(() -> BookingDepositEntity.builder()
                            .booking(savedBooking)
                            .pricingVersion(LocalDate.now().toString() + ":" + savedBooking.getVersion())
                            .expiresAt(savedBooking.getDepositExpiredAt() != null
                                    ? savedBooking.getDepositExpiredAt()
                                    : OffsetDateTime.now(ZoneOffset.ofHours(7)).plusMinutes(15))
                            .status("UNPAID")
                            .build());
            deposit.setRequiredAmount(savedBooking.getDepositAmount());
            bookingDepositRepository.save(deposit);
        }

        // Đọc cấu hình % chiết khấu Freelancer động từ Redis (mặc định 20%)
        BigDecimal commissionRate = new BigDecimal("0.20");
        try {
            String rateStr = stringRedisTemplate.opsForValue().get("settings:freelancer_commission_rate");
            if (rateStr != null && !rateStr.trim().isEmpty()) {
                commissionRate = new BigDecimal(rateStr.trim());
            }
        } catch (Exception ignored) {}

        BigDecimal finalServiceSubtotal = savedBooking.getServiceSubtotal() != null ? savedBooking.getServiceSubtotal() : BigDecimal.ZERO;
        BigDecimal platformFee = finalServiceSubtotal.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal distanceFee = savedBooking.getDistanceFee() != null ? savedBooking.getDistanceFee() : BigDecimal.ZERO;
        BigDecimal surchargeFee = savedBooking.getSurchargeFee() != null ? savedBooking.getSurchargeFee() : BigDecimal.ZERO;
        BigDecimal earningsAmount = finalServiceSubtotal.subtract(platformFee).add(surchargeFee).add(distanceFee);

        // Bắn WebSocket thông báo thợ đã được khách chốt dịch vụ thêm & đang chờ cọc
        if (savedBooking.getMua() != null) {
            Map<String, Object> confirmPayload = new HashMap<>();
            confirmPayload.put("type", "CUSTOMER_CONFIRMED_ADDONS");
            confirmPayload.put("bookingId", bookingId);
            confirmPayload.put("bookingCode", savedBooking.getBookingCode());
            confirmPayload.put("addOnNames", addOnNames != null ? addOnNames : List.of());
            confirmPayload.put("addOnTotal", extra);
            confirmPayload.put("totalAmount", savedBooking.getTotalAmount());
            confirmPayload.put("depositAmount", savedBooking.getDepositAmount());
            confirmPayload.put("platformFee", platformFee);
            confirmPayload.put("earningsAmount", earningsAmount);
            confirmPayload.put("message", "Khách hàng đã chốt dịch vụ thêm và đang tiến hành thanh toán cọc 30%.");
            confirmPayload.put("timestamp", System.currentTimeMillis());

            messagePublisher.send("/topic/booking-customer-confirmed/" + savedBooking.getMua().getId(), confirmPayload);
            messagePublisher.send("/topic/booking-status/" + bookingId, confirmPayload);
            messagePublisher.send("/topic/booking-matched/" + bookingId, confirmPayload);
        }

        return true;
    }

    private void startCandidateOffer(Long bookingId, Long muaId, String candidateValue) {
        long nowMs = System.currentTimeMillis();
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.current(bookingId),
                candidateValue, DISPATCH_STATE_TTL);
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.sentAt(bookingId),
                String.valueOf(nowMs), OFFER_TIMESTAMP_TTL);
        stringRedisTemplate.opsForValue().set(InstantBookingKeys.timer(bookingId, muaId),
                "PENDING", Duration.ofSeconds(OFFER_TIMEOUT_SECONDS));
        log.info("[startCandidateOffer] bookingId={}, muaId={}, sentAt={}ms, timer={}s",
                bookingId, muaId, nowMs, OFFER_TIMEOUT_SECONDS);
    }

    private void clearDispatchState(Long bookingId) {
        String currentMuaIdStr = stringRedisTemplate.opsForValue().get(InstantBookingKeys.current(bookingId));
        if (currentMuaIdStr != null) {
            dispatchLeaseService.release(bookingId, currentMuaIdStr);
            stringRedisTemplate.delete(InstantBookingKeys.timer(bookingId, currentMuaIdStr));
        }

        // Giải phóng triệt để candidate lease của tất cả các thợ trong cuốc này
        String candidatesJson = stringRedisTemplate.opsForValue().get(InstantBookingKeys.candidates(bookingId));
        if (candidatesJson != null) {
            try {
                List<?> cIds = objectMapper.readValue(candidatesJson, List.class);
                for (Object cId : cIds) {
                    if (cId != null) {
                        dispatchLeaseService.release(bookingId, cId.toString());
                    }
                }
            } catch (Exception ignored) {}
        }

        // Xóa sạch tất cả các timer key còn sót của booking này
        try {
            var timerKeys = stringRedisTemplate.keys(InstantBookingKeys.OFFER_TIMER_PREFIX + bookingId + ":*");
            if (timerKeys != null && !timerKeys.isEmpty()) {
                stringRedisTemplate.delete(timerKeys);
            }
        } catch (Exception ignored) {}

        stringRedisTemplate.delete(InstantBookingKeys.queue(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.current(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.skipped(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.expiration(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.sentAt(bookingId));
        stringRedisTemplate.delete(InstantBookingKeys.meta(bookingId) + ":total");
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
        // 1. Nếu khách hàng chọn đích danh 1 thợ MUA từ danh sách Online (Đặt Đích Danh)
        if (req.getTargetMuaId() != null) {
            Long targetId = req.getTargetMuaId();
            var targetOpt = muaProfileRepository.findById(targetId);
            if (targetOpt.isEmpty()) {
                throw new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "booking.target_mua_not_found", HttpStatus.NOT_FOUND);
            }
            MuaProfileEntity targetMua = targetOpt.get();
            String leaseKey = InstantBookingKeys.candidateLease(targetId);
            boolean isLeased = Boolean.TRUE.equals(stringRedisTemplate.hasKey(leaseKey));
            boolean isOnline = Boolean.TRUE.equals(targetMua.getIsOnline());
            boolean isBusy = Boolean.TRUE.equals(targetMua.getIsBusy());

            if (!isOnline || isBusy || isLeased) {
                log.warn("[CandidateFilter] Targeted MUA id={} is not available: isOnline={}, isBusy={}, isLeased={}",
                        targetId, isOnline, isBusy, isLeased);
                throw new CustomBusinessException(ErrorCodes.ERR_MUA_NOT_AVAILABLE,
                        "Chuyên viên trang điểm bạn chọn hiện đang bận hoặc không trực tuyến.", HttpStatus.BAD_REQUEST);
            }

            log.info("[CandidateFilter] Targeted booking strictly for MUA id={}", targetId);
            return new ArrayList<>(List.of(targetId));
        }

        // 2. Luồng đặt ngẫu nhiên / tìm thợ gần nhất (GIỮ NGUYÊN HOÀN TOÀN)
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
