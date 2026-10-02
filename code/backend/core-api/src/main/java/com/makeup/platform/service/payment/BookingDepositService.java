package com.makeup.platform.service.payment;

import com.makeup.platform.dto.request.payment.CreateDepositIntentReq;
import com.makeup.platform.dto.response.payment.BookingDepositStatusRes;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;


public interface BookingDepositService {


    PaymentCheckoutRes createOrResumeDepositIntent(Long bookingId, Long customerId,
                                                    CreateDepositIntentReq req,
                                                    String idempotencyKey, String clientIp);

    BookingDepositStatusRes getDepositStatus(Long bookingId, Long customerId);

  
    void applyDepositFromPayment(Long paymentId);

    BookingDepositStatusRes syncDepositPayment(Long bookingId, Long customerId);

    BookingDepositStatusRes mockPayDeposit(Long bookingId, Long customerId);

    PaymentCheckoutRes createFinalPaymentIntent(Long bookingId, Long customerId,
                                                CreateDepositIntentReq req,
                                                String idempotencyKey, String clientIp);

    void applyFinalPayment(Long paymentId);
}
