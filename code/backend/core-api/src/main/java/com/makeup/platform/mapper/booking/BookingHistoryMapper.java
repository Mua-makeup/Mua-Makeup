package com.makeup.platform.mapper.booking;

import com.makeup.platform.dto.response.booking.BookingHistoryLogRes;
import com.makeup.platform.dto.response.booking.BookingHistoryRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingHistoryEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class BookingHistoryMapper {

    public BookingHistoryLogRes toRes(BookingHistoryEntity entity) {
        if (entity == null) {
            return null;
        }

        String changedBy = null;
        Long changedByUserId = null;
        if (entity.getChangedByUser() != null) {
            changedByUserId = entity.getChangedByUser().getId();
            changedBy = entity.getChangedByUser().getFullName();
        }

        return BookingHistoryLogRes.builder()
                .id(entity.getId())
                .fromStatus(entity.getFromStatus() != null ? entity.getFromStatus().name() : null)
                .toStatus(entity.getToStatus() != null ? entity.getToStatus().name() : null)
                .changedByUserId(changedByUserId)
                .changedBy(changedBy)
                .note(entity.getNote())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public List<BookingHistoryLogRes> toResList(List<BookingHistoryEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toRes).toList();
    }

    public BookingHistoryRes toHistoryRes(BookingEntity booking, List<BookingHistoryEntity> historyEntities) {
        if (booking == null) {
            return null;
        }

        return BookingHistoryRes.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .currentStatus(booking.getStatus() != null ? booking.getStatus().name() : null)
                .historyLogs(toResList(historyEntities))
                .build();
    }
}
