package com.makeup.platform.dto.response.interaction;

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
public class ReviewDetailRes {
    private Long id;
    private Long bookingId;
    private String bookingCode;
    private String packageName;
    private String categoryName;
    private String styleName;
    private Long customerId;
    private String customerName;
    private String customerAvatar;
    private Long muaId;
    private String muaName;
    private Integer rating;
    private String comment;
    private List<String> imageUrls;
    private String status;
    private String agencyReply;
    private OffsetDateTime agencyRepliedAt;
    private LocalDateTime createdAt;
}
