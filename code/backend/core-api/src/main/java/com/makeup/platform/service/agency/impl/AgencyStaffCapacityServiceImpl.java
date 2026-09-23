package com.makeup.platform.service.agency.impl;

import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffShiftEntity;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffShiftRepository;
import com.makeup.platform.repository.mua.MUACalendarRepository;
import com.makeup.platform.service.agency.AgencyStaffCapacityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyStaffCapacityServiceImpl implements AgencyStaffCapacityService {

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyStaffShiftRepository agencyStaffShiftRepository;
    private final MUACalendarRepository muaCalendarRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean hasAvailableStaffForAgency(Long agencyId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        List<AgencyStaffEntity> activeStaffList = agencyStaffRepository.findByAgencyIdAndIsActiveTrue(agencyId);
        if (activeStaffList.isEmpty()) {
            log.info("No active staff found for agency ID: {}", agencyId);
            return false;
        }

        int javaDow = date.getDayOfWeek().getValue();
        int dayOfWeek = (javaDow == 7) ? 1 : javaDow + 1; // 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7

        OffsetDateTime windowStart = date.atTime(startTime).atOffset(VIETNAM_OFFSET);
        OffsetDateTime windowEnd = date.atTime(endTime).atOffset(VIETNAM_OFFSET);

        for (AgencyStaffEntity staff : activeStaffList) {
            // 1. Kiểm tra thợ có ca trực bao trọn khoảng thời gian booking hay không
            List<AgencyStaffShiftEntity> staffShifts = agencyStaffShiftRepository.findActiveShiftsForStaffOnDate(
                    staff.getId(), date, dayOfWeek);

            boolean insideShift = staffShifts.stream().anyMatch(shift ->
                    !startTime.isBefore(shift.getStartTime()) && !endTime.isAfter(shift.getEndTime()));

            if (!insideShift) {
                continue; // Thợ không trong ca trực tại khung giờ này
            }

            // 2. Nếu thợ có ca trực hợp lệ, kiểm tra xem lịch của thợ có bị bận/trùng đơn khác không
            if (staff.getMua() != null) {
                boolean hasConflict = muaCalendarRepository.existsOverlappingSlot(
                        staff.getMua().getId(), windowStart, windowEnd);
                if (!hasConflict) {
                    log.info("Found available staff ID: {} for agency ID: {} in shift on {}",
                            staff.getId(), agencyId, date);
                    return true;
                }
            } else {
                return true;
            }
        }

        log.info("No staff on duty or available for agency ID: {} on {} between {} and {}",
                agencyId, date, startTime, endTime);
        return false;
    }
}
