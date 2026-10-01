package com.makeup.platform.service.payment.gateway;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.HmacUtils;
import com.makeup.platform.config.MomoConfig;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.dto.response.payment.PaymentGatewayInfoRes;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class MomoGatewayStrategy implements PaymentGatewayStrategy {

    public static final String GATEWAY_CODE = "MOMO";
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MomoConfig momoConfig;
    private final RestClient momoRestClient;
    private final ObjectMapper objectMapper;

    @Override
    public String gatewayCode() {
        return GATEWAY_CODE;
    }

    @Override
    public PaymentGatewayInfoRes getMetadata() {
        return PaymentGatewayInfoRes.builder()
                .code(GATEWAY_CODE)
                .name("MoMo")
                .description("Ví điện tử MoMo (Quét mã QR, App MoMo, Thẻ ATM/Napas)")
                .logoUrl("https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png")
                .isEnabled(momoConfig.isEnabled())
                .build();
    }

    @Override
    public PaymentCheckoutRes createCheckout(PaymentTransactionEntity txn, String clientIp) {
        if (!momoConfig.isEnabled()) {
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_GATEWAY_DISABLED, "ERR_PAYMENT_GATEWAY_DISABLED");
        }

        String requestId = "REQ-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String orderId = txn.getPaymentCode();
        String orderInfo = "Nap tien vi Makeup Platform " + txn.getPaymentCode();
        long amount = txn.getAmount().setScale(0, RoundingMode.HALF_UP).longValue();
        String requestType = "captureWallet";
        String extraData = "";

        String rawSignature = "accessKey=" + momoConfig.getAccessKey() +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&ipnUrl=" + momoConfig.getIpnUrl() +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + momoConfig.getPartnerCode() +
                "&redirectUrl=" + momoConfig.getReturnUrl() +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

        String signature = HmacUtils.hmacSha256(momoConfig.getSecretKey(), rawSignature);

        Map<String, Object> requestPayload = new HashMap<>();
        requestPayload.put("partnerCode", momoConfig.getPartnerCode());
        requestPayload.put("partnerName", "Makeup Platform");
        requestPayload.put("storeId", "MakeupStore");
        requestPayload.put("requestId", requestId);
        requestPayload.put("amount", amount);
        requestPayload.put("orderId", orderId);
        requestPayload.put("orderInfo", orderInfo);
        requestPayload.put("redirectUrl", momoConfig.getReturnUrl());
        requestPayload.put("ipnUrl", momoConfig.getIpnUrl());
        requestPayload.put("lang", "vi");
        requestPayload.put("extraData", extraData);
        requestPayload.put("requestType", requestType);
        requestPayload.put("signature", signature);

        OffsetDateTime expiresAt = OffsetDateTime.now(VIETNAM_ZONE).plusMinutes(15);

        try {
            Map<?, ?> response = momoRestClient.post()
                    .uri(momoConfig.getEndpointUrl())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_CHECKOUT_FAILED, "ERR_PAYMENT_CHECKOUT_FAILED");
            }

            Object resultCodeObj = response.get("resultCode");
            int resultCode = (resultCodeObj instanceof Number) ? ((Number) resultCodeObj).intValue() : -1;
            if (resultCode != 0) {
                log.error("MoMo Create Payment failed with resultCode: {}, message: {}", resultCode, response.get("message"));
                throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_CHECKOUT_FAILED, "ERR_PAYMENT_CHECKOUT_FAILED");
            }

            String payUrl = (String) response.get("payUrl");
            String qrCodeUrl = (String) response.get("qrCodeUrl");
            String deeplink = (String) response.get("deeplink");

            return PaymentCheckoutRes.builder()
                    .paymentCode(orderId)
                    .gatewayCode(GATEWAY_CODE)
                    .amount(txn.getAmount())
                    .paymentUrl(payUrl)
                    .qrCodeUrl(qrCodeUrl)
                    .deepLink(deeplink)
                    .expiresAt(expiresAt)
                    .build();
        } catch (CustomBusinessException cbe) {
            throw cbe;
        } catch (Exception e) {
            log.error("Exception calling MoMo API: ", e);
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_CHECKOUT_FAILED, "ERR_PAYMENT_CHECKOUT_FAILED");
        }
    }

    @Override
    public GatewayPaymentResult verifyAndParseCallback(Map<String, String> queryParams, String rawBody) {
        Map<String, Object> bodyMap;
        try {
            if (rawBody != null && !rawBody.isBlank()) {
                bodyMap = objectMapper.readValue(rawBody, new TypeReference<Map<String, Object>>() {});
            } else if (queryParams != null && !queryParams.isEmpty()) {
                bodyMap = new HashMap<>(queryParams);
            } else {
                throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_SIGNATURE_INVALID, "ERR_PAYMENT_SIGNATURE_INVALID");
            }

            String partnerCode = String.valueOf(bodyMap.getOrDefault("partnerCode", ""));
            String orderId = String.valueOf(bodyMap.getOrDefault("orderId", ""));
            String requestId = String.valueOf(bodyMap.getOrDefault("requestId", ""));
            String amountStr = String.valueOf(bodyMap.getOrDefault("amount", "0"));
            String orderInfo = String.valueOf(bodyMap.getOrDefault("orderInfo", ""));
            String orderType = String.valueOf(bodyMap.getOrDefault("orderType", ""));
            String transId = String.valueOf(bodyMap.getOrDefault("transId", ""));
            Object resultCodeObj = bodyMap.get("resultCode");
            int resultCode = -1;
            if (resultCodeObj instanceof Number) {
                resultCode = ((Number) resultCodeObj).intValue();
            } else if (resultCodeObj instanceof String) {
                try {
                    resultCode = Integer.parseInt(((String) resultCodeObj).trim());
                } catch (NumberFormatException ignored) {}
            }
            String message = String.valueOf(bodyMap.getOrDefault("message", ""));
            String payType = String.valueOf(bodyMap.getOrDefault("payType", ""));
            String responseTime = String.valueOf(bodyMap.getOrDefault("responseTime", ""));
            String extraData = String.valueOf(bodyMap.getOrDefault("extraData", ""));
            String receivedSignature = String.valueOf(bodyMap.getOrDefault("signature", ""));

            String rawSignature = "accessKey=" + momoConfig.getAccessKey() +
                    "&amount=" + amountStr +
                    "&extraData=" + extraData +
                    "&message=" + message +
                    "&orderId=" + orderId +
                    "&orderInfo=" + orderInfo +
                    "&orderType=" + orderType +
                    "&partnerCode=" + partnerCode +
                    "&payType=" + payType +
                    "&requestId=" + requestId +
                    "&responseTime=" + responseTime +
                    "&resultCode=" + resultCode +
                    "&transId=" + transId;

            String calculatedSignature = HmacUtils.hmacSha256(momoConfig.getSecretKey(), rawSignature);
            if (!HmacUtils.constantTimeEquals(calculatedSignature, receivedSignature)) {
                log.warn("MoMo IPN signature verification failed! Received: {}, Calculated: {}", receivedSignature, calculatedSignature);
                throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_SIGNATURE_INVALID, "ERR_PAYMENT_SIGNATURE_INVALID");
            }

            boolean successful = (resultCode == 0);
            BigDecimal amount = new BigDecimal(amountStr);

            return GatewayPaymentResult.builder()
                    .paymentCode(orderId)
                    .gatewayCode(GATEWAY_CODE)
                    .gatewayRequestId(requestId)
                    .gatewayTransactionId(transId)
                    .amount(amount)
                    .successful(successful)
                    .responseCode(String.valueOf(resultCode))
                    .message(message)
                    .paidAt(successful ? OffsetDateTime.now(VIETNAM_ZONE) : null)
                    .build();

        } catch (CustomBusinessException cbe) {
            throw cbe;
        } catch (Exception e) {
            log.error("Failed to parse MoMo IPN body: ", e);
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_SIGNATURE_INVALID, "ERR_PAYMENT_SIGNATURE_INVALID");
        }
    }

    @Override
    public Object callbackAcknowledgement(GatewayPaymentResult result) {
        // MoMo expects HTTP 204 No Content
        return Collections.emptyMap();
    }
}
