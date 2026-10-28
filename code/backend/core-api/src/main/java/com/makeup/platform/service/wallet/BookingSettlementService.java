package com.makeup.platform.service.wallet;
import java.math.BigDecimal;


public interface BookingSettlementService {


    void settleBooking(Long bookingId, BigDecimal commissionRate);

    
    void settleBookingOnlinePayment(Long bookingId, BigDecimal commissionRate);

    void settleBookingOnlinePaymentInTransaction(Long bookingId, BigDecimal commissionRate);

    void retryPendingSettlements();

    void processOvertimeAllowancesForBooking(Long bookingId);
}
