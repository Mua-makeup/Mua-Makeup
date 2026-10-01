package com.makeup.platform.service.wallet;


public interface BookingSettlementService {


    void settleBooking(Long bookingId, java.math.BigDecimal commissionRate);

    
    void settleBookingOnlinePayment(Long bookingId, java.math.BigDecimal commissionRate);

    void retryPendingSettlements();
}
