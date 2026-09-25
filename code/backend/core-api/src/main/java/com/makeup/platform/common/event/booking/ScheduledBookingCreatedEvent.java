package com.makeup.platform.common.event.booking;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
public class ScheduledBookingCreatedEvent extends ApplicationEvent {

    private final Long bookingId;
    private final String bookingCode;
    private final BigDecimal depositAmount;
    private final Long agencyId;
    private final Long customerId;
    private final String customerName;
    private final String customerPhone;
    private final String servicePackageName;
    private final LocalDate bookingDate;
    private final LocalTime startTime;
    private final BigDecimal totalAmount;

    public ScheduledBookingCreatedEvent(
            Object source,
            Long bookingId,
            String bookingCode,
            BigDecimal depositAmount,
            Long agencyId,
            Long customerId,
            String customerName,
            String customerPhone,
            String servicePackageName,
            LocalDate bookingDate,
            LocalTime startTime,
            BigDecimal totalAmount) {
        super(source);
        this.bookingId = bookingId;
        this.bookingCode = bookingCode;
        this.depositAmount = depositAmount;
        this.agencyId = agencyId;
        this.customerId = customerId;
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.servicePackageName = servicePackageName;
        this.bookingDate = bookingDate;
        this.startTime = startTime;
        this.totalAmount = totalAmount;
    }

    public ScheduledBookingCreatedEvent(Object source, Long bookingId, String bookingCode, BigDecimal depositAmount) {
        this(source, bookingId, bookingCode, depositAmount, null, null, null, null, null, null, null, null);
    }
}
