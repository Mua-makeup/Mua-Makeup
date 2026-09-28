package com.makeup.platform.service.payment;

import com.makeup.platform.dto.request.payment.CreatePaymentIntentReq;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.dto.response.payment.PaymentDetailRes;
import com.makeup.platform.dto.response.payment.PaymentGatewayInfoRes;

import java.util.List;

public interface PaymentGatewayService {

    List<PaymentGatewayInfoRes> getAvailableGateways();

    PaymentCheckoutRes createPaymentIntent(Long userId, CreatePaymentIntentReq req, String clientIp);

    PaymentDetailRes getPaymentDetail(String paymentCode, Long userId);
}
