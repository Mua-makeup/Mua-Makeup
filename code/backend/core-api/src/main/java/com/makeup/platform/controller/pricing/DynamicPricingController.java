package com.makeup.platform.controller.pricing;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.pricing.CalculateDistanceReq;
import com.makeup.platform.dto.request.pricing.PreviewInvoiceReq;
import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.service.pricing.DynamicPricingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pricing")
@RequiredArgsConstructor
public class DynamicPricingController extends BaseController {

    private final DynamicPricingService dynamicPricingService;

    @GetMapping("/providers")
    public ResponseEntity<ApiResponse<java.util.List<com.makeup.platform.dto.response.pricing.ProviderOptionRes>>> getAvailableProviders() {
        java.util.List<com.makeup.platform.dto.response.pricing.ProviderOptionRes> res = dynamicPricingService.getAvailableProviders();
        return ok(res, "common.success");
    }

    @PostMapping("/preview-invoice")
    public ResponseEntity<ApiResponse<InvoicePreviewRes>> previewInvoice(
            @Valid @RequestBody PreviewInvoiceReq req
    ) {
        InvoicePreviewRes res = dynamicPricingService.calculatePreviewInvoice(req);
        return ok(res, "pricing.invoice_preview_success");
    }

    @PostMapping("/calculate-distance")
    public ResponseEntity<ApiResponse<DistanceMatrixRes>> calculateDistance(
            @Valid @RequestBody CalculateDistanceReq req
    ) {
        DistanceMatrixRes res = dynamicPricingService.calculateDistance(req);
        return ok(res, "pricing.distance_calculate_success");
    }
}
