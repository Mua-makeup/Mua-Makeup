package com.makeup.platform.mapper.mua;

import com.makeup.platform.dto.request.mua.BlockCalendarSlotReq;
import com.makeup.platform.dto.response.mua.MUACalendarSlotRes;
import com.makeup.platform.entity.mua.MUACalendarEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Component
public class MUACalendarMapper {

    public MUACalendarSlotRes toSlotResponse(MUACalendarEntity entity) {
        if (entity == null) {
            return null;
        }

        return MUACalendarSlotRes.builder()
                .calendarId(entity.getId())
                .muaId(entity.getMua() != null ? entity.getMua().getId() : null)
                .bookingId(entity.getBooking() != null ? entity.getBooking().getId() : null)
                .bookingDate(entity.getBookingDate())
                .startAt(entity.getStartAt())
                .endAt(entity.getEndAt())
                .isLocked(entity.getIsLocked())
                .reason(entity.getReason())
                .build();
    }

    public MUACalendarEntity toEntity(MuaProfileEntity muaProfile, BlockCalendarSlotReq req, ZoneOffset zoneOffset) {
        if (req == null) {
            return null;
        }

        OffsetDateTime startAt = req.getBookingDate().atTime(req.getStartTime()).atOffset(zoneOffset);
        OffsetDateTime endAt = req.getBookingDate().atTime(req.getEndTime()).atOffset(zoneOffset);

        return MUACalendarEntity.builder()
                .mua(muaProfile)
                .bookingDate(req.getBookingDate())
                .startAt(startAt)
                .endAt(endAt)
                .isLocked(true)
                .reason(req.getReason())
                .build();
    }
}
