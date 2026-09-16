package com.makeup.platform.service.pricing;

import com.makeup.platform.dto.request.pricing.ConfigureSurgeRuleReq;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.dto.response.pricing.SurgeRuleRes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SurgePricingService {

    /**
     * Đánh giá và tính toán phụ trội cao điểm dựa trên thời gian đặt lịch, khu vực và tỷ lệ Cung/Cầu H3.
     */
    InvoicePreviewRes.SurgePricingInfo calculateSurge(
            BigDecimal serviceSubtotal,
            LocalDateTime bookingTime,
            String zoneCode,
            BigDecimal customerLat,
            BigDecimal customerLng
    );

    default InvoicePreviewRes.SurgePricingInfo calculateSurge(
            BigDecimal serviceSubtotal,
            LocalDateTime bookingTime,
            String zoneCode
    ) {
        return calculateSurge(serviceSubtotal, bookingTime, zoneCode, null, null);
    }

    SurgeRuleRes createRule(ConfigureSurgeRuleReq req);

    SurgeRuleRes updateRule(Long id, ConfigureSurgeRuleReq req);

    void deleteRule(Long id);

    List<SurgeRuleRes> listRules();

    boolean isH3SurgeGloballyEnabled();

    boolean toggleH3Surge(boolean enabled);
}
