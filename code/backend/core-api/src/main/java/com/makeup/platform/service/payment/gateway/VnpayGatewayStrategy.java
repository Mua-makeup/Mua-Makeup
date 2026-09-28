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
        vnpParams.put("vnp_ReturnUrl", vnpayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", (clientIp != null && !clientIp.isBlank()) ? clientIp : "127.0.0.1");
        vnpParams.put("vnp_CreateDate", createDate);
        vnpParams.put("vnp_ExpireDate", expireDate);

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        for (int i = 0; i < fieldNames.size(); i++) {
            String fieldName = fieldNames.get(i);
            String fieldValue = vnpParams.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                String encodedKey = URLEncoder.encode(fieldName, StandardCharsets.US_ASCII);
                String encodedVal = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII);

                hashData.append(fieldName).append('=').append(encodedVal);
                query.append(encodedKey).append('=').append(encodedVal);

                if (i < fieldNames.size() - 1) {
                    hashData.append('&');
                    query.append('&');
                }
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
        for (int i = 0; i < fieldNames.size(); i++) {
            String fieldName = fieldNames.get(i);
            String fieldValue = fields.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                String encodedVal = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII);
                hashData.append(fieldName).append('=').append(encodedVal);
                if (i < fieldNames.size() - 1) {
                    hashData.append('&');
                }
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
}
