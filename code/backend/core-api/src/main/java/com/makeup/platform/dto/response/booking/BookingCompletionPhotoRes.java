package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingCompletionPhotoRes {

    private Long bookingId;
    private String bookingCode;
    private String completionPhotoUrl;
    private String thumbnailUrl;
    private String publicId;
    private LocalDateTime uploadedAt;
}
