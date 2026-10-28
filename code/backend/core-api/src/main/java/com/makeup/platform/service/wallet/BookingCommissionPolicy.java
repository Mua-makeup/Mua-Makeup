package com.makeup.platform.service.wallet;

import com.makeup.platform.entity.booking.BookingEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;


@Component
@RequiredArgsConstructor
public class BookingCommissionPolicy {

    private final PlatformFeeService platformFeeService;

    public BigDecimal rateFor(BookingEntity booking) {
        return platformFeeService.getRate();
    }

    public BigDecimal rateFor(BookingEntity booking, BigDecimal fallback) {
        return platformFeeService.getRate();
    }

 
    public BigDecimal getRate() {
        return platformFeeService.getRate();
    }
}
