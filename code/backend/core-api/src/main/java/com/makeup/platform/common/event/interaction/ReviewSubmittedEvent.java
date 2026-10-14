package com.makeup.platform.common.event.interaction;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ReviewSubmittedEvent extends ApplicationEvent {

    private final Long reviewId;
    private final Long bookingId;
    private final Long muaId;
    private final Long customerId;
    private final Integer rating;

    public ReviewSubmittedEvent(Object source, Long reviewId, Long bookingId, Long muaId, Long customerId, Integer rating) {
        super(source);
        this.reviewId = reviewId;
        this.bookingId = bookingId;
        this.muaId = muaId;
        this.customerId = customerId;
        this.rating = rating;
    }
}
