package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyReviewItemRes;
import com.makeup.platform.entity.interaction.ReviewEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class AgencyReviewMapper {

    public AgencyReviewItemRes toItemRes(ReviewEntity review) {
        if (review == null) {
            return null;
        }

        Long bookingId = review.getBooking() != null ? review.getBooking().getId() : null;
        String bookingCode = review.getBooking() != null ? review.getBooking().getBookingCode() : null;

        Long customerId = review.getCustomer() != null ? review.getCustomer().getId() : null;
        String customerName = review.getCustomer() != null ? review.getCustomer().getFullName() : null;
        String customerAvatarUrl = review.getCustomer() != null ? review.getCustomer().getAvatarUrl() : null;

        Long muaId = review.getMua() != null ? review.getMua().getId() : null;
        String staffName = review.getMua() != null && review.getMua().getUser() != null
                ? review.getMua().getUser().getFullName()
                : null;
        String staffAvatarUrl = review.getMua() != null && review.getMua().getUser() != null
                ? review.getMua().getUser().getAvatarUrl()
                : null;

        Long packageId = review.getBooking() != null && review.getBooking().getServicePackage() != null
                ? review.getBooking().getServicePackage().getId()
                : null;
        String packageName = review.getBooking() != null && review.getBooking().getServicePackage() != null
                ? review.getBooking().getServicePackage().getPackageName()
                : null;

        return AgencyReviewItemRes.builder()
                .reviewId(review.getId())
                .bookingId(bookingId)
                .bookingCode(bookingCode)
                .customerId(customerId)
                .customerName(customerName)
                .customerAvatarUrl(customerAvatarUrl)
                .muaId(muaId)
                .staffName(staffName)
                .staffAvatarUrl(staffAvatarUrl)
                .packageId(packageId)
                .packageName(packageName)
                .rating(review.getRating())
                .comment(review.getComment())
                .imageUrls(review.getImageUrls() != null ? review.getImageUrls() : Collections.emptyList())
                .agencyReply(review.getAgencyReply())
                .agencyRepliedAt(review.getAgencyRepliedAt())
                .createdAt(review.getCreatedAt())
                .build();
    }

    public List<AgencyReviewItemRes> toItemResList(List<ReviewEntity> reviews) {
        if (reviews == null || reviews.isEmpty()) {
            return Collections.emptyList();
        }
        List<AgencyReviewItemRes> list = new ArrayList<>(reviews.size());
        for (ReviewEntity r : reviews) {
            AgencyReviewItemRes res = toItemRes(r);
            if (res != null) {
                list.add(res);
            }
        }
        return list;
    }
}
