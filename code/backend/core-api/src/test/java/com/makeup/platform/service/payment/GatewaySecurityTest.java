package com.makeup.platform.service.payment;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.config.VnpayConfig;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.service.payment.gateway.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GatewaySecurityTest {
    final VnpayConfig config = mock(VnpayConfig.class);
    final VnpayGatewayStrategy vnpay = new VnpayGatewayStrategy(config);
    @BeforeEach void setup() { lenient().when(config.getHashSecret()).thenReturn("test-only-signing-key"); }

    @ParameterizedTest @NullAndEmptySource @ValueSource(strings={"unknown", "   "})
    void unknownGatewayCannotBeSelected(String code) {
        var registry = new PaymentGatewayRegistry(List.of());
        assertFalse(registry.isSupported(code));
        assertThrows(CustomBusinessException.class, () -> registry.getStrategy(code));
    }
    @Test void gatewayNamesAreNormalizedAndDuplicatesRejected() {
        var one = mock(PaymentGatewayStrategy.class); when(one.gatewayCode()).thenReturn("VNPAY");
        var two = mock(PaymentGatewayStrategy.class); when(two.gatewayCode()).thenReturn(" vnpay ");
        assertSame(one, new PaymentGatewayRegistry(List.of(one)).getStrategy(" vnpay "));
        assertThrows(IllegalStateException.class, () -> new PaymentGatewayRegistry(List.of(one, two)));
    }
    @Test void disabledGatewayCannotCreateCheckout() {
        assertThrows(CustomBusinessException.class, () -> vnpay.createCheckout(new PaymentTransactionEntity(), "127.0.0.1"));
    }
    @Test void callbackWithoutSignatureIsRejected() {
        assertThrows(CustomBusinessException.class, () -> vnpay.verifyAndParseCallback(Map.of(), null));
    }
    @ParameterizedTest @CsvSource({"00,00,true", "00,02,false", "24,00,false", "24,02,false"})
    void onlySuccessfulSignedGatewayStatusIsAccepted(String response, String state, boolean successful) throws Exception {
        var payload = payload(response, state);
        sign(payload);
        var result = vnpay.verifyAndParseCallback(payload, null);
        assertEquals(successful, result.isSuccessful());
        assertEquals("PAY-TEST", result.getPaymentCode());
        assertEquals(new BigDecimal("100000.00"), result.getAmount());
        assertEquals(successful, result.getPaidAt() != null);
    }
    @ParameterizedTest @ValueSource(strings={"vnp_Amount", "vnp_TxnRef", "vnp_ResponseCode", "vnp_TransactionStatus"})
    void tamperingAfterSigningIsRejected(String field) throws Exception {
        var payload = payload("00", "00"); sign(payload); payload.put(field, "tampered");
        var error = assertThrows(CustomBusinessException.class, () -> vnpay.verifyAndParseCallback(payload, null));
        assertEquals("ERR_PAYMENT_SIGNATURE_INVALID", error.getErrorCode());
    }
    private Map<String, String> payload(String response, String status) {
        return new TreeMap<>(Map.of("vnp_Amount", "10000000", "vnp_TxnRef", "PAY-TEST",
            "vnp_ResponseCode", response, "vnp_TransactionStatus", status));
    }
    private void sign(Map<String, String> payload) throws Exception {
        // Independent JCA signing fixture: do not use production HmacUtils.
        var mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec("test-only-signing-key".getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        var data = payload.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).collect(java.util.stream.Collectors.joining("&"));
        payload.put("vnp_SecureHash", HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8))));
    }
}
