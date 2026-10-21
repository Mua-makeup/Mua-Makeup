package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyReviewRes {

    private Long id;
    private Long bookingId;
    private String bookingCode;
    private LocalDate bookingDate;

    private String packageName;
    private String categoryName;
    private String styleName;

    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String customerAvatar;

    private StaffInfo primaryStaff;

    @Builder.Default
    private List<StaffInfo> assistantStaff = new ArrayList<>();

    private Integer rating;
    private String comment;

    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    private String completionPhotoUrl;
    private String status;
    private LocalDateTime createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StaffInfo {
        private Long staffId;
        private String name;
        private String phone;
        private String avatarUrl;
        private String role;
    }
}
