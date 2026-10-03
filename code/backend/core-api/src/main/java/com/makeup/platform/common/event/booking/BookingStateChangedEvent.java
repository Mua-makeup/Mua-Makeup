package com.makeup.platform.common.event.booking;

import com.makeup.platform.entity.booking.BookingStatus;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class BookingStateChangedEvent extends ApplicationEvent {

    private final String eventId;
    private final Long bookingId;
    private final String bookingCode;
    private final BookingStatus fromStatus;
    private final BookingStatus toStatus;
    private final Long changedByUserId;

    public BookingStateChangedEvent(Object source, Long bookingId, String bookingCode,
                                    BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId) {
        this(source, UUID.randomUUID().toString(), bookingId, bookingCode, fromStatus, toStatus, changedByUserId);
    }

    public BookingStateChangedEvent(Object source, String eventId, Long bookingId, String bookingCode,
                                    BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId) {
        super(source);
        this.eventId = eventId != null ? eventId : UUID.randomUUID().toString();
        this.bookingId = bookingId;
        this.bookingCode = bookingCode;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedByUserId = changedByUserId;
    }
}
