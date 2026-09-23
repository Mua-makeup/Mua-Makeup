package com.makeup.platform.common.event.booking;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class BookingReminderEvent extends ApplicationEvent {

    private final Long bookingId;
    private final String reminderType; // "REMINDER_24H" hoặc "REMINDER_2H"

    public BookingReminderEvent(Object source, Long bookingId, String reminderType) {
        super(source);
        this.bookingId = bookingId;
        this.reminderType = reminderType;
    }
}
