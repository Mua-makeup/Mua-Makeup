package com.makeup.platform.service.pricing;

import com.makeup.platform.dto.request.pricing.CalculateDistanceReq;
import com.makeup.platform.dto.request.pricing.PreviewInvoiceReq;
import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.dto.response.pricing.ProviderOptionRes;

import java.util.List;

public interface DynamicPricingService {

    /**
     * Tính toán bảng báo giá hóa đơn chi tiết realtime trước khi khách chốt đơn.
     * Bóc tách dịch vụ gốc, add-ons, phí di chuyển, phụ trội cao điểm (Surge),
     * phụ phí sáng sớm/lễ tết (Surcharges), voucher và tiền cọc Escrow 30%.
     */
    InvoicePreviewRes calculatePreviewInvoice(PreviewInvoiceReq req);

    /**
     * Đo khoảng cách và thời gian di chuyển giữa 2 điểm tọa độ (có cache 24h & fallback).
     */
    DistanceMatrixRes calculateDistance(CalculateDistanceReq req);

    /**
     * Lấy danh sách đối tác cung cấp dịch vụ (Studios & MUAs) thực tế từ CSDL.
     */
    List<ProviderOptionRes> getAvailableProviders();
}
