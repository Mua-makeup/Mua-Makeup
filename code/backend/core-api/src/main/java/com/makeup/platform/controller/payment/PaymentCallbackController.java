package com.makeup.platform.controller.payment;

import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.PaymentWebhookProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentCallbackController {

    private final PaymentWebhookProcessor paymentWebhookProcessor;
    private final PaymentTransactionRepository paymentTransactionRepository;

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

    @GetMapping(value = {"/return/{gateway}", "/{gateway}/return"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> handleReturnCallback(
            @PathVariable String gateway,
            @RequestParam Map<String, String> queryParams,
            HttpServletRequest request) {
        log.info("Received GET Return callback for gateway: {} with params: {}", gateway, queryParams.keySet());

        try {
            paymentWebhookProcessor.processWebhook(gateway, queryParams, null);
        } catch (Exception e) {
            log.warn("Return callback webhook processing error (may already be processed): {}", e.getMessage());
        }

        String paymentCode = queryParams.get("orderId");
        if (paymentCode == null) {
            paymentCode = queryParams.get("vnp_TxnRef");
        }

        Long bookingId = null;
        String bookingCode = "";
        String amountFormatted = "";
        boolean isSuccess = false;

        if (paymentCode != null) {
            Optional<PaymentTransactionEntity> transactionOpt = paymentTransactionRepository.findByPaymentCode(paymentCode);
            if (transactionOpt.isPresent()) {
                PaymentTransactionEntity tx = transactionOpt.get();
                if (tx.getBooking() != null) {
                    bookingId = tx.getBooking().getId();
                    bookingCode = tx.getBooking().getBookingCode() != null ? tx.getBooking().getBookingCode() : "#" + bookingId;
                }
                if (tx.getAmount() != null) {
                    amountFormatted = String.format("%,d đ", tx.getAmount().longValue());
                }
                isSuccess = "SUCCESS".equalsIgnoreCase(tx.getStatus());
            }
        }

        String momoResultCode = queryParams.get("resultCode");
        String vnpResponseCode = queryParams.get("vnp_ResponseCode");
        if ("0".equals(momoResultCode) || "00".equals(vnpResponseCode)) {
            isSuccess = true;
        }

        String hostHeader = request.getHeader("Host");
        String host = "192.168.1.122";
        if (hostHeader != null && !hostHeader.isBlank()) {
            String clientHost = hostHeader.split(":")[0];
            if (!"127.0.0.1".equals(clientHost) && !"localhost".equalsIgnoreCase(clientHost)) {
                host = clientHost;
            }
        }

        String expoUrl = bookingId != null
                ? "exp://" + host + ":8081/--/booking/detail/" + bookingId
                : "exp://" + host + ":8081";

        String nativeUrl = bookingId != null
                ? "app://booking/detail/" + bookingId
                : "app://";

        String html = buildReturnHtmlPage(isSuccess, gateway, paymentCode, bookingCode, amountFormatted, expoUrl, nativeUrl, bookingId);
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.add("ngrok-skip-browser-warning", "69420");
        return ResponseEntity.ok().headers(responseHeaders).body(html);
    }

    private String buildReturnHtmlPage(boolean isSuccess, String gateway, String paymentCode,
                                       String bookingCode, String amountFormatted, String expoUrl, String nativeUrl, Long bookingId) {
        String title = isSuccess ? "Thanh Toán Đặt Cọc Thành Công!" : "Thanh Toán Chưa Hoàn Tất";
        String statusColor = isSuccess ? "#059669" : "#DC2626";
        String statusBg = isSuccess ? "#ECFDF5" : "#FEF2F2";
        String iconSvg = isSuccess
                ? "<svg width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='#059669' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'></path><polyline points='22 4 12 14.01 9 11.01'></polyline></svg>"
                : "<svg width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='#DC2626' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><line x1='15' y1='9' x2='9' y2='15'></line><line x1='9' y1='9' x2='15' y2='15'></line></svg>";

        String message = isSuccess
                ? "Khoản cọc 30% đã được ghi nhận vào Quỹ Bảo Chứng Escrow an toàn. Hệ thống đã xác nhận thanh toán."
                : "Giao dịch không thành công hoặc đã bị huỷ. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.";

        return "<!DOCTYPE html>\n" +
                "<html lang='vi'>\n" +
                "<head>\n" +
                "    <meta charset='UTF-8'>\n" +
                "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n" +
                "    <title>" + title + "</title>\n" +
                "    <style>\n" +
                "        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }\n" +
                "        body { background: #0F172A; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: #1E293B; }\n" +
                "        .card { background: #FFFFFF; border-radius: 24px; padding: 36px 24px; width: 100%; max-width: 440px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }\n" +
                "        .icon-circle { width: 92px; height: 92px; border-radius: 46px; background: " + statusBg + "; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; }\n" +
                "        h1 { font-size: 21px; font-weight: 800; color: #0F172A; margin-bottom: 10px; }\n" +
                "        p { font-size: 14px; line-height: 1.5; color: #64748B; margin-bottom: 20px; }\n" +
                "        .meta-box { background: #F8FAFC; border-radius: 16px; padding: 14px; margin-bottom: 20px; text-align: left; border: 1px solid #E2E8F0; }\n" +
                "        .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }\n" +
                "        .meta-row:last-child { margin-bottom: 0; }\n" +
                "        .meta-label { color: #64748B; }\n" +
                "        .meta-value { font-weight: 700; color: #0F172A; }\n" +
                "        .btn-expo { display: block; width: 100%; padding: 15px; border-radius: 14px; background: #059669; color: #FFFFFF; font-weight: 700; font-size: 15px; text-decoration: none; border: none; cursor: pointer; margin-bottom: 10px; }\n" +
                "        .btn-expo:hover { background: #047857; }\n" +
                "        .btn-native { display: block; width: 100%; padding: 12px; border-radius: 14px; background: #F1F5F9; color: #334155; font-weight: 700; font-size: 13px; text-decoration: none; border: 1px solid #CBD5E1; cursor: pointer; }\n" +
                "        .tip-box { background: #EFF6FF; border-radius: 12px; padding: 12px; margin-top: 18px; font-size: 12px; color: #1E40AF; line-height: 1.5; text-align: left; border: 1px solid #BFDBFE; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class='card'>\n" +
                "        <div class='icon-circle'>" + iconSvg + "</div>\n" +
                "        <h1 style='color: " + statusColor + ";'>" + title + "</h1>\n" +
                "        <p>" + message + "</p>\n" +
                "        <div class='meta-box'>\n" +
                "            <div class='meta-row'><span class='meta-label'>Cổng thanh toán:</span><span class='meta-value'>" + gateway.toUpperCase() + "</span></div>\n" +
                "            <div class='meta-row'><span class='meta-label'>Mã giao dịch:</span><span class='meta-value'>" + (paymentCode != null ? paymentCode : "N/A") + "</span></div>\n" +
                "            " + (!bookingCode.isEmpty() ? "<div class='meta-row'><span class='meta-label'>Lịch hẹn:</span><span class='meta-value'>" + bookingCode + "</span></div>\n" : "") +
                "            " + (!amountFormatted.isEmpty() ? "<div class='meta-row'><span class='meta-label'>Số tiền cọc:</span><span class='meta-value' style='color: #E11D48;'>" + amountFormatted + "</span></div>\n" : "") +
                "        </div>\n" +
                "        <a href='" + expoUrl + "' class='btn-expo'>Mở Lại Ứng Dụng (Expo Go)</a>\n" +
                "        <a href='" + nativeUrl + "' class='btn-native'>Mở Bản Cài Đặt (Standalone App)</a>\n" +
                "        <div class='tip-box'>💡 <b>Mẹo:</b> Khi thanh toán xong, hệ thống đã tự động ghi nhận cọc vào đơn. Bạn có thể vuốt mép dưới iPhone để chuyển về Expo Go ngay lập tức!</div>\n" +
                "    </div>\n" +
                "    <script>\n" +
                "        try {\n" +
                "            if (window.opener) {\n" +
                "                window.opener.postMessage({ type: 'DEPOSIT_PAYMENT_RESULT', isSuccess: " + isSuccess + ", bookingId: '" + bookingId + "' }, '*');\n" +
                "            }\n" +
                "        } catch(e) {}\n" +
                "        setTimeout(function() {\n" +
                "            window.location.href = '" + expoUrl + "';\n" +
                "        }, 400);\n" +
                "    </script>\n" +
                "</body>\n" +
                "</html>";
    }
}
