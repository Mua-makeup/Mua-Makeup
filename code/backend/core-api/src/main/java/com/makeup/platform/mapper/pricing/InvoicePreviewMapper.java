package com.makeup.platform.mapper.pricing;

import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.dto.response.pricing.SurchargeBreakdownItemRes;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

@Component
public class InvoicePreviewMapper {

    public InvoicePreviewRes.PackageInfo toPackageInfo(ServicePackageEntity pkg) {
        if (pkg == null) return null;
        return InvoicePreviewRes.PackageInfo.builder()
                .packageId(pkg.getId())
                .packageName(pkg.getPackageName())
                .basePrice(pkg.getPrice())
                .build();
    }

    public List<InvoicePreviewRes.AddOnItem> toAddOnItems(List<PackageItemEntity> items) {
        if (items == null) return Collections.emptyList();
        return items.stream()
                .map(item -> InvoicePreviewRes.AddOnItem.builder()
                        .itemId(item.getId())
                        .name(item.getItemName())
                        .price(item.getItemPrice())
                        .build())
                .toList();
    }

    public InvoicePreviewRes.DistanceInfo toDistanceInfo(
            DistanceMatrixRes matrix,
            BigDecimal freeRadiusKm,
            BigDecimal excessDistanceKm,
            BigDecimal pricePerKm,
            BigDecimal distanceFee
    ) {
        return InvoicePreviewRes.DistanceInfo.builder()
                .distanceKm(matrix != null ? matrix.getDistanceKm() : BigDecimal.ZERO)
                .freeRadiusKm(freeRadiusKm)
                .excessDistanceKm(excessDistanceKm)
                .pricePerKm(pricePerKm)
                .distanceFee(distanceFee)
                .estimatedTravelMinutes(matrix != null ? matrix.getDurationMinutes() : 0)
                .routingProvider(matrix != null ? matrix.getRoutingProvider() : "UNKNOWN")
                .build();
    }

    public InvoicePreviewRes.SurgePricingInfo toSurgeInfo(
            boolean isSurgeApplied,
            BigDecimal multiplier,
            String reason,
            BigDecimal surgeAmount
    ) {
        return InvoicePreviewRes.SurgePricingInfo.builder()
                .isSurgeApplied(isSurgeApplied)
                .multiplier(multiplier)
                .surgeReason(reason)
                .surgeAmount(surgeAmount)
                .build();
    }

    public InvoicePreviewRes.FinancialSummary toFinancialSummary(
            BigDecimal totalAmount,
            BigDecimal depositRatio,
            BigDecimal depositRequiredAmount,
            BigDecimal remainingPayableAmount
    ) {
        return InvoicePreviewRes.FinancialSummary.builder()
                .totalAmount(totalAmount)
                .depositRatio(depositRatio)
                .depositRequiredAmount(depositRequiredAmount)
                .remainingPayableAmount(remainingPayableAmount)
                .currency("VND")
                .build();
    }

    public InvoicePreviewRes buildInvoice(
            ServicePackageEntity pkg,
            List<PackageItemEntity> addOns,
            BigDecimal serviceSubtotal,
            InvoicePreviewRes.DistanceInfo distanceInfo,
            InvoicePreviewRes.SurgePricingInfo surgeInfo,
            List<SurchargeBreakdownItemRes> surchargesBreakdown,
            BigDecimal totalSurchargesAmount,
            InvoicePreviewRes.DiscountInfo discount,
            InvoicePreviewRes.FinancialSummary financialSummary
    ) {
        return InvoicePreviewRes.builder()
                .packageInfo(toPackageInfo(pkg))
                .addOns(toAddOnItems(addOns))
                .serviceSubtotal(serviceSubtotal)
                .distanceInfo(distanceInfo)
                .surgePricing(surgeInfo)
                .surchargesBreakdown(surchargesBreakdown)
                .totalSurchargesAmount(totalSurchargesAmount)
                .discount(discount)
                .financialSummary(financialSummary)
                .build();
    }
}
