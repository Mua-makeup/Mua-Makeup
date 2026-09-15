package com.makeup.platform.common.event.booking;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class InstantBookingAcceptedEvent extends ApplicationEvent {

    private final Long bookingId;
    private final Long muaId;

    public InstantBookingAcceptedEvent(Object source, Long bookingId, Long muaId) {
        super(source);
        this.bookingId = bookingId;
        this.muaId = muaId;
    }
}
