package com.makeup.platform.common.event.booking;

import com.makeup.platform.entity.booking.BookingStatus;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class BookingStateChangedEvent extends ApplicationEvent {

    private final Long bookingId;
    private final String bookingCode;
    private final BookingStatus fromStatus;
    private final BookingStatus toStatus;
    private final Long changedByUserId;

    public BookingStateChangedEvent(Object source, Long bookingId, String bookingCode,
                                   BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId) {
        super(source);
        this.bookingId = bookingId;
        this.bookingCode = bookingCode;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedByUserId = changedByUserId;
    }
}
