package com.makeup.platform.dto.request.interaction;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReviewReq {

    @NotNull(message = "review.booking_id_required")
    private Long bookingId;

    @NotNull(message = "review.rating_required")
    @Min(value = 1, message = "review.rating_min")
    @Max(value = 5, message = "review.rating_max")
    private Integer rating;

    @Size(max = 2000, message = "review.comment_too_long")
    private String comment;

    private List<String> imageUrls;

    private String deviceId;

    private String bankHash;
}
