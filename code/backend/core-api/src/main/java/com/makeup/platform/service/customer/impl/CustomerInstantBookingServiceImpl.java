package com.makeup.platform.service.customer.impl;

import com.makeup.platform.common.constants.ErrorCodes;
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
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.booking.InstantBookingMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.service.customer.CustomerInstantBookingService;
import com.makeup.platform.service.pricing.SurgePricingService;
import com.makeup.platform.service.telemetry.RedisGeoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerInstantBookingServiceImpl implements CustomerInstantBookingService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final SurgePricingService surgePricingService;
    private final BookingAuditService bookingAuditService;
    private final RedisGeoService redisGeoService;
    private final SimpMessagingTemplate messagingTemplate;
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

        // 0. Quét dọn và tự động hủy tất cả đơn cũ còn ở trạng thái REQUESTED của khách
        // hàng này
        // Khi khách bấm "Đặt Lại" hoặc tạo yêu cầu mới, các đơn cũ chưa có thợ nhận sẽ
        // được hủy ngay để không chặn khách
        List<BookingEntity> customerBookings = bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        for (BookingEntity b : customerBookings) {
            if (b.getBookingType() == BookingType.REALTIME_INSTANT && b.getStatus() == BookingStatus.REQUESTED) {
                log.info("[InstantBooking] Auto-expiring pending REQUESTED booking id={} before new request",
                        b.getId());
                expireInstantBooking(b.getId());
            }
        }

        // Chặn tạo đơn tức thì nếu khách hàng đang có đơn ĐÃ ĐƯỢC THỢ NHẬN VÀ ĐANG THỰC
        // HIỆN
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

        // 1. Tính toán giá dịch vụ & Hệ số Surge thời gian thực (Dynamic Pricing
        // Engine)
        BigDecimal basePrice = new BigDecimal("500000.00");
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

        BigDecimal emergencySurchargeFee = new BigDecimal("150000.00"); // Phụ phí ca khẩn cấp 30 phút
        BigDecimal totalSurchargeFee = emergencySurchargeFee.add(surgeAmount);

        BigDecimal totalAmount = basePrice.add(totalSurchargeFee).setScale(2, RoundingMode.HALF_UP);
        BigDecimal rawDeposit = totalAmount.multiply(new BigDecimal("0.30"));
        BigDecimal depositAmount = rawDeposit.divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(1000))
                .setScale(2, RoundingMode.HALF_UP);

        // 2. Query potential online MUAs in Redis GEO (30km) sorted by distance ASC
        List<Long> candidateMuaIds = new ArrayList<>();
        try {
            GeoResults<RedisGeoCommands.GeoLocation<String>> geoResults = redisGeoService.searchNearbyActiveMuas(
                    req.getDestinationLatitude().doubleValue(),
                    req.getDestinationLongitude().doubleValue(),
                    TelemetryConstants.MAX_RADIUS_KM);
            if (geoResults != null && !geoResults.getContent().isEmpty()) {
                for (var item : geoResults.getContent()) {
                    try {
                        Long muaId = Long.valueOf(item.getContent().getName());
                        var muaOpt = muaProfileRepository.findById(muaId);
                        if (muaOpt.isPresent()) {
                            var mua = muaOpt.get();
                            boolean isFreelanceMUA = mua.getUser() != null
                                    && mua.getUser().getRole() != null
                                    && "ROLE_FREELANCE_MUA".equals(mua.getUser().getRole().getName());
                            boolean hasVerifiedCert = mua.getCertificates() != null && mua.getCertificates().stream()
                                    .anyMatch(c -> Boolean.TRUE.equals(c.getIsVerified())
                                            || "VERIFIED".equalsIgnoreCase(c.getStatus()));
                            if (isFreelanceMUA && hasVerifiedCert && Boolean.TRUE.equals(mua.getIsOnline())
                                    && !Boolean.TRUE.equals(mua.getIsBusy())) {
                                String lockKey = "mua:dispatch:locked:" + muaId;
                                Boolean isLocked = stringRedisTemplate.hasKey(lockKey);
                                if (!Boolean.TRUE.equals(isLocked)) {
                                    candidateMuaIds.add(muaId);
                                }
                            }
                        }
                    } catch (Exception ignored) {
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[InstantBooking] Redis GEO query failed: {}", e.getMessage());
        }

        // BẮT BUỘC: Nếu không có thợ nào online trong bán kính quét -> Báo lỗi ngay cho
        // khách hàng, không tạo đơn rác
        if (candidateMuaIds.isEmpty()) {
            log.warn("[InstantBooking] No online available MUA found within 10km for customer id={}", customerId);
            throw new CustomBusinessException(ErrorCodes.ERR_MUA_NOT_AVAILABLE,
                    "booking.no_mua_available_in_radius", HttpStatus.NOT_FOUND);
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

        BookingEntity savedBooking = bookingRepository.save(booking);

        // 5. Record Audit log
        bookingAuditService.logTransition(savedBooking, null, BookingStatus.REQUESTED, customerId,
                "Khách hàng tạo đơn khẩn cấp (Instant Booking 30-60 phút)");

        // 6. Sequential Waterfall Dispatch: Queue candidates in Redis & offer to first
        // closest MUA
        Long firstTargetMuaId = null;
        Long firstTargetUserId = null;
        String listKey = "booking:dispatch:candidates:" + savedBooking.getId();
        stringRedisTemplate.delete(listKey);
        for (Long cId : candidateMuaIds) {
            stringRedisTemplate.opsForList().rightPush(listKey, String.valueOf(cId));
        }
        stringRedisTemplate.expire(listKey, Duration.ofMinutes(10));

        String firstStr = stringRedisTemplate.opsForList().leftPop(listKey);
        if (firstStr != null) {
            firstTargetMuaId = Long.valueOf(firstStr);
            var muaOpt = muaProfileRepository.findById(firstTargetMuaId);
            firstTargetUserId = muaOpt.map(m -> m.getUser() != null ? m.getUser().getId() : null).orElse(null);

            stringRedisTemplate.opsForValue().set("booking:dispatch:current:" + savedBooking.getId(),
                    firstStr, Duration.ofMinutes(10));
            // Khóa thợ này trong 25 giây để chống đơn khác tranh chấp
            stringRedisTemplate.opsForValue().set("mua:dispatch:locked:" + firstTargetMuaId,
                    String.valueOf(savedBooking.getId()), Duration.ofSeconds(25));
            // Timer 20s Server-side: Tự động chuyển thợ kế tiếp nếu thợ này không phản hồi
            // (ví dụ tắt trình duyệt/mất mạng)
            stringRedisTemplate.opsForValue().set(
                    "booking:dispatch:timer:" + savedBooking.getId() + ":" + firstTargetMuaId,
                    "PENDING", Duration.ofSeconds(20));
            stringRedisTemplate.opsForValue().set("booking:dispatch:sent_at:" + savedBooking.getId(),
                    String.valueOf(System.currentTimeMillis()), Duration.ofMinutes(5));
        }

        try {
            Map<String, Object> offerPayload = new HashMap<>();
            offerPayload.put("type", "INSTANT_BOOKING_OFFER");
            offerPayload.put("bookingId", savedBooking.getId());
            offerPayload.put("bookingCode", savedBooking.getBookingCode());
            offerPayload.put("targetMuaId", firstTargetMuaId);
            offerPayload.put("targetUserId", firstTargetUserId);
            offerPayload.put("candidateIndex", 1);
            offerPayload.put("totalCandidates", potentialCount);
            offerPayload.put("customerAddress", savedBooking.getDestinationAddress());
            offerPayload.put("latitude", savedBooking.getDestinationLatitude());
            offerPayload.put("longitude", savedBooking.getDestinationLongitude());
            offerPayload.put("customerName", customer.getFullName());
            offerPayload.put("customerPhone", customer.getPhoneNumber());
            offerPayload.put("earningsAmount", savedBooking.getTotalAmount().multiply(new BigDecimal("0.80")));
            offerPayload.put("totalAmount", savedBooking.getTotalAmount());
            offerPayload.put("countdownSeconds", 20);
            offerPayload.put("timestamp", System.currentTimeMillis());

            if (firstTargetMuaId != null) {
                // CHỈ GỬI VÀO DUY NHẤT KÊNH RIÊNG CỦA THỢ ĐƯỢC CHỌN (KHÔNG GỬI KÊNH CHUNG)
                messagingTemplate.convertAndSend("/topic/mua-offer/" + firstTargetMuaId, offerPayload);
                log.info(
                        "[InstantBooking] Dispatched offer strictly to closest MUA id={} (totalCandidates={}) for bookingId={}",
                        firstTargetMuaId, potentialCount, savedBooking.getId());
            }
        } catch (Exception e) {
            log.warn("[InstantBooking] WebSocket send failed: {}", e.getMessage());
        }

        // 7. Store TTL key for 45s countdown auto-expiration
        stringRedisTemplate.opsForValue().set("booking:instant:expire:" + savedBooking.getId(), "ACTIVE",
                Duration.ofSeconds(45));

        return instantBookingMapper.toCreatedRes(savedBooking, potentialCount, 45);
    }

    @Override
    @Transactional
    public boolean dispatchNextCandidate(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.REQUESTED) {
            log.info("[SequentialDispatch] Booking id={} is no longer in REQUESTED status, aborting next dispatch",
                    bookingId);
            return false;
        }

        // 1. Giải phóng khóa thợ hiện tại và timer cũ (nếu có)
        String currentMuaIdStr = stringRedisTemplate.opsForValue().get("booking:dispatch:current:" + bookingId);
        if (currentMuaIdStr != null) {
            stringRedisTemplate.delete("mua:dispatch:locked:" + currentMuaIdStr);
            stringRedisTemplate.delete("booking:dispatch:timer:" + bookingId + ":" + currentMuaIdStr);
        }
        stringRedisTemplate.delete("booking:dispatch:sent_at:" + bookingId);

        // 2. Lấy thợ tiếp theo trong hàng đợi
        String listKey = "booking:dispatch:candidates:" + bookingId;
        String nextMuaIdStr = stringRedisTemplate.opsForList().leftPop(listKey);

        if (nextMuaIdStr != null) {
            Long nextMuaId = Long.valueOf(nextMuaIdStr);
            stringRedisTemplate.opsForValue().set("booking:dispatch:current:" + bookingId,
                    nextMuaIdStr, Duration.ofMinutes(10));
            // Khóa thợ tiếp theo trong 25 giây
            stringRedisTemplate.opsForValue().set("mua:dispatch:locked:" + nextMuaId,
                    String.valueOf(bookingId), Duration.ofSeconds(25));
            // Timer 20s Server-side cho thợ tiếp theo
            stringRedisTemplate.opsForValue().set("booking:dispatch:timer:" + bookingId + ":" + nextMuaId,
                    "PENDING", Duration.ofSeconds(20));
            stringRedisTemplate.opsForValue().set("booking:dispatch:sent_at:" + bookingId,
                    String.valueOf(System.currentTimeMillis()), Duration.ofMinutes(5));

            UserEntity customer = booking.getCustomer();
            Map<String, Object> offerPayload = new HashMap<>();
            offerPayload.put("type", "INSTANT_BOOKING_OFFER");
            offerPayload.put("bookingId", booking.getId());
            offerPayload.put("bookingCode", booking.getBookingCode());
            offerPayload.put("targetMuaId", nextMuaId);
            offerPayload.put("customerAddress", booking.getDestinationAddress());
            offerPayload.put("latitude", booking.getDestinationLatitude());
            offerPayload.put("longitude", booking.getDestinationLongitude());
            offerPayload.put("customerName", customer != null ? customer.getFullName() : "Khách hàng");
            offerPayload.put("customerPhone", customer != null ? customer.getPhoneNumber() : "");
            offerPayload.put("earningsAmount", booking.getTotalAmount().multiply(new BigDecimal("0.80")));
            offerPayload.put("totalAmount", booking.getTotalAmount());
            offerPayload.put("countdownSeconds", 20);
            offerPayload.put("timestamp", System.currentTimeMillis());

            // CHỈ GỬI VÀO DUY NHẤT KÊNH RIÊNG CỦA THỢ TIẾP THEO
            messagingTemplate.convertAndSend("/topic/mua-offer/" + nextMuaId, offerPayload);
            log.info("[SequentialDispatch] Cascaded bookingId={} strictly to next closest MUA id={}", bookingId,
                    nextMuaId);
            return true;
        } else {
            log.info("[SequentialDispatch] No more candidate MUAs available for bookingId={}", bookingId);
            expireInstantBooking(bookingId);
            return false;
        }
    }

    @Override
    @Transactional
    public boolean expireInstantBooking(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
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
        String currentMuaIdStr = stringRedisTemplate.opsForValue().get("booking:dispatch:current:" + bookingId);
        if (currentMuaIdStr != null) {
            stringRedisTemplate.delete("mua:dispatch:locked:" + currentMuaIdStr);
            stringRedisTemplate.delete("booking:dispatch:timer:" + bookingId + ":" + currentMuaIdStr);
        }
        stringRedisTemplate.delete("booking:dispatch:candidates:" + bookingId);
        stringRedisTemplate.delete("booking:dispatch:current:" + bookingId);
        stringRedisTemplate.delete("booking:instant:expire:" + bookingId);
        stringRedisTemplate.delete("booking:dispatch:sent_at:" + bookingId);

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

        messagingTemplate.convertAndSend("/topic/booking-matched/" + bookingId, timeoutPayload);
        messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, timeoutPayload);

        // Dismiss any lingering popup on MUAs
        Map<String, Object> dismissPayload = new HashMap<>();
        dismissPayload.put("type", "BOOKING_DISMISSED");
        dismissPayload.put("bookingId", bookingId);
        dismissPayload.put("reason", "TIMEOUT_EXPIRED");
        dismissPayload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend("/topic/instant-dismiss/" + bookingId, dismissPayload);
        messagingTemplate.convertAndSend("/topic/instant-dismiss", dismissPayload);

        log.info("[InstantBookingTimeout] Successfully cancelled booking id={} due to 45s timeout", bookingId);
        return true;
    }

    @Override
    @Transactional
    public boolean cancelInstantBookingByCustomer(Long bookingId, Long customerUserId, String reason) {
        BookingEntity booking = bookingRepository.findById(bookingId)
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
        String currentMuaIdStr = stringRedisTemplate.opsForValue().get("booking:dispatch:current:" + bookingId);
        if (currentMuaIdStr != null) {
            stringRedisTemplate.delete("mua:dispatch:locked:" + currentMuaIdStr);
            stringRedisTemplate.delete("booking:dispatch:timer:" + bookingId + ":" + currentMuaIdStr);
        }
        stringRedisTemplate.delete("booking:dispatch:candidates:" + bookingId);
        stringRedisTemplate.delete("booking:dispatch:current:" + bookingId);
        stringRedisTemplate.delete("booking:instant:expire:" + bookingId);
        stringRedisTemplate.delete("booking:dispatch:sent_at:" + bookingId);

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

        messagingTemplate.convertAndSend("/topic/booking-matched/" + bookingId, cancelPayload);
        messagingTemplate.convertAndSend("/topic/booking-status/" + bookingId, cancelPayload);

        // Dismiss MUAs
        Map<String, Object> dismissPayload = new HashMap<>();
        dismissPayload.put("type", "BOOKING_DISMISSED");
        dismissPayload.put("bookingId", bookingId);
        dismissPayload.put("reason", "CUSTOMER_CANCELLED");
        dismissPayload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend("/topic/instant-dismiss/" + bookingId, dismissPayload);
        messagingTemplate.convertAndSend("/topic/instant-dismiss", dismissPayload);

        log.info("[CustomerCancel] Booking id={} successfully cancelled by customer userId={}", bookingId,
                customerUserId);
        return true;
    }

    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void scanAndExpireOverdueInstantBookings() {
        LocalDateTime threshold = LocalDateTime.now().minusSeconds(45);
        List<BookingEntity> pending = bookingRepository.findByStatus(BookingStatus.REQUESTED);
        for (BookingEntity b : pending) {
            if (b.getBookingType() != BookingType.REALTIME_INSTANT)
                continue;

            // 1. Quá hạn 45s tổng thời gian tìm thợ -> Hủy đơn an toàn
            if (b.getCreatedAt() != null && b.getCreatedAt().isBefore(threshold)) {
                log.info("[SafetyNet] Expiring overdue instant bookingId={}", b.getId());
                expireInstantBooking(b.getId());
                continue;
            }

            // 2. Server-side check: Nếu thợ hiện tại đã quá 20s không phản hồi (tắt trình
            // duyệt, mất mạng) -> Tự động chuyển thợ kế tiếp
            String sentAtStr = stringRedisTemplate.opsForValue().get("booking:dispatch:sent_at:" + b.getId());
            if (sentAtStr != null) {
                try {
                    long sentAt = Long.parseLong(sentAtStr);
                    if (System.currentTimeMillis() - sentAt >= 20000) { // 20s
                        log.info(
                                "[SafetyNet] Current MUA did not respond within 20s for bookingId={}. Auto-cascading to next candidate.",
                                b.getId());
                        dispatchNextCandidate(b.getId());
                    }
                } catch (Exception e) {
                    log.warn("[SafetyNet] Error parsing sent_at for bookingId={}: {}", b.getId(), e.getMessage());
                }
            }
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
}
