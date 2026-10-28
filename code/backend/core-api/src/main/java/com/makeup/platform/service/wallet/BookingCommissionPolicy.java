package com.makeup.platform.service.wallet;

import com.makeup.platform.entity.booking.BookingEntity;
import java.math.BigDecimal;

/** Studio platform fees do not depend on the customer's payment method. */
public final class BookingCommissionPolicy {
    private static final BigDecimal STUDIO_RATE = new BigDecimal("0.20");

    private BookingCommissionPolicy() {}

    public static BigDecimal rateFor(BookingEntity booking, BigDecimal freelanceRate) {
        return booking.getAgency() != null ? STUDIO_RATE : freelanceRate;
    }
}
