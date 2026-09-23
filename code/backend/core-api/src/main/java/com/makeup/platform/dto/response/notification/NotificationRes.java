package com.makeup.platform.dto.response.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationRes {

    private Long id;
    private String type;
    private String title;
    private String content;
    private Long bookingId;
    private String bookingCode;
    private Long agencyId;
    private Long userId;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private Map<String, Object> metadata;
}
