package com.makeup.platform.service.pricing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.constants.InstantBookingKeys;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.H3SpatialUtils;
import com.makeup.platform.dto.request.booking.CreateInstantBookingReq;
import com.makeup.platform.entity.telemetry.AvailabilityStatus;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.service.telemetry.RedisGeoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.math.*;
import java.time.Duration;
import java.util.*;

/** Instant-only pricing: does not alter scheduled/studio pricing rules. */
@Service
@RequiredArgsConstructor
@Slf4j
public class InstantPricingService {
    private final StringRedisTemplate redis;
    private final RedisGeoService geo;
    private final MuaProfileRepository muas;
    private final ObjectMapper json;
    private static final DefaultRedisScript<Long> DEMAND = new DefaultRedisScript<>(
        "local t=redis.call('TIME'); local now=t[1]*1000+math.floor(t[2]/1000); " +
        "redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',now-300000); " +
        "redis.call('ZADD',KEYS[1],now,ARGV[1]); redis.call('EXPIRE',KEYS[1],300); " +
        "return redis.call('ZCARD',KEYS[1])", Long.class);

    public static BigDecimal multiplier(long demand, long supply) {
        BigDecimal ratio = BigDecimal.valueOf(demand).divide(BigDecimal.valueOf(Math.max(supply, 1)), 8, RoundingMode.HALF_UP);
        return BigDecimal.ONE.add(ratio.subtract(BigDecimal.ONE).max(BigDecimal.ZERO).multiply(new BigDecimal("0.25")))
            .min(new BigDecimal("1.50")).setScale(2, RoundingMode.HALF_UP);
    }
    public static BigDecimal surge(BigDecimal base, BigDecimal multiplier) {
        return base.multiply((multiplier == null ? BigDecimal.ONE : multiplier).subtract(BigDecimal.ONE))
            .max(BigDecimal.ZERO).setScale(0, RoundingMode.HALF_UP);
    }
    public static BigDecimal distanceFee(double km) {
        return BigDecimal.valueOf(Math.max(0, km - 2) * 10000).setScale(0, RoundingMode.HALF_UP);
    }
    public Map<String,Object> demand(Long customer, CreateInstantBookingReq req) {
        Map<String,Object> result = new HashMap<>();
        result.put("surgeMultiplier", BigDecimal.ONE);
        try {
            String cell = H3SpatialUtils.latLngToCell(req.getDestinationLatitude().doubleValue(), req.getDestinationLongitude().doubleValue());
            if (cell.startsWith("fallback")) throw new IllegalStateException("H3 unavailable");
            Long count = redis.execute(DEMAND, List.of("surge:instant:demand:" + cell), customer.toString());
            if (count == null) throw new IllegalStateException("Demand unavailable");
            var nearby = geo.searchNearbyActiveMuas(req.getDestinationLatitude().doubleValue(), req.getDestinationLongitude().doubleValue(), 3);
            long supply = 0;
            if (nearby != null) {
                Set<Long> ids = new HashSet<>();
                for (var item : nearby) ids.add(Long.valueOf(item.getContent().getName()));
                for (var mua : muas.findAllById(ids)) {
                    if (Boolean.TRUE.equals(mua.getIsOnline()) && !Boolean.TRUE.equals(mua.getIsBusy())
                        && mua.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE && geo.hasHeartbeat(mua.getId())
                        && !Boolean.TRUE.equals(redis.hasKey(InstantBookingKeys.candidateLease(mua.getId())))) supply++;
                }
            }
            result.put("demandCount", count);
            result.put("supplyCount", supply);
            result.put("surgeMultiplier", multiplier(count, supply));
            result.put("pricingReason", String.format("%d khách / %d thợ sẵn sàng trong 3km; nhu cầu 5 phút gần nhất", count, supply));
        } catch (Exception e) {
            log.warn("Instant demand unavailable; using 1.00x: {}", e.getMessage());
            result.put("pricingReason", "Chưa đo được cung/cầu; áp dụng giá gốc 1.00x");
        }
        return result;
    }
    public record Ticket(Long customer, String request, Map<String,Object> price) {}
    private String requestKey(CreateInstantBookingReq req) {
        var tree = json.valueToTree(req);
        ((com.fasterxml.jackson.databind.node.ObjectNode) tree).remove("quoteId");
        return tree.toString();
    }
    public Map<String,Object> saveQuote(Long customer, CreateInstantBookingReq req, Map<String,Object> price) {
        try {
            String id = UUID.randomUUID().toString();
            price.put("quoteId", id);
            price.put("expiresAt", System.currentTimeMillis() + 120000);
            redis.opsForValue().set("instant:quote:" + id, json.writeValueAsString(new Ticket(customer, requestKey(req), price)), Duration.ofMinutes(2));
            return price;
        } catch (Exception e) { throw invalidQuote(); }
    }
    public Map<String,Object> requireQuote(Long customer, CreateInstantBookingReq req) {
        try {
            if (req.getQuoteId() == null) throw invalidQuote();
            String raw = redis.opsForValue().get("instant:quote:" + req.getQuoteId());
            if (raw == null) throw invalidQuote();
            Ticket ticket = json.readValue(raw, Ticket.class);
            if (!customer.equals(ticket.customer()) || !requestKey(req).equals(ticket.request())) throw invalidQuote();
            return ticket.price();
        } catch (Exception e) { throw invalidQuote(); }
    }
    private CustomBusinessException invalidQuote() {
        return new CustomBusinessException(ErrorCodes.ERR_PACKAGE_NOT_AVAILABLE,
            "booking.instant_quote_expired_or_changed", HttpStatus.CONFLICT);
    }
}
