package com.makeup.platform.dto.response.pricing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoicePreviewRes {

    private PackageInfo packageInfo;
    private List<AddOnItem> addOns;
    private BigDecimal serviceSubtotal;
    private DistanceInfo distanceInfo;
    private SurgePricingInfo surgePricing;
    private List<SurchargeBreakdownItemRes> surchargesBreakdown;
    private BigDecimal totalSurchargesAmount;
    private DiscountInfo discount;
    private FinancialSummary financialSummary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PackageInfo {
        private Long packageId;
        private String packageName;
        private BigDecimal basePrice;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddOnItem {
        private Long itemId;
        private String name;
        private BigDecimal price;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DistanceInfo {
        private BigDecimal distanceKm;
        private BigDecimal freeRadiusKm;
        private BigDecimal excessDistanceKm;
        private BigDecimal pricePerKm;
        private BigDecimal distanceFee;
        private Integer estimatedTravelMinutes;
        private String routingProvider;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SurgePricingInfo {
        private Boolean isSurgeApplied;
        private BigDecimal multiplier;
        private String surgeReason;
        private BigDecimal surgeAmount;
        private Integer demandCount;
        private Integer supplyCount;
        private BigDecimal demandRatio;
        private String surgeType; // e.g. "SCHEDULE_PEAK_HOUR", "REALTIME_DEMAND_SURGE", "NORMAL"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscountInfo {
        private String voucherCode;
        private BigDecimal discountAmount;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinancialSummary {
        private BigDecimal totalAmount;
        private BigDecimal depositRatio;
        private BigDecimal depositRequiredAmount;
        private BigDecimal remainingPayableAmount;
        private String currency;
    }
}
