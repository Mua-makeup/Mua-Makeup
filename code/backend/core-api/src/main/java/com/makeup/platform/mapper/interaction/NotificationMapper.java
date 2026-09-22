package com.makeup.platform.mapper.interaction;

import com.makeup.platform.dto.response.notification.NotificationRes;
import com.makeup.platform.entity.interaction.NotificationEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class NotificationMapper {

    public NotificationRes toResponse(NotificationEntity entity) {
        if (entity == null) {
            return null;
        }

        String bookingCode = null;
        if (entity.getBooking() != null) {
            bookingCode = entity.getBooking().getBookingCode();
        } else if (entity.getMetadata() != null && entity.getMetadata().get("bookingCode") != null) {
            bookingCode = String.valueOf(entity.getMetadata().get("bookingCode"));
        }

        return NotificationRes.builder()
                .id(entity.getId())
                .type(entity.getType())
                .title(entity.getTitle())
                .content(entity.getContent())
                .bookingId(entity.getBooking() != null ? entity.getBooking().getId() : null)
                .bookingCode(bookingCode)
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .userId(entity.getUser() != null ? entity.getUser().getId() : null)
                .isRead(entity.getIsRead() != null ? entity.getIsRead() : false)
                .createdAt(entity.getCreatedAt())
                .metadata(entity.getMetadata())
                .build();
    }

    public List<NotificationRes> toResponseList(List<NotificationEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}
