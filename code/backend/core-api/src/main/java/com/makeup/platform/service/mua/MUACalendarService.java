package com.makeup.platform.service.mua;

import com.makeup.platform.dto.request.mua.BlockCalendarSlotReq;
import com.makeup.platform.dto.response.mua.AvailableTimeSlotRes;
import com.makeup.platform.dto.response.mua.MUACalendarSlotRes;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public interface MUACalendarService {

    AvailableTimeSlotRes getAvailableSlots(Long muaId, LocalDate date, Integer durationMinutes, Integer stepMinutes);

    MUACalendarSlotRes blockPersonalSlot(Long muaId, BlockCalendarSlotReq req);

    void unblockPersonalSlot(Long muaId, Long calendarId);

    boolean isSlotAvailableWithBuffer(Long muaId, OffsetDateTime startAt, OffsetDateTime endAt, int bufferMinutes);

    void lockSlotForBooking(Long muaId, Long bookingId, LocalDate bookingDate, OffsetDateTime startAt, OffsetDateTime endAt, String reason);

    void releaseSlotByBookingId(Long bookingId);

    void releaseSlotByBookingIdAndMuaId(Long bookingId, Long muaId);
}
