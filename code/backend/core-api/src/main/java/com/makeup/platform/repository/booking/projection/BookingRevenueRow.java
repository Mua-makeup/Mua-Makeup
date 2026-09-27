package com.makeup.platform.repository.booking.projection;

import java.math.BigDecimal;

public interface BookingRevenueRow {
    Long getMuaId();
    BigDecimal getTotalAmount();
}
