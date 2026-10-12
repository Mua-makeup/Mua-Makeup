package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.mua.AvailableTimeSlotRes;
import com.makeup.platform.dto.response.mua.CalendarDayOverviewRes;
import com.makeup.platform.entity.pricing.SurgePricingRuleEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.pricing.SurgePricingRuleRepository;
import com.makeup.platform.service.agency.AgencyCalendarService;
import com.makeup.platform.service.agency.AgencyStaffCapacityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyCalendarServiceImpl implements AgencyCalendarService {

    private static final LocalTime WORK_DAY_START = LocalTime.of(7, 0);
    private static final LocalTime WORK_DAY_END = LocalTime.of(22, 0);

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffCapacityService agencyStaffCapacityService;
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

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalTime minBookingTime = now.plusHours(1); // Quy tắc đặt hẹn trước ít nhất 1 tiếng

        List<CalendarDayOverviewRes> result = new ArrayList<>(scanDays);

        for (int i = 0; i < scanDays; i++) {
            LocalDate date = start.plusDays(i);
            boolean isPastDate = date.isBefore(today);
            boolean isToday = date.isEqual(today);

            int dow = date.getDayOfWeek().getValue();
            String dayOfWeekText = switch (dow) {
                case 1 -> "Thứ 2";
                case 2 -> "Thứ 3";
                case 3 -> "Thứ 4";
                case 4 -> "Thứ 5";
                case 5 -> "Thứ 6";
                case 6 -> "Thứ 7";
                default -> "Chủ Nhật";
            };

            if (isPastDate) {
                result.add(CalendarDayOverviewRes.builder()
                        .date(date)
                        .dayOfWeek(dayOfWeekText)
                        .isFullyBooked(true)
                        .availableSlotsCount(0)
                        .build());
                continue;
            }

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

                boolean hasStaff = agencyStaffCapacityService.hasAvailableStaffForAgency(agencyId, date, currentStart, currentEnd);
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
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalTime minBookingTime = now.plusHours(1); // Quy tắc đặt hẹn trước ít nhất 1 tiếng
        boolean isToday = date.isEqual(today);
        boolean isPastDate = date.isBefore(today);

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

            // 1. Kiểm tra công suất: Có bất kỳ thợ nào của Studio còn rảnh trong ca trực không?
            boolean hasStaff = agencyStaffCapacityService.hasAvailableStaffForAgency(agencyId, date, currentStart, currentEnd);

            // 2. Tra cứu quy tắc phụ trội hoặc ưu đãi
            List<SurgePricingRuleEntity> matchingSurgeRules = surgePricingRuleRepository.findMatchingRules(currentStart, dayOfWeekStr, "ALL");
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
}
