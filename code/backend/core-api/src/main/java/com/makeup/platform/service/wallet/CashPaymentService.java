package com.makeup.platform.service.wallet;

import com.makeup.platform.dto.request.wallet.CashPaymentConfirmationReq;
import com.makeup.platform.dto.response.wallet.CashReceiptStatusRes;


public interface CashPaymentService {

    CashReceiptStatusRes confirmByCustomer(Long bookingId, Long customerId, CashPaymentConfirmationReq req);

    CashReceiptStatusRes confirmByFreelancer(Long bookingId, Long muaUserId, CashPaymentConfirmationReq req);

    CashReceiptStatusRes confirmByWorker(Long bookingId, Long workerUserId, CashPaymentConfirmationReq req);

    CashReceiptStatusRes declineByWorker(Long bookingId, Long workerUserId, String reason);

    CashReceiptStatusRes getStatus(Long bookingId, Long actorUserId);
}
