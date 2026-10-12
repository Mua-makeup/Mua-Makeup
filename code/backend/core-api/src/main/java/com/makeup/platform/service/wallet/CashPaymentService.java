package com.makeup.platform.service.wallet;

import com.makeup.platform.dto.request.wallet.CashPaymentConfirmationReq;
import com.makeup.platform.dto.response.wallet.CashReceiptStatusRes;

/**
 * Service xác nhận tiền mặt hai phía (Customer & Freelancer).
 * Quyết toán chỉ chạy khi cả hai khớp cùng invoice_version.
 */
public interface CashPaymentService {

    /**
     * Khách hàng xác nhận đã trả tiền mặt phần còn lại.
     * Idempotency: cùng key + booking trả cùng kết quả.
     */
    CashReceiptStatusRes confirmByCustomer(Long bookingId, Long customerId, CashPaymentConfirmationReq req);

    /**
     * Thợ tự do xác nhận đã nhận tiền mặt từ khách.
     * Idempotency: cùng key + booking trả cùng kết quả.
     * Nếu cả hai đã xác nhận và khớp invoice_version -> trigger settlement.
     */
    CashReceiptStatusRes confirmByFreelancer(Long bookingId, Long muaUserId, CashPaymentConfirmationReq req);

    /**
     * Chuyên viên thi công (Freelancer MUA hoặc Nhân viên Agency) xác nhận đã nhận tiền mặt từ khách.
     * Tự động xác thực vai trò thi công trên đơn hàng và kích hoạt quyết toán ví tương ứng.
     */
    CashReceiptStatusRes confirmByWorker(Long bookingId, Long workerUserId, CashPaymentConfirmationReq req);

    /**
     * Lấy trạng thái xác nhận tiền mặt của booking.
     */
    CashReceiptStatusRes getStatus(Long bookingId, Long actorUserId);
}
