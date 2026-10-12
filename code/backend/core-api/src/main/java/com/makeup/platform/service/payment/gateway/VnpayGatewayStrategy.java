package com.makeup.platform.service.payment.gateway;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.HmacUtils;
import com.makeup.platform.config.VnpayConfig;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.dto.response.payment.PaymentGatewayInfoRes;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class VnpayGatewayStrategy implements PaymentGatewayStrategy {

    public static final String GATEWAY_CODE = "VNPAY";
    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final VnpayConfig vnpayConfig;

    @Override
    public String gatewayCode() {
        return GATEWAY_CODE;
    }

    @Override
    public PaymentGatewayInfoRes getMetadata() {
        return PaymentGatewayInfoRes.builder()
                .code(GATEWAY_CODE)
                .name("VNPAY")
                .description("Cổng thanh toán VNPay (Thẻ ATM, Thẻ quốc tế, QR VNPAY-QR)")
                .logoUrl("https://vnpay.vn/assets/images/logo-vnpay.svg")
                .isEnabled(vnpayConfig.isEnabled())
                .build();
    }

    @Override
    public PaymentCheckoutRes createCheckout(PaymentTransactionEntity txn, String clientIp) {
        if (!vnpayConfig.isEnabled()) {
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_GATEWAY_DISABLED, "ERR_PAYMENT_GATEWAY_DISABLED");
        }

        OffsetDateTime now = OffsetDateTime.now(VIETNAM_ZONE);
        OffsetDateTime expiresAt = now.plusMinutes(15);

        String createDate = now.format(VNPAY_DATE_FORMAT);
        String expireDate = expiresAt.format(VNPAY_DATE_FORMAT);

        long amountInCents = txn.getAmount().multiply(new BigDecimal("100")).setScale(0, RoundingMode.HALF_UP).longValue();

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(amountInCents));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", txn.getPaymentCode());
        vnpParams.put("vnp_OrderInfo", "Nap tien vi Makeup Platform " + txn.getPaymentCode());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", resolveReturnUrl(vnpayConfig.getReturnUrl()));
        vnpParams.put("vnp_IpAddr", (clientIp != null && !clientIp.isBlank()) ? clientIp : "127.0.0.1");
        vnpParams.put("vnp_CreateDate", createDate);
        vnpParams.put("vnp_ExpireDate", expireDate);

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        for (String fieldName : fieldNames) {
            String fieldValue = vnpParams.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                String encodedKey = URLEncoder.encode(fieldName, StandardCharsets.US_ASCII);
                String encodedVal = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII);

                if (hashData.length() > 0) {
                    hashData.append('&');
                }
                hashData.append(fieldName).append('=').append(encodedVal);

                if (query.length() > 0) {
                    query.append('&');
                }
                query.append(encodedKey).append('=').append(encodedVal);
            }
        }

        String secureHash = HmacUtils.hmacSha512(vnpayConfig.getHashSecret(), hashData.toString());
        String paymentUrl = vnpayConfig.getPayUrl() + "?" + query.toString() + "&vnp_SecureHash=" + secureHash;

        return PaymentCheckoutRes.builder()
                .paymentCode(txn.getPaymentCode())
                .gatewayCode(GATEWAY_CODE)
                .amount(txn.getAmount())
                .paymentUrl(paymentUrl)
                .qrCodeUrl(null)
                .deepLink(null)
                .expiresAt(expiresAt)
                .build();
    }

    @Override
    public GatewayPaymentResult verifyAndParseCallback(Map<String, String> queryParams, String rawBody) {
        String receivedHash = queryParams.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_SIGNATURE_INVALID, "ERR_PAYMENT_SIGNATURE_INVALID");
        }

        Map<String, String> fields = new HashMap<>(queryParams);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        for (String fieldName : fieldNames) {
            String fieldValue = fields.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                String encodedVal = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII);
                if (hashData.length() > 0) {
                    hashData.append('&');
                }
                hashData.append(fieldName).append('=').append(encodedVal);
            }
        }

        String calculatedHash = HmacUtils.hmacSha512(vnpayConfig.getHashSecret(), hashData.toString());
        if (!HmacUtils.constantTimeEquals(calculatedHash.toLowerCase(), receivedHash.toLowerCase())) {
            log.warn("VNPay IPN signature verification failed! Received: {}, Calculated: {}", receivedHash, calculatedHash);
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_SIGNATURE_INVALID, "ERR_PAYMENT_SIGNATURE_INVALID");
        }

        String responseCode = queryParams.get("vnp_ResponseCode");
        String transactionStatus = queryParams.get("vnp_TransactionStatus");
        boolean successful = "00".equals(responseCode) && "00".equals(transactionStatus);

        String rawAmount = queryParams.get("vnp_Amount");
        BigDecimal amount = BigDecimal.ZERO;
        if (rawAmount != null && !rawAmount.isBlank()) {
            amount = new BigDecimal(rawAmount).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        }

        return GatewayPaymentResult.builder()
                .paymentCode(queryParams.get("vnp_TxnRef"))
                .gatewayCode(GATEWAY_CODE)
                .gatewayRequestId(null)
                .gatewayTransactionId(queryParams.get("vnp_TransactionNo"))
                .amount(amount)
                .successful(successful)
                .responseCode(responseCode)
                .message("00".equals(responseCode) ? "Confirm Success" : "Payment Failed with code " + responseCode)
                .paidAt(successful ? OffsetDateTime.now(VIETNAM_ZONE) : null)
                .build();
    }

    @Override
    public Object callbackAcknowledgement(GatewayPaymentResult result) {
        Map<String, String> response = new HashMap<>();
        if (result != null && result.isSuccessful()) {
            response.put("RspCode", "00");
            response.put("Message", "Confirm Success");
        } else {
            response.put("RspCode", "99");
            response.put("Message", "Unknown Error");
        }
        return response;
    }

    private String resolveReturnUrl(String baseReturnUrl) {
        if (baseReturnUrl == null || baseReturnUrl.isBlank()) {
            return "";
        }
        if (baseReturnUrl.contains("ngrok-free.dev") && !baseReturnUrl.contains("ngrok-skip-browser-warning")) {
            return baseReturnUrl.contains("?")
                    ? baseReturnUrl + "&ngrok-skip-browser-warning=69420"
                    : baseReturnUrl + "?ngrok-skip-browser-warning=69420";
        }
        return baseReturnUrl;
    }

    @Override
    public GatewayPaymentResult queryTransaction(PaymentTransactionEntity txn) {
        if (!vnpayConfig.isEnabled()) return null;
        // Use the exact checkout timestamp, not the later query time.
        String transactionDate = org.springframework.web.util.UriComponentsBuilder.fromUriString(txn.getPaymentUrl())
                .build().getQueryParams().getFirst("vnp_CreateDate");
        if (transactionDate == null) return null;
        Map<String, String> request = new java.util.LinkedHashMap<>();
        request.put("vnp_RequestId", java.util.UUID.randomUUID().toString().replace("-", ""));
        request.put("vnp_Version", "2.1.0");
        request.put("vnp_Command", "querydr");
        request.put("vnp_TmnCode", vnpayConfig.getTmnCode());
        request.put("vnp_TxnRef", txn.getPaymentCode());
        request.put("vnp_TransactionDate", transactionDate);
        request.put("vnp_CreateDate", OffsetDateTime.now(VIETNAM_ZONE).format(VNPAY_DATE_FORMAT));
        request.put("vnp_IpAddr", "127.0.0.1");
        request.put("vnp_OrderInfo", "Query payment " + txn.getPaymentCode());
        request.put("vnp_SecureHash", HmacUtils.hmacSha512(vnpayConfig.getHashSecret(), String.join("|", request.values())));
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        Map<?, ?> response = org.springframework.web.client.RestClient.builder().requestFactory(factory).build()
                .post().uri(vnpayConfig.getApiUrl()).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(request).retrieve().body(Map.class);
        if (response == null) return null;
        String[] signedFields = {"vnp_ResponseId", "vnp_Command", "vnp_ResponseCode", "vnp_Message",
                "vnp_TmnCode", "vnp_TxnRef", "vnp_Amount", "vnp_BankCode", "vnp_PayDate", "vnp_TransactionNo",
                "vnp_TransactionType", "vnp_TransactionStatus", "vnp_OrderInfo", "vnp_PromotionCode", "vnp_PromotionAmount"};
        String data = java.util.Arrays.stream(signedFields)
                .map(key -> response.get(key) == null ? "" : String.valueOf(response.get(key)))
                .collect(java.util.stream.Collectors.joining("|"));
        String hash = String.valueOf(response.get("vnp_SecureHash"));
        if (!HmacUtils.constantTimeEquals(HmacUtils.hmacSha512(vnpayConfig.getHashSecret(), data).toLowerCase(java.util.Locale.ROOT), hash.toLowerCase(java.util.Locale.ROOT)) ||
                !vnpayConfig.getTmnCode().equals(response.get("vnp_TmnCode")) ||
                !txn.getPaymentCode().equals(response.get("vnp_TxnRef"))) {
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_SIGNATURE_INVALID, "ERR_PAYMENT_SIGNATURE_INVALID");
        }
        boolean success = "00".equals(response.get("vnp_ResponseCode")) && "00".equals(response.get("vnp_TransactionStatus"))
                && "01".equals(response.get("vnp_TransactionType"));
        return GatewayPaymentResult.builder().paymentCode(txn.getPaymentCode()).gatewayCode(GATEWAY_CODE)
                .amount(response.get("vnp_Amount") == null ? null : new BigDecimal(String.valueOf(response.get("vnp_Amount"))).movePointLeft(2))
                .gatewayTransactionId(String.valueOf(response.get("vnp_TransactionNo")))
                .responseCode(String.valueOf(response.get("vnp_ResponseCode"))).successful(success)
                .paidAt(success ? OffsetDateTime.now(VIETNAM_ZONE) : null).build();
    }
}
