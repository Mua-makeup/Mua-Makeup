package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyReviewItemRes {

    private Long reviewId;
    private Long bookingId;
    private String bookingCode;

    // Customer
    private Long customerId;
    private String customerName;
    private String customerAvatarUrl;

    // Primary Assigned Staff
    private Long staffId;
    private Long muaId;
    private String staffName;
    private String staffAvatarUrl;

    // Service Package
    private Long packageId;
    private String packageName;

    // Review content
    private Integer rating;
    private String comment;
    private List<String> imageUrls;

    // Agency reply
    private String agencyReply;
    private OffsetDateTime agencyRepliedAt;

    private LocalDateTime createdAt;
}
