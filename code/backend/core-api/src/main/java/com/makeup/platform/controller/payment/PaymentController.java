package com.makeup.platform.controller.payment;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.payment.CreatePaymentIntentReq;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.dto.response.payment.PaymentDetailRes;
import com.makeup.platform.dto.response.payment.PaymentGatewayInfoRes;
import com.makeup.platform.service.payment.PaymentGatewayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController extends BaseController {

    private final PaymentGatewayService paymentGatewayService;

    @GetMapping("/gateways")
    public ResponseEntity<ApiResponse<List<PaymentGatewayInfoRes>>> getGateways() {
        return okWithKey(paymentGatewayService.getAvailableGateways(), "payment.gateway_list_success");
    }

    @PostMapping("/create-intent")
    public ResponseEntity<ApiResponse<PaymentCheckoutRes>> createIntent(
            @Valid @RequestBody CreatePaymentIntentReq req,
            HttpServletRequest request) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        String clientIp = extractClientIp(request);
        PaymentCheckoutRes response = paymentGatewayService.createPaymentIntent(userId, req, clientIp);
        return createdWithKey(response, "payment.intent_created_success");
    }

    @GetMapping("/{paymentCode}")
    public ResponseEntity<ApiResponse<PaymentDetailRes>> getPaymentDetail(@PathVariable String paymentCode) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        return okWithKey(paymentGatewayService.getPaymentDetail(paymentCode, userId), "payment.detail_success");
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String proxyClientIp = request.getHeader("Proxy-Client-IP");
        if (proxyClientIp != null && !proxyClientIp.isBlank()) {
            return proxyClientIp;
        }
        return request.getRemoteAddr();
    }
}
