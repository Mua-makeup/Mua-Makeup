package com.makeup.platform.mapper.interaction;

import com.makeup.platform.dto.response.interaction.ReviewDetailRes;
import com.makeup.platform.entity.interaction.ReviewEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ReviewMapper {

    public ReviewDetailRes toDetailRes(ReviewEntity review) {
        if (review == null) {
            return null;
        }

        String customerName = null;
        String customerAvatar = null;
        if (review.getCustomer() != null) {
            customerName = review.getCustomer().getFullName();
            customerAvatar = review.getCustomer().getAvatarUrl();
        }

        String muaName = null;
        if (review.getMua() != null && review.getMua().getUser() != null) {
            muaName = review.getMua().getUser().getFullName();
        }

        String bookingCode = null;
        if (review.getBooking() != null) {
            bookingCode = review.getBooking().getBookingCode();
        }

        return ReviewDetailRes.builder()
                .id(review.getId())
                .bookingId(review.getBooking() != null ? review.getBooking().getId() : null)
                .bookingCode(bookingCode)
                .customerId(review.getCustomer() != null ? review.getCustomer().getId() : null)
                .customerName(customerName)
                .customerAvatar(customerAvatar)
                .muaId(review.getMua() != null ? review.getMua().getId() : null)
                .muaName(muaName)
                .rating(review.getRating())
                .comment(review.getComment())
                .imageUrls(review.getImageUrls() != null ? new ArrayList<>(review.getImageUrls()) : List.of())
                .status(review.getStatus() != null ? review.getStatus().name() : null)
                .createdAt(review.getCreatedAt())
                .build();
    }
}
