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
    private final Long agencyId;

    public ReviewSubmittedEvent(Object source, Long reviewId, Long bookingId, Long muaId, Long customerId, Integer rating, Long agencyId) {
        super(source);
        this.reviewId = reviewId;
        this.bookingId = bookingId;
        this.muaId = muaId;
        this.customerId = customerId;
        this.rating = rating;
        this.agencyId = agencyId;
    }

    public ReviewSubmittedEvent(Object source, Long reviewId, Long bookingId, Long muaId, Long customerId, Integer rating) {
        this(source, reviewId, bookingId, muaId, customerId, rating, null);
    }
}
