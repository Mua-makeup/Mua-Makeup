package com.makeup.platform.service.mua.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.mua.BlockCalendarSlotReq;
import com.makeup.platform.dto.response.mua.AvailableTimeSlotRes;
import com.makeup.platform.dto.response.mua.MUACalendarSlotRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.mua.MUACalendarEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.mua.MUACalendarMapper;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffShiftEntity;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffShiftRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.mua.MUACalendarRepository;
import com.makeup.platform.service.mua.MUACalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MUACalendarServiceImpl implements MUACalendarService {

    private final MUACalendarRepository muaCalendarRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingRepository bookingRepository;
    private final MUACalendarMapper muaCalendarMapper;
    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyStaffShiftRepository agencyStaffShiftRepository;

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);
    private static final LocalTime WORK_DAY_START = LocalTime.of(6, 0);
    private static final LocalTime WORK_DAY_END = LocalTime.of(22, 0);
    private static final int DEFAULT_BUFFER_MINUTES = 30;

    @Override
    @Transactional(readOnly = true)
    public AvailableTimeSlotRes getAvailableSlots(Long muaId, LocalDate date, Integer durationMinutes, Integer stepMinutes) {
        if (!muaProfileRepository.existsById(muaId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND, "mua.profile_not_found");
        }

        int duration = (durationMinutes != null && durationMinutes > 0) ? durationMinutes : 90;
        int step = (stepMinutes != null && stepMinutes > 0) ? stepMinutes : 30;

        // 1. Kiểm tra xem MUA có phải là Thợ trực thuộc Studio đang hoạt động không
        Optional<AgencyStaffEntity> activeStaffOpt = agencyStaffRepository.findActiveStaffByMuaId(muaId);
        boolean isStudioStaff = activeStaffOpt.isPresent();
        List<AgencyStaffShiftEntity> staffShifts = Collections.emptyList();

        if (isStudioStaff) {
            Long staffId = activeStaffOpt.get().getId();
            int javaDow = date.getDayOfWeek().getValue();
            int dayOfWeek = (javaDow == 7) ? 1 : javaDow + 1; // 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7
            staffShifts = agencyStaffShiftRepository.findActiveShiftsForStaffOnDate(staffId, date, dayOfWeek);
            log.info("MUA ID: {} is Studio Staff (staffId: {}), active shifts on {}: {}",
                    muaId, staffId, date, staffShifts.size());
        }

        List<MUACalendarEntity> existingSlots = muaCalendarRepository.findActiveSlotsByMuaIdAndDate(muaId, date);
        List<AvailableTimeSlotRes.TimeSlotItemRes> slotItems = new ArrayList<>();

        LocalTime currentStart = WORK_DAY_START;

        while (true) {
            LocalTime currentEnd = currentStart.plusMinutes(duration);
            if (currentEnd.isAfter(WORK_DAY_END) || currentEnd.isBefore(currentStart)) {
                break;
            }

            // A. Nếu là Thợ Studio, slot phải nằm trọn vẹn trong ít nhất 1 ca trực hợp lệ
            if (isStudioStaff) {
                LocalTime finalStart = currentStart;
                LocalTime finalEnd = currentEnd;
                boolean insideShift = staffShifts.stream().anyMatch(shift ->
                        !finalStart.isBefore(shift.getStartTime()) && !finalEnd.isAfter(shift.getEndTime()));

                if (!insideShift) {
                    slotItems.add(AvailableTimeSlotRes.TimeSlotItemRes.builder()
                            .startTime(currentStart)
                            .endTime(currentEnd)
                            .isAvailable(false)
                            .isBufferBlocked(false)
                            .unavailableReason("Ngoài ca trực được phân công của Studio")
                            .build());
                    currentStart = currentStart.plusMinutes(step);
                    continue;
                }
            }

            OffsetDateTime slotStartAt = date.atTime(currentStart).atOffset(VIETNAM_OFFSET);
            OffsetDateTime slotEndAt = date.atTime(currentEnd).atOffset(VIETNAM_OFFSET);

            OffsetDateTime bufferStartAt = slotStartAt.minusMinutes(DEFAULT_BUFFER_MINUTES);
            OffsetDateTime bufferEndAt = slotEndAt.plusMinutes(DEFAULT_BUFFER_MINUTES);

            boolean hardOverlap = false;
            boolean bufferOverlap = false;

            for (MUACalendarEntity busySlot : existingSlots) {
                // 1. Kiểm tra Hard Overlap (trùng trực tiếp với ca trang điểm thực tế)
                if (isOverlapping(slotStartAt, slotEndAt, busySlot.getStartAt(), busySlot.getEndAt())) {
                    hardOverlap = true;
                    break;
                }

                // 2. Kiểm tra Buffer Overlap (chạm vào khoảng đệm di chuyển 30m)
                if (isOverlapping(bufferStartAt, bufferEndAt, busySlot.getStartAt(), busySlot.getEndAt())) {
                    bufferOverlap = true;
                }
            }

            if (hardOverlap) {
                slotItems.add(AvailableTimeSlotRes.TimeSlotItemRes.builder()
                        .startTime(currentStart)
                        .endTime(currentEnd)
                        .isAvailable(false)
                        .isBufferBlocked(false)
                        .unavailableReason("Thợ đã có ca trang điểm hoặc khóa lịch bận")
                        .build());
            } else if (bufferOverlap) {
                slotItems.add(AvailableTimeSlotRes.TimeSlotItemRes.builder()
                        .startTime(currentStart)
                        .endTime(currentEnd)
                        .isAvailable(false)
                        .isBufferBlocked(true)
                        .unavailableReason("Khoảng đệm 30 phút thợ di chuyển giữa 2 địa điểm phục vụ")
                        .build());
            } else {
                slotItems.add(AvailableTimeSlotRes.TimeSlotItemRes.builder()
                        .startTime(currentStart)
                        .endTime(currentEnd)
                        .isAvailable(true)
                        .isBufferBlocked(false)
                        .unavailableReason(null)
                        .build());
            }

            currentStart = currentStart.plusMinutes(step);
        }

        return AvailableTimeSlotRes.builder()
                .muaId(muaId)
                .bookingDate(date)
                .durationMinutes(duration)
                .stepMinutes(step)
                .slots(slotItems)
                .build();
    }

    @Override
    @Transactional
    public MUACalendarSlotRes blockPersonalSlot(Long muaId, BlockCalendarSlotReq req) {
        MuaProfileEntity muaProfile = muaProfileRepository.findById(muaId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND, "mua.profile_not_found"));

        OffsetDateTime startAt = req.getBookingDate().atTime(req.getStartTime()).atOffset(VIETNAM_OFFSET);
        OffsetDateTime endAt = req.getBookingDate().atTime(req.getEndTime()).atOffset(VIETNAM_OFFSET);

        // Kiểm tra xem khoảng thời gian này có trùng với ca nào đã có không
        if (muaCalendarRepository.existsOverlappingSlot(muaId, startAt, endAt)) {
            throw new CustomBusinessException(ErrorCodes.ERR_SLOT_ALREADY_BOOKED, "booking.slot_already_booked");
        }

        MUACalendarEntity entity = muaCalendarMapper.toEntity(muaProfile, req, VIETNAM_OFFSET);
        MUACalendarEntity saved = muaCalendarRepository.save(entity);
        log.info("MUA ID: {} successfully blocked calendar slot ID: {}", muaId, saved.getId());

        return muaCalendarMapper.toSlotResponse(saved);
    }

    @Override
    @Transactional
    public void unblockPersonalSlot(Long muaId, Long calendarId) {
        MUACalendarEntity slot = muaCalendarRepository.findById(calendarId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_CALENDAR_SLOT_NOT_FOUND, "calendar.slot_not_found"));

        if (!slot.getMua().getId().equals(muaId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_FORBIDDEN, "common.forbidden");
        }

        if (slot.getBooking() != null) {
            throw new CustomBusinessException(ErrorCodes.ERR_CANNOT_UNBLOCK_BOOKED_SLOT, "calendar.cannot_unblock_booked_slot");
        }

        muaCalendarRepository.delete(slot);
        log.info("MUA ID: {} unblocked calendar slot ID: {}", muaId, calendarId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isSlotAvailableWithBuffer(Long muaId, OffsetDateTime startAt, OffsetDateTime endAt, int bufferMinutes) {
        // Nếu là Thợ Studio, kiểm tra xem slot có nằm trong ca trực hợp lệ không
        Optional<AgencyStaffEntity> activeStaffOpt = agencyStaffRepository.findActiveStaffByMuaId(muaId);
        if (activeStaffOpt.isPresent()) {
            Long staffId = activeStaffOpt.get().getId();
            LocalDate bookingDate = startAt.toLocalDate();
            int javaDow = bookingDate.getDayOfWeek().getValue();
            int dayOfWeek = (javaDow == 7) ? 1 : javaDow + 1;
            List<AgencyStaffShiftEntity> staffShifts = agencyStaffShiftRepository.findActiveShiftsForStaffOnDate(staffId, bookingDate, dayOfWeek);

            LocalTime startTime = startAt.toLocalTime();
            LocalTime endTime = endAt.toLocalTime();
            boolean insideShift = staffShifts.stream().anyMatch(shift ->
                    !startTime.isBefore(shift.getStartTime()) && !endTime.isAfter(shift.getEndTime()));

            if (!insideShift) {
                return false;
            }
        }

        OffsetDateTime windowStart = startAt.minusMinutes(bufferMinutes);
        OffsetDateTime windowEnd = endAt.plusMinutes(bufferMinutes);
        return !muaCalendarRepository.existsOverlappingSlot(muaId, windowStart, windowEnd);
    }

    @Override
    @Transactional
    public void lockSlotForBooking(Long muaId, Long bookingId, LocalDate bookingDate, OffsetDateTime startAt, OffsetDateTime endAt, String reason) {
        MuaProfileEntity muaProfile = muaProfileRepository.findById(muaId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND, "mua.profile_not_found"));

        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found"));

        // Idempotency guard: release any prior slot this MUA holds for this specific booking before locking
        muaCalendarRepository.deleteByBookingIdAndMuaId(bookingId, muaId);
        muaCalendarRepository.flush();

        MUACalendarEntity calendarSlot = MUACalendarEntity.builder()
                .mua(muaProfile)
                .booking(booking)
                .bookingDate(bookingDate)
                .startAt(startAt)
                .endAt(endAt)
                .isLocked(true)
                .reason(reason)
                .build();

        muaCalendarRepository.save(calendarSlot);
        log.info("Locked calendar slot for booking ID: {} and MUA ID: {}", bookingId, muaId);
    }

    @Override
    @Transactional
    public void releaseSlotByBookingId(Long bookingId) {
        muaCalendarRepository.deleteByBookingId(bookingId);
        log.info("Released calendar slots associated with booking ID: {}", bookingId);
    }

    @Override
    @Transactional
    public void releaseSlotByBookingIdAndMuaId(Long bookingId, Long muaId) {
        muaCalendarRepository.deleteByBookingIdAndMuaId(bookingId, muaId);
        log.info("Released calendar slot for booking ID: {} and MUA ID: {}", bookingId, muaId);
    }

    /**
     * Thuật toán kiểm tra giao thoa 2 khoảng [start1, end1] và [start2, end2]
     * max(start1, start2) < min(end1, end2)
     */
    private boolean isOverlapping(OffsetDateTime start1, OffsetDateTime end1, OffsetDateTime start2, OffsetDateTime end2) {
        OffsetDateTime maxStart = start1.isAfter(start2) ? start1 : start2;
        OffsetDateTime minEnd = end1.isBefore(end2) ? end1 : end2;
        return maxStart.isBefore(minEnd);
    }
}
