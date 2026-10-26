package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.mua.AvailableTimeSlotRes;
import com.makeup.platform.dto.response.mua.CalendarDayOverviewRes;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffShiftEntity;
import com.makeup.platform.entity.mua.MUACalendarEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.pricing.SurgePricingRuleEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffShiftRepository;
import com.makeup.platform.repository.mua.MUACalendarRepository;
import com.makeup.platform.repository.pricing.SurgePricingRuleRepository;
import com.makeup.platform.service.agency.AgencyCalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyCalendarServiceImpl implements AgencyCalendarService {

    private static final LocalTime WORK_DAY_START = LocalTime.of(7, 0);
    private static final LocalTime WORK_DAY_END = LocalTime.of(22, 0);
    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyStaffShiftRepository agencyStaffShiftRepository;
    private final MUACalendarRepository muaCalendarRepository;
    private final SurgePricingRuleRepository surgePricingRuleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CalendarDayOverviewRes> getAgencyCalendarDaysOverview(Long agencyId, LocalDate startDate, Integer days, Integer durationMinutes) {
        if (!agencyProfileRepository.existsById(agencyId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND, "agency.profile_not_found", HttpStatus.NOT_FOUND);
        }

        int scanDays = (days != null && days > 0) ? Math.min(days, 90) : 30;
        int duration = (durationMinutes != null && durationMinutes > 0) ? durationMinutes : 60;
        LocalDate start = (startDate != null) ? startDate : LocalDate.now();
        LocalDate end = start.plusDays(scanDays - 1);

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalTime minBookingTime = now.plusHours(1); // Quy tắc đặt hẹn trước ít nhất 1 tiếng

        // 1. Tải toàn bộ nhân sự đang hoạt động của Studio (1 query)
        List<AgencyStaffEntity> activeStaffList = agencyStaffRepository.findByAgencyIdAndIsActiveTrue(agencyId);
        if (activeStaffList.isEmpty()) {
            List<CalendarDayOverviewRes> emptyResult = new ArrayList<>(scanDays);
            for (int i = 0; i < scanDays; i++) {
                LocalDate d = start.plusDays(i);
                emptyResult.add(CalendarDayOverviewRes.builder()
                        .date(d)
                        .dayOfWeek(formatDayOfWeek(d))
                        .isFullyBooked(true)
                        .availableSlotsCount(0)
                        .build());
            }
            return emptyResult;
        }

        // 2. Tải trước toàn bộ ca trực trong khoảng ngày (1 query)
        List<AgencyStaffShiftEntity> allShifts = agencyStaffShiftRepository.findAllActiveByAgencyIdAndWeekRange(agencyId, start, end);
        Map<Long, List<AgencyStaffShiftEntity>> shiftsByStaffId = allShifts.stream()
                .filter(s -> s.getStaff() != null)
                .collect(Collectors.groupingBy(s -> s.getStaff().getId()));

        // 3. Tải trước toàn bộ lịch bận của tất cả chuyên viên trong khoảng ngày (1 query)
        List<Long> muaIds = activeStaffList.stream()
                .map(AgencyStaffEntity::getMua)
                .filter(Objects::nonNull)
                .map(MuaProfileEntity::getId)
                .toList();

        List<MUACalendarEntity> allBusySlots = muaIds.isEmpty()
                ? Collections.emptyList()
                : muaCalendarRepository.findActiveSlotsByMuaIdsAndDateBetween(muaIds, start, end);

        Map<Long, Map<LocalDate, List<MUACalendarEntity>>> busySlotsByMuaAndDate = allBusySlots.stream()
                .filter(b -> b.getMua() != null)
                .collect(Collectors.groupingBy(
                        b -> b.getMua().getId(),
                        Collectors.groupingBy(MUACalendarEntity::getBookingDate)
                ));

        List<CalendarDayOverviewRes> result = new ArrayList<>(scanDays);

        for (int i = 0; i < scanDays; i++) {
            LocalDate date = start.plusDays(i);
            boolean isPastDate = date.isBefore(today);
            boolean isToday = date.isEqual(today);
            String dayOfWeekText = formatDayOfWeek(date);

            if (isPastDate) {
                result.add(CalendarDayOverviewRes.builder()
                        .date(date)
                        .dayOfWeek(dayOfWeekText)
                        .isFullyBooked(true)
                        .availableSlotsCount(0)
                        .build());
                continue;
            }

            int javaDow = date.getDayOfWeek().getValue();
            int dayOfWeek = (javaDow == 7) ? 1 : javaDow + 1; // 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7

            int availableCount = 0;
            LocalTime currentStart = WORK_DAY_START;

            while (true) {
                LocalTime currentEnd = currentStart.plusMinutes(duration);
                if (currentEnd.isAfter(WORK_DAY_END) || currentEnd.isBefore(currentStart)) {
                    break;
                }

                if (isToday && currentStart.isBefore(minBookingTime)) {
                    currentStart = currentStart.plusMinutes(15);
                    continue;
                }

                OffsetDateTime windowStart = date.atTime(currentStart).atOffset(VIETNAM_OFFSET);
                OffsetDateTime windowEnd = date.atTime(currentEnd).atOffset(VIETNAM_OFFSET);

                // Kiểm tra in-memory xem có bất kỳ thợ nào rảnh trong khung giờ này không
                boolean hasStaff = false;
                for (AgencyStaffEntity staff : activeStaffList) {
                    List<AgencyStaffShiftEntity> staffShifts = shiftsByStaffId.getOrDefault(staff.getId(), Collections.emptyList());

                    LocalTime slotStart = currentStart;
                    boolean insideShift = staffShifts.stream().anyMatch(shift -> {
                        boolean matchDate = (shift.getWorkDate() != null && shift.getWorkDate().isEqual(date))
                                || (shift.getWorkDate() == null && Boolean.TRUE.equals(shift.getIsRecurring()) && Objects.equals(shift.getDayOfWeek(), dayOfWeek));
                        return matchDate && !slotStart.isBefore(shift.getStartTime()) && slotStart.isBefore(shift.getEndTime());
                    });

                    if (!insideShift) {
                        continue;
                    }

                    if (staff.getMua() != null) {
                        List<MUACalendarEntity> staffDayBusy = busySlotsByMuaAndDate
                                .getOrDefault(staff.getMua().getId(), Collections.emptyMap())
                                .getOrDefault(date, Collections.emptyList());

                        boolean conflict = staffDayBusy.stream().anyMatch(busy ->
                                isOverlapping(windowStart, windowEnd, busy.getStartAt(), busy.getEndAt()));

                        if (!conflict) {
                            hasStaff = true;
                            break;
                        }
                    } else {
                        hasStaff = true;
                        break;
                    }
                }

                if (hasStaff) {
                    availableCount++;
                }

                currentStart = currentStart.plusMinutes(15);
            }

            result.add(CalendarDayOverviewRes.builder()
                    .date(date)
                    .dayOfWeek(dayOfWeekText)
                    .isFullyBooked(availableCount == 0)
                    .availableSlotsCount(availableCount)
                    .build());
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public AvailableTimeSlotRes getAgencyAvailableSlots(Long agencyId, LocalDate date, Integer durationMinutes, Integer stepMinutes) {
        if (!agencyProfileRepository.existsById(agencyId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND, "agency.profile_not_found", HttpStatus.NOT_FOUND);
        }

        int duration = (durationMinutes != null && durationMinutes > 0) ? durationMinutes : 60;
        int step = (stepMinutes != null && stepMinutes > 0) ? stepMinutes : 15;

        List<AvailableTimeSlotRes.TimeSlotItemRes> slotItems = new ArrayList<>();

        String dayOfWeekStr = date.getDayOfWeek().name();
        int javaDow = date.getDayOfWeek().getValue();
        int dayOfWeek = (javaDow == 7) ? 1 : javaDow + 1; // 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalTime minBookingTime = now.plusHours(1); // Quy tắc đặt hẹn trước ít nhất 1 tiếng
        boolean isToday = date.isEqual(today);
        boolean isPastDate = date.isBefore(today);

        // 1. Tải trước toàn bộ thợ, ca trực và lịch bận cho ngày này (3 queries duy nhất)
        List<AgencyStaffEntity> activeStaffList = agencyStaffRepository.findByAgencyIdAndIsActiveTrue(agencyId);
        List<AgencyStaffShiftEntity> allShifts = agencyStaffShiftRepository.findAllActiveByAgencyIdAndWeekRange(agencyId, date, date);
        Map<Long, List<AgencyStaffShiftEntity>> shiftsByStaffId = allShifts.stream()
                .filter(s -> s.getStaff() != null)
                .collect(Collectors.groupingBy(s -> s.getStaff().getId()));

        List<Long> muaIds = activeStaffList.stream()
                .map(AgencyStaffEntity::getMua)
                .filter(Objects::nonNull)
                .map(MuaProfileEntity::getId)
                .toList();

        List<MUACalendarEntity> allBusySlots = muaIds.isEmpty()
                ? Collections.emptyList()
                : muaCalendarRepository.findActiveSlotsByMuaIdsAndDate(muaIds, date);

        Map<Long, List<MUACalendarEntity>> busySlotsByMua = allBusySlots.stream()
                .filter(b -> b.getMua() != null)
                .collect(Collectors.groupingBy(b -> b.getMua().getId()));

        // 2. Tải trước toàn bộ quy tắc Surge (1 query)
        List<SurgePricingRuleEntity> allActiveSurgeRules = surgePricingRuleRepository.findByIsActiveTrue();

        LocalTime currentStart = WORK_DAY_START;

        while (true) {
            LocalTime currentEnd = currentStart.plusMinutes(duration);
            if (currentEnd.isAfter(WORK_DAY_END) || currentEnd.isBefore(currentStart)) {
                break;
            }

            // 0. Quá khứ hoặc < 1 tiếng
            if (isPastDate || (isToday && currentStart.isBefore(minBookingTime))) {
                String reason = isPastDate
                        ? "Ngày đã qua trong quá khứ"
                        : (currentStart.isBefore(now)
                                ? "Khung giờ đã qua trong ngày"
                                : "Cần đặt hẹn trước ít nhất 1 tiếng để Studio chuẩn bị tiếp đón");

                slotItems.add(AvailableTimeSlotRes.TimeSlotItemRes.builder()
                        .startTime(currentStart)
                        .endTime(currentEnd)
                        .isAvailable(false)
                        .isBufferBlocked(false)
                        .unavailableReason(reason)
                        .isRecommended(false)
                        .badgeLabel(null)
                        .surgeInfo(null)
                        .build());
                currentStart = currentStart.plusMinutes(step);
                continue;
            }

            OffsetDateTime windowStart = date.atTime(currentStart).atOffset(VIETNAM_OFFSET);
            OffsetDateTime windowEnd = date.atTime(currentEnd).atOffset(VIETNAM_OFFSET);

            // 1. Kiểm tra công suất in-memory
            boolean hasStaff = false;
            for (AgencyStaffEntity staff : activeStaffList) {
                List<AgencyStaffShiftEntity> staffShifts = shiftsByStaffId.getOrDefault(staff.getId(), Collections.emptyList());

                LocalTime slotStart = currentStart;
                boolean insideShift = staffShifts.stream().anyMatch(shift -> {
                    boolean matchDate = (shift.getWorkDate() != null && shift.getWorkDate().isEqual(date))
                            || (shift.getWorkDate() == null && Boolean.TRUE.equals(shift.getIsRecurring()) && Objects.equals(shift.getDayOfWeek(), dayOfWeek));
                    return matchDate && !slotStart.isBefore(shift.getStartTime()) && slotStart.isBefore(shift.getEndTime());
                });

                if (!insideShift) {
                    continue;
                }

                if (staff.getMua() != null) {
                    List<MUACalendarEntity> staffBusy = busySlotsByMua.getOrDefault(staff.getMua().getId(), Collections.emptyList());
                    boolean conflict = staffBusy.stream().anyMatch(busy ->
                            isOverlapping(windowStart, windowEnd, busy.getStartAt(), busy.getEndAt()));
                    if (!conflict) {
                        hasStaff = true;
                        break;
                    }
                } else {
                    hasStaff = true;
                    break;
                }
            }

            // 2. Tra cứu quy tắc phụ trội hoặc ưu đãi in-memory
            LocalTime loopStart = currentStart;
            List<SurgePricingRuleEntity> matchingSurgeRules = allActiveSurgeRules.stream()
                    .filter(r -> "ALL".equals(r.getZoneCode()))
                    .filter(r -> r.getStartTime() == null || r.getEndTime() == null
                            || (!loopStart.isBefore(r.getStartTime()) && !loopStart.isAfter(r.getEndTime())))
                    .filter(r -> r.getApplicableDaysOfWeek() == null || r.getApplicableDaysOfWeek().contains(dayOfWeekStr))
                    .sorted(Comparator.comparing(SurgePricingRuleEntity::getSurgeMultiplier).reversed())
                    .toList();

            boolean hasSurge = !matchingSurgeRules.isEmpty();
            String surgeRuleName = hasSurge ? matchingSurgeRules.get(0).getRuleName() : null;
            BigDecimal surgeMultiplier = hasSurge ? matchingSurgeRules.get(0).getSurgeMultiplier() : BigDecimal.ONE;

            AvailableTimeSlotRes.SurgeSlotInfoRes surgeInfo = AvailableTimeSlotRes.SurgeSlotInfoRes.builder()
                    .hasSurge(hasSurge)
                    .ruleName(surgeRuleName)
                    .multiplier(surgeMultiplier)
                    .surchargeType(hasSurge ? (surgeMultiplier.compareTo(BigDecimal.ONE) < 0 ? "DISCOUNT" : "SURGE") : null)
                    .surchargeAmount(BigDecimal.ZERO)
                    .build();

            slotItems.add(AvailableTimeSlotRes.TimeSlotItemRes.builder()
                    .startTime(currentStart)
                    .endTime(currentEnd)
                    .isAvailable(hasStaff)
                    .isBufferBlocked(false)
                    .unavailableReason(hasStaff ? null : "Studio hiện không còn chuyên viên rảnh trong khung giờ này")
                    .isRecommended(false)
                    .badgeLabel(hasSurge ? (surgeMultiplier.compareTo(BigDecimal.ONE) < 0 ? "Ưu đãi" : "Giờ cao điểm") : null)
                    .surgeInfo(surgeInfo)
                    .build());

            currentStart = currentStart.plusMinutes(step);
        }

        return AvailableTimeSlotRes.builder()
                .muaId(agencyId)
                .bookingDate(date)
                .durationMinutes(duration)
                .stepMinutes(step)
                .slots(slotItems)
                .build();
    }

    private boolean isOverlapping(OffsetDateTime start1, OffsetDateTime end1, OffsetDateTime start2, OffsetDateTime end2) {
        return start1.isBefore(end2) && end1.isAfter(start2);
    }

    private String formatDayOfWeek(LocalDate date) {
        int dow = date.getDayOfWeek().getValue();
        return switch (dow) {
            case 1 -> "Thứ 2";
            case 2 -> "Thứ 3";
            case 3 -> "Thứ 4";
            case 4 -> "Thứ 5";
            case 5 -> "Thứ 6";
            case 6 -> "Thứ 7";
            default -> "Chủ Nhật";
        };
    }
}

