package com.makeup.platform.common.event.booking;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class BookingDepositExpiredEvent extends ApplicationEvent {

    private final Long bookingId;

    public BookingDepositExpiredEvent(Object source, Long bookingId) {
        super(source);
        this.bookingId = bookingId;
    }
}
