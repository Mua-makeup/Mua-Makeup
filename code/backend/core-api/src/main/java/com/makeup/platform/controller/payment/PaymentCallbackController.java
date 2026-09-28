package com.makeup.platform.controller.payment;

import com.makeup.platform.service.payment.PaymentWebhookProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentCallbackController {

    private final PaymentWebhookProcessor paymentWebhookProcessor;

    @GetMapping({"/ipn/{gateway}", "/{gateway}/ipn"})
    public ResponseEntity<Object> handleGetCallback(
            @PathVariable String gateway,
            @RequestParam Map<String, String> queryParams) {
        log.info("Received GET IPN callback for gateway: {} with params: {}", gateway, queryParams.keySet());
        Object result = paymentWebhookProcessor.processWebhook(gateway, queryParams, null);
        return ResponseEntity.ok(result);
    }

    @PostMapping({"/ipn/{gateway}", "/{gateway}/ipn"})
    public ResponseEntity<Object> handlePostCallback(
            @PathVariable String gateway,
            @RequestParam Map<String, String> queryParams,
            @RequestBody(required = false) String rawBody) {
        log.info("Received POST IPN callback for gateway: {}", gateway);
        Object result = paymentWebhookProcessor.processWebhook(gateway, queryParams, rawBody);
        if ("momo".equalsIgnoreCase(gateway)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }
}
